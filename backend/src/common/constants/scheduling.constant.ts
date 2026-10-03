/**
 * Tuning knobs for the automatic scheduling engine and the recurrence expander.
 * They live here, and not inside the services, because they are the policy the
 * church can argue about ("oito semanas é muito?") while the algorithm stays put.
 */

import { UserRole } from '../../modules/users/entities/user.entity';

/** Who may generate a roster, materialize occurrences or resolve a swap. */
export const SCHEDULE_MANAGER_ROLES: readonly UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.CHURCH_ADMIN,
  UserRole.LEADER,
];

/** Window used to count how often a member has served recently. Eight weeks. */
export const FAIRNESS_LOOKBACK_DAYS = 56;

/** A member who has never served is treated as having rested this many days. */
export const FAIRNESS_MAX_REST_DAYS = 90;

/** Load above this many assignments in the lookback window scores the same. */
export const FAIRNESS_MAX_RECENT_ASSIGNMENTS = 8;

/** Serving inside this many days before the event counts as "back-to-back". */
export const FAIRNESS_CONSECUTIVE_WINDOW_DAYS = 7;

/** Single history query covers both the load window and the rest window. */
export const FAIRNESS_HISTORY_WINDOW_DAYS = Math.max(
  FAIRNESS_LOOKBACK_DAYS,
  FAIRNESS_MAX_REST_DAYS,
);

/**
 * Weights of the fairness score. Relative size is what matters:
 * `RECENT_LOAD` dominates so the person who served least always leads;
 * `REST` breaks ties between people with the same count;
 * `CONSECUTIVE_PENALTY` is deliberately smaller than `RECENT_LOAD` so it only
 * moves someone down when a comparable alternative exists;
 * `PRIMARY_ROLE` is a nudge, never enough to beat a fairness gap.
 */
export const FAIRNESS_WEIGHTS = {
  RECENT_LOAD: 100,
  REST: 40,
  CONSECUTIVE_PENALTY: 25,
  PRIMARY_ROLE: 5,
} as const;

/** Why a position could not be fully staffed. */
export enum ScheduleGapReason {
  NO_MEMBER_COVERS_ROLE = 'NO_MEMBER_COVERS_ROLE',
  NO_AVAILABLE_MEMBER = 'NO_AVAILABLE_MEMBER',
  NOT_ENOUGH_MEMBERS = 'NOT_ENOUGH_MEMBERS',
}

export const SCHEDULE_GAP_MESSAGES: Record<ScheduleGapReason, string> = {
  [ScheduleGapReason.NO_MEMBER_COVERS_ROLE]:
    'Nenhum membro ativo da equipe cobre esta função',
  [ScheduleGapReason.NO_AVAILABLE_MEMBER]:
    'Todos os membros que cobrem esta função estão indisponíveis nesta data',
  [ScheduleGapReason.NOT_ENOUGH_MEMBERS]:
    'Não há membros disponíveis suficientes para preencher todas as vagas',
};

/** How far ahead occurrences of a recurring event are materialized by default. */
export const RECURRENCE_DEFAULT_WEEKS_AHEAD = 8;

/** Upper bound accepted from the client for the materialization window. */
export const RECURRENCE_MAX_WEEKS_AHEAD = 52;

/** Hard stop so a malformed rule can never flood the events table. */
export const RECURRENCE_MAX_OCCURRENCES = 120;

/** Accepted values of the `FREQ=` part of a recurrence rule. */
export enum RecurrenceFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

/** `BYDAY=` codes, in iCalendar spelling, mapped to JavaScript weekday numbers. */
export const RECURRENCE_WEEKDAY_CODES: Record<string, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};
