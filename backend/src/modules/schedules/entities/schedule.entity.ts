import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, Unique } from 'typeorm';
import { Event } from '../../events/entities/event.entity';
import { Team } from '../../teams/entities/team.entity';
import { TeamRole } from '../../teams/entities/team-role.entity';
import { Member } from '../../members/entities/member.entity';
import { User } from '../../users/entities/user.entity';

export enum ScheduleStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

@Entity('schedules')
@Unique(['event', 'team', 'member'])
export class Schedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  eventId: string;

  @Column({ type: 'uuid', nullable: false })
  teamId: string;

  @Column({ type: 'uuid', nullable: false })
  memberId: string;

  @Column({ type: 'uuid', nullable: false })
  teamRoleId: string;

  @Column({ type: 'enum', enum: ScheduleStatus, default: ScheduleStatus.PENDING })
  status: ScheduleStatus;

  @Column({ type: 'timestamptz', nullable: true })
  confirmedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  confirmedById: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Event, (event) => event.schedules, { onDelete: 'CASCADE' })
  event: Event;

  @ManyToOne(() => Team, (team) => team.schedules, { onDelete: 'CASCADE' })
  team: Team;

  @ManyToOne(() => TeamRole, { onDelete: 'RESTRICT' })
  teamRole: TeamRole;

  @ManyToOne(() => Member, (member) => member.schedules, { onDelete: 'CASCADE' })
  member: Member;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  confirmedBy: User;
}
