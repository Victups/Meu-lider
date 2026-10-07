import { toOptionalScheduleSummary } from '../../schedules/mappers/schedule.mapper';
import { toOptionalUserResponse } from '../../users/mappers/user.mapper';
import { NotificationResponseDto } from '../dtos/notification-response.dto';
import { Notification } from '../entities/notification.entity';

export function toNotificationResponse(notification: Notification): NotificationResponseDto {
  return {
    id: notification.id,
    userId: notification.userId,
    title: notification.title,
    message: notification.message,
    type: notification.type,
    relatedScheduleId: notification.relatedScheduleId ?? null,
    relatedEventId: notification.relatedEventId ?? null,
    relatedSwapId: notification.relatedSwapId ?? null,
    isRead: notification.isRead,
    readAt: notification.readAt ?? null,
    createdAt: notification.createdAt,
    user: toOptionalUserResponse(notification.user),
    relatedSchedule: toOptionalScheduleSummary(notification.relatedSchedule),
  };
}

export function toNotificationResponseList(
  notifications: Notification[],
): NotificationResponseDto[] {
  return notifications.map(toNotificationResponse);
}
