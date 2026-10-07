import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, MoreThan, Not, Repository } from 'typeorm';
import { ResourceType, SCHEDULE_MANAGER_ROLES } from '../../../common/constants';
import {
  InsufficientPermissionException,
  InvalidSwapCandidateException,
  ResourceNotFoundException,
  SwapAlreadyOpenException,
  SwapNotOpenException,
} from '../../../common/exceptions';
import type { JwtUser } from '../../../common/interfaces';
import { formatEventWhen, toDateOnlyString } from '../../../common/utils';
import { Availability } from '../../availability/entities/availability.entity';
import { WeekdayAvailability } from '../../availability/entities/weekday-availability.entity';
import { findUnavailableMemberIdsForDay } from '../../availability/utils';
import { Member } from '../../members/entities/member.entity';
import { toOptionalMemberResponse } from '../../members/mappers/member.mapper';
import { NotificationType } from '../../notifications/entities/notification.entity';
import { LeaderNotificationsService } from '../../notifications/leader-notifications.service';
import { PushNotificationService } from '../../notifications/push-notification.service';
import { TeamMember } from '../../teams/entities/team-member.entity';
import { ScheduleResponseDto } from '../dtos/schedule-response.dto';
import { ScheduleSwap, SwapStatus } from '../entities/schedule-swap.entity';
import { Schedule, ScheduleStatus } from '../entities/schedule.entity';
import { toScheduleResponse } from '../mappers/schedule-detail.mapper';
import { findMemberIdsBusyDuring } from '../utils/overlap.util';
import { CreateScheduleSwapDto } from './dtos/create-schedule-swap.dto';
import { ListScheduleSwapsDto } from './dtos/list-schedule-swaps.dto';
import { ResolveScheduleSwapDto } from './dtos/resolve-schedule-swap.dto';
import {
  MySwapsDto,
  ScheduleSwapResponseDto,
  SwapCandidateMemberDto,
} from './dtos/schedule-swap-response.dto';
import type { IScheduleSwapsService } from './interfaces';
import { toScheduleSwapResponse, toScheduleSwapResponseList } from './mappers';

const SWAP_RELATIONS = {
  schedule: { event: true, team: true, teamRole: true, member: true },
  counterSchedule: { event: true, team: true, teamRole: true, member: true },
  requestedByMember: true,
} as const;

/** Answered requests stay visible to whoever made them for this long. */
const RECENT_ANSWER_DAYS = 14;
/** How far ahead a colleague's schedule is offered for a day exchange. */
const EXCHANGE_HORIZON_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

const ACTIVE_STATUSES = [ScheduleStatus.SCHEDULED, ScheduleStatus.CONFIRMED];

/**
 * Members sorting their own roster, without a leader in the middle. Two shapes:
 *
 *   HAND-OVER   "cover this one for me": whoever takes it inherits the Schedule
 *               row — to a named colleague or to an open call to the team.
 *   EXCHANGE    "my Sunday for your Thursday": the requester offers one slot
 *               (`scheduleId`) and asks for a colleague's (`counterScheduleId`);
 *               on acceptance the two rows swap owners.
 *
 * Rules enforced here:
 *   - only one OPEN request per schedule, either as the offered or the asked-for
 *     side, otherwise two people could accept it;
 *   - whoever takes a slot over must belong to the team, cover the same position,
 *     be free that day (dated absences AND the standing weekday rule), not be
 *     serving anywhere else at that time, and not already be in that event;
 *   - an exchange is between the same team and the same position, on two
 *     different upcoming events, and both people must be able to take the
 *     other's date — checked when asked and again when accepted, because the
 *     roster may have moved in between;
 *   - accepting moves the rows and closes the request in one transaction, and
 *     drops previous confirmations — new holders have confirmed nothing yet.
 */
@Injectable()
export class ScheduleSwapsService implements IScheduleSwapsService {
  private readonly logger = new Logger(ScheduleSwapsService.name);

