/**
 * The warning the brief asks for by name: open Week 39 with Week 32 unfinished
 * and the platform says so prominently, rather than letting a tech discover it
 * three days in.
 *
 * It informs rather than blocks. The curriculum is ordered for a reason, but a
 * tech who knows what they are doing should not be stopped by an app.
 */

import type { Week } from '@pathway/shared';

interface Props {
  week: Week;
  unmet: Week[];
  onSelectWeek: (week: number) => void;
}

export function DependencyWarning({ week, unmet, onSelectWeek }: Props) {
  if (unmet.length === 0) return null;

  return (
    <div className="dep-warning" role="status">
      <div className="dep-warning-head">
        {unmet.length === 1
          ? `Week ${week.week} depends on work you haven't finished`
          : `Week ${week.week} depends on ${unmet.length} weeks you haven't finished`}
      </div>
      <ul className="dep-warning-list">
        {unmet.map((dep) => (
          <li key={dep.week}>
            <button className="dep-warning-link" onClick={() => onSelectWeek(dep.week)}>
              Week {dep.week} — {dep.topic}
            </button>
          </li>
        ))}
      </ul>
      <p className="dep-warning-note">
        You can still start this week. The order is dependency-driven, so doing
        the earlier work first usually saves time.
      </p>
    </div>
  );
}
