import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Member } from '../../members/entities/member.entity';

/**
 * A member's standing rule for a weekday — "I can only serve on weekends".
 * Absent rows mean available, so a member who never opens the screen stays in
 * the rotation. Point-in-time absences live in Availability instead.
 */
@Entity('member_weekday_availability')
@Unique(['memberId', 'weekday'])
export class WeekdayAvailability {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  memberId: string;

  /** 0 = Sunday … 6 = Saturday, matching JavaScript's getDay(). */
  @Column({ type: 'smallint', nullable: false })
  weekday: number;

  @Column({ type: 'boolean', default: true })
  isAvailable: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Member, { onDelete: 'CASCADE' })
  member: Member;
}