  constructor(
    @InjectRepository(ScheduleSwap)
    private readonly swapsRepository: Repository<ScheduleSwap>,
    @InjectRepository(Schedule)
    private readonly schedulesRepository: Repository<Schedule>,
    @InjectRepository(TeamMember)
    private readonly teamMembersRepository: Repository<TeamMember>,
    @InjectRepository(Member)
    private readonly membersRepository: Repository<Member>,
    @InjectRepository(Availability)
    private readonly availabilityRepository: Repository<Availability>,
    @InjectRepository(WeekdayAvailability)
    private readonly weekdayRepository: Repository<WeekdayAvailability>,
    private readonly dataSource: DataSource,
    private readonly pushService: PushNotificationService,
    private readonly leaderNotifications: LeaderNotificationsService,
  ) {}

  async request(
    churchId: string,
    createDto: CreateScheduleSwapDto,
    user: JwtUser,
  ): Promise<ScheduleSwapResponseDto> {
    const schedule = await this.findScheduleForChurch(createDto.scheduleId, churchId);
    this.assertSwappable(schedule, 'Esta escala');

    if (!this.isManager(user) && schedule.member?.userId !== user.id) {
      throw new InsufficientPermissionException(
        'Somente o membro escalado pode pedir a troca desta escala',
      );
    }

    await this.assertNoOpenSwap(schedule.id);

    let counter: Schedule | null = null;
    let targetMemberId = createDto.targetMemberId ?? null;

    if (createDto.counterScheduleId) {
      counter = await this.findScheduleForChurch(createDto.counterScheduleId, churchId);
      await this.assertNoOpenSwap(counter.id);
      await this.assertExchangeAllowed(schedule, counter);
      targetMemberId = counter.memberId;
    } else if (targetMemberId) {
      await this.assertCanTakeOver(schedule, targetMemberId);
    }

    const saved = await this.swapsRepository.save(
      this.swapsRepository.create({
        scheduleId: schedule.id,
        requestedByMemberId: schedule.memberId,
        targetMemberId,
        counterScheduleId: counter?.id ?? null,
        reason: createDto.reason ?? null,
        status: SwapStatus.OPEN,
      }),
    );

    await this.safely(() => this.announceRequest(saved, schedule, counter));

    return this.findOne(churchId, saved.id);
  }

  async findByChurch(
    churchId: string,
    filters: ListScheduleSwapsDto,
  ): Promise<ScheduleSwapResponseDto[]> {
    let query = this.swapsRepository
      .createQueryBuilder('swap')
      .innerJoinAndSelect('swap.schedule', 'schedule')
      .innerJoin('schedule.event', 'event')
      .where('event.churchId = :churchId', { churchId })
      .andWhere('swap.status = :status', { status: filters.status ?? SwapStatus.OPEN });

    if (filters.scheduleId) {
      query = query.andWhere('swap.scheduleId = :scheduleId', {
        scheduleId: filters.scheduleId,
      });
    }

    return toScheduleSwapResponseList(
      await query.orderBy('swap.createdAt', 'DESC').getMany(),
    );
  }

  async findMine(churchId: string, user: JwtUser): Promise<MySwapsDto> {
    const me = await this.membersRepository.findOne({ where: { userId: user.id, churchId } });
    if (!me) return { incoming: [], outgoing: [] };

    const now = new Date();
    const answeredSince = new Date(now.getTime() - RECENT_ANSWER_DAYS * DAY_MS);

    const outgoing = (
      await this.swapsRepository.find({
        where: [
          { requestedByMemberId: me.id, status: SwapStatus.OPEN },
          {
            requestedByMemberId: me.id,
            status: Not(SwapStatus.OPEN),
            respondedAt: MoreThan(answeredSince),
          },
        ],
        relations: SWAP_RELATIONS,
        order: { createdAt: 'DESC' },
      })
    ).filter((swap) => swap.status !== SwapStatus.OPEN || this.isUpcoming(swap.schedule));

    const directed = await this.swapsRepository.find({
      where: { targetMemberId: me.id, status: SwapStatus.OPEN },
      relations: SWAP_RELATIONS,
      order: { createdAt: 'DESC' },
    });

    const openCalls = await this.swapsRepository.find({
      where: {
        targetMemberId: IsNull(),
        status: SwapStatus.OPEN,
        requestedByMemberId: Not(me.id),
        schedule: { event: { churchId, active: true, eventDate: MoreThan(now) } },
      },
      relations: SWAP_RELATIONS,
      order: { createdAt: 'DESC' },
    });

    const eligibleCalls: ScheduleSwap[] = [];
    for (const call of openCalls) {
      if ((await this.takeOverProblem(call.schedule, me.id)) === null) eligibleCalls.push(call);
    }

    const incoming = [...directed.filter((swap) => this.isUpcoming(swap.schedule)), ...eligibleCalls];

    return {
      incoming: await this.withTargets(incoming),
      outgoing: await this.withTargets(outgoing),
    };
  }

