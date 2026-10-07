import { In, Repository } from 'typeorm';
import { Availability } from '../entities/availability.entity';
import { WeekdayAvailability } from '../entities/weekday-availability.entity';
import { findAvailabilityWindowsForDay, isAvailableForWindows } from './availability-window.util';

/**
 * Members who cannot serve on `day` (`YYYY-MM-DD`): blocked by a dated window
 * ("viajo dia 12") or by a standing weekday rule ("só aos fins de semana").
 *
 * One definition for the scheduling engine and the swap flow, so a swap can
 * never put on a Tuesday someone the engine would never have scheduled there.
 * Only rows explicitly set to unavailable count for the weekday rule, so a
 * member who never opened the screen stays eligible.
 */
export async function findUnavailableMemberIdsForDay(
  availabilityRepository: Repository<Availability>,
  weekdayRepository: Repository<WeekdayAvailability>,
  memberIds: string[],
  day: string,
): Promise<Set<string>> {
  const unavailable = new Set<string>();

  if (memberIds.length === 0) {
    return unavailable;
  }

  const windows = await findAvailabilityWindowsForDay(availabilityRepository, memberIds, day);

  const windowsByMember = new Map<string, Availability[]>();
  for (const window of windows) {
    const bucket = windowsByMember.get(window.memberId) ?? [];
    bucket.push(window);
    windowsByMember.set(window.memberId, bucket);
  }

  for (const [memberId, memberWindows] of windowsByMember) {
    if (!isAvailableForWindows(memberWindows)) {
      unavailable.add(memberId);
    }
  }

  // `day` is YYYY-MM-DD; the T12:00 keeps the weekday from shifting with the timezone.
  const weekday = new Date(`${day}T12:00:00`).getDay();

  const blocked = await weekdayRepository.find({
    where: { memberId: In(memberIds), weekday, isAvailable: false },
    select: { memberId: true },
  });

  for (const entry of blocked) {
    unavailable.add(entry.memberId);
  }

  return unavailable;
}
