import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { Church } from '../../churches/entities/church.entity';
import { User } from '../../users/entities/user.entity';
import { Schedule } from '../../schedules/entities/schedule.entity';
import { EventTeam } from './event-team.entity';

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  churchId: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 100, default: 'culto' })
  eventType: string;

  @Column({ type: 'timestamptz', nullable: false })
  eventDate: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  location: string;

  @Column({ type: 'timestamptz', nullable: true })
  endDate: Date;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ type: 'varchar', length: 500, nullable: true })
  recurrenceRule: string;

  @Column({ type: 'uuid', nullable: true })
  createdById: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Church, (church) => church.events, { onDelete: 'CASCADE' })
  church: Church;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  createdBy: User;

  @OneToMany(() => EventTeam, (eventTeam) => eventTeam.event)
  teams: EventTeam[];

  @OneToMany(() => Schedule, (schedule) => schedule.event)
  schedules: Schedule[];
}
