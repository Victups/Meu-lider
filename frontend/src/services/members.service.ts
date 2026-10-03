import type { ID, Member } from '@/types';
import { http } from './http/client';

export const membersService = {
  async list(churchId: ID): Promise<Member[]> {
    const { data } = await http.get<Member[]>(`/churches/${churchId}/members`);
    return data;
  },

  async getById(churchId: ID, memberId: ID): Promise<Member> {
    const { data } = await http.get<Member>(`/churches/${churchId}/members/${memberId}`);
    return data;
  },

  async create(churchId: ID, input: Partial<Member>): Promise<Member> {
    const { data } = await http.post<Member>(`/churches/${churchId}/members`, input);
    return data;
  },

  async update(churchId: ID, memberId: ID, input: Partial<Member>): Promise<Member> {
    const { data } = await http.put<Member>(`/churches/${churchId}/members/${memberId}`, input);
    return data;
  },
};
