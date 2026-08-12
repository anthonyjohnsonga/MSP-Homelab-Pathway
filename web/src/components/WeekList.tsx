/**
 * Every week, grouped by phase, with a per-phase completion bar and a status
 * marker on each row.
 */

import type { ArtifactCheck, Curriculum, WeekProgress, WeekStatus } from '@pathway/shared';
import { completionByPhase, weeksByPhase } from '@pathway/shared';
import { shortDate } from '../lib/data.ts';

const STATUS_TITLES: Record<WeekStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  complete: 'Complete',
  skipped: 'Skipped',
};

interface Props {
  curriculum: Curriculum;
  progress: WeekProgress[];
  checks: Map<number, ArtifactCheck>;
  selectedWeek: number;
  currentWeek: number | null;
  onSelectWeek: (week: number) => void;
}

export function WeekList({
  curriculum,
  progress,
  checks,
  selectedWeek,
  currentWeek,
  onSelectWeek,
}: Props) {
  const byWeek = new Map(progress.map((p) => [p.week, p]));
  const phaseCompletion = new Map(
    completionByPhase(curriculum, progress).map((c) => [c.phase, c]),
  );

  return (
    <nav aria-label="Curriculum weeks">
      {weeksByPhase(curriculum).map((group) => {
        const done = phaseCompletion.get(group.phase);
        return (
          <div className="phase-group" key={group.phase}>
            <div className="phase-header">
              <h2 className="phase-heading">{group.phase}</h2>
              {done && (
                <span className="phase-count">
                  {done.complete}/{done.total}
                </span>
              )}
            </div>

            {done && (
              <div className="phase-bar" aria-hidden="true">
                <div
                  className="phase-bar-fill"
                  style={{ width: `${Math.round(done.fraction * 100)}%` }}
                />
              </div>
            )}

            {group.weeks.map((week) => {
              const isNow = week.week === currentWeek;
              const status = byWeek.get(week.week)?.status ?? 'not_started';
              return (
                <button
                  key={week.week}
                  className={`week-row${isNow ? ' is-now' : ''}`}
                  aria-current={week.week === selectedWeek}
                  onClick={() => onSelectWeek(week.week)}
                >
                  <span className="num">{week.week}</span>
                  <span className="week-topic">
                    <span
                      className={`status-dot status-${status}`}
                      title={STATUS_TITLES[status]}
                      aria-label={STATUS_TITLES[status]}
                    />
                    {isNow && <span className="now-dot" aria-hidden="true" />}
                    {week.topic}
                  </span>
                  <span className="dates">
                    <ArtifactMark check={checks.get(week.week)} />
                    {shortDate(week.startDate)}
                  </span>
                </button>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}

/**
 * A tick for a week whose artifact is confirmed present, and a hollow mark for
 * one that is only self-reported. The two must stay visibly different — that
 * distinction is the point of the whole mechanic.
 */
function ArtifactMark({ check }: { check: ArtifactCheck | undefined }) {
  if (!check?.found) return null;
  const verified = check.source === 'verified';
  return (
    <span
      className={`artifact-mark ${verified ? 'is-verified' : 'is-attested'}`}
      title={verified ? 'Artifact verified in your repo' : 'Self-reported, not verified'}
      aria-label={verified ? 'Artifact verified' : 'Artifact self-reported'}
    >
      {verified ? '✓' : '○'}
    </span>
  );
}
