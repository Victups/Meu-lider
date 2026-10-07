import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Church } from '../../churches/entities/church.entity';
import { Team } from '../../teams/entities/team.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Short code a leader hands to a newcomer. Replaces typing a 36-character
 * church id: the code resolves the church (and optionally a team to join).
 */
@Entity('invitations')
export class Invitation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 12, nullable: false })
  code: string;

  @Column({ type: 'uuid', nullable: false })
  churchId: string;

  /** When set, whoever signs up with this code also joins this team. */
  @Column({ type: 'uuid', nullable: true })
  teamId: string | null;

  @Column({ type: 'uuid', nullable: true })
  createdById: string | null;

  @Column({ type: 'timestamptz', nullable: false })
  expiresAt: Date;

  /** Null means unlimited uses until it expires or is revoked. */
  @Column({ type: 'int', nullable: true })
  maxUses: number | null;

  @Column({ type: 'int', default: 0 })
  usedCount: number;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Church, { onDelete: 'CASCADE' })
  church: Church;

  @ManyToOne(() => Team, { onDelete: 'CASCADE', nullable: true })
  team: Team | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  createdBy: User | null;
}
