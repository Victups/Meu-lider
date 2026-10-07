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
  formatEventWhen,
  formatShortDate,
  toDateOnlyString,
} from '../../../common/utils';
import { Availability } from '../../availability/entities/availability.entity';
import { WeekdayAvailability } from '../../availability/entities/weekday-availability.entity';
import { findUnavailableMemberIdsForDay } from '../../availability/utils';
import { Event } from '../../events/entities/event.entity';
import { NotificationType } from '../../notifications/entities/notification.entity';
import { PushNotificationService, type PushPayload } from '../../notifications/push-notification.service';
import { TeamAccessService } from '../../teams/team-access.service';
import { TeamMember } from '../../teams/entities/team-member.entity';
import { TeamRole } from '../../teams/entities/team-role.entity';
import { Schedule, ScheduleStatus } from '../entities/schedule.entity';
import { findMemberIdsBusyDuring } from '../utils/overlap.util';
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

interface CandidatePool {
  teamMembersByTeam: Map<string, TeamMember[]>;
  unavailableMemberIds: Set<string>;
  historyByMember: Map<string, MemberServingHistory>;
}

/** An assignment waiting to be announced, so a batch can be told once per person. */
interface PendingNotice {
  event: Event;
  userId: string;
  teamRoleName: string;
  scheduleId: string | null;
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
 *      unique (eventId, teamId, memberId) index would reject the insert anyway;
 *   6. is not serving another event that overlaps this one in time.
 *
 * MEMBERS IN MORE THAN ONE TEAM. Rule 5 looks at the whole event, not at one
 * team, so someone who leads one team and plays in another is booked once per
 * event. Positions are filled scarcest-first (see `orderByScarcity`) so that
 * shared person lands where nobody else can cover. A leader generating a roster
 * only ever staffs the teams they lead (see `scopeToUserTeams`).
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
    const notices: PendingNotice[] = [];
    const result = await this.generateOne(churchId, eventId, options, user, notices);
    await this.announceAssignments(notices);

