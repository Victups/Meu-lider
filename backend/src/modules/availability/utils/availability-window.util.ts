import { Repository } from 'typeorm';
import { differenceInCalendarDays } from '../../../common/utils';
import { Availability } from '../entities/availability.entity';

/**
 * Semantics of `Availability.isAvailable`, decided once and shared by the
 * scheduling engine and the swap flow.
 *
 * The model is default-available (opt-out): a member with no record at all can
 * serve on any date. A record is an exception to that default —
 *   `isAvailable = false` blocks the window (viagem, férias, trabalho);
 *   `isAvailable = true`  re-opens it, which is the only reason the flag is not
 *                         simply a "blocked" boolean: it lets a member punch a
 *                         hole in a longer block ("viajo o mês todo, menos dia 12").
 *
 * When several records cover the same day the narrowest window wins, with the
 * most recently created one breaking a tie. Narrowest-wins is what stops a
 * blanket year-long record — easy to create by accident, since the create DTO
 * defaults `isAvailable` to true — from quietly cancelling a one-week vacation.
 */

/**
 * Records covering `day` (a `YYYY-MM-DD` string) for the given members. The
 * comparison is done in SQL so the `date` columns never go through JavaScript's
 * timezone handling on the way in.
 */
export async function findAvailabilityWindowsForDay(
  repository: Repository<Availability>,
  memberIds: string[],
  day: string,
): Promise<Availability[]> {
  if (memberIds.length === 0) {
    return [];
  }

  return repository
    .createQueryBuilder('availability')
    .where('availability.memberId IN (:...memberIds)', { memberIds })
    .andWhere('availability.dateFrom <= CAST(:day AS date)', { day })
    .andWhere('availability.dateTo >= CAST(:day AS date)', { day })
    .getMany();
}

/** The record that decides the day, out of the ones covering it. */
export function pickGoverningWindow(windows: Availability[]): Availability | null {
  let governing: Availability | null = null;

  for (const window of windows) {
    if (!governing || isNarrowerWindow(window, governing)) {
      governing = window;
    }
  }

  return governing;
}

/** `windows` must already be filtered to the records covering the date. */
export function isAvailableForWindows(windows: Availability[]): boolean {
  return pickGoverningWindow(windows)?.isAvailable !== false;
}

function isNarrowerWindow(candidate: Availability, current: Availability): boolean {
  const candidateSpan = differenceInCalendarDays(candidate.dateTo, candidate.dateFrom);
  const currentSpan = differenceInCalendarDays(current.dateTo, current.dateFrom);

  if (candidateSpan !== currentSpan) {
    return candidateSpan < currentSpan;
  }

  return candidate.createdAt.getTime() > current.createdAt.getTime();
}
