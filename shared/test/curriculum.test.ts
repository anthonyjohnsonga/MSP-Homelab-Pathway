import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import type { WeekProgress } from '../src/types.ts';
import {
  calendarPosition,
  completionByPhase,
  dependents,
  getWeek,
  loadCurriculum,
  pace,
  totalHours,
  unmetDependencies,
  weekCount,
  weeksByPhase,
} from '../src/curriculum.ts';
import { parseISODate } from '../src/dates.ts';
import { clone, makeCurriculum } from './fixtures.ts';

const complete = (week: number): WeekProgress => ({
  week,
  status: 'complete',
  hours: null,
  completedAt: '2026-08-16T00:00:00.000Z',
});

describe('loadCurriculum', () => {
  it('returns the curriculum when it is valid', () => {
    assert.equal(weekCount(loadCurriculum(makeCurriculum())), 52);
  });

  it('throws with detail when it is not', () => {
    const c = clone(makeCurriculum(5));
    c.weeks[1]!.dependsOn = [4];
    assert.throws(() => loadCurriculum(c), /forward_dependency/);
  });
});

describe('weeksByPhase', () => {
  it('groups consecutive weeks that share a phase', () => {
    const c = clone(makeCurriculum(6));
    for (const w of c.weeks.slice(3)) w.phase = 'Phase 2 — Second';
    c.phases.push('Phase 2 — Second');

    const groups = weeksByPhase(c);
    assert.equal(groups.length, 2);
    assert.equal(groups[0]!.weeks.length, 3);
    assert.equal(groups[1]!.weeks.length, 3);
    assert.equal(groups[1]!.phase, 'Phase 2 — Second');
  });

  it('covers every week exactly once', () => {
    const c = makeCurriculum(52);
    const total = weeksByPhase(c).reduce((n, g) => n + g.weeks.length, 0);
    assert.equal(total, 52);
  });
});

describe('calendarPosition', () => {
  const c = makeCurriculum(52); // starts Monday 2026-08-10

  it('reports the first week on day one', () => {
    const at = calendarPosition(c, parseISODate('2026-08-10'));
    assert.equal(at.state, 'in_progress');
    assert.equal(at.state === 'in_progress' && at.week.week, 1);
    assert.equal(at.state === 'in_progress' && at.dayOfWeek, 1);
  });

  it('reports the last day of a week as day seven', () => {
    const at = calendarPosition(c, parseISODate('2026-08-16'));
    assert.equal(at.state === 'in_progress' && at.week.week, 1);
    assert.equal(at.state === 'in_progress' && at.dayOfWeek, 7);
  });

  it('rolls to the next week the following Monday', () => {
    const at = calendarPosition(c, parseISODate('2026-08-17'));
    assert.equal(at.state === 'in_progress' && at.week.week, 2);
  });

  it('finds the right week deep into the year', () => {
    // Week 16 in the real calendar starts 2026-11-23.
    const at = calendarPosition(c, parseISODate('2026-11-25'));
    assert.equal(at.state === 'in_progress' && at.week.week, 16);
  });

  it('reports before_start ahead of week one', () => {
    const at = calendarPosition(c, parseISODate('2026-08-03'));
    assert.equal(at.state, 'before_start');
    assert.equal(at.state === 'before_start' && at.daysUntilStart, 7);
  });

  it('reports after_end past the final Sunday', () => {
    const at = calendarPosition(c, parseISODate('2027-08-15'));
    assert.equal(at.state, 'after_end');
    assert.equal(at.state === 'after_end' && at.daysSinceEnd, 7);
  });
});

describe('pace', () => {
  const c = makeCurriculum(52);
  const inWeek10 = parseISODate('2026-10-12');

  it('is on_track when completions match the calendar', () => {
    const progress = Array.from({ length: 10 }, (_, i) => complete(i + 1));
    const p = pace(c, progress, inWeek10);
    assert.equal(p.expectedWeek, 10);
    assert.equal(p.completedWeeks, 10);
    assert.equal(p.state, 'on_track');
  });

  it('tolerates being one week behind', () => {
    const progress = Array.from({ length: 9 }, (_, i) => complete(i + 1));
    assert.equal(pace(c, progress, inWeek10).state, 'on_track');
  });

  it('is behind at two weeks down', () => {
    const progress = Array.from({ length: 8 }, (_, i) => complete(i + 1));
    const p = pace(c, progress, inWeek10);
    assert.equal(p.state, 'behind');
    assert.equal(p.delta, -2);
  });

  it('is ahead when running in front of the calendar', () => {
    const progress = Array.from({ length: 12 }, (_, i) => complete(i + 1));
    assert.equal(pace(c, progress, inWeek10).state, 'ahead');
  });

  it('ignores weeks that are merely in progress', () => {
    const progress: WeekProgress[] = [
      complete(1),
      { week: 2, status: 'in_progress', hours: 4 },
      { week: 3, status: 'skipped', hours: null },
    ];
    assert.equal(pace(c, progress, inWeek10).completedWeeks, 1);
  });
});

describe('unmetDependencies', () => {
  // Mirrors the brief's example: Week 39 depends on 32 and 38.
  const c = clone(makeCurriculum(52));
  c.weeks[38]!.dependsOn = [32, 38];

  it('names the dependency that is missing', () => {
    const done = new Set([38]);
    const unmet = unmetDependencies(c, 39, (w) => done.has(w));
    assert.equal(unmet.length, 1);
    assert.equal(unmet[0]!.week, 32);
  });

  it('returns nothing once every dependency is complete', () => {
    const done = new Set([32, 38]);
    assert.deepEqual(unmetDependencies(c, 39, (w) => done.has(w)), []);
  });

  it('returns every dependency when none are complete', () => {
    const unmet = unmetDependencies(c, 39, () => false);
    assert.deepEqual(unmet.map((w) => w.week), [32, 38]);
  });

  it('returns nothing for a week that does not exist', () => {
    assert.deepEqual(unmetDependencies(c, 999, () => false), []);
  });

  it('returns nothing for a week with no dependencies', () => {
    assert.deepEqual(unmetDependencies(c, 1, () => false), []);
  });
});

describe('dependents', () => {
  it('finds the weeks a skipped week would block', () => {
    const c = clone(makeCurriculum(52));
    c.weeks[38]!.dependsOn = [32];
    c.weeks[43]!.dependsOn = [32, 40];
    assert.deepEqual(dependents(c, 32).map((w) => w.week), [39, 44]);
  });
});

describe('completionByPhase and totalHours', () => {
  it('reports completion as a fraction of each phase', () => {
    const c = clone(makeCurriculum(6));
    for (const w of c.weeks.slice(3)) w.phase = 'Phase 2 — Second';
    c.phases.push('Phase 2 — Second');

    const byPhase = completionByPhase(c, [complete(1), complete(2), complete(5)]);
    assert.equal(byPhase[0]!.complete, 2);
    assert.equal(byPhase[0]!.fraction, 2 / 3);
    assert.equal(byPhase[1]!.complete, 1);
  });

  it('sums logged hours and treats null as zero', () => {
    const progress: WeekProgress[] = [
      { week: 1, status: 'complete', hours: 6.5 },
      { week: 2, status: 'complete', hours: null },
      { week: 3, status: 'in_progress', hours: 2 },
    ];
    assert.equal(totalHours(progress), 8.5);
  });
});

describe('getWeek', () => {
  it('finds a week by number', () => {
    assert.equal(getWeek(makeCurriculum(52), 17)?.week, 17);
  });

  it('returns undefined for a week outside the curriculum', () => {
    assert.equal(getWeek(makeCurriculum(52), 53), undefined);
  });
});
