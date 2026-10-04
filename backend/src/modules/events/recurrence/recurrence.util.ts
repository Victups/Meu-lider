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
 *   FREQ=MONTHLY;BYDAY=1SU
 *   FREQ=MONTHLY;INTERVAL=1;COUNT=12
 *   FREQ=DAILY;INTERVAL=2
 *
 * FREQ is required. INTERVAL defaults to 1. COUNT is the size of the whole
 * series, counting the event that carries the rule. UNTIL is an inclusive
 * calendar day.
 *
 * BYDAY comes in two shapes and they are not interchangeable:
 *
 * - bare codes (`SU,WE`) are weekly-only and default to the weekday of the
 *   event itself;
 * - positional codes (`1SU`, `4SU`, `-1SU`) are monthly-only and pin the
 *   occurrence to the nth weekday of the month — the church's "1º domingo é
 *   Ceia, 2º é Varões, 3º é CIBE, 4º é Jovens, 5º é Louvor" rotation.
 *
 * `4SU` and `-1SU` are deliberately different: in a month with five Sundays the
 * fourth one is not the last one, and the rotation wants the fourth. A month
 * that has no such position (a fifth Sunday in February) simply produces no
 * occurrence; nothing is rounded or pushed into the next month.
 */
export interface RecurrencePattern {
  frequency: RecurrenceFrequency;
  interval: number;
  /** JavaScript weekday numbers (0 = Sunday); empty means "same as the anchor". */
  weekdays: number[];
  /** Non-empty only for `FREQ=MONTHLY;BYDAY=1SU`-style rules. */
  monthlyWeekdays: MonthlyWeekday[];
  count: number | null;
  until: Date | null;
}

/** One `nSU` term of a monthly BYDAY. */
export interface MonthlyWeekday {
  /** JavaScript weekday number (0 = Sunday). */
  weekday: number;
  /** 1..5 counted from the start of the month, or -1 for "the last one". */
  position: number;
}

const MAX_INTERVAL = 52;
/** Highest nth-weekday position a month can hold. */
const MAX_MONTHLY_POSITION = 5;
/** The only "counted from the end" position the subset accepts. */
const LAST_MONTHLY_POSITION = -1;
/** `SU`, `1SU`, `-1SU` — an optional signed position followed by a weekday code. */
const BYDAY_PATTERN = /^(-?\d{1,2})?([A-Z]{2})$/;
const MONTHS_PER_YEAR = 12;
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
    monthlyWeekdays: [],
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
      case 'BYDAY': {
        const byDay = parseByDay(rule, value);
        pattern.weekdays = byDay.weekdays;
        pattern.monthlyWeekdays = byDay.monthlyWeekdays;
        break;
      }
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
    throw new InvalidRecurrenceRuleException(
      rule,
      'BYDAY sem posição só vale com FREQ=WEEKLY; para "primeiro domingo do mês" use FREQ=MONTHLY;BYDAY=1SU',
    );
  }

  if (pattern.monthlyWeekdays.length > 0 && pattern.frequency !== RecurrenceFrequency.MONTHLY) {
    throw new InvalidRecurrenceRuleException(
      rule,
      'BYDAY com posição (ex.: "1SU") só vale com FREQ=MONTHLY',
    );
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

  const candidates = selectExpander(pattern)(anchor, pattern, horizon);

  const untilDay = pattern.until ? toDateOnlyString(pattern.until) : null;

  return candidates
    .filter((date) => !untilDay || toDateOnlyString(date) <= untilDay)
    .slice(0, limit);
}

type Expander = (anchor: Date, pattern: RecurrencePattern, horizon: Date) => Date[];

