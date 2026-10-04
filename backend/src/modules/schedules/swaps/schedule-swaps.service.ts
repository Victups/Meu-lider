import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ResourceType, SCHEDULE_MANAGER_ROLES } from '../../../common/constants';
import {
  InsufficientPermissionException,
  InvalidSwapCandidateException,
  MemberUnavailableException,
  ResourceNotFoundException,
  SwapAlreadyOpenException,
  SwapNotOpenException,
} from '../../../common/exceptions';
import type { JwtUser } from '../../../common/interfaces';
import { toDateOnlyString } from '../../../common/utils';
import { Availability } from '../../availability/entities/availability.entity';
import {
  findAvailabilityWindowsForDay,
  isAvailableForWindows,
} from '../../availability/utils';
import { TeamMember } from '../../teams/entities/team-member.entity';
import { ScheduleSwap, SwapStatus } from '../entities/schedule-swap.entity';
import { Schedule, ScheduleStatus } from '../entities/schedule.entity';
import { CreateScheduleSwapDto } from './dtos/create-schedule-swap.dto';
import { ListScheduleSwapsDto } from './dtos/list-schedule-swaps.dto';
import { ResolveScheduleSwapDto } from './dtos/resolve-schedule-swap.dto';
import { ScheduleSwapResponseDto } from './dtos/schedule-swap-response.dto';
import type { IScheduleSwapsService } from './interfaces';
import { toScheduleSwapResponse, toScheduleSwapResponseList } from './mappers';

/**
 * Hand-over of a slot when life happens. The member who is scheduled asks to be
 * replaced — naming someone (`targetMemberId`) or opening the call to the whole
 * team — and whoever takes it inherits the Schedule row rather than creating a
 * second one, so the event never ends up with two people in one position.
 *
 * Rules enforced here:
 *   - only one OPEN request per schedule, otherwise two people could accept it;
 *   - whoever takes over must belong to the team, cover the same TeamRole, be
 *     available on the event date and not already be booked for that event;
 *   - accepting moves the Schedule to the new member in the same transaction
 *     that closes the request, and drops the previous confirmation — the new
 *     person has not confirmed anything yet;
 *   - a leader or admin can resolve a request directly onto a chosen member.
 */
@Injectable()
export class ScheduleSwapsService implements IScheduleSwapsService {
  constructor(
    @InjectRepository(ScheduleSwap)
    private readonly swapsRepository: Repository<ScheduleSwap>,
    @InjectRepository(Schedule)
    private readonly schedulesRepository: Repository<Schedule>,
    @InjectRepository(TeamMember)
    private readonly teamMembersRepository: Repository<TeamMember>,
    @InjectRepository(Availability)
    private readonly availabilityRepository: Repository<Availability>,
    private readonly dataSource: DataSource,
  ) {}