  async findOne(churchId: string, swapId: string): Promise<ScheduleSwapResponseDto> {
    const [response] = await this.withTargets([await this.findSwapForChurch(swapId, churchId)]);
    return response;
  }

  async findExchangeCandidates(
    churchId: string,
    scheduleId: string,
    user: JwtUser,
  ): Promise<ScheduleResponseDto[]> {
    const mine = await this.findScheduleForChurch(scheduleId, churchId);
    this.assertOwnerOrManager(mine, user);

    if (!this.isUpcoming(mine) || !ACTIVE_STATUSES.includes(mine.status)) return [];

    const now = new Date();
    const horizon = new Date(now.getTime() + EXCHANGE_HORIZON_DAYS * DAY_MS);

    const candidates = await this.schedulesRepository.find({
      where: {
        teamId: mine.teamId,
        teamRoleId: mine.teamRoleId,
        status: In(ACTIVE_STATUSES),
        memberId: Not(mine.memberId),
        eventId: Not(mine.eventId),
        event: { churchId, active: true, eventDate: MoreThan(now) },
      },
      relations: { event: true, team: true, teamRole: true, member: true },
      order: { event: { eventDate: 'ASC' } },
    });

    const result: ScheduleResponseDto[] = [];
    for (const candidate of candidates) {
      if (candidate.event.eventDate > horizon) continue;
      if (await this.hasOpenSwap(candidate.id)) continue;

      const problem = await this.exchangeProblem(mine, candidate);
      if (problem === null) result.push(toScheduleResponse(candidate));
    }

    return result;
  }

  async findHandoverCandidates(
    churchId: string,
    scheduleId: string,
    user: JwtUser,
  ): Promise<SwapCandidateMemberDto[]> {
    const schedule = await this.findScheduleForChurch(scheduleId, churchId);
    this.assertOwnerOrManager(schedule, user);

    if (!this.isUpcoming(schedule)) return [];

    const teamMembers = await this.teamMembersRepository.find({
      where: { teamId: schedule.teamId },
      relations: { member: true, roles: true },
    });

    const result: SwapCandidateMemberDto[] = [];
    for (const teamMember of teamMembers) {
      if (!this.coversRole(teamMember, schedule.teamRoleId)) continue;
      if ((await this.takeOverProblem(schedule, teamMember.memberId)) !== null) continue;

      result.push({ memberId: teamMember.memberId, fullName: teamMember.member.fullName });
    }

    return result.sort((a, b) => a.fullName.localeCompare(b.fullName));
  }

  async accept(
    churchId: string,
    swapId: string,
    user: JwtUser,
  ): Promise<ScheduleSwapResponseDto> {
    const swap = await this.findSwapForChurch(swapId, churchId);
    this.assertOpen(swap);

    if (swap.counterSchedule) {
      return this.acceptExchange(swap, user);
    }

    const actingMemberId = await this.resolveActingMemberId(swap.schedule.teamId, user);

    if (!actingMemberId) {
      throw new InvalidSwapCandidateException(
        'Você não faz parte da equipe responsável por esta escala',
        { swapId },
      );
    }

    if (swap.targetMemberId && swap.targetMemberId !== actingMemberId) {
      throw new InvalidSwapCandidateException(
        'Este pedido de troca foi direcionado a outro membro',
        { swapId },
      );
    }

    return this.handOver(swap, actingMemberId, user.id);
  }

  async resolve(
    churchId: string,
    swapId: string,
    resolveDto: ResolveScheduleSwapDto,
    user: JwtUser,
  ): Promise<ScheduleSwapResponseDto> {
    this.assertIsManager(user, 'Apenas líderes e administradores podem resolver trocas');

    const swap = await this.findSwapForChurch(swapId, churchId);
    this.assertOpen(swap);

    if (swap.counterSchedule) {
      throw new InvalidSwapCandidateException(
        'Uma troca de dias só pode ser aceita pelo colega que a recebeu',
        { swapId },
      );
    }

    return this.handOver(swap, resolveDto.acceptedByMemberId, user.id);
  }

