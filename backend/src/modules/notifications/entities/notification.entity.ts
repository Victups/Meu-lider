import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Schedule } from '../../schedules/entities/schedule.entity';

export enum NotificationType {
  SCHEDULE_ASSIGNED = 'SCHEDULE_ASSIGNED',
  SCHEDULE_CHANGED = 'SCHEDULE_CHANGED',
  CONFIRMATION_REQUESTED = 'CONFIRMATION_REQUESTED',
  SCHEDULE_CANCELLED = 'SCHEDULE_CANCELLED',
  SCHEDULE_REMINDER = 'SCHEDULE_REMINDER',
  AVAILABILITY_REMINDER = 'AVAILABILITY_REMINDER',
  /** A leader is told an event exists that their team may need to staff. */
  EVENT_CREATED = 'EVENT_CREATED',
  /** A member asked a leader to be released from a schedule. */
  RELEASE_REQUESTED = 'RELEASE_REQUESTED',
  /** A colleague asked to swap or hand over a slot. */
  SWAP_REQUESTED = 'SWAP_REQUESTED',
  /** The colleague answered the swap — accepted or declined. */
  SWAP_RESPONDED = 'SWAP_RESPONDED',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  userId: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  title: string;

  @Column({ type: 'text', nullable: false })
  message: string;

  @Column({ type: 'enum', enum: NotificationType, nullable: false })
  type: NotificationType;

  @Column({ type: 'uuid', nullable: true })
  relatedScheduleId: string | null;

  /** Where tapping the notification should land. */
  @Column({ type: 'uuid', nullable: true })
  relatedEventId: string | null;

  @Column({ type: 'uuid', nullable: true })
  relatedSwapId: string | null;

  /**
   * Which reminder window this row answers (24, 12 or 1 hours before). Together
   * with `relatedScheduleId` it is the idempotency key of the reminder job.
   */
  @Column({ type: 'smallint', nullable: true })
  reminderHours: number | null;

  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  readAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.notifications, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Schedule, { onDelete: 'SET NULL', nullable: true })
  relatedSchedule: Schedule;
}
