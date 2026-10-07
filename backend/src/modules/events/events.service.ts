import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThanOrEqual, Repository } from 'typeorm';
import { CHURCH_MANAGER_ROLES, ResourceType } from '../../common/constants';
import {
  ChurchAccessDeniedException,
  InsufficientPermissionException,
  InvalidScheduleTransitionException,
  ResourceNotFoundException,
} from '../../common/exceptions';
import type { JwtUser } from '../../common/interfaces';
import { formatEventWhen } from '../../common/utils';
import { NotificationType } from '../notifications/entities/notification.entity';
import { LeaderNotificationsService } from '../notifications/leader-notifications.service';
import { PushNotificationService } from '../notifications/push-notification.service';
import { AutoScheduleService } from '../schedules/auto-schedule/auto-schedule.service';
import { Schedule } from '../schedules/entities/schedule.entity';
import { Team } from '../teams/entities/team.entity';
import { TeamAccessService } from '../teams/team-access.service';
import { CreateEventDto } from './dtos/create-event.dto';
import { EventResponseDto } from './dtos/event-response.dto';
import { UpdateEventDto } from './dtos/update-event.dto';
import { Event } from './entities/event.entity';
import { EventTeam } from './entities/event-team.entity';
import type { IEventsService } from './interfaces/events-service.interface';
import { toEventResponse, toEventResponseList } from './mappers/event.mapper';

