/**
 * One week in full: what you learn, what you build, what must land in the repo,
 * how to get the tools without paying, and what you recorded against it.
 */

import type {
  ArtifactCheck,
  Curriculum,
  ProgressStore,
  RepoRef,
  Week,
  WeekProgress,
  WeekStatus,
} from '@pathway/shared';
import { daysBetween, getWeek, parseISODate } from '@pathway/shared';
import { dateRange, stripCode } from '../lib/data.ts';
import { HoursInput, NoteEditor, StatusControl } from './ProgressControls.tsx';
import { DependencyWarning } from './DependencyWarning.tsx';
import { ArtifactPanel } from './ArtifactPanel.tsx';

/** Past this, a trial's terms are old enough that we say so out loud. */
const STALE_AFTER_DAYS = 180;

interface Props {
  curriculum: Curriculum;
  week: Week;
  now: Date;
  progress: WeekProgress | undefined;
  store: ProgressStore;
  unmetDependencies: Week[];
  repo: RepoRef | null;
  artifactCheck: ArtifactCheck | undefined;
  verifying: boolean;
  onSelectWeek: (week: number) => void;
  onStatusChange: (week: number, status: WeekStatus) => void;
  onHoursChange: (week: number, hours: number | null) => void;
  onVerify: (week: Week) => void;
  onAttest: (week: Week) => void;
  onClearCheck: (week: Week) => void;
}

export function WeekDetail({
  curriculum,
  week,
  now,
  progress,
  store,
  unmetDependencies,
  repo,
  artifactCheck,
  verifying,
  onSelectWeek,
  onStatusChange,
  onHoursChange,
  onVerify,
  onAttest,
  onClearCheck,
}: Props) {
  const { tooling } = week;
  const hasPaid = tooling.paidFallback.trim() !== '' && tooling.paidFallback.trim() !== '—';

  return (
    <article className="detail">
      <div className="detail-eyebrow">{week.phase}</div>
      <h2>
        Week {week.week} — {week.topic}
      </h2>
      <div className="detail-dates">{dateRange(week.startDate, week.endDate)}</div>

      <DependencyWarning
        week={week}
        unmet={unmetDependencies}
        onSelectWeek={onSelectWeek}
      />

      <div className="progress-row">
        <StatusControl
          value={progress?.status ?? 'not_started'}
          onChange={(status) => onStatusChange(week.week, status)}
        />
        <HoursInput
          value={progress?.hours ?? null}
          onChange={(hours) => onHoursChange(week.week, hours)}
        />
      </div>

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
        <ArtifactPanel
          week={week}
          curriculum={curriculum}
          repo={repo}
          check={artifactCheck}
          verifying={verifying}
          onVerify={() => onVerify(week)}
          onAttest={() => onAttest(week)}
          onClear={() => onClearCheck(week)}
        />
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
                <p className="rung-detail">Only if free and trial genuinely fall short.</p>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <h3>Your note</h3>
        <NoteEditor week={week.week} store={store} />
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
      {stale && (
        <>
          {' '}
          · <span className="stale-flag">verify before relying on this</span>
        </>
      )}
    </span>
  );
}
