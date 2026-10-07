import type { ID, ISODateString, Timestamped } from './common';
import type { Event } from './event';
import type { Member } from './member';
import type { Team, TeamRole } from './team';

export const ScheduleStatus = {
  /** Assigned by the engine and expected to serve — no acceptance needed. */
  SCHEDULED: 'SCHEDULED',
  /** Member asked out; stays on the roster until a leader rules. */
  RELEASE_REQUESTED: 'RELEASE_REQUESTED',
  /** Taken over from someone else, so this one really was accepted. */
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW',
} as const;

export type ScheduleStatus = (typeof ScheduleStatus)[keyof typeof ScheduleStatus];

export const SCHEDULE_STATUS_LABEL: Record<ScheduleStatus, string> = {
  SCHEDULED: 'Escalado',
  RELEASE_REQUESTED: 'Pediu saída',
  CONFIRMED: 'Confirmado',
  CANCELLED: 'Cancelado',
  NO_SHOW: 'Não compareceu',
};

export interface Schedule extends Timestamped {
  id: ID;
  eventId: ID;
  teamId: ID;
  memberId: ID;
  teamRoleId: ID;
  status: ScheduleStatus;
  confirmedAt: ISODateString | null;
  confirmedById: ID | null;
  notes: string | null;
  /** Why the member asked out, when they did. */
  releaseReason: string | null;
  releaseRequestedAt: ISODateString | null;
  event?: Event;
  team?: Team;
  member?: Member;
  teamRole?: TeamRole;
}

export interface CreateScheduleInput {
  eventId: ID;
  teamId: ID;
  memberId: ID;
  teamRoleId: ID;
  notes?: string;
}

export interface ScheduleStatistics {
  total: number;
  confirmed: number;
  pending: number;
  cancelled: number;
  noShow: number;
}

export interface AutoScheduleResult {
  eventId: ID;
  eventName: string;
  eventDate: ISODateString;
  dryRun: boolean;
  createdCount: number;
  alreadyFilledCount: number;
  missingCount: number;
  fullyStaffed: boolean;
  assignments: AutoScheduleAssignment[];
  gaps: ScheduleGap[];
}

export interface AutoScheduleAssignment {
  memberId: ID;
  teamRoleId: ID;
  teamRoleName: string;
  score: number;
}

export interface ScheduleGap {
  teamRoleId: ID;
  teamRoleName: string;
  slotsNeeded: number;
  slotsFilled: number;
  missingSlots: number;
  reason: string;
}

/** The month's roster as WhatsApp-ready text. */
export interface ShareText {
  month: string;
  text: string;
  eventCount: number;
}

export interface MemberParticipation {
  memberId: ID;
  fullName: string;
  served: number;
  noShow: number;
  upcoming: number;
}
