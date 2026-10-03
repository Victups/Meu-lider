import type { Availability, CreateAvailabilityInput, ID } from '@/types';
import { http } from './http/client';

export const availabilityService = {
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