  async decline(
    churchId: string,
    swapId: string,
    user: JwtUser,
  ): Promise<ScheduleSwapResponseDto> {
    const swap = await this.findSwapForChurch(swapId, churchId);
    this.assertOpen(swap);

    if (!this.isManager(user)) {
      const actingMemberId = await this.resolveActingMemberId(swap.schedule.teamId, user);

      if (!actingMemberId || swap.targetMemberId !== actingMemberId) {
        throw new InsufficientPermissionException(
          'Somente o membro convidado ou um líder pode recusar este pedido',
        );
      }
    }

    const closed = await this.closeSwap(swap, SwapStatus.DECLINED);

    await this.safely(async () => {
      const decliner = await this.membersRepository.findOne({ where: { userId: user.id } });
      await this.notifyUser(swap.requestedByMember?.userId, swap, {
        type: NotificationType.SWAP_RESPONDED,
        title: 'Troca recusada',
        message: `${decliner?.fullName ?? 'Seu colega'} não pôde aceitar a troca de ${this.describe(swap.schedule)}.`,
      });
    });

    return toScheduleSwapResponse(closed);
  }

  async cancel(
    churchId: string,
    swapId: string,
    user: JwtUser,
  ): Promise<ScheduleSwapResponseDto> {
    const swap = await this.findSwapForChurch(swapId, churchId);
    this.assertOpen(swap);

    if (!this.isManager(user) && swap.requestedByMember?.userId !== user.id) {
      throw new InsufficientPermissionException(
        'Somente quem pediu a troca ou um líder pode cancelá-la',
      );
    }

    return toScheduleSwapResponse(await this.closeSwap(swap, SwapStatus.CANCELLED));
  }

  /** The colleague agrees to the day exchange: both rows change owner together. */
  private async acceptExchange(
    swap: ScheduleSwap,
    user: JwtUser,
  ): Promise<ScheduleSwapResponseDto> {
    const offered = swap.schedule;
    const asked = swap.counterSchedule as Schedule;

    if (asked.member?.userId !== user.id) {
      throw new InvalidSwapCandidateException(
        'Este pedido de troca foi direcionado a outro membro',
        { swapId: swap.id },
      );
    }

    // The roster may have moved since the request was made.
    const stale =
      offered.memberId !== swap.requestedByMemberId ||
      asked.memberId !== swap.targetMemberId ||
      !ACTIVE_STATUSES.includes(offered.status) ||
      !ACTIVE_STATUSES.includes(asked.status) ||
      !this.isUpcoming(offered) ||
      !this.isUpcoming(asked);

    if (stale) {
      await this.closeSwap(swap, SwapStatus.CANCELLED);
      throw new InvalidSwapCandidateException(
        'A escala mudou desde o pedido e a troca não vale mais',
        { swapId: swap.id },
      );
    }

    const problem = await this.exchangeProblem(offered, asked);
    if (problem !== null) {
      throw new InvalidSwapCandidateException(problem, { swapId: swap.id });
    }

    const respondedAt = new Date();

    // Column updates, not entity saves: the loaded graph still holds the old
    // members and would write them back over the new ids.
    await this.dataSource.transaction(async (manager) => {
      const reset = { status: ScheduleStatus.SCHEDULED, confirmedAt: null, confirmedById: null };

      await manager.update(Schedule, offered.id, { ...reset, memberId: asked.memberId });
      await manager.update(Schedule, asked.id, { ...reset, memberId: offered.memberId });
      await manager.update(ScheduleSwap, swap.id, {
        status: SwapStatus.ACCEPTED,
        acceptedByMemberId: asked.memberId,
        respondedAt,
      });
    });

    await this.safely(async () => {
      await this.notifyUser(swap.requestedByMember?.userId, swap, {
        type: NotificationType.SWAP_RESPONDED,
        title: 'Troca aceita!',
        message: `${asked.member.fullName} aceitou: você agora serve em ${this.describe(asked)} e ${asked.member.fullName} em ${this.describe(offered)}.`,
      });

      await this.leaderNotifications.notifyTeamLeaders(
        offered.event.churchId,
        offered.teamId,
        {
          type: NotificationType.SWAP_RESPONDED,
          title: 'Troca de dias entre membros',
          message: `${offered.member.fullName} ⇄ ${asked.member.fullName}: ${this.describe(offered)} por ${this.describe(asked)}.`,
          relatedSwapId: swap.id,
          relatedEventId: offered.eventId,
        },
        user.id,
      );
    });

    return this.findOne(offered.event.churchId, swap.id);
  }

