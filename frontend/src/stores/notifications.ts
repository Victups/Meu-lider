import { create } from 'zustand';
import { notificationsService } from '@/services';

interface NotificationsState {
  unread: number;
  /** Best effort: a failed count must never break the screen that asked for it. */
  refresh: () => Promise<void>;
  setUnread: (count: number) => void;
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  unread: 0,
  refresh: async () => {
    try {
      set({ unread: await notificationsService.unreadCount() });
    } catch {
      // keep the previous number
    }
  },
  setUnread: (count) => set({ unread: Math.max(0, count) }),
}));
