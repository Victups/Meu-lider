import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsDate, IsOptional, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { Repository } from 'typeorm';
import { Schedule } from '../entities/schedule.entity';

const HOLDING = `('SCHEDULED','CONFIRMED','RELEASE_REQUESTED')`;

export class ParticipationQueryDto {
  @Type(() => Date)
  @IsDate()
  from: Date;

  @Type(() => Date)
  @IsDate()
  to: Date;

  @IsOptional()
  @IsUUID()
  teamId?: string;
}

export class MemberParticipationDto {
  memberId: string;
  fullName: string;
  /** Events that already happened where they held a slot and were not marked absent. */
  served: number;
  noShow: number;
  /** Still ahead. */
  upcoming: number;
}

/** Who carries the rota: served, missed and upcoming per person in a period. */
@Injectable()
export class ScheduleReportsService {
  constructor(
    @InjectRepository(Schedule)
    private readonly schedulesRepository: Repository<Schedule>,
  ) {}

  async participation(
    churchId: string,
    { from, to, teamId }: ParticipationQueryDto,
  ): Promise<MemberParticipationDto[]> {
    const rows = await this.schedulesRepository
      .createQueryBuilder('s')
      .innerJoin('s.event', 'e')
      .innerJoin('s.member', 'm')
      .select('m.id', 'memberId')
      .addSelect('m.fullName', 'fullName')
      .addSelect(`COUNT(*) FILTER (WHERE s.status IN ${HOLDING} AND e."eventDate" <= now())`, 'served')
      .addSelect(`COUNT(*) FILTER (WHERE s.status = 'NO_SHOW')`, 'noShow')
      .addSelect(`COUNT(*) FILTER (WHERE s.status IN ${HOLDING} AND e."eventDate" > now())`, 'upcoming')
      .where('e.churchId = :churchId AND e.active = true', { churchId })
      .andWhere('e.eventDate BETWEEN :from AND :to', { from, to })
      .andWhere(teamId ? 's.teamId = :teamId' : '1=1', { teamId })
      .groupBy('m.id')
      .orderBy('"served"', 'DESC')
      .addOrderBy('m.fullName', 'ASC')
      .getRawMany<Record<keyof MemberParticipationDto, string>>();

    return rows.map((row) => ({
      memberId: row.memberId,
      fullName: row.fullName,
      served: Number(row.served),
      noShow: Number(row.noShow),
      upcoming: Number(row.upcoming),
    }));
  }
}
