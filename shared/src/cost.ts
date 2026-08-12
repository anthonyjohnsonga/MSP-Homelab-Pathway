/**
 * What the year actually costs.
 *
 * The promise is free-first: every week leads with a genuinely free path, and
 * paid appears only where free cannot do the job. This module works out where
 * that promise holds, so the platform can prove it rather than assert it.
 *
 * Prices are read out of the curriculum prose and shown verbatim. Nothing here
 * adds numbers up — the strings are ranges, per-user rates and per-month rates
 * that cannot be honestly summed into one figure, and a made-up total would be
 * worse than none.
 */

import type { Curriculum, Trial, Week } from './types.ts';
import { daysBetween, parseISODate, today } from './dates.ts';

export type CostTier =
  /** Free covers it, with nothing else offered. */
  | 'free_only'
  /** Free covers it, and a trial is available too. */
  | 'free_with_trial'
  /** A paid option exists but free is sufficient. */
  | 'paid_optional'
  /** Paid is unavoidable. */
  | 'paid_required';

export interface WeekCost {
  week: number;
  topic: string;
  tier: CostTier;
  standsUp: string;
  freeOption: string;
  trial: Trial | null;
  /** null when the curriculum records no paid option. */
  paidFallback: string | null;
  /** Price fragment stated in the prose, e.g. "$10–15/yr". */
  priceHint: string | null;
}

export interface CostSummary {
  total: number;
  freeOnly: number;
  withTrial: number;
  paidOptional: number;
  paidRequired: number;
  /** The weeks where money genuinely has to be spent. */
  requiredItems: WeekCost[];
  weeks: WeekCost[];
}

/** The curriculum writes "—" where there is nothing to buy. */
function normalisePaid(raw: string): string | null {
  const trimmed = raw.trim();
  return trimmed === '' || trimmed === '—' || trimmed === '-' ? null : trimmed;
}

/**
 * A paid option is only unavoidable when the curriculum says so outright.
 * Week 6's domain name is the one place this is true across the whole year.
 */
function isRequired(paid: string | null): boolean {
  return paid !== null && /\brequired\b/i.test(paid);
}

/** First price-looking fragment: "$10–15/yr", "~$22/user/mo", "~$4k". */
const PRICE = /~?\$[\d.,]+\s*k?\b(?:\s*[–—-]\s*\$?[\d.,]+\s*k?\b)?(?:\/[\w/]+)*/i;

export function priceHint(paid: string | null): string | null {
  if (!paid) return null;
  const match = paid.match(PRICE);
  return match ? match[0].trim() : null;
}

export function weekCost(week: Week): WeekCost {
  const paid = normalisePaid(week.tooling.paidFallback);
  const trial = week.tooling.trial ?? null;

  let tier: CostTier;
  if (isRequired(paid)) tier = 'paid_required';
  else if (paid) tier = 'paid_optional';
  else if (trial) tier = 'free_with_trial';
  else tier = 'free_only';

  return {
    week: week.week,
    topic: week.topic,
    tier,
    standsUp: week.tooling.standsUp,
    freeOption: week.tooling.freeOption,
    trial,
    paidFallback: paid,
    priceHint: priceHint(paid),
  };
}

export function costSummary(curriculum: Curriculum): CostSummary {
  const weeks = curriculum.weeks.map(weekCost);
  return {
    total: weeks.length,
    freeOnly: weeks.filter((w) => w.tier === 'free_only').length,
    withTrial: weeks.filter((w) => w.trial !== null).length,
    paidOptional: weeks.filter((w) => w.tier === 'paid_optional').length,
    paidRequired: weeks.filter((w) => w.tier === 'paid_required').length,
    requiredItems: weeks.filter((w) => w.tier === 'paid_required'),
    weeks,
  };
}

/** Default before a trial's terms are old enough to distrust. */
export const TRIAL_STALE_AFTER_DAYS = 180;

/**
 * Trials whose terms have not been confirmed recently.
 *
 * Vendors change durations, eligibility and URLs constantly, so the platform
 * says which entries are old rather than quietly sending a tech to a dead link.
 */
export function staleTrials(
  curriculum: Curriculum,
  now: Date = today(),
  maxAgeDays: number = TRIAL_STALE_AFTER_DAYS,
): Week[] {
  return curriculum.weeks.filter((week) => {
    const checkedOn = week.tooling.trial?.checkedOn;
    if (!checkedOn) return false;
    try {
      return daysBetween(parseISODate(checkedOn), now) > maxAgeDays;
    } catch {
      // An unparseable date is worse than an old one — treat it as stale.
      return true;
    }
  });
}