  /** Moves the slot and closes the request atomically — never one without the other. */
  private async handOver(
    swap: ScheduleSwap,
    newMemberId: string,
    actorUserId: string,
  ): Promise<ScheduleSwapResponseDto> {
    await this.assertCanTakeOver(swap.schedule, newMemberId);

    const respondedAt = new Date();

    await this.dataSource.transaction(async (manager) => {
      await manager.update(Schedule, swap.scheduleId, {
        memberId: newMemberId,
        status: ScheduleStatus.SCHEDULED,
        confirmedAt: null,
        confirmedById: null,
      });

      await manager.update(ScheduleSwap, swap.id, {
        status: SwapStatus.ACCEPTED,
        acceptedByMemberId: newMemberId,
        respondedAt,
      });
    });

    await this.safely(async () => {
      const newcomer = await this.membersRepository.findOne({ where: { id: newMemberId } });

      await this.notifyUser(swap.requestedByMember?.userId, swap, {
        type: NotificationType.SWAP_RESPONDED,
        title: 'Troca aceita!',
        message: `${newcomer?.fullName ?? 'Seu colega'} vai cobrir ${this.describe(swap.schedule)}.`,
      });

      if (newcomer?.userId && newcomer.userId !== actorUserId) {
        await this.notifyUser(newcomer.userId, swap, {
          type: NotificationType.SWAP_RESPONDED,
        title: 'Você assumiu uma escala',
          message: `${swap.schedule.teamRole?.name ?? 'Escala'} — ${this.describe(swap.schedule)}.`,
        });
      }
    });

    return this.findOne(swap.schedule.event.churchId, swap.id);
  }

  private async closeSwap(swap: ScheduleSwap, status: SwapStatus): Promise<ScheduleSwap> {
    swap.status = status;
    swap.respondedAt = new Date();

    return this.swapsRepository.save(swap);
  }

  /** Both directions of an exchange: who may take whose date. Null means it works. */
  private async exchangeProblem(mine: Schedule, theirs: Schedule): Promise<string | null> {
    if (mine.eventId === theirs.eventId) return 'As duas escalas são do mesmo evento';
    if (mine.teamId !== theirs.teamId || mine.teamRoleId !== theirs.teamRoleId) {
      return 'A troca de dias só vale entre pessoas da mesma equipe e função';
    }
    if (mine.memberId === theirs.memberId) return 'As duas escalas são da mesma pessoa';
    if (!ACTIVE_STATUSES.includes(theirs.status)) return 'Essa escala não está mais ativa';
    if (!this.isUpcoming(theirs)) return 'Esse evento já aconteceu';

    const forThem = await this.takeOverProblem(mine, theirs.memberId, [theirs.id]);
    if (forThem !== null) return `${theirs.member?.fullName ?? 'O colega'}: ${forThem}`;

    const forMe = await this.takeOverProblem(theirs, mine.memberId, [mine.id]);
    if (forMe !== null) return `Você: ${forMe}`;

    return null;
  }

  private async assertExchangeAllowed(mine: Schedule, theirs: Schedule): Promise<void> {
    const problem = await this.exchangeProblem(mine, theirs);

    if (problem !== null) {
      throw new InvalidSwapCandidateException(problem, {
        scheduleId: mine.id,
        counterScheduleId: theirs.id,
      });
    }
  }

  private async assertCanTakeOver(schedule: Schedule, candidateMemberId: string): Promise<void> {
    const problem = await this.takeOverProblem(schedule, candidateMemberId);

    if (problem !== null) {
      throw new InvalidSwapCandidateException(problem, {
        scheduleId: schedule.id,
        memberId: candidateMemberId,
      });
    }
  }

