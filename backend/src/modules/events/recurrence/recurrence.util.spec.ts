import { describe, expect, it } from '@jest/globals';
import { RecurrenceFrequency } from '../../../common/constants';
import { InvalidRecurrenceRuleException } from '../../../common/exceptions';
import { endOfDay, toDateOnlyString } from '../../../common/utils';
import { expandRecurrence, parseRecurrenceRule } from './recurrence.util';

/**
 * 2026 is the reference year here because it carries both shapes of month:
 * four Sundays (February, April, ...) and five (March, May, August, November).
 * Those five-Sunday months are the whole reason `4SU` and `-1SU` have to be
 * told apart, and the reason a `5SU` series skips most of the year.
 */

/** Local time, so the expectations read the way the church reads a calendar. */
function at(day: string, hour = 19, minute = 0): Date {
  const [year, month, dayOfMonth] = day.split('-').map(Number);
  return new Date(year, month - 1, dayOfMonth, hour, minute);
}

/** The calendar days a rule produces after its anchor, up to `horizon`. */
function expand(rule: string, anchor: Date, horizon: string): string[] {
  return expandRecurrence(anchor, parseRecurrenceRule(rule), endOfDay(horizon)).map(
    toDateOnlyString,
  );
}

const END_OF_2026 = '2026-12-31';

describe('parseRecurrenceRule', () => {
  it('reads a positional BYDAY as a monthly weekday position', () => {
    const pattern = parseRecurrenceRule('FREQ=MONTHLY;BYDAY=1SU');

    expect(pattern.frequency).toBe(RecurrenceFrequency.MONTHLY);
    expect(pattern.monthlyWeekdays).toEqual([{ weekday: 0, position: 1 }]);
    expect(pattern.weekdays).toEqual([]);
    expect(pattern.interval).toBe(1);
  });

  it('reads -1SU as the last weekday of the month', () => {
    expect(parseRecurrenceRule('FREQ=MONTHLY;BYDAY=-1SU').monthlyWeekdays).toEqual([
      { weekday: 0, position: -1 },
    ]);
  });

  it('keeps 4SU and -1SU as distinct positions', () => {
    expect(parseRecurrenceRule('FREQ=MONTHLY;BYDAY=4SU').monthlyWeekdays).not.toEqual(
      parseRecurrenceRule('FREQ=MONTHLY;BYDAY=-1SU').monthlyWeekdays,
    );
  });

  it('accepts several positions in one rule and drops duplicates', () => {
    expect(parseRecurrenceRule('FREQ=MONTHLY;BYDAY=1SU,3SU,1SU').monthlyWeekdays).toEqual([
      { weekday: 0, position: 1 },
      { weekday: 0, position: 3 },
    ]);
  });

  it('accepts positions on any weekday, not just Sunday', () => {
    expect(parseRecurrenceRule('FREQ=MONTHLY;BYDAY=2TU').monthlyWeekdays).toEqual([
      { weekday: 2, position: 2 },
    ]);
  });

  it('is case insensitive', () => {
    expect(parseRecurrenceRule('freq=monthly;byday=1su').monthlyWeekdays).toEqual([
      { weekday: 0, position: 1 },
    ]);
  });

  it('still reads a bare weekly BYDAY', () => {
    const pattern = parseRecurrenceRule('FREQ=WEEKLY;BYDAY=SU,TU');

    expect(pattern.weekdays).toEqual([0, 2]);
    expect(pattern.monthlyWeekdays).toEqual([]);
  });

  it('still reads INTERVAL, COUNT and UNTIL', () => {
    const pattern = parseRecurrenceRule('FREQ=WEEKLY;INTERVAL=2;COUNT=10;UNTIL=2026-12-31');

    expect(pattern.interval).toBe(2);
    expect(pattern.count).toBe(10);
    expect(toDateOnlyString(pattern.until as Date)).toBe('2026-12-31');
  });
});

