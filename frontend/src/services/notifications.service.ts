import type { ID, Notification } from '@/types';
import { http } from './http/client';

export const notificationsService = {
  async list(onlyUnread?: boolean): Promise<Notification[]> {
    const { data } = await http.get<Notification[]>('/notifications', {
      params: onlyUnread ? { unread: true } : undefined,
    });
    return data;
  },

  async markAsRead(notificationId: ID): Promise<Notification> {
    const { data } = await http.put<Notification>(`/notifications/${notificationId}/read`);
    return data;
  },

  async markAllAsRead(): Promise<void> {
    await http.post('/notifications/read-all');
  },

  async registerPushToken(token: string): Promise<void> {
    await http.post('/notifications/register-token', { token });
  },

  async removePushToken(): Promise<void> {
    await http.post('/notifications/remove-token');
  },
};
