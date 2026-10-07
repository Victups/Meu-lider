import type { CreateSwapInput, ID, MySwaps, Schedule, ScheduleSwap, SwapCandidateMember } from '@/types';
import { http } from './http/client';

export const swapsService = {
  async mine(churchId: ID): Promise<MySwaps> {
    const { data } = await http.get<MySwaps>(`/churches/${churchId}/swaps/mine`);
    return data;
  },

  /** Colleagues' schedules the member could trade days with. */
  async exchangeCandidates(churchId: ID, scheduleId: ID): Promise<Schedule[]> {
    const { data } = await http.get<Schedule[]>(`/churches/${churchId}/swaps/exchange-candidates`, {
      params: { scheduleId },
    });
    return data;
  },

  /** Team members who could take the slot over outright. */
  async handoverCandidates(churchId: ID, scheduleId: ID): Promise<SwapCandidateMember[]> {
    const { data } = await http.get<SwapCandidateMember[]>(
      `/churches/${churchId}/swaps/handover-candidates`,
      { params: { scheduleId } },
    );
    return data;
  },

  async request(churchId: ID, input: CreateSwapInput): Promise<ScheduleSwap> {
    const { data } = await http.post<ScheduleSwap>(`/churches/${churchId}/swaps`, input);
    return data;
  },

  async accept(churchId: ID, swapId: ID): Promise<ScheduleSwap> {
    const { data } = await http.post<ScheduleSwap>(`/churches/${churchId}/swaps/${swapId}/accept`);
    return data;
  },

  async decline(churchId: ID, swapId: ID): Promise<ScheduleSwap> {
    const { data } = await http.post<ScheduleSwap>(`/churches/${churchId}/swaps/${swapId}/decline`);
    return data;
  },

  async cancel(churchId: ID, swapId: ID): Promise<ScheduleSwap> {
    const { data } = await http.post<ScheduleSwap>(`/churches/${churchId}/swaps/${swapId}/cancel`);
    return data;
  },
};
