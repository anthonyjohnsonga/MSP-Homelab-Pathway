import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import type { Week } from '../src/types.ts';
import { costSummary, priceHint, staleTrials, weekCost } from '../src/cost.ts';
import { loadCurriculum } from '../src/curriculum.ts';
import { parseISODate } from '../src/dates.ts';
import { clone, makeCurriculum, makeWeek, MONDAY } from './fixtures.ts';

const real = loadCurriculum(
  JSON.parse(readFileSync(new URL('../../data/curriculum.json', import.meta.url), 'utf8')),
);

function weekWithTooling(
  freeOption: string,
  paidFallback: string,
  trial: Week['tooling']['trial'] = null,
): Week {
  const week = makeWeek(1, MONDAY, 'Phase 1 — Test Phase');
  return { ...week, tooling: { standsUp: 'thing', freeOption, trial, paidFallback } };
}

describe('tiering a week', () => {
  it('is free_only when nothing is offered but free', () => {
    assert.equal(weekCost(weekWithTooling('Proxmox VE', '—')).tier, 'free_only');
  });

  it('treats an empty paid fallback as nothing to buy', () => {
    assert.equal(weekCost(weekWithTooling('Proxmox VE', '')).tier, 'free_only');
  });

  it('is free_with_trial when a trial exists and no paid option does', () => {
    const week = weekWithTooling('Ubuntu', '—', { name: 'Eval', duration: '90 days' });
    assert.equal(weekCost(week).tier, 'free_with_trial');
  });

  it('is paid_optional when a paid option exists but free suffices', () => {
    assert.equal(weekCost(weekWithTooling('k3s', 'AKS node costs')).tier, 'paid_optional');
  });

  it('is paid_required only when the curriculum says required', () => {
    const week = weekWithTooling('Cloudflare free DNS', 'Domain registration, $10–15/yr (required)');
    assert.equal(weekCost(week).tier, 'paid_required');
  });

  it('does not infer required from a price alone', () => {
    // A price is not the same as an obligation. Most priced items are optional.
    assert.equal(weekCost(weekWithTooling('Free thing', '~$22/user/mo')).tier, 'paid_optional');
  });
});

describe('priceHint', () => {
  it('reads a range with a period', () => {
    assert.equal(priceHint('Domain registration, $10–15/yr (required)'), '$10–15/yr');
  });

  it('reads an approximate per-user rate', () => {
    assert.equal(priceHint('M365 Business Premium, ~$22/user/mo'), '~$22/user/mo');
  });

  it('reads thousands', () => {
    assert.equal(priceHint('Nessus Pro (~$4k — skip)'), '~$4k');
  });

  it('returns null when no price is stated', () => {
    assert.equal(priceHint('GitHub Pro'), null);
    assert.equal(priceHint(null), null);
  });
});

describe('summary over the real curriculum', () => {
  const summary = costSummary(real);

  it('covers every week exactly once', () => {
    assert.equal(summary.total, 52);
    assert.equal(
      summary.freeOnly + summary.paidOptional + summary.paidRequired +
        summary.weeks.filter((w) => w.tier === 'free_with_trial').length,
      52,
    );
  });

  it('finds exactly one unavoidable cost in the whole year', () => {
    // The domain name. This is the headline claim the cost view makes, so it
    // is worth a test that fails loudly if the data ever changes.
    assert.equal(summary.paidRequired, 1);
    assert.equal(summary.requiredItems[0]?.week, 6);
    assert.match(summary.requiredItems[0]?.paidFallback ?? '', /Domain registration/);
  });

  it('reports the trial count', () => {
    assert.equal(summary.withTrial, 16);
  });

  it('gives every week a free option', () => {
    assert.deepEqual(
      summary.weeks.filter((w) => w.freeOption.trim() === '').map((w) => w.week),
      [],
    );
  });
});

describe('staleTrials', () => {
  it('finds nothing when trials were checked recently', () => {
    assert.deepEqual(staleTrials(real, parseISODate('2026-09-01')), []);
  });

  it('flags trials once they age past the threshold', () => {
    // Trials were checked 2026-08-10; a year later they are all suspect.
    assert.equal(staleTrials(real, parseISODate('2027-09-01')).length, 16);
  });

  it('respects a custom threshold', () => {
    assert.equal(staleTrials(real, parseISODate('2026-08-25'), 7).length, 16);
    assert.equal(staleTrials(real, parseISODate('2026-08-25'), 30).length, 0);
  });

  it('ignores weeks with no trial', () => {
    const c = makeCurriculum(3);
    assert.deepEqual(staleTrials(c, parseISODate('2030-01-01')), []);
  });

  it('treats an unparseable checkedOn as stale', () => {
    const c = clone(makeCurriculum(3));
    c.weeks[0]!.tooling.trial = { name: 'X', duration: '30 days', checkedOn: 'last tuesday' };
    assert.deepEqual(staleTrials(c, parseISODate('2026-08-11')).map((w) => w.week), [1]);
  });
});
