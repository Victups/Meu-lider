import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResourceType } from '../../common/constants';
import {
  DuplicateScheduleException,
  EventNotStartedException,
  InsufficientPermissionException,
  InvalidScheduleTransitionException,
  ResourceNotFoundException,
  TeamRoleNotInTeamException,
} from '../../common/exceptions';
import type { JwtUser } from '../../common/interfaces';
import { formatEventWhen } from '../../common/utils';
import { LeaderNotificationsService } from '../notifications/leader-notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { PushNotificationService } from '../notifications/push-notification.service';
import { TeamRole } from '../teams/entities/team-role.entity';
import { CreateScheduleDto } from './dtos/create-schedule.dto';
import { ScheduleResponseDto } from './dtos/schedule-response.dto';
import { UpdateScheduleDto } from './dtos/update-schedule.dto';
import { Member } from '../members/entities/member.entity';
import { TeamAccessService } from '../teams/team-access.service';
import { AutoScheduleService } from './auto-schedule/auto-schedule.service';
import { Schedule, ScheduleStatus } from './entities/schedule.entity';
import type { ScheduleStatistics } from './interfaces/schedule-statistics.interface';
import type { ISchedulesService } from './interfaces/schedules-service.interface';
import { toScheduleResponse, toScheduleResponseList } from './mappers/schedule-detail.mapper';
import { toScheduleSummary } from './mappers/schedule.mapper';

@Injectable()
export class SchedulesService implements ISchedulesService {
  private readonly logger = new Logger(SchedulesService.name);

  constructor(
    @InjectRepository(Schedule)
    private readonly schedulesRepository: Repository<Schedule>,
    @InjectRepository(TeamRole)
    private readonly teamRolesRepository: Repository<TeamRole>,
    private readonly autoScheduleService: AutoScheduleService,
    private readonly teamAccessService: TeamAccessService,
    @InjectRepository(Member)
    private readonly membersRepository: Repository<Member>,
    private readonly pushService: PushNotificationService,
    private readonly leaderNotifications: LeaderNotificationsService,
  ) {}

  async create(
    createScheduleDto: CreateScheduleDto,
    user: JwtUser,
  ): Promise<ScheduleResponseDto> {
    await this.teamAccessService.assertCanManageTeam(createScheduleDto.teamId, user);
    const { eventId, teamId, memberId, teamRoleId } = createScheduleDto;

    await this.assertTeamRoleBelongsToTeam(teamRoleId, teamId);

    const existingSchedule = await this.schedulesRepository.findOne({
      where: { eventId, teamId, memberId },
    });

    if (existingSchedule) {
      throw new DuplicateScheduleException(eventId, teamId, memberId);
    }

    const schedule = this.schedulesRepository.create(createScheduleDto);
    const saved = await this.schedulesRepository.save(schedule);

    await this.safely(async () => {
      const full = await this.findScheduleEntity(saved.id);
      await this.notifyMember(full, {
        type: NotificationType.SCHEDULE_ASSIGNED,
        title: 'Você foi escalado(a)!',
        message: `${full.teamRole?.name ?? 'Escala'} — ${full.event.name}, ${formatEventWhen(full.event.eventDate)}.`,
      });
    });

    return toScheduleSummary(saved);
  }

  async findOne(id: string): Promise<ScheduleResponseDto> {
    return toScheduleResponse(await this.findScheduleEntity(id));
  }

  async findByEvent(eventId: string): Promise<ScheduleResponseDto[]> {
    const schedules = await this.schedulesRepository.find({
      where: { eventId },
      relations: { member: { user: true }, team: true, teamRole: true },
    });

    return toScheduleResponseList(schedules);
  }

  async findByMember(memberId: string): Promise<ScheduleResponseDto[]> {
    const schedules = await this.schedulesRepository.find({
      where: { memberId },
      relations: { event: true, team: true, teamRole: true },
      order: { event: { eventDate: 'ASC' } },
    });

    return toScheduleResponseList(schedules);
  }

