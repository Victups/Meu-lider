import type { ID, ISODateString, Timestamped } from './common';

export interface Event extends Timestamped {
  id: ID;
  churchId: ID;
  name: string;
  description: string | null;
  eventType: string | null;
  eventDate: ISODateString;
  endDate: ISODateString | null;
  location: string | null;
  active: boolean;
  /** iCalendar RRULE string, when the event repeats. */
  recurrenceRule: string | null;
  createdById: ID | null;
  teams?: EventTeamLink[];
}

/** Link row between an event and a team it needs staffed. */
export interface EventTeamLink {
  id: ID;
  eventId: ID;
  teamId: ID;
  team?: { id: ID; name: string; color: string | null };
}

export interface CreateEventInput {
  churchId: ID;
  name: string;
  eventDate: ISODateString;
  /** Teams this event needs. Without any, the scheduler staffs nobody. */
  teamIds?: ID[];
  description?: string;
  eventType?: string;
  endDate?: ISODateString;
  location?: string;
  recurrenceRule?: string;
}

/** Result of asking what a recurrence rule would generate. */
export interface OccurrencesPreview {
  eventId: ID;
  recurrenceRule: string | null;
  dates: ISODateString[];
}

export interface MaterializeResult {
  createdCount: number;
  skippedCount: number;
  created: Event[];
}
