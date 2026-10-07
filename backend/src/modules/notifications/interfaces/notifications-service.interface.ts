import type { NotificationResponseDto } from '../dtos/notification-response.dto';

/** Every operation is scoped to the owner: nobody reads or edits someone else's inbox. */
export interface INotificationsService {
  findOne(id: string, userId: string): Promise<NotificationResponseDto>;
  findByUser(userId: string, unreadOnly?: boolean): Promise<NotificationResponseDto[]>;
  countUnread(userId: string): Promise<number>;
  markAsRead(id: string, userId: string): Promise<NotificationResponseDto>;
  markAllAsRead(userId: string): Promise<void>;
  remove(id: string, userId: string): Promise<void>;
}
