import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { Church } from '../../churches/entities/church.entity';
import { User } from '../../users/entities/user.entity';
import { TeamMember } from '../../teams/entities/team-member.entity';
import { Schedule } from '../../schedules/entities/schedule.entity';
import { Availability } from '../../availability/entities/availability.entity';

@Entity('members')
export class Member {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false, unique: true })
  userId: string;

  @Column({ type: 'uuid', nullable: false })
  churchId: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  fullName: string;

  @Column({ type: 'varchar', length: 14, unique: true, nullable: true })
  cpf: string;

  @Column({ type: 'date', nullable: true })
  birthDate: Date;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  joinedAt: Date;

  @Column({ type: 'varchar', length: 50, default: 'active' })
  status: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  // Relations
  // userId is NOT NULL, so the member row cannot outlive its account.
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Church, (church) => church.members, { onDelete: 'CASCADE' })
  church: Church;

  @OneToMany(() => TeamMember, (tm) => tm.member)
  teamMemberships: TeamMember[];

  @OneToMany(() => Schedule, (schedule) => schedule.member)
  schedules: Schedule[];

  @OneToMany(() => Availability, (availability) => availability.member)
  availabilities: Availability[];
}
