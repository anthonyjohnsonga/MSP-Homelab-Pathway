/**
 * One week in full: what you learn, what you build, what must land in the repo,
 * and how to get the tools without paying.
 */

import type { Curriculum, Week } from '@shared/index.ts';
import { daysBetween, getWeek, parseISODate } from '@shared/index.ts';
import { dateRange, stripCode } from '../lib/data.ts';

/** Past this, a trial's terms are old enough that we say so out loud. */
const STALE_AFTER_DAYS = 180;

interface Props {
  curriculum: Curriculum;
  week: Week;
  now: Date;
  onSelectWeek: (week: number) => void;
}

export function WeekDetail({ curriculum, week, now, onSelectWeek }: Props) {
  const { tooling } = week;
  const hasPaid = tooling.paidFallback.trim() !== '' && tooling.paidFallback.trim() !== '—';

  return (
    <article className="detail">
      <div className="detail-eyebrow">{week.phase}</div>
      <h2>
        Week {week.week} — {week.topic}
      </h2>
      <div className="detail-dates">{dateRange(week.startDate, week.endDate)}</div>

      <section className="section">
        <h3>Concepts</h3>
        <ul className="concepts">
          {week.concepts.map((concept) => (
            <li key={concept}>{concept}</li>
          ))}
        </ul>
      </section>

      <section className="section">
        <h3>Lab</h3>
        <div className="callout">
          <p>{week.lab}</p>
        </div>
      </section>

      <section className="section">
        <h3>Required artifact</h3>
        <div className="callout artifact">
          <p>{stripCode(week.artifact)}</p>
          <p className="callout-note">
            This week is not complete until this exists in your <code>msp-lab</code> repo.
          </p>
        </div>
      </section>

      <section className="section">
        <h3>Depends on</h3>
        {week.dependsOn.length === 0 ? (
          <p className="empty">Nothing — this week stands alone.</p>
        ) : (
          <div className="dep-list">
            {week.dependsOn.map((depNumber) => {
              const dep = getWeek(curriculum, depNumber);
              return (
                <button
                  key={depNumber}
                  className="dep-chip"
                  onClick={() => onSelectWeek(depNumber)}
                >
                  <span className="dep-num">Week {depNumber}</span>
                  {dep ? ` · ${dep.topic}` : ''}
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="section">
        <h3>Stands up</h3>
        <p>{tooling.standsUp}</p>
      </section>

      <section className="section">
        <h3>How to get the tools</h3>
        <div className="ladder">
          <div className="rung free">
            <div className="rung-label">Free</div>
            <div className="rung-body">
              <p>{tooling.freeOption || 'No free option recorded for this week.'}</p>
            </div>
          </div>

          {tooling.trial && (
            <div className="rung trial">
              <div className="rung-label">Trial</div>
              <div className="rung-body">
                <p>
                  {tooling.trial.url ? (
                    <a href={tooling.trial.url} target="_blank" rel="noreferrer noopener">
                      {tooling.trial.name}
                    </a>
                  ) : (
                    tooling.trial.name
                  )}{' '}
                  — <span className="trial-duration">{tooling.trial.duration}</span>
                </p>
                {tooling.trial.eligibility && (
                  <p className="rung-detail">{tooling.trial.eligibility}</p>
                )}
                <TrialFreshness checkedOn={tooling.trial.checkedOn} now={now} />
              </div>
            </div>
          )}

          {hasPaid && (
            <div className="rung paid">
              <div className="rung-label">Paid</div>
              <div className="rung-body">
                <p>{tooling.paidFallback}</p>
                <p className="rung-detail">
                  Only if free and trial genuinely fall short.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    </article>
  );
}

/**
 * Trial terms and signup links rot faster than anything else in the curriculum,
 * so we show when each was last confirmed and flag the old ones rather than
 * letting a tech discover a dead link on their own.
 */
function TrialFreshness({ checkedOn, now }: { checkedOn?: string; now: Date }) {
  if (!checkedOn) return null;

  let age: number;
  try {
    age = daysBetween(parseISODate(checkedOn), now);
  } catch {
    return null;
  }

  const stale = age > STALE_AFTER_DAYS;
  return (
    <span className="checked-on">
      Checked {checkedOn}
      {stale && <> · <span className="stale-flag">verify before relying on this</span></>}
    </span>
  );
}
