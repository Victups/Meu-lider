import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { Church } from '../../churches/entities/church.entity';
import { TeamMember } from './team-member.entity';
import { TeamRole } from './team-role.entity';
import { Schedule } from '../../schedules/entities/schedule.entity';

@Entity('teams')
export class Team {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  churchId: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 7, nullable: true })
  color: string;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Church, (church) => church.teams, { onDelete: 'CASCADE' })
  church: Church;

  @OneToMany(() => TeamMember, (tm) => tm.team)
  members: TeamMember[];

  @OneToMany(() => TeamRole, (role) => role.team)
  roles: TeamRole[];

  @OneToMany(() => Schedule, (schedule) => schedule.team)
  schedules: Schedule[];
}