  /**
   * Member asking out. The slot is NOT freed here: it stays on the roster,
   * flagged, until a leader rules — so nobody vanishes from a Sunday without
   * the leadership seeing it.
   */
  async requestRelease(
    id: string,
    reason: string,
    user: JwtUser,
  ): Promise<ScheduleResponseDto> {
    const schedule = await this.findScheduleEntity(id);
    await this.assertIsOwnSchedule(schedule, user);

    if (schedule.status === ScheduleStatus.CANCELLED) {
      throw new InvalidScheduleTransitionException('Esta escala já foi cancelada');
    }

    schedule.status = ScheduleStatus.RELEASE_REQUESTED;
    schedule.releaseReason = reason;
    schedule.releaseRequestedAt = new Date();

    const saved = await this.schedulesRepository.save(schedule);

    await this.safely(() =>
      this.leaderNotifications.notifyTeamLeaders(
        schedule.event.churchId,
        schedule.teamId,
        {
          type: NotificationType.RELEASE_REQUESTED,
          title: 'Pedido para sair da escala',
          message: `${schedule.member.fullName} pediu para sair de ${schedule.event.name} (${formatEventWhen(schedule.event.eventDate)}): “${reason}”.`,
          relatedScheduleId: schedule.id,
          relatedEventId: schedule.eventId,
        },
        user.id,
      ),
    );

    return toScheduleResponse(saved);
  }

  /** Leader agrees the member is out: the slot opens and the engine refills. */
  async approveRelease(id: string, user: JwtUser): Promise<ScheduleResponseDto> {
    const schedule = await this.findScheduleEntity(id);
    await this.teamAccessService.assertCanManageTeam(schedule.teamId, user);

    return this.releaseAndRefill(schedule, 'approved');
  }

  /** Leader turns the request down; the member stays on the roster. */
  async rejectRelease(id: string, user: JwtUser): Promise<ScheduleResponseDto> {
    const schedule = await this.findScheduleEntity(id);
    await this.teamAccessService.assertCanManageTeam(schedule.teamId, user);

    if (schedule.status !== ScheduleStatus.RELEASE_REQUESTED) {
      throw new InvalidScheduleTransitionException('Não há pedido de saída nesta escala');
    }

    schedule.status = ScheduleStatus.SCHEDULED;
    schedule.releaseReason = null;
    schedule.releaseRequestedAt = null;

    const saved = await this.schedulesRepository.save(schedule);

    await this.safely(() =>
      this.notifyMember(schedule, {
        type: NotificationType.SCHEDULE_CHANGED,
        title: 'Pedido de saída recusado',
        message: `Você segue escalado(a) em ${schedule.event.name} (${formatEventWhen(schedule.event.eventDate)}).`,
      }),
    );

    return toScheduleResponse(saved);
  }

  /** Leader pulling someone out directly — they warned by phone, say. */
  async releaseByLeader(
    id: string,
    reason: string | undefined,
    user: JwtUser,
  ): Promise<ScheduleResponseDto> {
    const schedule = await this.findScheduleEntity(id);
    await this.teamAccessService.assertCanManageTeam(schedule.teamId, user);

    if (reason) {
      schedule.releaseReason = reason;
    }

    return this.releaseAndRefill(schedule, 'by-leader');
  }

  async markNoShow(id: string, user: JwtUser): Promise<ScheduleResponseDto> {
    const schedule = await this.findScheduleEntity(id);
    await this.teamAccessService.assertCanManageTeam(schedule.teamId, user);
    this.assertEventStarted(schedule);

    const attending =
      schedule.status === ScheduleStatus.SCHEDULED || schedule.status === ScheduleStatus.CONFIRMED;
    if (!attending) {
      throw new InvalidScheduleTransitionException(
        'Só quem estava escalado pode ser marcado como ausente',
      );
    }

    schedule.status = ScheduleStatus.NO_SHOW;
    return toScheduleResponse(await this.schedulesRepository.save(schedule));
  }

  async markAttended(id: string, user: JwtUser): Promise<ScheduleResponseDto> {
    const schedule = await this.findScheduleEntity(id);
    await this.teamAccessService.assertCanManageTeam(schedule.teamId, user);

    if (schedule.status !== ScheduleStatus.NO_SHOW) {
      throw new InvalidScheduleTransitionException('Esta escala não está marcada como falta');
    }

    schedule.status = ScheduleStatus.SCHEDULED;
    return toScheduleResponse(await this.schedulesRepository.save(schedule));
  }

