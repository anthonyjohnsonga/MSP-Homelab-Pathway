/**
 * Every week, grouped by phase, in curriculum order.
 *
 * Status indicators arrive with task 6; today this shows structure, dates and
 * which week the calendar says it is.
 */

import type { Curriculum } from '@shared/index.ts';
import { weeksByPhase } from '@shared/index.ts';
import { shortDate } from '../lib/data.ts';

interface Props {
  curriculum: Curriculum;
  selectedWeek: number;
  currentWeek: number | null;
  onSelectWeek: (week: number) => void;
}

export function WeekList({ curriculum, selectedWeek, currentWeek, onSelectWeek }: Props) {
  return (
    <nav aria-label="Curriculum weeks">
      {weeksByPhase(curriculum).map((group) => (
        <div className="phase-group" key={group.phase}>
          <h2 className="phase-heading">{group.phase}</h2>
          {group.weeks.map((week) => {
            const isNow = week.week === currentWeek;
            return (
              <button
                key={week.week}
                className={`week-row${isNow ? ' is-now' : ''}`}
                aria-current={week.week === selectedWeek}
                onClick={() => onSelectWeek(week.week)}
              >
                <span className="num">{week.week}</span>
                <span>
                  {isNow && <span className="now-dot" aria-hidden="true" />}
                  {week.topic}
                </span>
                <span className="dates">{shortDate(week.startDate)}</span>
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
