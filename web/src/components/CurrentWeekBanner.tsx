/**
 * "You are in Week N" — the first thing shown on load.
 *
 * This is calendar position, not progress. Once progress is persisted
 * (task 6) this banner also reports whether the tech is ahead or behind.
 */

import type { Curriculum } from '@shared/index.ts';
import { calendarPosition } from '@shared/index.ts';
import { dateRange } from '../lib/data.ts';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface Props {
  curriculum: Curriculum;
  now: Date;
  onSelectWeek: (week: number) => void;
}

export function CurrentWeekBanner({ curriculum, now, onSelectWeek }: Props) {
  const position = calendarPosition(curriculum, now);

  if (position.state === 'before_start') {
    const { firstWeek, daysUntilStart } = position;
    return (
      <div className="banner">
        <strong>Starts in {daysUntilStart} {daysUntilStart === 1 ? 'day' : 'days'}</strong>
        <span className="banner-topic">
          Week 1 — {firstWeek.topic}
        </span>
        <span className="banner-meta">
          {dateRange(firstWeek.startDate, firstWeek.endDate)}
        </span>
      </div>
    );
  }

  if (position.state === 'after_end') {
    const { lastWeek, daysSinceEnd } = position;
    return (
      <div className="banner">
        <strong>The year is complete</strong>
        <span className="banner-topic">
          Week {lastWeek.week} ended {daysSinceEnd} {daysSinceEnd === 1 ? 'day' : 'days'} ago
        </span>
      </div>
    );
  }

  const { week, dayOfWeek } = position;
  const dayName = DAY_NAMES[dayOfWeek - 1] ?? '';

  return (
    <div className="banner">
      <strong>
        <button className="dep-chip" onClick={() => onSelectWeek(week.week)}>
          You are in Week {week.week}
        </button>
      </strong>
      <span className="banner-topic">{week.topic}</span>
      <span className="banner-meta">
        {dayName} · day {dayOfWeek} of 7 · {dateRange(week.startDate, week.endDate)}
      </span>
    </div>
  );
}