describe('parseRecurrenceRule validation', () => {
  const invalid: Array<[string, string, RegExp]> = [
    ['a bare BYDAY outside FREQ=WEEKLY', 'FREQ=MONTHLY;BYDAY=SU', /BYDAY sem posição/],
    ['a positional BYDAY outside FREQ=MONTHLY', 'FREQ=WEEKLY;BYDAY=1SU', /BYDAY com posição/],
    ['a positional BYDAY on FREQ=DAILY', 'FREQ=DAILY;BYDAY=1SU', /BYDAY com posição/],
    ['a position above the fifth week', 'FREQ=MONTHLY;BYDAY=6SU', /posição inválida/],
    ['a zero position', 'FREQ=MONTHLY;BYDAY=0SU', /posição inválida/],
    ['a negative position other than -1', 'FREQ=MONTHLY;BYDAY=-2SU', /posição inválida/],
    ['an unknown weekday code', 'FREQ=MONTHLY;BYDAY=1XX', /dia da semana inválido/],
    ['a malformed term', 'FREQ=MONTHLY;BYDAY=1SUN', /dia da semana inválido/],
    ['positions mixed with bare codes', 'FREQ=MONTHLY;BYDAY=1SU,TU', /misturar/],
    ['an empty rule', '', /vazia/],
    ['a missing FREQ', 'BYDAY=SU', /FREQ é obrigatório/],
    ['an unknown FREQ', 'FREQ=YEARLY', /FREQ aceita/],
    ['an unknown field', 'FREQ=WEEKLY;BYSETPOS=1', /campo desconhecido/],
    ['a malformed chunk', 'FREQ=MONTHLY;BYDAY', /trecho inválido/],
  ];

  it.each(invalid)('rejects %s', (_label, rule, message) => {
    expect(() => parseRecurrenceRule(rule)).toThrow(InvalidRecurrenceRuleException);
    expect(() => parseRecurrenceRule(rule)).toThrow(message);
  });

  it('reports the problem in Portuguese with a 400', () => {
    let thrown: unknown;

    try {
      parseRecurrenceRule('FREQ=MONTHLY;BYDAY=9SU');
    } catch (error) {
      thrown = error;
    }

    const exception = thrown as InvalidRecurrenceRuleException;

    expect(exception).toBeInstanceOf(InvalidRecurrenceRuleException);
    expect(exception.getStatus()).toBe(400);
    expect(exception.getResponse()).toMatchObject({
      message: expect.stringContaining('Regra de recorrência inválida'),
    });
    expect(exception.details).toMatchObject({ rule: 'FREQ=MONTHLY;BYDAY=9SU' });
  });
});