  /**
   * Why `candidateMemberId` cannot take `schedule` over, or null when they can.
   * `ignoreScheduleIds` discounts slots the candidate is handing back in the
   * same operation (their half of an exchange).
   */
  private async takeOverProblem(
    schedule: Schedule,
    candidateMemberId: string,
    ignoreScheduleIds: string[] = [],
  ): Promise<string | null> {
    if (candidateMemberId === schedule.memberId) {
      return 'O membro já é o responsável por esta escala';
    }

    const teamMember = await this.teamMembersRepository.findOne({
      where: { teamId: schedule.teamId, memberId: candidateMemberId },
      relations: { roles: true, member: true },
    });

    const eventDate = schedule.event.eventDate;
    const eventDay = toDateOnlyString(eventDate);

    if (!teamMember || (teamMember.endedAt && toDateOnlyString(teamMember.endedAt) < eventDay)) {
      return 'O membro não faz parte da equipe desta escala';
    }

    if (teamMember.member && teamMember.member.status !== 'active') {
      return 'O membro está inativo';
    }

    if (!this.coversRole(teamMember, schedule.teamRoleId)) {
      return 'O membro não cobre a função desta escala';
    }

    const unavailable = await findUnavailableMemberIdsForDay(
      this.availabilityRepository,
      this.weekdayRepository,
      [candidateMemberId],
      eventDay,
    );

    if (unavailable.has(candidateMemberId)) {
      return 'O membro está indisponível nesta data';
    }

    // Any status counts: the unique (event, team, member) index also rejects a
    // row that was cancelled before.
    const alreadyInEvent = await this.schedulesRepository.findOne({
      where: { eventId: schedule.eventId, memberId: candidateMemberId },
    });

    if (alreadyInEvent) {
      return 'O membro já está escalado neste evento';
    }

    const busy = await findMemberIdsBusyDuring(
      this.schedulesRepository,
      [candidateMemberId],
      schedule.event,
      ignoreScheduleIds,
    );

    if (busy.has(candidateMemberId)) {
      return 'O membro já serve em outro evento no mesmo horário';
    }

    return null;
  }

  private async announceRequest(
    swap: ScheduleSwap,
    schedule: Schedule,
    counter: Schedule | null,
  ): Promise<void> {
    const requester = schedule.member.fullName;

    if (counter) {
      await this.notifyUser(counter.member.userId, swap, {
        type: NotificationType.SWAP_REQUESTED,
        title: 'Pedido de troca de dias',
        message: `${requester} quer trocar com você: ele(a) fica com ${this.describe(counter)} e você com ${this.describe(schedule)}. Abra para responder.`,
      });
      return;
    }

    const message = `${requester} precisa de alguém para cobrir ${schedule.teamRole?.name ?? 'a escala'} — ${this.describe(schedule)}.`;

    if (swap.targetMemberId) {
      const target = await this.membersRepository.findOne({ where: { id: swap.targetMemberId } });
      await this.notifyUser(target?.userId, swap, {
        type: NotificationType.SWAP_REQUESTED,
        title: 'Pedido de cobertura',
        message,
      });
      return;
    }

    // Open call: everyone who could actually take it hears about it.
    const teamMembers = await this.teamMembersRepository.find({
      where: { teamId: schedule.teamId },
      relations: { member: true, roles: true },
    });

    for (const teamMember of teamMembers) {
      if (teamMember.memberId === schedule.memberId) continue;
      if (!this.coversRole(teamMember, schedule.teamRoleId)) continue;
      if ((await this.takeOverProblem(schedule, teamMember.memberId)) !== null) continue;

      await this.notifyUser(teamMember.member.userId, swap, {
        type: NotificationType.SWAP_REQUESTED,
        title: 'Procura-se alguém para cobrir',
        message,
      });
    }
  }

  private notifyUser(
    userId: string | null | undefined,
    swap: ScheduleSwap,
    content: { type: NotificationType; title: string; message: string },
  ): Promise<void> {
    if (!userId) return Promise.resolve();

    return this.pushService.send({
      userId,
      title: content.title,
      message: content.message,
      type: content.type,
      relatedSwapId: swap.id,
      relatedEventId: swap.schedule?.eventId,
    });
  }

  private describe(schedule: Schedule): string {
    return `${schedule.event.name} (${formatEventWhen(schedule.event.eventDate)})`;
  }

