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
  relatedScheduleId: string;

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