describe('expandRecurrence - the Sunday night rotation', () => {
  it('expands 1SU to the first Sunday of every month', () => {
    expect(expand('FREQ=MONTHLY;BYDAY=1SU', at('2026-01-04'), END_OF_2026)).toEqual([
      '2026-02-01',
      '2026-03-01',
      '2026-04-05',
      '2026-05-03',
      '2026-06-07',
      '2026-07-05',
      '2026-08-02',
      '2026-09-06',
      '2026-10-04',
      '2026-11-01',
      '2026-12-06',
    ]);
  });

  it('expands 2SU to the second Sunday of every month', () => {
    expect(expand('FREQ=MONTHLY;BYDAY=2SU', at('2026-01-11'), END_OF_2026)).toEqual([
      '2026-02-08',
      '2026-03-08',
      '2026-04-12',
      '2026-05-10',
      '2026-06-14',
      '2026-07-12',
      '2026-08-09',
      '2026-09-13',
      '2026-10-11',
      '2026-11-08',
      '2026-12-13',
    ]);
  });

  it('expands 3SU to the third Sunday of every month', () => {
    expect(expand('FREQ=MONTHLY;BYDAY=3SU', at('2026-01-18'), END_OF_2026)).toEqual([
      '2026-02-15',
      '2026-03-15',
      '2026-04-19',
      '2026-05-17',
      '2026-06-21',
      '2026-07-19',
      '2026-08-16',
      '2026-09-20',
      '2026-10-18',
      '2026-11-15',
      '2026-12-20',
    ]);
  });

  it('expands 4SU to the fourth Sunday, never the fifth', () => {
    expect(expand('FREQ=MONTHLY;BYDAY=4SU', at('2026-01-25'), END_OF_2026)).toEqual([
      '2026-02-22',
      '2026-03-22',
      '2026-04-26',
      '2026-05-24',
      '2026-06-28',
      '2026-07-26',
      '2026-08-23',
      '2026-09-27',
      '2026-10-25',
      '2026-11-22',
      '2026-12-27',
    ]);
  });

  it('expands 5SU only in the months that have a fifth Sunday', () => {
    expect(expand('FREQ=MONTHLY;BYDAY=5SU', at('2026-01-01', 9), END_OF_2026)).toEqual([
      '2026-03-29',
      '2026-05-31',
      '2026-08-30',
      '2026-11-29',
    ]);
  });

  it('produces nothing at all for a month without the requested position', () => {
    // February and April 2026 have four Sundays: no occurrence, no approximation,
    // and nothing pushed into the following month.
    expect(expand('FREQ=MONTHLY;BYDAY=5SU', at('2026-01-01', 9), '2026-04-30')).toEqual([
      '2026-03-29',
    ]);
  });
});

describe('expandRecurrence - fourth Sunday versus last Sunday', () => {
  const anchor = at('2026-01-25');

  it('expands -1SU to the last Sunday of every month', () => {
    expect(expand('FREQ=MONTHLY;BYDAY=-1SU', anchor, END_OF_2026)).toEqual([
      '2026-02-22',
      '2026-03-29',
      '2026-04-26',
      '2026-05-31',
      '2026-06-28',
      '2026-07-26',
      '2026-08-30',
      '2026-09-27',
      '2026-10-25',
      '2026-11-29',
      '2026-12-27',
    ]);
  });

  it('separates them exactly on the five-Sunday months', () => {
    const fourth = expand('FREQ=MONTHLY;BYDAY=4SU', anchor, END_OF_2026);
    const last = expand('FREQ=MONTHLY;BYDAY=-1SU', anchor, END_OF_2026);

    expect(fourth.filter((day, index) => day !== last[index])).toEqual([
      '2026-03-22',
      '2026-05-24',
      '2026-08-23',
      '2026-11-22',
    ]);
  });

  it('collapses them on a month with only four Sundays', () => {
    expect(expand('FREQ=MONTHLY;BYDAY=4SU', anchor, '2026-02-28')).toEqual(['2026-02-22']);
    expect(expand('FREQ=MONTHLY;BYDAY=-1SU', anchor, '2026-02-28')).toEqual(['2026-02-22']);
  });

  it('gives -1SU an occurrence where 5SU has none', () => {
    expect(expand('FREQ=MONTHLY;BYDAY=-1SU', anchor, '2026-02-28')).toEqual(['2026-02-22']);
    expect(expand('FREQ=MONTHLY;BYDAY=5SU', anchor, '2026-02-28')).toEqual([]);
  });
});

