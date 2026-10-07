import { CONFIG_DEFAULTS } from '../constants/config.constant';

/**
 * Human-readable text goes to people in Brazil, but the server may run in UTC
 * (containers do), so formatting pins the timezone instead of trusting the
 * host clock. Override with APP_TIMEZONE.
 */
function timezone(): string {
  return process.env.APP_TIMEZONE ?? CONFIG_DEFAULTS.APP_TIMEZONE;
}

const WEEKDAY_LABELS = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
] as const;

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  weekday: number;
  hour: number;
  minute: number;
}

function zonedParts(value: Date): ZonedParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone(),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(value);

  const read = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? '';

  const weekdayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(read('weekday'));

  return {
    year: Number(read('year')),
    month: Number(read('month')),
    day: Number(read('day')),
    weekday: weekdayIndex,
    hour: Number(read('hour')),
    minute: Number(read('minute')),
  };
}

const pad = (value: number): string => `${value}`.padStart(2, '0');

/** `17/10` */
export function formatShortDate(value: Date): string {
  const { day, month } = zonedParts(value);
  return `${pad(day)}/${pad(month)}`;
}

/** `19:30` */
export function formatTime(value: Date): string {
  const { hour, minute } = zonedParts(value);
  return `${pad(hour)}:${pad(minute)}`;
}

/** `Sábado` */
export function formatWeekday(value: Date): string {
  return WEEKDAY_LABELS[zonedParts(value).weekday];
}

/** `Sábado, 10/10 às 17:00` */
export function formatEventWhen(value: Date): string {
  return `${formatWeekday(value)}, ${formatShortDate(value)} às ${formatTime(value)}`;
}

export const MONTH_LABELS = [
  'JANEIRO',
  'FEVEREIRO',
  'MARÇO',
  'ABRIL',
  'MAIO',
  'JUNHO',
  'JULHO',
  'AGOSTO',
  'SETEMBRO',
  'OUTUBRO',
  'NOVEMBRO',
  'DEZEMBRO',
] as const;
