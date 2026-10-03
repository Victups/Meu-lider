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
}

export interface CreateEventInput {
  churchId: ID;
  name: string;
  eventDate: ISODateString;
  description?: string;
  eventType?: string;
  endDate?: ISODateString;
  location?: string;
  recurrenceRule?: string;
}
