import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Team } from './team.entity';
import { TeamMemberRole } from './team-member-role.entity';

/** A position within a team: "Vocal", "Baixo", "Fotógrafo". */
@Entity('team_roles')
@Unique(['teamId', 'slug'])
export class TeamRole {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  teamId: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  name: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  slug: string;

  @Column({ type: 'varchar', length: 7, nullable: true })
  color: string | null;

  /** How many people this position normally needs per event. */
  @Column({ type: 'int', default: 1 })
  defaultSlots: number;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Team, (team) => team.roles, { onDelete: 'CASCADE' })
  team: Team;

  @OneToMany(() => TeamMemberRole, (assignment) => assignment.teamRole)
  assignments: TeamMemberRole[];
}
