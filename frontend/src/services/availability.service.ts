import type { Availability, CreateAvailabilityInput, ID, WeekdayAvailability } from '@/types';
import { http } from './http/client';

export const availabilityService = {
  /** Standing weekly rule. Always returns all seven days. */
  async getWeekdays(memberId: ID): Promise<WeekdayAvailability[]> {
    const { data } = await http.get<WeekdayAvailability[]>(
      `/members/${memberId}/availability/weekdays`,
    );
    return data;
  },

  /** Replaces the whole week: days sent are available, the rest are not. */
  async setWeekdays(memberId: ID, weekdays: number[]): Promise<WeekdayAvailability[]> {
    const { data } = await http.put<WeekdayAvailability[]>(
      `/members/${memberId}/availability/weekdays`,
      { weekdays },
    );
    return data;
  },

  async listByMember(memberId: ID): Promise<Availability[]> {
    const { data } = await http.get<Availability[]>(`/members/${memberId}/availability`);
    return data;
  },

  async create(memberId: ID, input: CreateAvailabilityInput): Promise<Availability> {
    const { data } = await http.post<Availability>(`/members/${memberId}/availability`, input);
    return data;
  },

  async remove(memberId: ID, availabilityId: ID): Promise<void> {
    await http.delete(`/members/${memberId}/availability/${availabilityId}`);
  },
};
