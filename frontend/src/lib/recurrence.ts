/**
 * Builds the iCalendar rules the API accepts. The backend supports a subset:
 * weekly with plain BYDAY, monthly with a positional BYDAY (1SU = first
 * Sunday), and monthly-relative with OFFSET (1SU;OFFSET=-3 = 3 days before
 * the first Sunday). Anything else it rejects, so this file is the only place
 * that writes rule strings.
 */

export type RecurrenceKind = 'none' | 'weekly' | 'monthly-nth' | 'monthly-relative';

/** 0 = Sunday … 6 = Saturday, matching JavaScript's getDay(). */
const ICAL_WEEKDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const;

export const WEEKDAY_LABEL = [
  'domingo',
  'segunda',
  'terça',
  'quarta',
  'quinta',
  'sexta',
  'sábado',
] as const;

export const WEEKDAY_OPTIONS = WEEKDAY_LABEL.map((label, i) => ({ value: i, label }));

/** Which occurrence of that weekday within the month. */
export const MONTH_POSITIONS = [
  { value: 1, label: '1º' },
  { value: 2, label: '2º' },
  { value: 3, label: '3º' },
  { value: 4, label: '4º' },
  { value: 5, label: '5º' },
  { value: -1, label: 'último' },
] as const;

export type MonthPosition = (typeof MONTH_POSITIONS)[number]['value'];

export interface RecurrenceSelection {
  kind: RecurrenceKind;
  /** Weekday of the event, taken from its date. */
  weekday: number;
  position: MonthPosition;
  /** Reference weekday for monthly-relative (e.g. Sunday=0 for "before 1st Sunday"). */
  refWeekday: number;
  /** Day offset from the reference (-6..+6, never 0). */
  offset: number;
}

export function buildRecurrenceRule(selection: RecurrenceSelection): string | undefined {
  const day = ICAL_WEEKDAY[selection.weekday];

  if (selection.kind === 'weekly') return `FREQ=WEEKLY;BYDAY=${day}`;
  if (selection.kind === 'monthly-nth') return `FREQ=MONTHLY;BYDAY=${selection.position}${day}`;

  if (selection.kind === 'monthly-relative') {
    const refDay = ICAL_WEEKDAY[selection.refWeekday];
    return `FREQ=MONTHLY;BYDAY=${selection.position}${refDay};OFFSET=${selection.offset}`;
  }

  return undefined;
}

export function describeRecurrence(selection: RecurrenceSelection): string {
  const weekday = WEEKDAY_LABEL[selection.weekday];

  if (selection.kind === 'weekly') return `Toda ${weekday}`;

  if (selection.kind === 'monthly-nth') {
    const position = MONTH_POSITIONS.find((p) => p.value === selection.position);
    return `${position?.label ?? '1º'} ${weekday} do mês`;
  }

  if (selection.kind === 'monthly-relative') {
    const refWeekday = WEEKDAY_LABEL[selection.refWeekday];
    const position = MONTH_POSITIONS.find((p) => p.value === selection.position);
    const abs = Math.abs(selection.offset);
    const direction = selection.offset < 0 ? 'antes' : 'depois';
    return `${abs} dia${abs > 1 ? 's' : ''} ${direction} do ${position?.label ?? '1º'} ${refWeekday}`;
  }

  return 'Não se repete';
}

/** Reads a stored rule back into the selector's state. */
export function parseRecurrenceRule(
  rule: string | null | undefined,
  fallbackWeekday: number,
): RecurrenceSelection {
  const base: RecurrenceSelection = {
    kind: 'none',
    weekday: fallbackWeekday,
    position: 1,
    refWeekday: 0,
    offset: -1,
  };
  if (!rule) return base;

  const byDay = /BYDAY=(-?\d)?(SU|MO|TU|WE|TH|FR|SA)/.exec(rule);
  const weekday = byDay ? ICAL_WEEKDAY.indexOf(byDay[2] as (typeof ICAL_WEEKDAY)[number]) : -1;

  const offsetMatch = /OFFSET=(-?\d+)/.exec(rule);
  const offset = offsetMatch ? Number(offsetMatch[1]) : 0;

  if (rule.includes('FREQ=MONTHLY') && byDay?.[1] && offset !== 0) {
    const refWeekday = weekday >= 0 ? weekday : 0;
    const actualWeekday = ((refWeekday + offset) % 7 + 7) % 7;
    return {
      kind: 'monthly-relative',
      weekday: actualWeekday,
      position: Number(byDay[1]) as MonthPosition,
      refWeekday,
      offset,
    };
  }

  if (rule.includes('FREQ=MONTHLY') && byDay?.[1]) {
    return {
      ...base,
      kind: 'monthly-nth',
      weekday: weekday >= 0 ? weekday : fallbackWeekday,
      position: Number(byDay[1]) as MonthPosition,
    };
  }

  if (rule.includes('FREQ=WEEKLY') && weekday >= 0) {
    return { ...base, kind: 'weekly', weekday, position: 1 };
  }

  return base;
}
