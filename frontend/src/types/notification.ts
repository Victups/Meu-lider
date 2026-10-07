import type { ID, ISODateString } from './common';

export const NotificationType = {
  SCHEDULE_ASSIGNED: 'SCHEDULE_ASSIGNED',
  SCHEDULE_CHANGED: 'SCHEDULE_CHANGED',
  CONFIRMATION_REQUESTED: 'CONFIRMATION_REQUESTED',
  SCHEDULE_CANCELLED: 'SCHEDULE_CANCELLED',
  SCHEDULE_REMINDER: 'SCHEDULE_REMINDER',
  AVAILABILITY_REMINDER: 'AVAILABILITY_REMINDER',
  EVENT_CREATED: 'EVENT_CREATED',
  RELEASE_REQUESTED: 'RELEASE_REQUESTED',
  SWAP_REQUESTED: 'SWAP_REQUESTED',
  SWAP_RESPONDED: 'SWAP_RESPONDED',
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
  relatedEventId: ID | null;
  relatedSwapId: ID | null;
  isRead: boolean;
  readAt: ISODateString | null;
  createdAt: ISODateString;
}
