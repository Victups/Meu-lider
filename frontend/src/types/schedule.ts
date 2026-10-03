import type { ID, ISODateString, Timestamped } from './common';
import type { Event } from './event';
import type { Member } from './member';
import type { Team, TeamRole } from './team';

export const ScheduleStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW',
} as const;

export type ScheduleStatus = (typeof ScheduleStatus)[keyof typeof ScheduleStatus];

export const SCHEDULE_STATUS_LABEL: Record<ScheduleStatus, string> = {
  PENDING: 'Aguardando',
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
