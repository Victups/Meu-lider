import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Member } from '../../members/entities/member.entity';
import { Schedule } from './schedule.entity';

export enum SwapStatus {
  OPEN = 'OPEN',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  CANCELLED = 'CANCELLED',
}

/**
 * A member asking to be replaced on a schedule. `targetMemberId` is null for an
 * open call to the whole team; set when one specific person is asked.
 */
@Entity('schedule_swaps')
export class ScheduleSwap {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  scheduleId: string;

  @Column({ type: 'uuid', nullable: false })
  requestedByMemberId: string;

  @Column({ type: 'uuid', nullable: true })
  targetMemberId: string | null;

  @Column({ type: 'uuid', nullable: true })
  acceptedByMemberId: string | null;

  @Column({ type: 'enum', enum: SwapStatus, default: SwapStatus.OPEN })
  status: SwapStatus;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  respondedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Schedule, { onDelete: 'CASCADE' })
  schedule: Schedule;

  @ManyToOne(() => Member, { onDelete: 'CASCADE' })
  requestedByMember: Member;

  @ManyToOne(() => Member, { onDelete: 'SET NULL', nullable: true })
  acceptedByMember: Member | null;
}
