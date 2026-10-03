/**
 * Calendar helpers shared by the scheduling engine and the recurrence expander.
 *
 * Everything here works on the server's local timezone, which is assumed to be
 * the church's timezone — there is no per-church timezone column yet. The
 * `date` columns in Postgres (Availability.dateFrom/dateTo, TeamMember.endedAt)
 * come back from the driver as plain `YYYY-MM-DD` strings even though the
 * entities type them as `Date`, so every helper accepts both shapes.
 */

export const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
export const DAYS_PER_WEEK = 7;

export type DateLike = Date | string;

/** `YYYY-MM-DD` for the calendar day the value falls on. */
export function toDateOnlyString(value: DateLike): string {
  if (typeof value === 'string') {
    return value.slice(0, 10);
  }

  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/** Local midnight of the calendar day the value falls on. */
export function startOfDay(value: DateLike): Date {
  const [year, month, day] = toDateOnlyString(value).split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** Last millisecond of the calendar day the value falls on. */
export function endOfDay(value: DateLike): Date {
  const result = startOfDay(value);
  result.setHours(23, 59, 59, 999);

  return result;
}

export function addDays(value: Date, days: number): Date {
  const result = new Date(value.getTime());
  result.setDate(result.getDate() + days);

  return result;
}

export function addWeeks(value: Date, weeks: number): Date {
  return addDays(value, weeks * DAYS_PER_WEEK);
}

/**
 * Adds whole months keeping the day of the month. Returns null when the target
 * month has no such day (31 January + 1 month), so callers can skip it instead
 * of silently sliding the occurrence into the next month.
 */
export function addMonthsKeepingDayOfMonth(value: Date, months: number): Date | null {
  const dayOfMonth = value.getDate();
  const result = new Date(value.getTime());

  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  result.setDate(dayOfMonth);

  return result.getDate() === dayOfMonth ? result : null;
}

/** Whole calendar days between two values; negative when `later` comes first. */
export function differenceInCalendarDays(later: DateLike, earlier: DateLike): number {
  const diff = startOfDay(later).getTime() - startOfDay(earlier).getTime();
  return Math.round(diff / MILLISECONDS_PER_DAY);
}

/** Copies the time of day of `reference` onto the calendar day of `day`. */
export function withTimeOfDay(day: Date, reference: Date): Date {
  const result = new Date(day.getTime());

  result.setHours(
    reference.getHours(),
    reference.getMinutes(),
    reference.getSeconds(),
    reference.getMilliseconds(),
  );

  return result;
}
