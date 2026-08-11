/**
 * Invariant checks for curriculum.json.
 *
 * These run in CI on every push and via `npm run validate`. The point is to
 * fail loudly: a curriculum with a forward dependency or a gap in its week
 * numbering will produce a platform that quietly misleads techs about what
 * they can start, which is worse than not building it at all.
 *
 * Nothing here hardcodes 52. A 56-week variant validates unchanged.
 */

import type { Curriculum, Week } from './types.ts';
import { WEEK_STATUSES } from './types.ts';
import { daysBetween, isMonday, isSunday, parseISODate, toISODate } from './dates.ts';

export type IssueLevel = 'error' | 'warning';

export interface Issue {
  level: IssueLevel;
  /** Short stable identifier, useful for testing and for suppressing noise. */
  code: string;
  /** The week the problem is in, when it belongs to one. */
  week?: number;
  message: string;
}

/**
 * Check every invariant. Returns all problems found rather than throwing on the
 * first, so a broken data file can be fixed in one pass instead of ten.
 */
export function validateCurriculum(data: unknown): Issue[] {
  const issues: Issue[] = [];
  const err = (code: string, message: string, week?: number) =>
    issues.push({ level: 'error', code, message, week });
  const warn = (code: string, message: string, week?: number) =>
    issues.push({ level: 'warning', code, message, week });

  if (typeof data !== 'object' || data === null) {
    err('not_an_object', 'Curriculum data is not an object.');
    return issues;
  }

  const c = data as Partial<Curriculum>;

  if (typeof c.schemaVersion !== 'number') {
    err('schema_version', 'schemaVersion is missing or is not a number.');
  }
  if (!Array.isArray(c.phases) || c.phases.length === 0) {
    err('no_phases', 'phases is missing or empty.');
  }
  if (!Array.isArray(c.weeks) || c.weeks.length === 0) {
    err('no_weeks', 'weeks is missing or empty.');
    return issues;
  }

  const weeks = c.weeks as Week[];
  const phases = new Set(Array.isArray(c.phases) ? c.phases : []);

  // ---- Week numbering: contiguous from 1, no gaps, no duplicates ----------
  weeks.forEach((w, i) => {
    const expected = i + 1;
    if (w.week !== expected) {
      err(
        'week_numbering',
        `Week at position ${expected} is numbered ${w.week}. Numbering must be contiguous from 1.`,
        w.week,
      );
    }
  });

  const seen = new Set<number>();
  for (const w of weeks) {
    if (seen.has(w.week)) {
      err('duplicate_week', `Week ${w.week} appears more than once.`, w.week);
    }
    seen.add(w.week);
  }

  // ---- Per-week content and dependency checks ----------------------------
  for (const w of weeks) {
    for (const field of ['topic', 'phase', 'lab', 'artifact'] as const) {
      if (typeof w[field] !== 'string' || w[field].trim() === '') {
        err('missing_field', `Week ${w.week} has no ${field}.`, w.week);
      }
    }

    if (!Array.isArray(w.concepts) || w.concepts.length === 0) {
      err('no_concepts', `Week ${w.week} lists no concepts.`, w.week);
    }

    if (typeof w.phase === 'string' && !phases.has(w.phase)) {
      err(
        'unknown_phase',
        `Week ${w.week} is in phase "${w.phase}", which is not in the declared phases list.`,
        w.week,
      );
    }

    // The rule that makes the dependency graph safe to walk: you can only
    // depend on work that comes earlier in the year.
    if (!Array.isArray(w.dependsOn)) {
      err('depends_on_type', `Week ${w.week} has a dependsOn that is not an array.`, w.week);
    } else {
      for (const dep of w.dependsOn) {
        if (typeof dep !== 'number' || !Number.isInteger(dep)) {
          err('depends_on_type', `Week ${w.week} depends on a non-integer week.`, w.week);
        } else if (dep >= w.week) {
          err(
            'forward_dependency',
            `Week ${w.week} depends on Week ${dep}, which is not strictly earlier.`,
            w.week,
          );
        } else if (!seen.has(dep) && !weeks.some((x) => x.week === dep)) {
          err(
            'missing_dependency',
            `Week ${w.week} depends on Week ${dep}, which does not exist.`,
            w.week,
          );
        }
      }
    }

    if (!w.tooling || typeof w.tooling !== 'object') {
      err('no_tooling', `Week ${w.week} has no tooling block.`, w.week);
    } else if (typeof w.tooling.freeOption !== 'string' || w.tooling.freeOption.trim() === '') {
      // Free-first is the product promise, so a week with no free path is a
      // warning worth surfacing rather than a silent gap.
      warn('no_free_option', `Week ${w.week} offers no free option.`, w.week);
    }

    // schemaVersion 1 carried per-user state inline. Tolerated, but flagged:
    // it does not belong in a repo that is public and multi-user.
    if (w.status !== undefined && !WEEK_STATUSES.includes(w.status)) {
      err('bad_status', `Week ${w.week} has an unrecognised status "${w.status}".`, w.week);
    }
    if (w.notes !== undefined && w.notes !== '') {
      warn(
        'inline_user_data',
        `Week ${w.week} carries an inline note. Per-user data belongs in storage, not the repo.`,
        w.week,
      );
    }
  }

  // ---- Calendar: consecutive Monday-to-Sunday blocks ----------------------
  let previousEnd: Date | null = null;
  for (const w of weeks) {
    let start: Date;
    let end: Date;
    try {
      start = parseISODate(w.startDate);
      end = parseISODate(w.endDate);
    } catch (cause) {
      err('bad_date', `Week ${w.week}: ${(cause as Error).message}`, w.week);
      previousEnd = null;
      continue;
    }

    if (!isMonday(start)) {
      err('not_monday', `Week ${w.week} starts on ${w.startDate}, which is not a Monday.`, w.week);
    }
    if (!isSunday(end)) {
      err('not_sunday', `Week ${w.week} ends on ${w.endDate}, which is not a Sunday.`, w.week);
    }
    if (daysBetween(start, end) !== 6) {
      err('not_seven_days', `Week ${w.week} does not span exactly seven days.`, w.week);
    }
    if (previousEnd && daysBetween(previousEnd, start) !== 1) {
      err(
        'gap_in_calendar',
        `Week ${w.week} starts on ${w.startDate}, which does not directly follow the previous week.`,
        w.week,
      );
    }
    previousEnd = end;
  }

  // ---- Header dates agree with the weeks they summarise -------------------
  const first = weeks[0];
  const last = weeks[weeks.length - 1];
  if (first && c.startDate && c.startDate !== first.startDate) {
    err(
      'start_date_mismatch',
      `Curriculum startDate is ${c.startDate} but Week ${first.week} starts on ${first.startDate}.`,
    );
  }
  if (last && c.endDate && c.endDate !== last.endDate) {
    err(
      'end_date_mismatch',
      `Curriculum endDate is ${c.endDate} but Week ${last.week} ends on ${last.endDate}.`,
    );
  }

  // ---- Declared phases are all actually used ------------------------------
  const usedPhases = new Set(weeks.map((w) => w.phase));
  for (const phase of phases) {
    if (!usedPhases.has(phase)) {
      warn('unused_phase', `Phase "${phase}" is declared but no week belongs to it.`);
    }
  }

  return issues;
}

/** Convenience split for callers that only care whether it is safe to load. */
export function errorsOnly(issues: Issue[]): Issue[] {
  return issues.filter((i) => i.level === 'error');
}

/** Human-readable one-liner, used by the CLI and by test failure messages. */
export function formatIssue(issue: Issue): string {
  const where = issue.week === undefined ? '' : ` (week ${issue.week})`;
  return `${issue.level.toUpperCase()} [${issue.code}]${where}: ${issue.message}`;
}

/** Re-exported so callers can render a date without importing dates.ts. */
export { toISODate };
