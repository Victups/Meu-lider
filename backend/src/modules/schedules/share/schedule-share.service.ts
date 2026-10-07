import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CONFIG_DEFAULTS, ResourceType } from '../../../common/constants';
import { ResourceNotFoundException } from '../../../common/exceptions';
import {
  MONTH_LABELS,
  formatShortDate,
  formatTime,
  formatWeekday,
} from '../../../common/utils';
import { Church } from '../../churches/entities/church.entity';
import { Team } from '../../teams/entities/team.entity';
import { Schedule, ScheduleStatus } from '../entities/schedule.entity';
import { ShareTextDto } from './dtos/share-text.dto';

const DIVIDER = '━━━━━━━━━━━━━━━━━━';
const FOOTER = '_Qualquer imprevisto, avise com antecedência para trocarmos._';

/**
 * The month's roster as a message ready for WhatsApp, for the groups whose
 * members are not on the app yet — or just prefer reading it there.
 *
 * Events appear in date order, positions alphabetically inside each one, and
 * only people actually holding a slot are listed (cancelled rows are history).
 */
@Injectable()
export class ScheduleShareService {
  constructor(
    @InjectRepository(Schedule)
    private readonly schedulesRepository: Repository<Schedule>,
    @InjectRepository(Church)
    private readonly churchesRepository: Repository<Church>,
    @InjectRepository(Team)
    private readonly teamsRepository: Repository<Team>,
  ) {}

  async buildMonthText(churchId: string, month: string, teamId?: string): Promise<ShareTextDto> {
    const church = await this.churchesRepository.findOne({ where: { id: churchId } });
    if (!church) throw new ResourceNotFoundException(ResourceType.CHURCH, churchId);

    const team = teamId
      ? await this.teamsRepository.findOne({ where: { id: teamId, churchId } })
      : null;
    if (teamId && !team) throw new ResourceNotFoundException(ResourceType.TEAM, teamId);

    // The month is read in the app timezone by the database, not shifted by hand.
    const schedules = await this.schedulesRepository
      .createQueryBuilder('schedule')
      .innerJoinAndSelect('schedule.event', 'event')
      .leftJoinAndSelect('schedule.member', 'member')
      .leftJoinAndSelect('schedule.teamRole', 'teamRole')
      .where('event.churchId = :churchId AND event.active = true', { churchId })
      .andWhere('schedule.status != :cancelled', { cancelled: ScheduleStatus.CANCELLED })
      .andWhere(`to_char(event."eventDate" AT TIME ZONE :tz, 'YYYY-MM') = :month`, {
        tz: process.env.APP_TIMEZONE ?? CONFIG_DEFAULTS.APP_TIMEZONE,
        month,
      })
      .andWhere(teamId ? 'schedule.teamId = :teamId' : '1=1', { teamId })
      .getMany();

    const [year, monthNumber] = month.split('-').map(Number);
    const heading = `${MONTH_LABELS[monthNumber - 1]} ${year}`;
    const subtitle = team ? `Equipe ${team.name}` : church.name;

    const byEvent = new Map<string, Schedule[]>();
    for (const schedule of schedules) {
      byEvent.set(schedule.eventId, [...(byEvent.get(schedule.eventId) ?? []), schedule]);
    }

    const events = [...byEvent.values()].sort(
      (a, b) => a[0].event.eventDate.getTime() - b[0].event.eventDate.getTime(),
    );

    const lines: string[] = [`*ESCALA ${heading}*`, `*${subtitle}*`, '', DIVIDER, ''];

    for (const entries of events) {
      const { event } = entries[0];

      lines.push(
        `*${formatShortDate(event.eventDate)} (${formatWeekday(event.eventDate)}) - ${formatTime(event.eventDate)}*`,
        `📌 ${event.name}`,
      );

      const byRole = new Map<string, string[]>();
      for (const entry of entries) {
        const role = entry.teamRole?.name ?? 'Equipe';
        byRole.set(role, [...(byRole.get(role) ?? []), entry.member?.fullName ?? '—']);
      }

      for (const role of [...byRole.keys()].sort((a, b) => a.localeCompare(b, 'pt-BR'))) {
        const names = (byRole.get(role) ?? []).sort((a, b) => a.localeCompare(b, 'pt-BR'));
        lines.push(`▸ ${role}: ${names.join(', ')}`);
      }

      lines.push('');
    }

    if (events.length === 0) {
      lines.push('Nenhuma escala montada para este mês ainda.', '');
    }

    lines.push(DIVIDER, FOOTER);

    return { month, text: lines.join('\n'), eventCount: events.length };
  }
}