describe('expandRecurrence - monthly positional details', () => {
  it('keeps the anchor time of day', () => {
    const [first] = expandRecurrence(
      at('2026-01-04', 18, 30),
      parseRecurrenceRule('FREQ=MONTHLY;BYDAY=1SU'),
      endOfDay('2026-02-28'),
    );

    expect(toDateOnlyString(first)).toBe('2026-02-01');
    expect(first.getHours()).toBe(18);
    expect(first.getMinutes()).toBe(30);
  });

  it('never repeats the anchor itself', () => {
    expect(expand('FREQ=MONTHLY;BYDAY=1SU', at('2026-01-04'), '2026-01-31')).toEqual([]);
  });

  it('includes a position that falls later in the anchor month', () => {
    expect(expand('FREQ=MONTHLY;BYDAY=3SU', at('2026-02-10'), '2026-04-30')).toEqual([
      '2026-02-15',
      '2026-03-15',
      '2026-04-19',
    ]);
  });

  it('orders several positions inside the same month', () => {
    expect(expand('FREQ=MONTHLY;BYDAY=1SU,3SU', at('2026-01-01', 9), '2026-02-28')).toEqual([
      '2026-01-04',
      '2026-01-18',
      '2026-02-01',
      '2026-02-15',
    ]);
  });

  it('crosses the year boundary', () => {
    expect(expand('FREQ=MONTHLY;BYDAY=1SU', at('2026-11-01'), '2027-02-28')).toEqual([
      '2026-12-06',
      '2027-01-03',
      '2027-02-07',
    ]);
  });

  it('honours INTERVAL', () => {
    expect(expand('FREQ=MONTHLY;INTERVAL=2;BYDAY=1SU', at('2026-01-04'), END_OF_2026)).toEqual([
      '2026-03-01',
      '2026-05-03',
      '2026-07-05',
      '2026-09-06',
      '2026-11-01',
    ]);
  });

  it('honours COUNT, which includes the anchor', () => {
    expect(expand('FREQ=MONTHLY;BYDAY=1SU;COUNT=3', at('2026-01-04'), END_OF_2026)).toEqual([
      '2026-02-01',
      '2026-03-01',
    ]);
  });

  it('honours UNTIL inclusively', () => {
    expect(
      expand('FREQ=MONTHLY;BYDAY=1SU;UNTIL=2026-04-05', at('2026-01-04'), END_OF_2026),
    ).toEqual(['2026-02-01', '2026-03-01', '2026-04-05']);
  });
});

describe('expandRecurrence - the rules that already worked', () => {
  it('expands the Sunday EBD every week', () => {
    expect(expand('FREQ=WEEKLY;BYDAY=SU', at('2026-01-04', 9), '2026-01-31')).toEqual([
      '2026-01-11',
      '2026-01-18',
      '2026-01-25',
    ]);
  });

  it('expands the Tuesday teaching service every week', () => {
    expect(expand('FREQ=WEEKLY;BYDAY=TU', at('2026-01-06', 19, 30), '2026-01-31')).toEqual([
      '2026-01-13',
      '2026-01-20',
      '2026-01-27',
    ]);
  });

  it('expands a multi-weekday weekly rule', () => {
    expect(expand('FREQ=WEEKLY;BYDAY=SU,TU', at('2026-01-04', 9), '2026-01-20')).toEqual([
      '2026-01-06',
      '2026-01-11',
      '2026-01-13',
      '2026-01-18',
      '2026-01-20',
    ]);
  });

  it('falls back to the anchor weekday when BYDAY is absent', () => {
    expect(expand('FREQ=WEEKLY;INTERVAL=2', at('2026-01-04', 9), '2026-02-28')).toEqual([
      '2026-01-18',
      '2026-02-01',
      '2026-02-15',
    ]);
  });

  it('expands a plain monthly rule by day of the month', () => {
    expect(expand('FREQ=MONTHLY', at('2026-01-15'), '2026-04-30')).toEqual([
      '2026-02-15',
      '2026-03-15',
      '2026-04-15',
    ]);
  });

  it('skips the months that have no such day of the month', () => {
    expect(expand('FREQ=MONTHLY', at('2026-01-31'), '2026-06-30')).toEqual([
      '2026-03-31',
      '2026-05-31',
    ]);
  });

  it('expands a daily rule with an interval', () => {
    expect(expand('FREQ=DAILY;INTERVAL=2', at('2026-01-01', 9), '2026-01-10')).toEqual([
      '2026-01-03',
      '2026-01-05',
      '2026-01-07',
      '2026-01-09',
    ]);
  });
});