@Injectable()
export class EventsService implements IEventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    @InjectRepository(Event)
    private readonly eventsRepository: Repository<Event>,
    @InjectRepository(EventTeam)
    private readonly eventTeamsRepository: Repository<EventTeam>,
    @InjectRepository(Team)
    private readonly teamsRepository: Repository<Team>,
    @InjectRepository(Schedule)
    private readonly schedulesRepository: Repository<Schedule>,
    private readonly autoScheduleService: AutoScheduleService,
    private readonly teamAccessService: TeamAccessService,
    private readonly leaderNotifications: LeaderNotificationsService,
    private readonly pushService: PushNotificationService,
  ) {}

  /** Replaces the event's team list wholesale; undefined leaves it untouched. */
  private async syncTeams(eventId: string, teamIds?: string[]): Promise<void> {
    if (!teamIds) return;

    await this.eventTeamsRepository.delete({ eventId });
    if (teamIds.length === 0) return;

    await this.eventTeamsRepository.save(
      teamIds.map((teamId) => this.eventTeamsRepository.create({ eventId, teamId })),
    );
  }

  /**
   * Editing the team list is the one place a leader could reach into someone
   * else's roster, so every team added or dropped must be one they lead.
   */
  private async assertCanChangeTeams(
    user: JwtUser,
    current: string[],
    requested: string[],
  ): Promise<void> {
    if (CHURCH_MANAGER_ROLES.includes(user.role)) return;

    const changed = [
      ...requested.filter((id) => !current.includes(id)),
      ...current.filter((id) => !requested.includes(id)),
    ];

    for (const teamId of changed) {
      if (!(await this.teamAccessService.canManageTeam(teamId, user))) {
        throw new InsufficientPermissionException(
          'Você só pode vincular ou desvincular as equipes que lidera',
        );
      }
    }
  }

  async create(createEventDto: CreateEventDto, user: JwtUser): Promise<EventResponseDto> {
    const { teamIds, ...eventData } = createEventDto;

    await this.assertCanChangeTeams(user, [], teamIds ?? []);

    const event = this.eventsRepository.create({ ...eventData, createdById: user.id });
    const saved = await this.eventsRepository.save(event);
    await this.syncTeams(saved.id, teamIds);

    await this.staffAutomatically(saved.id);
    await this.announce(saved, teamIds ?? [], user.id);

    return toEventResponse(await this.findEventEntity(saved.id));
  }

  /**
   * The leader registers the event and the roster builds itself — that is the
   * whole point of the engine. A failure here must not fail event creation:
   * the event is still valid and can be staffed from its own screen.
   */
  private async staffAutomatically(eventId: string): Promise<void> {
    try {
      await this.autoScheduleService.refillEvent(eventId);
    } catch (error) {
      this.logger.warn(
        `Não foi possível montar a escala do evento ${eventId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * A new event needs a team. Without one, every leader hears about it and links
   * their own; with teams already attached, only those leaders are told.
   */
  private async announce(event: Event, teamIds: string[], creatorUserId: string): Promise<void> {
    try {
      await this.leaderNotifications.notifyNewEvents({
        churchId: event.churchId,
        events: [event],
        teamIds: teamIds.length > 0 ? teamIds : undefined,
        excludeUserId: creatorUserId,
      });
    } catch (error) {
      this.logger.warn(
        `Não foi possível avisar os líderes do evento ${event.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async findOne(id: string): Promise<EventResponseDto> {
    return toEventResponse(await this.findEventEntity(id));
  }

  async findByChurch(
    churchId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<EventResponseDto[]> {
    let query = this.eventsRepository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.teams', 'eventTeam')
      .leftJoinAndSelect('eventTeam.team', 'team')
      .where('event.churchId = :churchId', { churchId })
      .andWhere('event.active = :active', { active: true });

    if (startDate) {
      query = query.andWhere('event.eventDate >= :startDate', { startDate });
    }

    if (endDate) {
      query = query.andWhere('event.eventDate <= :endDate', { endDate });
    }

    const events = await query.orderBy('event.eventDate', 'ASC').getMany();
    return toEventResponseList(events);
  }

  async update(id: string, updateData: UpdateEventDto, user: JwtUser): Promise<EventResponseDto> {
    const { teamIds, ...eventData } = updateData;
    const event = await this.findEventEntity(id);

    if (teamIds) {
      await this.assertCanChangeTeams(
        user,
        (event.teams ?? []).map((link) => link.teamId),
        teamIds,
      );
    }

    Object.assign(event, eventData);
    await this.eventsRepository.save(event);
    await this.syncTeams(id, teamIds);

    // New teams or a new date open slots the engine should fill right away.
    await this.staffAutomatically(id);

    return toEventResponse(await this.findEventEntity(id));
  }

  /**
   * A leader attaching their team to an event, and the roster for that team
   * building itself. `applyToSeries` does the same for every upcoming event with
   * the same name — the Sunday service, the Tuesday class — so a leader does not
   * have to repeat it for each date.
   */
  async linkTeam(
    churchId: string,
    eventId: string,
    teamId: string,
    applyToSeries: boolean,
    user: JwtUser,
  ): Promise<EventResponseDto> {
    const event = await this.findEventForChurch(eventId, churchId);
    await this.teamAccessService.assertCanManageTeam(teamId, user);
    await this.findActiveTeam(teamId, churchId);

    const targets = new Map<string, Event>([[event.id, event]]);

    if (applyToSeries) {
      const upcoming = await this.eventsRepository.find({
        where: {
          churchId,
          name: event.name,
          active: true,
          eventDate: MoreThanOrEqual(new Date()),
        },
      });
      for (const sibling of upcoming) targets.set(sibling.id, sibling);
    }

    const ids = [...targets.keys()];
    const alreadyLinked = new Set(
      (await this.eventTeamsRepository.find({ where: { teamId, eventId: In(ids) } })).map(
        (link) => link.eventId,
      ),
    );

    const missing = ids.filter((id) => !alreadyLinked.has(id));
    if (missing.length > 0) {
      await this.eventTeamsRepository.save(
        missing.map((id) => this.eventTeamsRepository.create({ eventId: id, teamId })),
      );
    }

    await this.autoScheduleService.generateForEvents(churchId, ids, { teamIds: [teamId] }, user);

    return toEventResponse(await this.findEventEntity(eventId));
  }

  /** Takes a team off an event and clears the roster it had built there. */
  async unlinkTeam(
    churchId: string,
    eventId: string,
    teamId: string,
    user: JwtUser,
  ): Promise<EventResponseDto> {
    const event = await this.findEventForChurch(eventId, churchId);
    await this.teamAccessService.assertCanManageTeam(teamId, user);

    if (event.eventDate.getTime() <= Date.now()) {
      throw new InvalidScheduleTransitionException(
        'Esse evento já começou: a equipe não pode mais ser desvinculada',
      );
    }

    const schedules = await this.schedulesRepository.find({
      where: { eventId, teamId },
      relations: { member: true },
    });

    await this.schedulesRepository.delete({ eventId, teamId });
    await this.eventTeamsRepository.delete({ eventId, teamId });

    try {
      await this.pushService.sendMany(
        schedules
          .filter((schedule) => schedule.member?.userId && schedule.status !== 'CANCELLED')
          .map((schedule) => ({
            userId: schedule.member.userId,
            title: 'Você saiu da escala',
            message: `${event.name} (${formatEventWhen(event.eventDate)}) não precisa mais da sua equipe.`,
            type: NotificationType.SCHEDULE_CANCELLED,
            relatedEventId: event.id,
          })),
      );
    } catch (error) {
      this.logger.warn(
        `Falha ao avisar membros: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return toEventResponse(await this.findEventEntity(eventId));
  }

  async remove(id: string): Promise<EventResponseDto> {
    const event = await this.findEventEntity(id);
    event.active = false;

    return toEventResponse(await this.eventsRepository.save(event));
  }

  private async findEventForChurch(eventId: string, churchId: string): Promise<Event> {
    const event = await this.findEventEntity(eventId);

    if (event.churchId !== churchId) {
      throw new ChurchAccessDeniedException(churchId);
    }

    return event;
  }

  private async findActiveTeam(teamId: string, churchId: string): Promise<Team> {
    const team = await this.teamsRepository.findOne({
      where: { id: teamId, churchId, active: true },
    });

    if (!team) {
      throw new ResourceNotFoundException(ResourceType.TEAM, teamId);
    }

    return team;
  }

  private async findEventEntity(id: string): Promise<Event> {
    const event = await this.eventsRepository.findOne({
      where: { id },
      relations: { schedules: true, teams: { team: true } },
    });

    if (!event) {
      throw new ResourceNotFoundException(ResourceType.EVENT, id);
    }

    return event;
  }
}
