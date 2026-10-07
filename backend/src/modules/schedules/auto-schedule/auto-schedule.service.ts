import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  CHURCH_MANAGER_ROLES,
  FAIRNESS_CONSECUTIVE_WINDOW_DAYS,
  FAIRNESS_HISTORY_WINDOW_DAYS,
  FAIRNESS_LOOKBACK_DAYS,
  FAIRNESS_MAX_RECENT_ASSIGNMENTS,
  FAIRNESS_MAX_REST_DAYS,
  FAIRNESS_WEIGHTS,
  ResourceType,
  ScheduleGapReason,
} from '../../../common/constants';
import {
  ChurchAccessDeniedException,
  InsufficientPermissionException,
  ResourceNotFoundException,
} from '../../../common/exceptions';
import type { JwtUser } from '../../../common/interfaces';
import {
  addDays,
  differenceInCalendarDays,
  toDateOnlyString,
} from '../../../common/utils';
import { Availability } from '../../availability/entities/availability.entity';
import { WeekdayAvailability } from '../../availability/entities/weekday-availability.entity';
import {
  findAvailabilityWindowsForDay,
  isAvailableForWindows,
} from '../../availability/utils';
import { Event } from '../../events/entities/event.entity';
import { NotificationType } from '../../notifications/entities/notification.entity';
import { PushNotificationService, type PushPayload } from '../../notifications/push-notification.service';
import { TeamAccessService } from '../../teams/team-access.service';
import { TeamMember } from '../../teams/entities/team-member.entity';
import { TeamRole } from '../../teams/entities/team-role.entity';
import { Schedule, ScheduleStatus } from '../entities/schedule.entity';
import {
  AutoScheduleAssignmentDto,
  AutoScheduleResultDto,
  ScheduleGapDto,
} from './dtos/auto-schedule-result.dto';
import { GenerateScheduleDto } from './dtos/generate-schedule.dto';
import type {
  FairnessCandidate,
  IAutoScheduleService,
  MemberServingHistory,
} from './interfaces';
import { toAutoScheduleAssignment, toScheduleGap } from './mappers';

interface ServedRow {
  memberId: string;
  eventDate: Date;
}

/**
 * Builds the schedule of an event on its own, because nobody reviews it before
 * it is published: the leader registers the event and the roster has to come
 * out defensible. That makes fairness a requirement, not a nicety.
 *
 * HARD FILTERS (fail one and you are out, no score computed)
 *   1. belongs to the team and the membership has not ended by the event date;
 *   2. the Member record is active;
 *   3. covers the position through TeamMemberRole;
 *   4. is available on the event date (see `isMemberAvailable`);
 *   5. has no row at all for this event — including CANCELLED ones, because the
 *      unique (eventId, teamId, memberId) index would reject the insert anyway.
 *
 * FAIRNESS SCORE (higher wins; every term is normalised to 0..1 before weighting)
 *
 *   score = RECENT_LOAD * (1 - recentAssignments / MAX_RECENT_ASSIGNMENTS)
 *         + REST        * (daysSinceLastAssignment / MAX_REST_DAYS)
 *         - CONSECUTIVE_PENALTY * (served in the last 7 days ? 1 : 0)
 *         + PRIMARY_ROLE        * (this is their preferred position ? 1 : 0)
 *
 * Why this shape. "Justo" in a church rota means two different things that pull
 * apart, so both are in: serving *less often* (the count term) and having waited
 * *longer* (the rest term). The count alone would keep picking the newcomer who
 * served twice last week over the veteran who served three times in two months;
 * the wait alone would ignore someone who is clearly carrying the team. The
 * count dominates (100 vs 40) because volume is what people actually resent.
 *
 * The back-to-back penalty (25) is deliberately smaller than the load weight:
 * it only demotes someone when a comparable alternative exists, which is exactly
 * the "evite semanas consecutivas quando houver alternativa" rule — if the only
 * bass player available played last Sunday, he still plays. `isPrimary` (5) is a
 * nudge for the position someone actually prefers and can never override a real
 * fairness gap. Ties break on memberId so two runs on the same data agree.
 *
 * IDEMPOTENCE. Slots already taken are counted as filled and their holders are
 * excluded from the candidate pool, so running twice over the same event adds
 * nothing. PARTIAL FILL. A position nobody can cover does not abort the run: the
 * rest of the roster is written and the hole is reported in `gaps`, because a
 * roster missing one bass player beats no roster at all.
 */