  /** A notification that fails must never undo the swap behind it. */
  private async safely(action: () => Promise<unknown>): Promise<void> {
    try {
      await action();
    } catch (error) {
      this.logger.warn(
        `Falha ao notificar troca: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /** Attaches the person a directed request was addressed to. */
  private async withTargets(swaps: ScheduleSwap[]): Promise<ScheduleSwapResponseDto[]> {
    const handOverTargets = swaps
      .filter((swap) => swap.targetMemberId && !swap.counterSchedule)
      .map((swap) => swap.targetMemberId as string);

    const members = handOverTargets.length
      ? await this.membersRepository.find({ where: { id: In([...new Set(handOverTargets)]) } })
      : [];
    const byId = new Map(members.map((member) => [member.id, member]));

    return swaps.map((swap) => {
      const dto = toScheduleSwapResponse(swap);

      dto.targetMember = swap.counterSchedule
        ? dto.counterSchedule?.member
        : toOptionalMemberResponse(byId.get(swap.targetMemberId ?? ''));

      return dto;
    });
  }

  private coversRole(teamMember: TeamMember, teamRoleId: string): boolean {
    return (teamMember.roles ?? []).some((assignment) => assignment.teamRoleId === teamRoleId);
  }

  private isUpcoming(schedule: Schedule): boolean {
    return schedule.event.eventDate.getTime() > Date.now();
  }

  private assertSwappable(schedule: Schedule, subject: string): void {
    if (!ACTIVE_STATUSES.includes(schedule.status)) {
      throw new InvalidSwapCandidateException(`${subject} não está ativa e não pode ser trocada`, {
        scheduleId: schedule.id,
      });
    }

    if (!this.isUpcoming(schedule)) {
      throw new InvalidSwapCandidateException('Esse evento já aconteceu', {
        scheduleId: schedule.id,
      });
    }
  }

  private async hasOpenSwap(scheduleId: string): Promise<boolean> {
    return (
      (await this.swapsRepository.count({
        where: [
          { scheduleId, status: SwapStatus.OPEN },
          { counterScheduleId: scheduleId, status: SwapStatus.OPEN },
        ],
      })) > 0
    );
  }

  private async assertNoOpenSwap(scheduleId: string): Promise<void> {
    const open = await this.swapsRepository.findOne({
      where: [
        { scheduleId, status: SwapStatus.OPEN },
        { counterScheduleId: scheduleId, status: SwapStatus.OPEN },
      ],
    });

    if (open) {
      throw new SwapAlreadyOpenException(scheduleId, open.id);
    }
  }

  /** Maps the logged-in user onto their Member record inside the schedule's team. */
  private async resolveActingMemberId(teamId: string, user: JwtUser): Promise<string | null> {
    const teamMember = await this.teamMembersRepository.findOne({
      where: { teamId, member: { userId: user.id } },
      relations: { member: true },
    });

    return teamMember?.memberId ?? null;
  }

  private async findScheduleForChurch(scheduleId: string, churchId: string): Promise<Schedule> {
    const schedule = await this.schedulesRepository.findOne({
      where: { id: scheduleId, event: { churchId } },
      relations: { event: true, member: true, team: true, teamRole: true },
    });

    if (!schedule) {
      throw new ResourceNotFoundException(ResourceType.SCHEDULE, scheduleId);
    }

    return schedule;
  }

  private async findSwapForChurch(swapId: string, churchId: string): Promise<ScheduleSwap> {
    const swap = await this.swapsRepository.findOne({
      where: { id: swapId, schedule: { event: { churchId } } },
      relations: SWAP_RELATIONS,
    });

    if (!swap) {
      throw new ResourceNotFoundException(ResourceType.SCHEDULE_SWAP, swapId);
    }

    return swap;
  }

  private assertOwnerOrManager(schedule: Schedule, user: JwtUser): void {
    if (!this.isManager(user) && schedule.member?.userId !== user.id) {
      throw new InsufficientPermissionException(
        'Somente o membro escalado pode ver as opções de troca desta escala',
      );
    }
  }

  private assertOpen(swap: ScheduleSwap): void {
    if (swap.status !== SwapStatus.OPEN) {
      throw new SwapNotOpenException(swap.id, swap.status);
    }
  }

  private isManager(user: JwtUser): boolean {
    return SCHEDULE_MANAGER_ROLES.includes(user.role);
  }

  private assertIsManager(user: JwtUser, message: string): void {
    if (!this.isManager(user)) {
      throw new InsufficientPermissionException(message);
    }
  }
}
