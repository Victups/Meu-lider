import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { Member } from '../../members/entities/member.entity';

@Entity('availability')
export class Availability {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  memberId: string;

  @Column({ type: 'date', nullable: false })
  dateFrom: Date;

  @Column({ type: 'date', nullable: false })
  dateTo: Date;

  @Column({ type: 'boolean', default: true })
  isAvailable: boolean;

  @Column({ type: 'varchar', length: 500, nullable: true })
  reason: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Member, (member) => member.availabilities, { onDelete: 'CASCADE' })
  member: Member;
}
