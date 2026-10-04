/**
 * Builds the iCalendar rules the API accepts. The backend supports a subset:
 * weekly with plain BYDAY, and monthly with a positional BYDAY (1SU = first
 * Sunday). Anything else it rejects, so this file is the only place that
 * writes rule strings.
 */

export type RecurrenceKind = 'none' | 'weekly' | 'monthly-nth';

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
}

export function buildRecurrenceRule(selection: RecurrenceSelection): string | undefined {
  const day = ICAL_WEEKDAY[selection.weekday];

  if (selection.kind === 'weekly') return `FREQ=WEEKLY;BYDAY=${day}`;
  if (selection.kind === 'monthly-nth') return `FREQ=MONTHLY;BYDAY=${selection.position}${day}`;

  return undefined;
}

export function describeRecurrence(selection: RecurrenceSelection): string {
  const weekday = WEEKDAY_LABEL[selection.weekday];

  if (selection.kind === 'weekly') return `Toda ${weekday}`;

  if (selection.kind === 'monthly-nth') {
    const position = MONTH_POSITIONS.find((p) => p.value === selection.position);
    return `${position?.label ?? '1º'} ${weekday} do mês`;
  }

  return 'Não se repete';
}

/** Reads a stored rule back into the selector's state. */
export function parseRecurrenceRule(
  rule: string | null | undefined,
  fallbackWeekday: number,
): RecurrenceSelection {
  const base: RecurrenceSelection = { kind: 'none', weekday: fallbackWeekday, position: 1 };
  if (!rule) return base;

  const byDay = /BYDAY=(-?\d)?(SU|MO|TU|WE|TH|FR|SA)/.exec(rule);
  const weekday = byDay ? ICAL_WEEKDAY.indexOf(byDay[2] as (typeof ICAL_WEEKDAY)[number]) : -1;

  if (rule.includes('FREQ=MONTHLY') && byDay?.[1]) {
    return {
      kind: 'monthly-nth',
      weekday: weekday >= 0 ? weekday : fallbackWeekday,
      position: Number(byDay[1]) as MonthPosition,
    };
  }

  if (rule.includes('FREQ=WEEKLY') && weekday >= 0) {
    return { kind: 'weekly', weekday, position: 1 };
  }

  return base;
}
