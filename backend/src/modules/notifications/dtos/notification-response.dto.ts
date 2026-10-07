import type { ScheduleResponseDto } from '../../schedules/dtos/schedule-response.dto';
import type { UserResponseDto } from '../../users/dtos/user-response.dto';
import type { NotificationType } from '../entities/notification.entity';

export class NotificationResponseDto {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  relatedScheduleId: string | null;
  relatedEventId: string | null;
  relatedSwapId: string | null;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
  user?: UserResponseDto;
  relatedSchedule?: ScheduleResponseDto;
}
