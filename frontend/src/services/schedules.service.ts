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

  async confirm(churchId: ID, scheduleId: ID): Promise<Schedule> {
    const { data } = await http.post<Schedule>(
      `/churches/${churchId}/schedules/${scheduleId}/confirm`,
    );
    return data;
  },

  async decline(churchId: ID, scheduleId: ID): Promise<Schedule> {
    const { data } = await http.post<Schedule>(
      `/churches/${churchId}/schedules/${scheduleId}/decline`,
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
