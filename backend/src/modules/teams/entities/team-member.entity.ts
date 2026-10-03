import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, Unique } from 'typeorm';
import { Team } from './team.entity';
import { TeamMemberRole } from './team-member-role.entity';
import { Member } from '../../members/entities/member.entity';

@Entity('team_members')
@Unique(['team', 'member'])
export class TeamMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  teamId: string;

  @Column({ type: 'uuid', nullable: false })
  memberId: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  role: string;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  startedAt: Date;

  @Column({ type: 'date', nullable: true })
  endedAt: Date;

  @Column({ type: 'boolean', default: false })
  isLeader: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Team, (team) => team.members, { onDelete: 'CASCADE' })
  team: Team;

  @ManyToOne(() => Member, (member) => member.teamMemberships, { onDelete: 'CASCADE' })
  member: Member;

  @OneToMany(() => TeamMemberRole, (assignment) => assignment.teamMember)
  roles: TeamMemberRole[];
}