@Injectable()
export class AutoScheduleService implements IAutoScheduleService {
  constructor(
    @InjectRepository(Schedule)
    private readonly schedulesRepository: Repository<Schedule>,
    @InjectRepository(Event)
    private readonly eventsRepository: Repository<Event>,
    @InjectRepository(TeamRole)
    private readonly teamRolesRepository: Repository<TeamRole>,
    @InjectRepository(TeamMember)
    private readonly teamMembersRepository: Repository<TeamMember>,
    @InjectRepository(WeekdayAvailability)
    private readonly weekdayRepository: Repository<WeekdayAvailability>,
    @InjectRepository(Availability)
    private readonly availabilityRepository: Repository<Availability>,
    private readonly teamAccessService: TeamAccessService,
    private readonly pushService: PushNotificationService,
  ) {}

  private readonly logger = new Logger(AutoScheduleService.name);

  async generateForEvent(
    churchId: string,
    eventId: string,
    options: GenerateScheduleDto,
    user: JwtUser,
  ): Promise<AutoScheduleResultDto> {
    const event = await this.findEventEntity(eventId);

    if (event.churchId !== churchId) {
      throw new ChurchAccessDeniedException(churchId);
    }

    await this.assertCanScheduleEvent(event, user);

    return this.staffEvent(event, options);
  }

  /** The engine itself, with no authorisation: callers decide who may reach it. */
  private async staffEvent(
    event: Event,
    options: GenerateScheduleDto,
  ): Promise<AutoScheduleResultDto> {
    const { churchId, id: eventId } = event;

    // The event declares which teams it needs; an explicit override still wins.
    const eventTeamIds = (event.teams ?? []).map((link) => link.teamId);
    let teamRoles = await this.findOpenPositions(
      churchId,
      options.teamIds?.length ? options.teamIds : eventTeamIds,
    );

    if (options.roleIds?.length) {
      const allowed = new Set(options.roleIds);
      teamRoles = teamRoles.filter((role) => allowed.has(role.id));
    }
    const existingSchedules = await this.schedulesRepository.find({ where: { eventId } });

    const assignments: AutoScheduleAssignmentDto[] = [];
    const gaps: ScheduleGapDto[] = [];

    // Any row blocks a new insert on the unique index, cancelled or not; only
    // live rows count towards the slots that are actually covered.
    const bookedMemberIds = new Set(existingSchedules.map((schedule) => schedule.memberId));
    const filledByPosition = this.countFilledSlots(existingSchedules);
    let alreadyFilledCount = 0;

    const candidatePool = await this.loadCandidatePool(teamRoles, event);

    for (const teamRole of teamRoles) {
      const filledSlots = filledByPosition.get(teamRole.id) ?? 0;
      alreadyFilledCount += Math.min(filledSlots, teamRole.defaultSlots);

      const missingSlots = teamRole.defaultSlots - filledSlots;
      if (missingSlots <= 0) {
        continue;
      }

      const coveringMembers = candidatePool.teamMembersByTeam
        .get(teamRole.teamId)
        ?.filter((teamMember) => this.coversRole(teamMember, teamRole.id));

      const bookedElsewhere = (coveringMembers ?? []).filter((teamMember) =>
        bookedMemberIds.has(teamMember.memberId),
      ).length;

      const candidates = (coveringMembers ?? [])
        .filter(
          (teamMember) =>
            !bookedMemberIds.has(teamMember.memberId) &&
            !candidatePool.unavailableMemberIds.has(teamMember.memberId),
        )
        .map((teamMember) =>
          this.toFairnessCandidate(teamMember, teamRole.id, candidatePool.historyByMember),
        )
        .sort(compareCandidates);

      const chosen = candidates.slice(0, missingSlots);
      const created = chosen.map((candidate) =>
        this.schedulesRepository.create({
          eventId: event.id,
          teamId: teamRole.teamId,
          memberId: candidate.memberId,
          teamRoleId: teamRole.id,
          status: ScheduleStatus.SCHEDULED,
        }),
      );

      if (created.length > 0 && !options.dryRun) {
        await this.schedulesRepository.save(created);
      }

      created.forEach((schedule, index) => {
        bookedMemberIds.add(schedule.memberId);
        assignments.push(toAutoScheduleAssignment(schedule, teamRole, chosen[index].score));
      });

      const totalFilled = filledSlots + created.length;
      if (totalFilled < teamRole.defaultSlots) {
        gaps.push(
          toScheduleGap(
            teamRole,
            teamRole.defaultSlots,
            totalFilled,
            this.resolveGapReason(
              coveringMembers?.length ?? 0,
              candidates.length,
              bookedElsewhere,
            ),
          ),
        );
      }
    }

    if (!options.dryRun && assignments.length > 0) {
      this.sendAssignmentNotifications(event, assignments, candidatePool.teamMembersByTeam).catch(
        (err) => this.logger.warn(`Falha ao notificar escalados: ${err}`),
      );
    }

    return {
      eventId: event.id,
      eventName: event.name,
      eventDate: event.eventDate,
      dryRun: options.dryRun === true,
      createdCount: assignments.length,
      alreadyFilledCount,
      missingCount: gaps.reduce((total, gap) => total + gap.missingSlots, 0),
      fullyStaffed: gaps.length === 0,
      assignments,
      gaps,
    };
  }

