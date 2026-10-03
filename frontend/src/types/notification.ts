import type { ID, ISODateString } from './common';

export const NotificationType = {
  SCHEDULE_ASSIGNED: 'SCHEDULE_ASSIGNED',
  SCHEDULE_CONFIRMED: 'SCHEDULE_CONFIRMED',
  SCHEDULE_CANCELLED: 'SCHEDULE_CANCELLED',
  SCHEDULE_REMINDER: 'SCHEDULE_REMINDER',
  GENERAL: 'GENERAL',
} as const;

export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

/** Notifications are append-only, so the API exposes no updatedAt. */
export interface Notification {
  id: ID;
  userId: ID;
  title: string;
  message: string;
  type: NotificationType;
  relatedScheduleId: ID | null;
  isRead: boolean;
  readAt: ISODateString | null;
  createdAt: ISODateString;
}