  async request(
    churchId: string,
    createDto: CreateScheduleSwapDto,
    user: JwtUser,
  ): Promise<ScheduleSwapResponseDto> {
    const schedule = await this.findScheduleForChurch(createDto.scheduleId, churchId);

    if (schedule.status === ScheduleStatus.CANCELLED) {
      throw new InvalidSwapCandidateException(
        'Esta escala está cancelada e não precisa de troca',
        { scheduleId: schedule.id },
      );
    }

    if (!this.isManager(user) && schedule.member?.userId !== user.id) {
      throw new InsufficientPermissionException(
        'Somente o membro escalado pode pedir a troca desta escala',
      );
    }

    const openSwap = await this.swapsRepository.findOne({
      where: { scheduleId: schedule.id, status: SwapStatus.OPEN },
    });

    if (openSwap) {
      throw new SwapAlreadyOpenException(schedule.id, openSwap.id);
    }

    // Fail now rather than letting the leader name someone who could never take it.
    if (createDto.targetMemberId) {
      await this.assertCanTakeOver(schedule, createDto.targetMemberId);
    }

    const swap = this.swapsRepository.create({
      scheduleId: schedule.id,
      requestedByMemberId: schedule.memberId,
      targetMemberId: createDto.targetMemberId ?? null,
      reason: createDto.reason ?? null,
      status: SwapStatus.OPEN,
    });

    return toScheduleSwapResponse(await this.swapsRepository.save(swap));
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

  async findOne(churchId: string, swapId: string): Promise<ScheduleSwapResponseDto> {
    return toScheduleSwapResponse(await this.findSwapForChurch(swapId, churchId));
  }

  async accept(
    churchId: string,
    swapId: string,
    user: JwtUser,
  ): Promise<ScheduleSwapResponseDto> {
    const swap = await this.findSwapForChurch(swapId, churchId);
    this.assertOpen(swap);

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

    return this.handOver(swap, actingMemberId);
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

    return this.handOver(swap, resolveDto.acceptedByMemberId);
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

    return toScheduleSwapResponse(await this.closeSwap(swap, SwapStatus.DECLINED));
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

  /** Moves the slot and closes the request atomically — never one without the other. */
  private async handOver(
    swap: ScheduleSwap,
    newMemberId: string,
  ): Promise<ScheduleSwapResponseDto> {
    await this.assertCanTakeOver(swap.schedule, newMemberId);

    const respondedAt = new Date();

    // Column updates rather than entity saves: `swap.schedule.member` still
    // holds the previous member, and saving the entity graph could write that
    // stale relation back over the new memberId.
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

    swap.schedule.memberId = newMemberId;
    swap.schedule.status = ScheduleStatus.SCHEDULED;
    swap.schedule.confirmedAt = null;
    swap.schedule.confirmedById = null;
    swap.status = SwapStatus.ACCEPTED;
    swap.acceptedByMemberId = newMemberId;
    swap.respondedAt = respondedAt;

    return toScheduleSwapResponse(swap);
  }

  private async closeSwap(swap: ScheduleSwap, status: SwapStatus): Promise<ScheduleSwap> {
    swap.status = status;
    swap.respondedAt = new Date();

    return this.swapsRepository.save(swap);
  }

  /** Every hard rule the new owner of the slot has to clear. */
  private async assertCanTakeOver(schedule: Schedule, candidateMemberId: string): Promise<void> {
    const details = { scheduleId: schedule.id, memberId: candidateMemberId };

    if (candidateMemberId === schedule.memberId) {
      throw new InvalidSwapCandidateException(
        'O membro já é o responsável por esta escala',
        details,
      );
    }

    const teamMember = await this.teamMembersRepository.findOne({
      where: { teamId: schedule.teamId, memberId: candidateMemberId },
      relations: { roles: true },
    });

    const eventDate = schedule.event.eventDate;
    const eventDay = toDateOnlyString(eventDate);

    if (!teamMember || (teamMember.endedAt && toDateOnlyString(teamMember.endedAt) < eventDay)) {
      throw new InvalidSwapCandidateException(
        'O membro não faz parte da equipe desta escala',
        details,
      );
    }

    const coversRole = (teamMember.roles ?? []).some(
      (assignment) => assignment.teamRoleId === schedule.teamRoleId,
    );

    if (!coversRole) {
      throw new InvalidSwapCandidateException(
        'O membro não cobre a função desta escala',
        details,
      );
    }

    const windows = await findAvailabilityWindowsForDay(
      this.availabilityRepository,
      [candidateMemberId],
      eventDay,
    );

    if (!isAvailableForWindows(windows)) {
      throw new MemberUnavailableException(candidateMemberId, eventDate);
    }

    const alreadyScheduled = await this.schedulesRepository.findOne({
      where: { eventId: schedule.eventId, memberId: candidateMemberId },
    });

    if (alreadyScheduled) {
      throw new InvalidSwapCandidateException(
        'O membro já está escalado neste evento',
        details,
      );
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
      relations: { event: true, member: true },
    });

    if (!schedule) {
      throw new ResourceNotFoundException(ResourceType.SCHEDULE, scheduleId);
    }

    return schedule;
  }

  private async findSwapForChurch(swapId: string, churchId: string): Promise<ScheduleSwap> {
    const swap = await this.swapsRepository.findOne({
      where: { id: swapId, schedule: { event: { churchId } } },
      relations: {
        schedule: { event: true, member: true },
        requestedByMember: true,
      },
    });

    if (!swap) {
      throw new ResourceNotFoundException(ResourceType.SCHEDULE_SWAP, swapId);
    }

    return swap;
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
