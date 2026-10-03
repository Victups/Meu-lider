import {
  RECURRENCE_MAX_OCCURRENCES,
  RECURRENCE_WEEKDAY_CODES,
  RecurrenceFrequency,
} from '../../../common/constants';
import { InvalidRecurrenceRuleException } from '../../../common/exceptions';
import {
  addDays,
  addMonthsKeepingDayOfMonth,
  DAYS_PER_WEEK,
  startOfDay,
  toDateOnlyString,
  withTimeOfDay,
} from '../../../common/utils';

/**
 * A deliberately small subset of RRULE — enough for "culto de domingo, toda
 * semana" and "reunião de líderes, todo dia 15" without pulling an iCalendar
 * parser in. Anything outside the subset is rejected instead of ignored, so a
 * typo never silently produces the wrong series.
 *
 *   FREQ=WEEKLY;BYDAY=SU,WE;INTERVAL=1;UNTIL=2026-12-31
 *   FREQ=MONTHLY;INTERVAL=1;COUNT=12
 *   FREQ=DAILY;INTERVAL=2
 *
 * FREQ is required. INTERVAL defaults to 1. BYDAY is weekly-only and defaults to
 * the weekday of the event itself. COUNT is the size of the whole series,
 * counting the event that carries the rule. UNTIL is an inclusive calendar day.
 */
export interface RecurrencePattern {
  frequency: RecurrenceFrequency;
  interval: number;
  /** JavaScript weekday numbers (0 = Sunday); empty means "same as the anchor". */
  weekdays: number[];
  count: number | null;
  until: Date | null;
}

const MAX_INTERVAL = 52;
const UNTIL_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
/** Safety net for the expansion loops; never reached by a valid rule. */
const MAX_ITERATIONS = 1000;

export function parseRecurrenceRule(rule: string): RecurrencePattern {
  const parts = rule
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (parts.length === 0) {
    throw new InvalidRecurrenceRuleException(rule, 'a regra está vazia');
  }

  const pattern: RecurrencePattern = {
    frequency: RecurrenceFrequency.WEEKLY,
    interval: 1,
    weekdays: [],
    count: null,
    until: null,
  };

  let hasFrequency = false;

  for (const part of parts) {
    const [rawKey, rawValue] = part.split('=');
    const key = rawKey?.trim().toUpperCase();
    const value = rawValue?.trim().toUpperCase();

    if (!key || !value) {
      throw new InvalidRecurrenceRuleException(rule, `trecho inválido "${part}"`);
    }

    switch (key) {
      case 'FREQ':
        pattern.frequency = parseFrequency(rule, value);
        hasFrequency = true;
        break;
      case 'INTERVAL':
        pattern.interval = parseBoundedInteger(rule, 'INTERVAL', value, MAX_INTERVAL);
        break;
      case 'BYDAY':
        pattern.weekdays = parseWeekdays(rule, value);
        break;
      case 'COUNT':
        pattern.count = parseBoundedInteger(rule, 'COUNT', value, RECURRENCE_MAX_OCCURRENCES);
        break;
      case 'UNTIL':
        pattern.until = parseUntil(rule, value);
        break;
      default:
        throw new InvalidRecurrenceRuleException(rule, `campo desconhecido "${key}"`);
    }
  }

  if (!hasFrequency) {
    throw new InvalidRecurrenceRuleException(rule, 'FREQ é obrigatório');
  }

  if (pattern.weekdays.length > 0 && pattern.frequency !== RecurrenceFrequency.WEEKLY) {
    throw new InvalidRecurrenceRuleException(rule, 'BYDAY só vale com FREQ=WEEKLY');
  }

  return pattern;
}

/**
 * Occurrence dates strictly after `anchor` and no later than `horizon`, with the
 * anchor's time of day. The anchor itself is left out: it is the event that
 * already exists and carries the rule.
 */
