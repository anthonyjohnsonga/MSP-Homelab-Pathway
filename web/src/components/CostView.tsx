/**
 * What the year costs, across all 52 weeks.
 *
 * The point of this view is to make the free-first promise checkable rather
 * than something the README merely claims. It shows every week's free path,
 * the trials, and what money would buy — and is explicit that only one thing
 * all year genuinely has to be paid for.
 *
 * No totals are computed. The prices in the curriculum are ranges, per-user
 * rates and per-month rates that cannot be honestly added together, and an
 * invented total would be worse than none.
 */

import { useState } from 'react';

import type { Curriculum, WeekCost } from '@pathway/shared';
import { costSummary, staleTrials } from '@pathway/shared';

type Filter = 'all' | 'free_only' | 'has_trial' | 'has_paid';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All weeks' },
  { id: 'free_only', label: 'Free only' },
  { id: 'has_trial', label: 'Has a trial' },
  { id: 'has_paid', label: 'Has a paid option' },
];

interface Props {
  curriculum: Curriculum;
  now: Date;
  onSelectWeek: (week: number) => void;
}

export function CostView({ curriculum, now, onSelectWeek }: Props) {
  const [filter, setFilter] = useState<Filter>('all');
  const summary = costSummary(curriculum);
  const stale = staleTrials(curriculum, now);

  const rows = summary.weeks.filter((w) => {
    if (filter === 'free_only') return w.tier === 'free_only' || w.tier === 'free_with_trial';
    if (filter === 'has_trial') return w.trial !== null;
    if (filter === 'has_paid') return w.paidFallback !== null;
    return true;
  });

  return (
    <section className="cost-view">
      <div className="cost-stats">
        <Stat value={summary.total} label="weeks" />
        <Stat value={summary.freeOnly} label="free, nothing else offered" />
        <Stat value={summary.withTrial} label="with a trial" />
        <Stat value={summary.paidOptional} label="paid option, not needed" />
        <Stat value={summary.paidRequired} label="must be paid for" emphasis />
      </div>

      {summary.requiredItems.length > 0 && (
        <div className="cost-required">
          <h3>
            {summary.requiredItems.length === 1
              ? 'The only thing you have to buy all year'
              : 'What you have to buy'}
          </h3>
          {summary.requiredItems.map((item) => (
            <p key={item.week}>
              <button className="dep-warning-link" onClick={() => onSelectWeek(item.week)}>
                Week {item.week} — {item.topic}
              </button>
              : {item.paidFallback}
            </p>
          ))}
          <p className="cost-required-note">
            Everything else on this page is optional. Each week has a free path
            that completes the lab.
          </p>
        </div>
      )}

      {stale.length > 0 && (
        <div className="alert">
          {stale.length} trial {stale.length === 1 ? 'entry has' : 'entries have'} not been
          confirmed recently. Check the terms before relying on them.
        </div>
      )}

      <div className="cost-filters" role="group" aria-label="Filter weeks">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className="segment"
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="cost-rows">
        <div className="cost-row cost-head" aria-hidden="true">
          <span>Week</span>
          <span>Free</span>
          <span>Trial</span>
          <span>Paid</span>
        </div>
        {rows.map((row) => (
          <CostRow key={row.week} row={row} onSelectWeek={onSelectWeek} />
        ))}
        {rows.length === 0 && <p className="empty">No weeks match that filter.</p>}
      </div>
    </section>
  );
}

function Stat({
  value,
  label,
  emphasis,
}: {
  value: number;
  label: string;
  emphasis?: boolean;
}) {
  return (
    <div className={`cost-stat${emphasis ? ' emphasis' : ''}`}>
      <div className="cost-stat-value">{value}</div>
      <div className="cost-stat-label">{label}</div>
    </div>
  );
}

function CostRow({
  row,
  onSelectWeek,
}: {
  row: WeekCost;
  onSelectWeek: (week: number) => void;
}) {
  return (
    <div className="cost-row">
      <span className="cost-week">
        <button className="dep-warning-link" onClick={() => onSelectWeek(row.week)}>
          <span className="num">{row.week}</span> {row.topic}
        </button>
        <span className="cost-standsup">{row.standsUp}</span>
      </span>

      <span className="cost-cell cost-free">{row.freeOption}</span>

      <span className="cost-cell cost-trial">
        {row.trial ? (
          <>
            {row.trial.url ? (
              <a href={row.trial.url} target="_blank" rel="noreferrer noopener">
                {row.trial.name}
              </a>
            ) : (
              row.trial.name
            )}
            <span className="cost-duration">{row.trial.duration}</span>
          </>
        ) : (
          <span className="cost-dash">—</span>
        )}
      </span>

      <span className="cost-cell cost-paid">
        {row.paidFallback ? (
          <>
            {row.paidFallback}
            {row.tier === 'paid_required' && <span className="cost-required-tag">required</span>}
          </>
        ) : (
          <span className="cost-dash">—</span>
        )}
      </span>
    </div>
  );
}