  private async releaseAndRefill(
    schedule: Schedule,
    origin: 'approved' | 'by-leader',
  ): Promise<ScheduleResponseDto> {
    schedule.status = ScheduleStatus.CANCELLED;
    const saved = await this.schedulesRepository.save(schedule);

    await this.safely(() =>
      this.notifyMember(schedule, {
        type: NotificationType.SCHEDULE_CANCELLED,
        title: origin === 'approved' ? 'Pedido de saída aprovado' : 'Você saiu da escala',
        message: `${schedule.event.name} (${formatEventWhen(schedule.event.eventDate)}) não conta mais na sua escala.`,
      }),
    );

    try {
      await this.autoScheduleService.refillEvent(saved.eventId, saved.teamRoleId);
    } catch (error) {
      this.logger.warn(
        `Não foi possível repor a vaga do evento ${saved.eventId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    return toScheduleResponse(await this.findScheduleEntity(saved.id));
  }

  private async assertIsOwnSchedule(schedule: Schedule, user: JwtUser): Promise<void> {
    const member = await this.membersRepository.findOne({
      where: { id: schedule.memberId },
    });

    if (member?.userId !== user.id) {
      throw new InsufficientPermissionException(
        'Você só pode pedir saída das suas próprias escalas',
      );
    }
  }

  async update(
    id: string,
    updateData: UpdateScheduleDto,
    user: JwtUser,
  ): Promise<ScheduleResponseDto> {
    const schedule = await this.findScheduleEntity(id);
    await this.teamAccessService.assertCanManageTeam(schedule.teamId, user);

    // Moving a schedule to another team needs rights on the destination too.
    if (updateData.teamId && updateData.teamId !== schedule.teamId) {
      await this.teamAccessService.assertCanManageTeam(updateData.teamId, user);
    }

    // Either side of the pair can move, so the check runs on the resulting pair.
    if (updateData.teamRoleId !== undefined || updateData.teamId !== undefined) {
      await this.assertTeamRoleBelongsToTeam(
        updateData.teamRoleId ?? schedule.teamRoleId,
        updateData.teamId ?? schedule.teamId,
      );
    }

    Object.assign(schedule, updateData);
    // Any change to the assignment invalidates a previous confirmation.
    schedule.confirmedAt = null;
    schedule.confirmedById = null;
    schedule.status = ScheduleStatus.SCHEDULED;

    return toScheduleResponse(await this.schedulesRepository.save(schedule));
  }

  async remove(id: string, user: JwtUser): Promise<void> {
    const schedule = await this.findScheduleEntity(id);
    await this.teamAccessService.assertCanManageTeam(schedule.teamId, user);

    await this.schedulesRepository.delete(schedule.id);

    await this.safely(() =>
      this.notifyMember(schedule, {
        type: NotificationType.SCHEDULE_CANCELLED,
        title: 'Você saiu da escala',
        message: `${schedule.event.name} (${formatEventWhen(schedule.event.eventDate)}) não conta mais na sua escala.`,
      }),
    );
  }

  async getStatistics(eventId: string): Promise<ScheduleStatistics> {
    const schedules = await this.schedulesRepository.find({ where: { eventId } });

    return {
      total: schedules.length,
      confirmed: this.countByStatus(schedules, ScheduleStatus.CONFIRMED),
      pending: this.countByStatus(schedules, ScheduleStatus.SCHEDULED),
      cancelled: this.countByStatus(schedules, ScheduleStatus.CANCELLED),
      noShow: this.countByStatus(schedules, ScheduleStatus.NO_SHOW),
    };
  }

  /** Nothing else stops a Louvor assignment from picking the Mídia "Fotógrafo". */
  private async assertTeamRoleBelongsToTeam(teamRoleId: string, teamId: string): Promise<void> {
    const teamRole = await this.teamRolesRepository.findOne({ where: { id: teamRoleId } });

    if (!teamRole) {
      throw new ResourceNotFoundException(ResourceType.TEAM_ROLE, teamRoleId);
    }

    if (teamRole.teamId !== teamId) {
      throw new TeamRoleNotInTeamException(teamRoleId, teamId);
    }
  }

  private assertEventStarted(schedule: Schedule): void {
    if (schedule.event.eventDate.getTime() > Date.now()) {
      throw new EventNotStartedException();
    }
  }

  private countByStatus(schedules: Schedule[], status: ScheduleStatus): number {
    return schedules.filter((schedule) => schedule.status === status).length;
  }

  private notifyMember(
    schedule: Schedule,
    content: { type: NotificationType; title: string; message: string },
  ): Promise<void> {
    const userId = schedule.member?.userId;
    if (!userId) return Promise.resolve();

    return this.pushService.send({
      userId,
      ...content,
      relatedScheduleId: content.type === NotificationType.SCHEDULE_CANCELLED ? undefined : schedule.id,
      relatedEventId: schedule.eventId,
    });
  }

  /** A notification that fails must never undo or fail the action behind it. */
  private async safely(action: () => Promise<unknown>): Promise<void> {
    try {
      await action();
    } catch (error) {
      this.logger.warn(
        `Falha ao notificar: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async findScheduleEntity(id: string): Promise<Schedule> {
    const schedule = await this.schedulesRepository.findOne({
      where: { id },
      relations: { event: true, team: true, teamRole: true, member: true, confirmedBy: true },
    });

    if (!schedule) {
      throw new ResourceNotFoundException(ResourceType.SCHEDULE, id);
    }

    return schedule;
  }
}
