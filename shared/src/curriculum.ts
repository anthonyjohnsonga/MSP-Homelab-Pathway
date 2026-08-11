/**
 * Reading the curriculum and answering the questions the platform actually asks:
 * what week is it, what am I blocked on, and am I keeping up.
 *
 * Nothing here assumes 52 weeks. Counts come from the data.
 */

import type { Curriculum, Week, WeekProgress } from './types.ts';
import { daysBetween, parseISODate, today } from './dates.ts';
import { errorsOnly, formatIssue, validateCurriculum } from './validate.ts';

/**
 * Parse and validate curriculum data. Throws on any error-level issue, because
 * a platform running on a broken curriculum gives techs wrong answers about
 * what they can start.
 */
export function loadCurriculum(data: unknown): Curriculum {
  const problems = errorsOnly(validateCurriculum(data));
  if (problems.length > 0) {
    const detail = problems.map((p) => `  - ${formatIssue(p)}`).join('\n');
    throw new Error(`curriculum.json failed validation:\n${detail}`);
  }
  return data as Curriculum;
}

export function getWeek(curriculum: Curriculum, weekNumber: number): Week | undefined {
  return curriculum.weeks.find((w) => w.week === weekNumber);
}

/** Total weeks in this curriculum — 52 today, 56 if consolidation weeks land. */
export function weekCount(curriculum: Curriculum): number {
  return curriculum.weeks.length;
}

export interface PhaseGroup {
  phase: string;
  weeks: Week[];
}

/**
 * Weeks grouped by phase, in curriculum order. Used for the main list view.
 * Phases are ordered by where their first week falls, not by the declaration
 * order in `phases`, so the list always reads chronologically.
 */
export function weeksByPhase(curriculum: Curriculum): PhaseGroup[] {
  const groups: PhaseGroup[] = [];
  for (const week of curriculum.weeks) {
    const last = groups[groups.length - 1];
    if (last && last.phase === week.phase) {
      last.weeks.push(week);
    } else {
      groups.push({ phase: week.phase, weeks: [week] });
    }
  }
  return groups;
}

/** Where today sits relative to the curriculum calendar. */
export type CalendarPosition =
  | { state: 'before_start'; firstWeek: Week; daysUntilStart: number }
  | { state: 'in_progress'; week: Week; dayOfWeek: number }
  | { state: 'after_end'; lastWeek: Week; daysSinceEnd: number };

/**
 * Which week the calendar says it is. This is the "You are in Week N" banner.
 *
 * Note this is calendar position, not progress — a tech can be in Week 12 by
 * the calendar while having completed only six. `pace()` compares the two.
 */
export function calendarPosition(
  curriculum: Curriculum,
  now: Date = today(),
): CalendarPosition {
  const weeks = curriculum.weeks;
  const first = weeks[0];
  const last = weeks[weeks.length - 1];
  if (!first || !last) {
    throw new Error('Curriculum has no weeks.');
  }

  const start = parseISODate(first.startDate);
  if (now.getTime() < start.getTime()) {
    return { state: 'before_start', firstWeek: first, daysUntilStart: daysBetween(now, start) };
  }

  const end = parseISODate(last.endDate);
  if (now.getTime() > end.getTime()) {
    return { state: 'after_end', lastWeek: last, daysSinceEnd: daysBetween(end, now) };
  }

  for (const week of weeks) {
    const weekStart = parseISODate(week.startDate);
    const weekEnd = parseISODate(week.endDate);
    if (now.getTime() >= weekStart.getTime() && now.getTime() <= weekEnd.getTime()) {
      // 1 = Monday, the day the week opens, through 7 = Sunday.
      return { state: 'in_progress', week, dayOfWeek: daysBetween(weekStart, now) + 1 };
    }
  }

  // Only reachable if the calendar has a gap, which validation rejects.
  throw new Error(`No week covers ${now.toISOString().slice(0, 10)}.`);
}

export interface Pace {
  /** Week number the calendar says you should be working on. */
  expectedWeek: number;
  /** How many weeks are marked complete. */
  completedWeeks: number;
  /** completedWeeks minus expectedWeek. Negative means behind. */
  delta: number;
  state: 'ahead' | 'on_track' | 'behind';
}

/**
 * Progress against the calendar. Being a week behind is normal and shouldn't
 * feel like failure, so "on_track" deliberately spans a week either side.
 */
export function pace(
  curriculum: Curriculum,
  progress: readonly WeekProgress[],
  now: Date = today(),
): Pace {
  const position = calendarPosition(curriculum, now);
  const expectedWeek =
    position.state === 'before_start'
      ? 0
      : position.state === 'after_end'
        ? weekCount(curriculum)
        : position.week.week;

  const completedWeeks = progress.filter((p) => p.status === 'complete').length;
  const delta = completedWeeks - expectedWeek;

  return {
    expectedWeek,
    completedWeeks,
    delta,
    state: delta >= 1 ? 'ahead' : delta <= -2 ? 'behind' : 'on_track',
  };
}

/**
 * Weeks that must be finished before this one can honestly be started.
 *
 * This drives the warning the brief calls for: open Week 39 with Week 32
 * unfinished and the platform says so, prominently, rather than letting a tech
 * discover it three days in.
 */
export function unmetDependencies(
  curriculum: Curriculum,
  weekNumber: number,
  isComplete: (week: number) => boolean,
): Week[] {
  const week = getWeek(curriculum, weekNumber);
  if (!week) return [];
  return week.dependsOn
    .filter((dep) => !isComplete(dep))
    .map((dep) => getWeek(curriculum, dep))
    .filter((w): w is Week => w !== undefined);
}

/** Weeks that will be blocked if this one is skipped. The reverse edge. */
export function dependents(curriculum: Curriculum, weekNumber: number): Week[] {
  return curriculum.weeks.filter((w) => w.dependsOn.includes(weekNumber));
}

/** Build a lookup so callers can ask about progress without scanning a list. */
export function progressByWeek(
  progress: readonly WeekProgress[],
): Map<number, WeekProgress> {
  return new Map(progress.map((p) => [p.week, p]));
}

export interface PhaseCompletion {
  phase: string;
  total: number;
  complete: number;
  /** 0 to 1. */
  fraction: number;
}

/** Completion per phase, for the progress bars on the list view. */
export function completionByPhase(
  curriculum: Curriculum,
  progress: readonly WeekProgress[],
): PhaseCompletion[] {
  const byWeek = progressByWeek(progress);
  return weeksByPhase(curriculum).map((group) => {
    const complete = group.weeks.filter(
      (w) => byWeek.get(w.week)?.status === 'complete',
    ).length;
    return {
      phase: group.phase,
      total: group.weeks.length,
      complete,
      fraction: group.weeks.length === 0 ? 0 : complete / group.weeks.length,
    };
  });
}

/** Total hours a tech has logged across the year. */
export function totalHours(progress: readonly WeekProgress[]): number {
  return progress.reduce((sum, p) => sum + (p.hours ?? 0), 0);
}
