import type { ScheduleResponseDto } from '../../schedules/dtos/schedule-response.dto';

export class EventResponseDto {
  id: string;
  churchId: string;
  name: string;
  description: string | null;
  eventType: string;
  eventDate: Date;
  location: string | null;
  endDate: Date | null;
  active: boolean;
  recurrenceRule: string | null;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
  schedules?: ScheduleResponseDto[];
}
