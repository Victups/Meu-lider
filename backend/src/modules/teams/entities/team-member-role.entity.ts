import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { TeamMember } from './team-member.entity';
import { TeamRole } from './team-role.entity';

/**
 * Which positions a team member can cover. One person often fills several —
 * the keyboard player who also sings — so the scheduler needs the full set.
 */
@Entity('team_member_roles')
@Unique(['teamMemberId', 'teamRoleId'])
export class TeamMemberRole {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  teamMemberId: string;

  @Column({ type: 'uuid', nullable: false })
  teamRoleId: string;

  /** Preferred position when the scheduler has to choose between several. */
  @Column({ type: 'boolean', default: false })
  isPrimary: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => TeamMember, (member) => member.roles, { onDelete: 'CASCADE' })
  teamMember: TeamMember;

  @ManyToOne(() => TeamRole, (role) => role.assignments, { onDelete: 'CASCADE' })
  teamRole: TeamRole;
}
