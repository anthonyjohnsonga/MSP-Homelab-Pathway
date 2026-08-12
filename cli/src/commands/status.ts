/**
 * `msp-lab status` — where you are, what is outstanding, what is blocking you.
 */

import type { Curriculum } from '@pathway/shared';
import { calendarPosition, today } from '@pathway/shared';
import { colour, line, mark } from '../lib/output.ts';
import { checkWeek, readAttested, unmetDependenciesOnDisk } from '../lib/repo.ts';

export interface StatusOptions {
  repoRoot: string;
  curriculum: Curriculum;
  now?: Date;
  json?: boolean;
}

export function runStatus(options: StatusOptions): number {
  const { repoRoot, curriculum, now = today(), json = false } = options;
  const attested = readAttested(repoRoot);

  const results = curriculum.weeks.map((week) => checkWeek(repoRoot, curriculum, week, attested));
  const done = results.filter((r) => r.satisfied);
  const position = calendarPosition(curriculum, now);

  const currentWeek =
    position.state === 'in_progress'
      ? position.week.week
      : position.state === 'after_end'
        ? curriculum.weeks.length
        : 0;

  // Outstanding means: the calendar has passed it and it still is not done.
  const outstanding = results.filter((r) => r.week <= currentWeek && !r.satisfied);

  const blocked = curriculum.weeks
    .filter((w) => w.week <= currentWeek + 1)
    .map((w) => ({ week: w, unmet: unmetDependenciesOnDisk(repoRoot, curriculum, w) }))
    .filter((entry) => entry.unmet.length > 0);

  if (json) {
    console.log(
      JSON.stringify(
        {
          currentWeek,
          complete: done.length,
          total: curriculum.weeks.length,
          outstanding: outstanding.map((r) => r.week),
          blocked: blocked.map((b) => ({
            week: b.week.week,
            waitingOn: b.unmet.map((u) => u.week),
          })),
        },
        null,
        2,
      ),
    );
    return 0;
  }

  line(colour.bold(curriculum.title));
  line(colour.dim(repoRoot));
  line();

  if (position.state === 'before_start') {
    line(`The year starts in ${position.daysUntilStart} days, on ${position.firstWeek.startDate}.`);
  } else if (position.state === 'after_end') {
    line(`The year finished on ${position.lastWeek.endDate}.`);
  } else {
    line(
      `You are in ${colour.bold(`Week ${position.week.week}`)} — ${position.week.topic} ` +
        colour.dim(`(day ${position.dayOfWeek} of 7)`),
    );
  }

  const pct = Math.round((done.length / curriculum.weeks.length) * 100);
  line(`${done.length} of ${curriculum.weeks.length} weeks complete (${pct}%).`);

  // Ahead or behind, phrased as a fact rather than a telling-off.
  if (currentWeek > 0) {
    const delta = done.length - currentWeek;
    if (delta >= 1) line(colour.green(`${delta} week(s) ahead of the calendar.`));
    else if (delta <= -2) line(colour.amber(`${Math.abs(delta)} week(s) behind the calendar.`));
    else line(colour.dim('On track.'));
  }

  if (outstanding.length > 0) {
    line();
    line(colour.bold('Artifacts outstanding'));
    for (const r of outstanding.slice(0, 12)) {
      const week = curriculum.weeks.find((w) => w.week === r.week);
      const missing = r.attestOnly
        ? 'no file to check — needs attesting'
        : r.targets
            .filter((t) => !t.found)
            .map((t) => (t.target.path === '' ? '(repo root)' : t.target.path))
            .join(', ');
      line(`  ${mark.fail()} Week ${r.week} — ${week?.topic ?? ''}`);
      line(`       ${colour.dim(missing)}`);
    }
    if (outstanding.length > 12) {
      line(colour.dim(`  ...and ${outstanding.length - 12} more`));
    }
  }

  if (blocked.length > 0) {
    line();
    line(colour.bold('Dependency blockers'));
    for (const entry of blocked.slice(0, 8)) {
      line(
        `  ${mark.warn()} Week ${entry.week.week} is waiting on ` +
          entry.unmet.map((u) => `Week ${u.week}`).join(', '),
      );
    }
  }

  if (outstanding.length === 0 && blocked.length === 0) {
    line();
    line(colour.green('Nothing outstanding. Everything the calendar has reached is done.'));
  }

  return 0;
}
