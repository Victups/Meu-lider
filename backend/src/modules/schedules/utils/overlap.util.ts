import { Repository } from 'typeorm';
import { DEFAULT_EVENT_DURATION_HOURS } from '../../../common/constants';
import { Schedule, ScheduleStatus } from '../entities/schedule.entity';

const HOUR_MS = 60 * 60 * 1000;

export interface TimedEvent {
  id: string;
  eventDate: Date;
  endDate?: Date | null;
}

/**
 * Members already serving at another event that overlaps `event` — two services
 * on the same night, or a rehearsal running into a service. Events without an
 * end time are assumed to last a couple of hours. `ignoreScheduleIds` lets a
 * swap discount the very slot the person is giving up.
 */
export async function findMemberIdsBusyDuring(
  schedulesRepository: Repository<Schedule>,
  memberIds: string[],
  event: TimedEvent,
  ignoreScheduleIds: string[] = [],
): Promise<Set<string>> {
  if (memberIds.length === 0) return new Set();

  const start = event.eventDate;
  const end = event.endDate ?? new Date(start.getTime() + DEFAULT_EVENT_DURATION_HOURS * HOUR_MS);

  let query = schedulesRepository
    .createQueryBuilder('schedule')
    .innerJoin('schedule.event', 'other')
    .select('schedule.memberId', 'memberId')
    .distinct(true)
    .where('schedule.memberId IN (:...memberIds)', { memberIds })
    .andWhere('schedule.status != :cancelled', { cancelled: ScheduleStatus.CANCELLED })
    .andWhere('other.id != :eventId', { eventId: event.id })
    .andWhere('other.active = true')
    .andWhere('other.eventDate < :end', { end })
    .andWhere(
      `COALESCE(other.endDate, other.eventDate + INTERVAL '${DEFAULT_EVENT_DURATION_HOURS} hours') > :start`,
      { start },
    );

  if (ignoreScheduleIds.length > 0) {
    query = query.andWhere('schedule.id NOT IN (:...ignoreScheduleIds)', { ignoreScheduleIds });
  }

  const rows = await query.getRawMany<{ memberId: string }>();
  return new Set(rows.map((row) => row.memberId));
}
