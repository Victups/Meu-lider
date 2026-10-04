import type { CreateScheduleInput, ID, Schedule, ScheduleStatistics } from '@/types';
import { http } from './http/client';

export const schedulesService = {
  async listByEvent(churchId: ID, eventId: ID): Promise<Schedule[]> {
    const { data } = await http.get<Schedule[]>(`/churches/${churchId}/schedules/events/${eventId}`);
    return data;
  },

  async listByMember(churchId: ID, memberId: ID): Promise<Schedule[]> {
    const { data } = await http.get<Schedule[]>(
      `/churches/${churchId}/schedules/members/${memberId}`,
    );
    return data;
  },

  async create(churchId: ID, input: CreateScheduleInput): Promise<Schedule> {
    const { data } = await http.post<Schedule>(`/churches/${churchId}/schedules`, input);
    return data;
  },

  /** Member asking out of their own slot; the reason is required by the API. */
  async requestRelease(churchId: ID, scheduleId: ID, reason: string): Promise<Schedule> {
    const { data } = await http.post<Schedule>(
      `/churches/${churchId}/schedules/${scheduleId}/release-request`,
      { reason },
    );
    return data;
  },

  /** Leader agrees: the slot opens and the engine picks a replacement. */
  async approveRelease(churchId: ID, scheduleId: ID): Promise<Schedule> {
    const { data } = await http.post<Schedule>(
      `/churches/${churchId}/schedules/${scheduleId}/release-request/approve`,
    );
    return data;
  },

  async rejectRelease(churchId: ID, scheduleId: ID): Promise<Schedule> {
    const { data } = await http.post<Schedule>(
      `/churches/${churchId}/schedules/${scheduleId}/release-request/reject`,
    );
    return data;
  },

  /** Leader removing someone directly, without a request from them. */
  async releaseByLeader(churchId: ID, scheduleId: ID, reason?: string): Promise<Schedule> {
    const { data } = await http.post<Schedule>(
      `/churches/${churchId}/schedules/${scheduleId}/release`,
      { reason },
    );
    return data;
  },

  async remove(churchId: ID, scheduleId: ID): Promise<void> {
    await http.delete(`/churches/${churchId}/schedules/${scheduleId}`);
  },

  async statistics(churchId: ID, eventId: ID): Promise<ScheduleStatistics> {
    const { data } = await http.get<ScheduleStatistics>(
      `/churches/${churchId}/schedules/events/${eventId}/statistics`,
    );
    return data;
  },
};
