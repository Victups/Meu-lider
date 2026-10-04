import type { ID, ISODateString, Timestamped } from './common';
import type { User } from './user';

export interface Member extends Timestamped {
  id: ID;
  /** Always set: every account gets a member row at registration. */
  userId: ID;
  churchId: ID;
  fullName: string;
  cpf: string | null;
  birthDate: ISODateString | null;
  joinedAt: ISODateString | null;
  status: string;
  notes: string | null;
  user?: User;
}

export interface Availability extends Timestamped {
  id: ID;
  memberId: ID;
  dateFrom: ISODateString;
  dateTo: ISODateString;
  isAvailable: boolean;
  reason: string | null;
}

/** One weekday of the member's standing rule. 0 = Sunday … 6 = Saturday. */
export interface WeekdayAvailability {
  weekday: number;
  isAvailable: boolean;
}

export interface CreateAvailabilityInput {
  memberId: ID;
  dateFrom: ISODateString;
  dateTo: ISODateString;
  isAvailable: boolean;
  reason?: string;
}
