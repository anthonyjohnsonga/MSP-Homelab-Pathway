/**
 * "You are in Week N" — the first thing shown on load, plus whether the tech is
 * keeping up with the calendar.
 */

import type { Curriculum, Pace } from '@pathway/shared';
import { calendarPosition } from '@pathway/shared';
import { dateRange } from '../lib/data.ts';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface Props {
  curriculum: Curriculum;
  now: Date;
  pace: Pace;
  onSelectWeek: (week: number) => void;
}

export function CurrentWeekBanner({ curriculum, now, pace, onSelectWeek }: Props) {
  const position = calendarPosition(curriculum, now);

  if (position.state === 'before_start') {
    const { firstWeek, daysUntilStart } = position;
    return (
      <div className="banner">
        <strong>
          Starts in {daysUntilStart} {daysUntilStart === 1 ? 'day' : 'days'}
        </strong>
        <span className="banner-topic">Week 1 — {firstWeek.topic}</span>
        <span className="banner-meta">{dateRange(firstWeek.startDate, firstWeek.endDate)}</span>
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
        <span className="banner-meta">
          {pace.completedWeeks} of {curriculum.weeks.length} weeks finished
        </span>
      </div>
    );
  }

  const { week, dayOfWeek } = position;
  const dayName = DAY_NAMES[dayOfWeek - 1] ?? '';

  return (
    <div className="banner">
      <strong>
        <button className="week-jump" onClick={() => onSelectWeek(week.week)}>
          You are in Week {week.week}
        </button>
      </strong>
      <span className="banner-topic">{week.topic}</span>
      <PaceBadge pace={pace} />
      <span className="banner-meta">
        {dayName} · day {dayOfWeek} of 7 · {dateRange(week.startDate, week.endDate)}
      </span>
    </div>
  );
}

/**
 * Being a week behind is completely normal, so "on track" deliberately spans a
 * week either side. Only a real gap is called out, and it is phrased as a fact
 * rather than a telling-off.
 */
function PaceBadge({ pace }: { pace: Pace }) {
  if (pace.state === 'on_track') {
    return <span className="pace pace-on">On track</span>;
  }
  if (pace.state === 'ahead') {
    const n = pace.delta;
    return (
      <span className="pace pace-ahead">
        {n} {n === 1 ? 'week' : 'weeks'} ahead
      </span>
    );
  }
  const n = Math.abs(pace.delta);
  return (
    <span className="pace pace-behind">
      {n} {n === 1 ? 'week' : 'weeks'} behind
    </span>
  );
}