function selectExpander(pattern: RecurrencePattern): Expander {
  if (pattern.frequency === RecurrenceFrequency.WEEKLY) {
    return expandWeekly;
  }

  // `FREQ=MONTHLY;BYDAY=1SU` walks the calendar by position, not by day number.
  return pattern.monthlyWeekdays.length > 0 ? expandMonthlyByWeekday : expandByStep;
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

/**
 * "Terceiro domingo de cada mês". Walks whole months from the anchor's month
 * and asks each one for the requested position; a month that cannot answer
 * (no fifth Sunday) contributes nothing at all.
 */
function expandMonthlyByWeekday(
  anchor: Date,
  pattern: RecurrencePattern,
  horizon: Date,
): Date[] {
  const occurrences: Date[] = [];
  const anchorYear = anchor.getFullYear();
  const anchorMonth = anchor.getMonth();

  for (let step = 0; step < MAX_ITERATIONS; step += 1) {
    const absoluteMonth = anchorMonth + step * pattern.interval;
    const year = anchorYear + Math.floor(absoluteMonth / MONTHS_PER_YEAR);
    const month = ((absoluteMonth % MONTHS_PER_YEAR) + MONTHS_PER_YEAR) % MONTHS_PER_YEAR;

    if (new Date(year, month, 1).getTime() > horizon.getTime()) {
      break;
    }

    const monthly = pattern.monthlyWeekdays
      .map(({ weekday, position }) => nthWeekdayOfMonth(year, month, weekday, position))
      .filter((day): day is Date => day !== null)
      .map((day) => withTimeOfDay(day, anchor))
      .filter(
        (date) => date.getTime() > anchor.getTime() && date.getTime() <= horizon.getTime(),
      )
      .sort((left, right) => left.getTime() - right.getTime());

    occurrences.push(...monthly);

    if (occurrences.length >= RECURRENCE_MAX_OCCURRENCES) {
      break;
    }
  }

  return occurrences.slice(0, RECURRENCE_MAX_OCCURRENCES);
}

/**
 * The `position`-th `weekday` of the given month, or null when the month does
 * not reach that far — February never has a fifth Sunday. Position -1 counts
 * back from the last day, which is why it can land on a different date than
 * position 4 in a five-Sunday month.
 */
function nthWeekdayOfMonth(
  year: number,
  month: number,
  weekday: number,
  position: number,
): Date | null {
  if (position === LAST_MONTHLY_POSITION) {
    // Day 0 of the next month is the last day of this one.
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const backwardOffset = (lastDayOfMonth.getDay() - weekday + DAYS_PER_WEEK) % DAYS_PER_WEEK;

    return new Date(year, month, lastDayOfMonth.getDate() - backwardOffset);
  }

  const firstWeekday = new Date(year, month, 1).getDay();
  const forwardOffset = (weekday - firstWeekday + DAYS_PER_WEEK) % DAYS_PER_WEEK;
  const dayOfMonth = 1 + forwardOffset + (position - 1) * DAYS_PER_WEEK;
  const candidate = new Date(year, month, dayOfMonth);

  // Rolled over into the next month: this month has no such occurrence.
  return candidate.getMonth() === month ? candidate : null;
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

interface ParsedByDay {
  weekdays: number[];
  monthlyWeekdays: MonthlyWeekday[];
}

/**
 * Reads a whole BYDAY list, which must be all bare (`SU,TU`) or all positional
 * (`1SU,3SU`). Mixing them has no meaning in this subset, and silently picking
 * one of the two readings is exactly how a series ends up on the wrong Sunday.
 */
function parseByDay(rule: string, value: string): ParsedByDay {
  const terms = value
    .split(',')
    .map((code) => code.trim())
    .filter((code) => code.length > 0);

  if (terms.length === 0) {
    throw new InvalidRecurrenceRuleException(rule, 'BYDAY está vazio');
  }

  const weekdays = new Set<number>();
  const monthlyWeekdays: MonthlyWeekday[] = [];
  const seenPositions = new Set<string>();

  for (const term of terms) {
    const { weekday, position } = parseByDayTerm(rule, term);

    if (position === null) {
      weekdays.add(weekday);
      continue;
    }

    const key = `${position}:${weekday}`;

    if (!seenPositions.has(key)) {
      seenPositions.add(key);
      monthlyWeekdays.push({ weekday, position });
    }
  }

  if (weekdays.size > 0 && monthlyWeekdays.length > 0) {
    throw new InvalidRecurrenceRuleException(
      rule,
      'BYDAY não pode misturar dias com e sem posição (ex.: "1SU,TU")',
    );
  }

  return { weekdays: [...weekdays], monthlyWeekdays };
}

function parseByDayTerm(
  rule: string,
  term: string,
): { weekday: number; position: number | null } {
  const match = BYDAY_PATTERN.exec(term);
  const weekday = match ? RECURRENCE_WEEKDAY_CODES[match[2]] : undefined;

  if (!match || weekday === undefined) {
    throw new InvalidRecurrenceRuleException(rule, `dia da semana inválido "${term}"`);
  }

  if (match[1] === undefined) {
    return { weekday, position: null };
  }

  const position = Number(match[1]);
  const isSupported =
    position === LAST_MONTHLY_POSITION || (position >= 1 && position <= MAX_MONTHLY_POSITION);

  if (!isSupported) {
    throw new InvalidRecurrenceRuleException(
      rule,
      `posição inválida em "${term}": use 1 a ${MAX_MONTHLY_POSITION} para contar do início do mês, ou ${LAST_MONTHLY_POSITION} para o último`,
    );
  }

  return { weekday, position };
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
