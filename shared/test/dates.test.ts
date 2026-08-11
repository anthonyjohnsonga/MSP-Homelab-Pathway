import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { addDays, daysBetween, isMonday, isSunday, parseISODate, today, toISODate } from '../src/dates.ts';

describe('parseISODate', () => {
  it('parses a plain calendar date as UTC midnight', () => {
    const d = parseISODate('2026-08-10');
    assert.equal(d.toISOString(), '2026-08-10T00:00:00.000Z');
  });

  it('rejects malformed strings', () => {
    assert.throws(() => parseISODate('10/08/2026'), /Not an ISO date/);
    assert.throws(() => parseISODate('2026-8-10'), /Not an ISO date/);
    assert.throws(() => parseISODate(''), /Not an ISO date/);
  });

  it('rejects dates that do not exist', () => {
    assert.throws(() => parseISODate('2026-02-30'), /Not a real calendar date/);
    assert.throws(() => parseISODate('2026-13-01'), /Not a real calendar date/);
  });

  it('accepts a real leap day', () => {
    assert.equal(toISODate(parseISODate('2028-02-29')), '2028-02-29');
  });
});

describe('day-of-week helpers', () => {
  it('identifies the curriculum start as a Monday', () => {
    assert.ok(isMonday(parseISODate('2026-08-10')));
    assert.ok(!isSunday(parseISODate('2026-08-10')));
  });

  it('identifies the first week end as a Sunday', () => {
    assert.ok(isSunday(parseISODate('2026-08-16')));
  });
});

describe('addDays and daysBetween', () => {
  it('round-trips across a month boundary', () => {
    assert.equal(toISODate(addDays(parseISODate('2026-08-30'), 5)), '2026-09-04');
  });

  it('round-trips across a year boundary', () => {
    assert.equal(toISODate(addDays(parseISODate('2026-12-30'), 3)), '2027-01-02');
  });

  it('measures a week as six days start to end', () => {
    assert.equal(daysBetween(parseISODate('2026-08-10'), parseISODate('2026-08-16')), 6);
  });

  it('returns a negative count when the range runs backwards', () => {
    assert.equal(daysBetween(parseISODate('2026-08-16'), parseISODate('2026-08-10')), -6);
  });

  it('is unaffected by daylight saving transitions', () => {
    // US DST ends 2026-11-01. A naive local-time implementation returns 6.96
    // days here and rounds wrong; UTC arithmetic gives a clean 7.
    assert.equal(daysBetween(parseISODate('2026-10-26'), parseISODate('2026-11-02')), 7);
  });
});

describe('today', () => {
  it('reduces a local timestamp to that local calendar date at UTC midnight', () => {
    // 11pm local on the 9th must be the 9th, not the 10th, for users east of UTC.
    const local = new Date(2026, 7, 9, 23, 30, 0);
    assert.equal(toISODate(today(local)), '2026-08-09');
  });

  it('handles an early-morning local time', () => {
    const local = new Date(2026, 7, 10, 0, 15, 0);
    assert.equal(toISODate(today(local)), '2026-08-10');
  });
});
