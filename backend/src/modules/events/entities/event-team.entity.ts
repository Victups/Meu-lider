import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Team } from '../../teams/entities/team.entity';
import { Event } from './event.entity';

/**
 * Which teams an event actually needs. A rehearsal needs the band but not the
 * media crew, so without this the scheduler would staff every team in the
 * church for every event.
 */
@Entity('event_teams')
@Unique(['eventId', 'teamId'])
export class EventTeam {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  eventId: string;

  @Column({ type: 'uuid', nullable: false })
  teamId: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Event, (event) => event.teams, { onDelete: 'CASCADE' })
  event: Event;

  @ManyToOne(() => Team, { onDelete: 'CASCADE' })
  team: Team;
}