  /** Sequential on purpose: each event has to see the assignments of the previous one. */
  /**
   * Re-runs the engine after someone drops out, with no permission check: the
   * trigger is a member declining, not a leader acting. Cancelled rows keep
   * blocking the member who declined, so the replacement is always someone new.
   */
  async refillEvent(eventId: string, roleId?: string): Promise<AutoScheduleResultDto | null> {
    const event = await this.findEventEntity(eventId).catch(() => null);
    if (!event) return null;

    return this.staffEvent(event, roleId ? { roleIds: [roleId] } : {});
  }

  async generateForEvents(
    churchId: string,
    eventIds: string[],
    options: GenerateScheduleDto,
    user: JwtUser,
  ): Promise<AutoScheduleResultDto[]> {
    const results: AutoScheduleResultDto[] = [];

    for (const eventId of eventIds) {
      results.push(await this.generateForEvent(churchId, eventId, options, user));
    }

    return results;
  }

  private async assertCanScheduleEvent(event: Event, user: JwtUser): Promise<void> {
    if (CHURCH_MANAGER_ROLES.includes(user.role)) return;

    const eventTeamIds = (event.teams ?? []).map((link) => link.teamId);
    for (const teamId of eventTeamIds) {
      if (await this.teamAccessService.canManageTeam(teamId, user)) return;
    }

    throw new InsufficientPermissionException(
      'Apenas líderes das equipes do evento ou administradores podem gerar escalas',
    );
  }

  private async findEventEntity(id: string): Promise<Event> {
    const event = await this.eventsRepository.findOne({
      where: { id, active: true },
      relations: { teams: true },
    });

    if (!event) {
      throw new ResourceNotFoundException(ResourceType.EVENT, id);
    }

    return event;
  }

  /**
   * Active positions of the teams to staff. An empty `teamIds` means the event
   * declared no teams, and nothing is scheduled — staffing the whole church
   * would put the media crew in a band rehearsal.
   */
  private async findOpenPositions(churchId: string, teamIds?: string[]): Promise<TeamRole[]> {
    let query = this.teamRolesRepository
      .createQueryBuilder('teamRole')
      .innerJoinAndSelect('teamRole.team', 'team')
      .where('team.churchId = :churchId', { churchId })
      .andWhere('team.active = :teamActive', { teamActive: true })
      .andWhere('teamRole.active = :roleActive', { roleActive: true })
      .andWhere('teamRole.defaultSlots > 0');

    if (!teamIds?.length) {
      return [];
    }

    query = query.andWhere('teamRole.teamId IN (:...teamIds)', { teamIds });

    // Deterministic order so two runs produce the same roster.
    return query
      .orderBy('team.name', 'ASC')
      .addOrderBy('teamRole.name', 'ASC')
      .addOrderBy('teamRole.id', 'ASC')
      .getMany();
  }

  private countFilledSlots(schedules: Schedule[]): Map<string, number> {
    const filled = new Map<string, number>();

    for (const schedule of schedules) {
      if (schedule.status === ScheduleStatus.CANCELLED) {
        continue;
      }

      filled.set(schedule.teamRoleId, (filled.get(schedule.teamRoleId) ?? 0) + 1);
    }

    return filled;
  }