export function expandRecurrence(
  anchor: Date,
  pattern: RecurrencePattern,
  horizon: Date,
): Date[] {
  const limit = Math.min(
    RECURRENCE_MAX_OCCURRENCES,
    pattern.count === null ? RECURRENCE_MAX_OCCURRENCES : Math.max(pattern.count - 1, 0),
  );

  if (limit === 0) {
    return [];
  }

  const candidates =
    pattern.frequency === RecurrenceFrequency.WEEKLY
      ? expandWeekly(anchor, pattern, horizon)
      : expandByStep(anchor, pattern, horizon);

  const untilDay = pattern.until ? toDateOnlyString(pattern.until) : null;

  return candidates
    .filter((date) => !untilDay || toDateOnlyString(date) <= untilDay)
    .slice(0, limit);
}

function expandWeekly(anchor: Date, pattern: RecurrencePattern, horizon: Date): Date[] {
  const weekdays = (pattern.weekdays.length > 0 ? pattern.weekdays : [anchor.getDay()])
    .slice()
    .sort((left, right) => left - right);

  const anchorWeekStart = addDays(startOfDay(anchor), -anchor.getDay());
  const occurrences: Date[] = [];

  for (let week = 0; week < MAX_ITERATIONS; week += pattern.interval) {
    const weekStart = addDays(anchorWeekStart, week * DAYS_PER_WEEK);

    if (weekStart.getTime() > horizon.getTime()) {
      break;
    }

    for (const weekday of weekdays) {
      const occurrence = withTimeOfDay(addDays(weekStart, weekday), anchor);

      if (occurrence.getTime() > anchor.getTime() && occurrence.getTime() <= horizon.getTime()) {
        occurrences.push(occurrence);
      }
    }

    if (occurrences.length >= RECURRENCE_MAX_OCCURRENCES) {
      break;
    }
  }

  return occurrences;
}

function expandByStep(anchor: Date, pattern: RecurrencePattern, horizon: Date): Date[] {
  const occurrences: Date[] = [];
  const anchorDay = startOfDay(anchor);

  for (let step = 1; step <= MAX_ITERATIONS; step += 1) {
    const day =
      pattern.frequency === RecurrenceFrequency.DAILY
        ? addDays(anchorDay, step * pattern.interval)
        : addMonthsKeepingDayOfMonth(anchorDay, step * pattern.interval);

    // Monthly series skip the months that have no such day (31 of February).
    if (!day) {
      continue;
    }

    if (day.getTime() > horizon.getTime()) {
      break;
    }

    occurrences.push(withTimeOfDay(day, anchor));

    if (occurrences.length >= RECURRENCE_MAX_OCCURRENCES) {
      break;
    }
  }

  return occurrences;
}

function parseFrequency(rule: string, value: string): RecurrenceFrequency {
  if (!Object.values(RecurrenceFrequency).includes(value as RecurrenceFrequency)) {
    throw new InvalidRecurrenceRuleException(
      rule,
      `FREQ aceita ${Object.values(RecurrenceFrequency).join(', ')}`,
    );
  }

  return value as RecurrenceFrequency;
}

function parseWeekdays(rule: string, value: string): number[] {
  const codes = value.split(',').map((code) => code.trim());
  const weekdays = new Set<number>();

  for (const code of codes) {
    const weekday = RECURRENCE_WEEKDAY_CODES[code];

    if (weekday === undefined) {
      throw new InvalidRecurrenceRuleException(rule, `dia da semana inválido "${code}"`);
    }

    weekdays.add(weekday);
  }

  return [...weekdays];
}

function parseBoundedInteger(rule: string, key: string, value: string, max: number): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > max) {
    throw new InvalidRecurrenceRuleException(rule, `${key} deve ser um inteiro entre 1 e ${max}`);
  }

  return parsed;
}

function parseUntil(rule: string, value: string): Date {
  if (!UNTIL_PATTERN.test(value)) {
    throw new InvalidRecurrenceRuleException(rule, 'UNTIL deve estar no formato AAAA-MM-DD');
  }

  const until = startOfDay(value);

  if (Number.isNaN(until.getTime())) {
    throw new InvalidRecurrenceRuleException(rule, `UNTIL inválido "${value}"`);
  }

  return until;
}
