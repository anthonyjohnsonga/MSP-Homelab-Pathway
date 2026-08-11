/**
 * Synthetic curricula for tests.
 *
 * Built rather than checked in, so that a test for the 56-week variant costs a
 * function argument instead of a second data file to keep in sync.
 */

import type { Curriculum, Week } from '../src/types.ts';
import { addDays, parseISODate, toISODate } from '../src/dates.ts';

/** 2026-08-10 is a Monday — the real curriculum's start date. */
export const MONDAY = '2026-08-10';

export function makeWeek(n: number, startISO: string, phase: string): Week {
  const start = addDays(parseISODate(startISO), (n - 1) * 7);
  return {
    week: n,
    topic: `Topic ${n}`,
    phase,
    concepts: [`Concept for week ${n}`],
    lab: `Lab for week ${n}`,
    startDate: toISODate(start),
    endDate: toISODate(addDays(start, 6)),
    artifact: `docs/week-${n}.md`,
    dependsOn: [],
    tooling: {
      standsUp: `Thing ${n}`,
      freeOption: 'Free thing',
      trial: null,
      paidFallback: '—',
    },
  };
}

/**
 * A valid curriculum of any length. Defaults to 52 weeks; pass 56 to prove the
 * platform tolerates the consolidation-week variant.
 */
export function makeCurriculum(count = 52, startISO: string = MONDAY): Curriculum {
  const phase = 'Phase 1 — Test Phase';
  const weeks = Array.from({ length: count }, (_, i) => makeWeek(i + 1, startISO, phase));
  const first = weeks[0];
  const last = weeks[weeks.length - 1];
  if (!first || !last) throw new Error('count must be at least 1');

  return {
    schemaVersion: 2,
    title: 'Test Curriculum',
    client: { name: 'Northgate Legal', staff: 20, sites: 2, description: 'Test client' },
    lab: { model: 'hybrid', localHost: 'box', cloud: 'azure', targetSpec: 'spec' },
    repo: 'msp-lab',
    startDate: first.startDate,
    endDate: last.endDate,
    phases: [phase],
    weeks,
  };
}

/** Deep clone so a test can break one field without affecting its neighbours. */
export function clone(curriculum: Curriculum): Curriculum {
  return structuredClone(curriculum);
}