  private async loadCandidatePool(
    teamRoles: TeamRole[],
    event: Event,
  ): Promise<{
    teamMembersByTeam: Map<string, TeamMember[]>;
    unavailableMemberIds: Set<string>;
    historyByMember: Map<string, MemberServingHistory>;
  }> {
    const teamIds = [...new Set(teamRoles.map((teamRole) => teamRole.teamId))];

    if (teamIds.length === 0) {
      return {
        teamMembersByTeam: new Map(),
        unavailableMemberIds: new Set(),
        historyByMember: new Map(),
      };
    }

    const eventDay = toDateOnlyString(event.eventDate);
    const teamMembers = (
      await this.teamMembersRepository.find({
        where: { teamId: In(teamIds) },
        relations: { roles: true, member: true },
      })
    ).filter((teamMember) => this.isActiveMembership(teamMember, eventDay));

    const memberIds = [...new Set(teamMembers.map((teamMember) => teamMember.memberId))];

    const teamMembersByTeam = new Map<string, TeamMember[]>();
    for (const teamMember of teamMembers) {
      const bucket = teamMembersByTeam.get(teamMember.teamId) ?? [];
      bucket.push(teamMember);
      teamMembersByTeam.set(teamMember.teamId, bucket);
    }

    return {
      teamMembersByTeam,
      unavailableMemberIds: await this.findUnavailableMemberIds(memberIds, eventDay),
      historyByMember: await this.loadServingHistory(memberIds, event.eventDate),
    };
  }

  private isActiveMembership(teamMember: TeamMember, eventDay: string): boolean {
    if (teamMember.member && teamMember.member.status !== 'active') {
      return false;
    }

    return !teamMember.endedAt || toDateOnlyString(teamMember.endedAt) >= eventDay;
  }

  private coversRole(teamMember: TeamMember, teamRoleId: string): boolean {
    return (teamMember.roles ?? []).some((assignment) => assignment.teamRoleId === teamRoleId);
  }

  /** See `availability-window.util` for what `isAvailable` means here. */
  private async findUnavailableMemberIds(
    memberIds: string[],
    eventDay: string,
  ): Promise<Set<string>> {
    const unavailable = new Set<string>();

    if (memberIds.length === 0) {
      return unavailable;
    }

    const windows = await findAvailabilityWindowsForDay(
      this.availabilityRepository,
      memberIds,
      eventDay,
    );

    const windowsByMember = new Map<string, Availability[]>();
    for (const window of windows) {
      const bucket = windowsByMember.get(window.memberId) ?? [];
      bucket.push(window);
      windowsByMember.set(window.memberId, bucket);
    }

    for (const [memberId, memberWindows] of windowsByMember) {
      if (!isAvailableForWindows(memberWindows)) {
        unavailable.add(memberId);
      }
    }

    for (const memberId of await this.findWeekdayBlockedMemberIds(memberIds, eventDay)) {
      unavailable.add(memberId);
    }

    return unavailable;
  }

  /**
   * Standing weekly rule — "I only serve on weekends". Only rows explicitly set
   * to unavailable count, so a member who never set a preference stays eligible.
   */
  private async findWeekdayBlockedMemberIds(
    memberIds: string[],
    eventDay: string,
  ): Promise<string[]> {
    // eventDay is YYYY-MM-DD; the T12:00 avoids the day shifting by timezone.
    const weekday = new Date(`${eventDay}T12:00:00`).getDay();

    const blocked = await this.weekdayRepository.find({
      where: { memberId: In(memberIds), weekday, isAvailable: false },
      select: { memberId: true },
    });

    return blocked.map((entry) => entry.memberId);
  }

  private async loadServingHistory(
    memberIds: string[],
    eventDate: Date,
  ): Promise<Map<string, MemberServingHistory>> {
    const history = new Map<string, MemberServingHistory>();

    if (memberIds.length === 0) {
      return history;
    }

    const rows = await this.schedulesRepository
      .createQueryBuilder('schedule')
      .innerJoin('schedule.event', 'event')
      .select('schedule.memberId', 'memberId')
      .addSelect('event.eventDate', 'eventDate')
      .where('schedule.memberId IN (:...memberIds)', { memberIds })
      .andWhere('schedule.status != :cancelled', { cancelled: ScheduleStatus.CANCELLED })
      .andWhere('event.eventDate < :eventDate', { eventDate })
      .andWhere('event.eventDate >= :windowStart', {
        windowStart: addDays(eventDate, -FAIRNESS_HISTORY_WINDOW_DAYS),
      })
      .getRawMany<ServedRow>();

    for (const memberId of memberIds) {
      history.set(memberId, {
        recentAssignments: 0,
        daysSinceLastAssignment: FAIRNESS_MAX_REST_DAYS,
        servedInConsecutiveWindow: false,
      });
    }

    for (const row of rows) {
      const entry = history.get(row.memberId);
      if (!entry) {
        continue;
      }

      const daysAgo = differenceInCalendarDays(eventDate, new Date(row.eventDate));

      if (daysAgo <= FAIRNESS_LOOKBACK_DAYS) {
        entry.recentAssignments += 1;
      }

      if (daysAgo <= FAIRNESS_CONSECUTIVE_WINDOW_DAYS) {
        entry.servedInConsecutiveWindow = true;
      }

      entry.daysSinceLastAssignment = Math.min(entry.daysSinceLastAssignment, daysAgo);
    }

    return history;
  }

