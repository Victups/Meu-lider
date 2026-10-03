import type { CreateNotificationDto } from '../dtos/create-notification.dto';
import type { NotificationResponseDto } from '../dtos/notification-response.dto';

export interface INotificationsService {
  create(createNotificationDto: CreateNotificationDto): Promise<NotificationResponseDto>;
  findOne(id: string): Promise<NotificationResponseDto>;
  findByUser(userId: string, unreadOnly?: boolean): Promise<NotificationResponseDto[]>;
  markAsRead(id: string): Promise<NotificationResponseDto>;
  markAllAsRead(userId: string): Promise<void>;
  remove(id: string): Promise<void>;
}
