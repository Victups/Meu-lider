import type { Church, CreateChurchInput, ID, UpdateChurchInput } from '@/types';
import { http } from './http/client';

export const churchesService = {
  async listMine(): Promise<Church[]> {
    const { data } = await http.get<Church[]>('/churches');
    return data;
  },

  async getById(churchId: ID): Promise<Church> {
    const { data } = await http.get<Church>(`/churches/${churchId}`);
    return data;
  },

  async create(input: CreateChurchInput): Promise<Church> {
    const { data } = await http.post<Church>('/churches', input);
    return data;
  },

  async update(churchId: ID, input: UpdateChurchInput): Promise<Church> {
    const { data } = await http.put<Church>(`/churches/${churchId}`, input);
    return data;
  },
};
