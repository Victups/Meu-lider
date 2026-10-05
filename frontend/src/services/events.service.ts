import type {
  CreateEventInput,
  Event,
  ID,
  ISODateString,
  MaterializeResult,
  OccurrencesPreview,
} from '@/types';
import { http } from './http/client';

export interface EventDateRange {
  from?: ISODateString;
  to?: ISODateString;
}

export const eventsService = {
  async list(churchId: ID, range?: EventDateRange): Promise<Event[]> {
    const { data } = await http.get<Event[]>(`/churches/${churchId}/events`, { params: range });
    return data;
  },

  async getById(churchId: ID, eventId: ID): Promise<Event> {
    const { data } = await http.get<Event>(`/churches/${churchId}/events/${eventId}`);
    return data;
  },

  async create(churchId: ID, input: CreateEventInput): Promise<Event> {
    const { data } = await http.post<Event>(`/churches/${churchId}/events`, input);
    return data;
  },

  async update(churchId: ID, eventId: ID, input: Partial<CreateEventInput>): Promise<Event> {
    const { data } = await http.put<Event>(`/churches/${churchId}/events/${eventId}`, input);
    return data;
  },

  /** Dates the recurrence rule would produce, without creating anything. */
  async previewOccurrences(
    churchId: ID,
    eventId: ID,
    weeksAhead: number,
  ): Promise<OccurrencesPreview> {
    const { data } = await http.get<OccurrencesPreview>(
      `/churches/${churchId}/events/${eventId}/occurrences/preview`,
      { params: { weeksAhead } },
    );
    return data;
  },

  /** Creates the missing occurrences. Safe to call again — it skips existing ones. */
  async materializeOccurrences(
    churchId: ID,
    eventId: ID,
    options: { weeksAhead: number; autoSchedule?: boolean },
  ): Promise<MaterializeResult> {
    const { data } = await http.post<MaterializeResult>(
      `/churches/${churchId}/events/${eventId}/occurrences`,
      options,
    );
    return data;
  },

  /** Materializes the next month for ALL recurring events + auto-schedule. */
  async materializeMonth(churchId: ID): Promise<MaterializeResult[]> {
    const { data } = await http.post<MaterializeResult[]>(
      `/churches/${churchId}/events/materialize-month`,
    );
    return data;
  },

  async remove(churchId: ID, eventId: ID): Promise<void> {
    await http.delete(`/churches/${churchId}/events/${eventId}`);
  },
};