    return result;
  }

  private async generateOne(
    churchId: string,
    eventId: string,
    options: GenerateScheduleDto,
    user: JwtUser,
    notices: PendingNotice[],
  ): Promise<AutoScheduleResultDto> {
    const event = await this.findEventEntity(eventId);

    if (event.churchId !== churchId) {
      throw new ChurchAccessDeniedException(churchId);
    }

    const scoped = await this.scopeToUserTeams(event, options, user);

    return this.staffEvent(event, scoped, notices);
  }

  /**
   * The engine itself, with no authorisation: callers decide who may reach it.
   * Assignments are appended to `notices` instead of being announced here, so a
   * caller staffing a whole month can tell each person once.
   */
  private async staffEvent(
    event: Event,
    options: GenerateScheduleDto,
    notices: PendingNotice[],
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
    // live rows count towards the slots that are actually covered. Existing rows
    // span every team of the event, so a member who sits in two teams is never
    // booked twice into the same event.
    const bookedMemberIds = new Set(existingSchedules.map((schedule) => schedule.memberId));
    const filledByPosition = this.countFilledSlots(existingSchedules);
    let alreadyFilledCount = 0;

    const candidatePool = await this.loadCandidatePool(teamRoles, event);
    teamRoles = this.orderByScarcity(teamRoles, candidatePool, bookedMemberIds, filledByPosition);

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

        const userId = chosen[index].teamMember.member?.userId;
        if (userId && !options.dryRun) {
          notices.push({
            event,
            userId,
            teamRoleName: teamRole.name,
            scheduleId: schedule.id ?? null,
          });
        }
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

  /**
   * Re-runs the engine after someone drops out, with no permission check: the
   * trigger is a member declining, not a leader acting. Cancelled rows keep
   * blocking the member who declined, so the replacement is always someone new.
   */
  async refillEvent(eventId: string, roleId?: string): Promise<AutoScheduleResultDto | null> {
    const event = await this.findEventEntity(eventId).catch(() => null);
    if (!event) return null;

    const notices: PendingNotice[] = [];
    const result = await this.staffEvent(event, roleId ? { roleIds: [roleId] } : {}, notices);
    await this.announceAssignments(notices);

    return result;
  }

  /**
   * Sequential on purpose: each event has to see the assignments of the previous
   * one. Everyone is notified once at the end, however many events they landed in.
   */
  async generateForEvents(
    churchId: string,
    eventIds: string[],
    options: GenerateScheduleDto,
    user: JwtUser,
  ): Promise<AutoScheduleResultDto[]> {
    const results: AutoScheduleResultDto[] = [];
    const notices: PendingNotice[] = [];

    for (const eventId of eventIds) {
      results.push(await this.generateOne(churchId, eventId, options, user, notices));
    }

    await this.announceAssignments(notices);

    return results;
  }

  /**
   * A church admin may staff any team of the event. A leader is held to the
   * teams they lead: generating from the event screen must never rewrite
   * another team's roster, even when both teams are linked to the same event.
   */
  private async scopeToUserTeams(
    event: Event,
    options: GenerateScheduleDto,
    user: JwtUser,
  ): Promise<GenerateScheduleDto> {
    if (CHURCH_MANAGER_ROLES.includes(user.role)) return options;

    const requested = options.teamIds?.length
      ? options.teamIds
      : (event.teams ?? []).map((link) => link.teamId);

    const allowed: string[] = [];
    for (const teamId of requested) {
      if (await this.teamAccessService.canManageTeam(teamId, user)) allowed.push(teamId);
    }

    if (allowed.length === 0) {
      throw new InsufficientPermissionException(
        'Apenas líderes das equipes do evento ou administradores podem gerar escalas',
      );
    }

    return { ...options, teamIds: allowed };
  }

  /** One push per person: a single assignment is spelled out, several are summarised. */
  private async announceAssignments(notices: PendingNotice[]): Promise<void> {
    if (notices.length === 0) return;

    const byUser = new Map<string, PendingNotice[]>();
    for (const notice of notices) {
      byUser.set(notice.userId, [...(byUser.get(notice.userId) ?? []), notice]);
    }

    const payloads: PushPayload[] = [];
    for (const [userId, own] of byUser) {
      const sorted = [...own].sort(
        (a, b) => a.event.eventDate.getTime() - b.event.eventDate.getTime(),
      );
      const first = sorted[0];

      if (sorted.length === 1) {
        payloads.push({
          userId,
          title: 'Você foi escalado(a)!',
          message: `${first.teamRoleName} — ${first.event.name}, ${formatEventWhen(first.event.eventDate)}.`,
          type: NotificationType.SCHEDULE_ASSIGNED,
          relatedScheduleId: first.scheduleId ?? undefined,
          relatedEventId: first.event.id,
        });
        continue;
      }

      const preview = sorted
        .slice(0, 3)
        .map((notice) => `${notice.event.name} (${formatShortDate(notice.event.eventDate)})`)
        .join(', ');
      const rest = sorted.length - 3;

      payloads.push({
        userId,
        title: `Você foi escalado(a) em ${sorted.length} eventos`,
        message: `${preview}${rest > 0 ? ` e mais ${rest}` : ''}. Veja em Minhas escalas.`,
        type: NotificationType.SCHEDULE_ASSIGNED,
        relatedScheduleId: first.scheduleId ?? undefined,
        relatedEventId: first.event.id,
      });
    }

    try {
      await this.pushService.sendMany(payloads);
    } catch (error) {
      this.logger.warn(
        `Falha ao notificar escalados: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Fills the hardest positions first. A person who covers two positions should
   * go to the one nobody else can take, not to whichever sorts first by name —
   * otherwise a shared member can starve a team while another has spare hands.
   * Slack (eligible people minus open slots) is the measure; the names only
   * break ties so two runs on the same data agree.
   */
  private orderByScarcity(
    teamRoles: TeamRole[],
    pool: CandidatePool,
    bookedMemberIds: Set<string>,
    filledByPosition: Map<string, number>,
  ): TeamRole[] {
    const slackOf = (teamRole: TeamRole): number => {
      const eligible = (pool.teamMembersByTeam.get(teamRole.teamId) ?? []).filter(
        (teamMember) =>
          this.coversRole(teamMember, teamRole.id) &&
          !bookedMemberIds.has(teamMember.memberId) &&
          !pool.unavailableMemberIds.has(teamMember.memberId),
      ).length;
      const missing = teamRole.defaultSlots - (filledByPosition.get(teamRole.id) ?? 0);

      return eligible - Math.max(missing, 0);
    };

    return teamRoles
      .map((teamRole) => ({ teamRole, slack: slackOf(teamRole) }))
      .sort(
        (a, b) =>
          a.slack - b.slack ||
          (a.teamRole.team?.name ?? '').localeCompare(b.teamRole.team?.name ?? '') ||
          a.teamRole.name.localeCompare(b.teamRole.name) ||
          a.teamRole.id.localeCompare(b.teamRole.id),
      )
      .map((entry) => entry.teamRole);
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

  private async loadCandidatePool(teamRoles: TeamRole[], event: Event): Promise<CandidatePool> {
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

    // Blocked by a dated absence or a standing weekday rule (see
    // `availability-window.util` for what `isAvailable` means), or serving at
    // another event that overlaps this one.
    const unavailableMemberIds = await findUnavailableMemberIdsForDay(
      this.availabilityRepository,
      this.weekdayRepository,
      memberIds,
      eventDay,
    );
    for (const memberId of await findMemberIdsBusyDuring(
      this.schedulesRepository,
      memberIds,
      event,
    )) {
      unavailableMemberIds.add(memberId);
    }

    return {
      teamMembersByTeam,
      unavailableMemberIds,
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