  private toFairnessCandidate(
    teamMember: TeamMember,
    teamRoleId: string,
    historyByMember: Map<string, MemberServingHistory>,
  ): FairnessCandidate {
    const history = historyByMember.get(teamMember.memberId) ?? {
      recentAssignments: 0,
      daysSinceLastAssignment: FAIRNESS_MAX_REST_DAYS,
      servedInConsecutiveWindow: false,
    };

    const isPrimaryForRole = (teamMember.roles ?? []).some(
      (assignment) => assignment.teamRoleId === teamRoleId && assignment.isPrimary,
    );

    return {
      teamMember,
      memberId: teamMember.memberId,
      isPrimaryForRole,
      history,
      score: scoreFairness(history, isPrimaryForRole),
    };
  }

  /**
   * A position can go unfilled for reasons the leader must act on differently:
   * nobody plays bass at all, the bassist is away, or the bassist is already on
   * keys for this same event. Collapsing them into one message hides the fix.
   */
  private async sendAssignmentNotifications(
    event: Event,
    assignments: AutoScheduleAssignmentDto[],
    teamMembersByTeam: Map<string, TeamMember[]>,
  ): Promise<void> {
    const allTeamMembers = [...teamMembersByTeam.values()].flat();
    const memberIdToUserId = new Map<string, string>();
    for (const tm of allTeamMembers) {
      if (tm.member?.userId) {
        memberIdToUserId.set(tm.memberId, tm.member.userId);
      }
    }

    const dateStr = new Date(event.eventDate).toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    const payloads: PushPayload[] = [];
    for (const assignment of assignments) {
      const userId = memberIdToUserId.get(assignment.memberId);
      if (!userId) continue;

      payloads.push({
        userId,
        title: 'Você foi escalado(a)!',
        message: `Você foi escalado(a) como ${assignment.teamRoleName} no evento "${event.name}" em ${dateStr}.`,
        type: NotificationType.SCHEDULE_ASSIGNED,
        relatedScheduleId: assignment.scheduleId ?? undefined,
        data: { screen: 'event', eventId: event.id },
      });
    }

    await this.pushService.sendMany(payloads);
  }

  private resolveGapReason(
    membersCoveringRole: number,
    availableCandidates: number,
    excludedForBeingBooked: number,
  ): ScheduleGapReason {
    if (membersCoveringRole === 0) {
      return ScheduleGapReason.NO_MEMBER_COVERS_ROLE;
    }

    if (availableCandidates === 0) {
      return excludedForBeingBooked > 0
        ? ScheduleGapReason.ALL_COVERING_MEMBERS_BUSY
        : ScheduleGapReason.NO_AVAILABLE_MEMBER;
    }

    return ScheduleGapReason.NOT_ENOUGH_MEMBERS;
  }
}

/** See the class comment for the rationale behind each term. */
function scoreFairness(history: MemberServingHistory, isPrimaryForRole: boolean): number {
  const loadRatio =
    Math.min(history.recentAssignments, FAIRNESS_MAX_RECENT_ASSIGNMENTS) /
    FAIRNESS_MAX_RECENT_ASSIGNMENTS;
  const restRatio =
    Math.min(history.daysSinceLastAssignment, FAIRNESS_MAX_REST_DAYS) / FAIRNESS_MAX_REST_DAYS;

  return (
    FAIRNESS_WEIGHTS.RECENT_LOAD * (1 - loadRatio) +
    FAIRNESS_WEIGHTS.REST * restRatio -
    (history.servedInConsecutiveWindow ? FAIRNESS_WEIGHTS.CONSECUTIVE_PENALTY : 0) +
    (isPrimaryForRole ? FAIRNESS_WEIGHTS.PRIMARY_ROLE : 0)
  );
}

/** Best score first; memberId keeps the order reproducible between runs. */
function compareCandidates(left: FairnessCandidate, right: FairnessCandidate): number {
  if (left.score !== right.score) {
    return right.score - left.score;
  }

  return left.memberId.localeCompare(right.memberId);
}
