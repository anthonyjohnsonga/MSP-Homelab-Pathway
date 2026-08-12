/**
 * `msp-lab week start <n>` and `msp-lab week check <n>`.
 *
 * `check` is the one that matters. It exits non-zero when a week's artifact is
 * missing or a dependency is unfinished, which is what lets "no artifact, no
 * completion" be enforced by a pre-commit hook or CI instead of willpower.
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import type { Curriculum, Week } from '@pathway/shared';
import { artifactTargets, getWeek } from '@pathway/shared';
import { colour, line, mark } from '../lib/output.ts';
import {
  ATTEST_FILE,
  STATE_DIR,
  checkWeek,
  readAttested,
  unmetDependenciesOnDisk,
} from '../lib/repo.ts';

export interface WeekOptions {
  repoRoot: string;
  curriculum: Curriculum;
  weekNumber: number;
  json?: boolean;
}

function resolveWeek(curriculum: Curriculum, weekNumber: number): Week | null {
  return getWeek(curriculum, weekNumber) ?? null;
}

/* ---------- week check ---------------------------------------------------- */

export function runWeekCheck(options: WeekOptions): number {
  const { repoRoot, curriculum, weekNumber, json = false } = options;
  const week = resolveWeek(curriculum, weekNumber);

  if (!week) {
    console.error(`Week ${weekNumber} is not in this curriculum (1–${curriculum.weeks.length}).`);
    return 2;
  }

  const attested = readAttested(repoRoot);
  const result = checkWeek(repoRoot, curriculum, week, attested);
  const unmet = unmetDependenciesOnDisk(repoRoot, curriculum, week);

  if (json) {
    console.log(
      JSON.stringify(
        {
          week: week.week,
          topic: week.topic,
          satisfied: result.satisfied && unmet.length === 0,
          artifactsPresent: result.artifactsPresent,
          attestOnly: result.attestOnly,
          attested: result.attested,
          targets: result.targets.map((t) => ({
            path: t.target.path,
            kind: t.target.kind,
            found: t.found,
            ...(t.note ? { note: t.note } : {}),
          })),
          unmetDependencies: unmet.map((u) => u.week),
        },
        null,
        2,
      ),
    );
    return result.satisfied && unmet.length === 0 ? 0 : 1;
  }

  line(colour.bold(`Week ${week.week} — ${week.topic}`));
  line();

  // ---- dependencies first: they are the reason to stop before starting ----
  line(colour.bold('Dependencies'));
  if (week.dependsOn.length === 0) {
    line(`  ${mark.skip()} none`);
  } else {
    for (const dep of week.dependsOn) {
      const depWeek = getWeek(curriculum, dep);
      const blocked = unmet.find((u) => u.week === dep);
      const label = `Week ${dep}${depWeek ? ` — ${depWeek.topic}` : ''}`;
      line(blocked ? `  ${mark.fail()} ${label}` : `  ${mark.pass()} ${label}`);
    }
  }

  line();
  line(colour.bold('Artifact'));
  if (result.attestOnly) {
    line(`  ${result.attested ? mark.pass() : mark.warn()} ${colour.dim(week.artifact)}`);
    line(
      `       ${colour.dim(
        'This week names no file, so it cannot be checked automatically.',
      )}`,
    );
    if (!result.attested) {
      line(`       ${colour.dim(`Claim it with: msp-lab week attest ${week.week}`)}`);
    }
  } else {
    for (const target of result.targets) {
      const suffix = target.note ? ` ${colour.dim(`(${target.note})`)}` : '';
      const shown = target.target.path === '' ? '(repo root)' : target.target.path;
      line(`  ${target.found ? mark.pass() : mark.fail()} ${shown}${suffix}`);
    }
  }

  line();
  const ok = result.satisfied && unmet.length === 0;
  if (ok) {
    line(colour.green(`Week ${week.week} is complete.`));
    return 0;
  }

  if (unmet.length > 0) {
    line(
      colour.red(
        `Blocked: ${unmet.length} ${unmet.length === 1 ? 'dependency is' : 'dependencies are'} unfinished.`,
      ),
    );
  }
  if (!result.satisfied) {
    line(colour.red(`Week ${week.week} is not complete.`));
  }
  return 1;
}

/* ---------- week start ----------------------------------------------------- */

export function runWeekStart(options: WeekOptions): number {
  const { repoRoot, curriculum, weekNumber } = options;
  const week = resolveWeek(curriculum, weekNumber);

  if (!week) {
    console.error(`Week ${weekNumber} is not in this curriculum (1–${curriculum.weeks.length}).`);
    return 2;
  }

  const unmet = unmetDependenciesOnDisk(repoRoot, curriculum, week);
  const notePath = join('docs', 'notes', `week-${String(week.week).padStart(2, '0')}.md`);
  const noteFull = join(repoRoot, notePath);

  line(colour.bold(`Week ${week.week} — ${week.topic}`));
  line(colour.dim(`${week.startDate} to ${week.endDate}`));
  line();

  if (unmet.length > 0) {
    line(colour.amber('Heads up — these dependencies are not finished:'));
    for (const u of unmet) {
      const depWeek = getWeek(curriculum, u.week);
      line(`  ${mark.warn()} Week ${u.week}${depWeek ? ` — ${depWeek.topic}` : ''}`);
    }
    line(colour.dim('  You can carry on. The order is dependency-driven for a reason.'));
    line();
  }

  line(colour.bold('Concepts'));
  for (const concept of week.concepts) line(`  · ${concept}`);
  line();
  line(colour.bold('Lab'));
  line(`  ${week.lab}`);
  line();
  line(colour.bold('Artifact'));
  line(`  ${week.artifact}`);
  const targets = artifactTargets(week, curriculum);
  for (const target of targets) {
    const shown = target.path === '' ? '(repo root)' : target.path;
    line(`  ${colour.dim('→')} ${shown}${target.kind === 'directory' ? '/' : ''}`);
  }
  line();

  if (existsSync(noteFull)) {
    line(`${mark.skip()} ${notePath} ${colour.dim('(already started)')}`);
  } else {
    mkdirSync(dirname(noteFull), { recursive: true });
    writeFileSync(noteFull, noteStub(week), 'utf8');
    line(`${mark.pass()} ${notePath}`);
  }

  line();
  line(colour.dim(`When you are done: msp-lab week check ${week.week}`));
  return 0;
}

function noteStub(week: Week): string {
  return `# Week ${week.week} — ${week.topic}

${week.startDate} to ${week.endDate}

## What I set out to do

${week.lab}

## What I actually did

<!-- Your own words. Future you and the Week 49 RAG bot both read this. -->

## What broke

## What I would do differently

## Artifact

${week.artifact}
`;
}

/* ---------- week attest ---------------------------------------------------- */

/**
 * Claim a week that names no file.
 *
 * Written into the repo rather than kept elsewhere, so the claim is part of the
 * history and reviewable like everything else.
 */
export function runWeekAttest(options: WeekOptions): number {
  const { repoRoot, curriculum, weekNumber } = options;
  const week = resolveWeek(curriculum, weekNumber);

  if (!week) {
    console.error(`Week ${weekNumber} is not in this curriculum.`);
    return 2;
  }

  const result = checkWeek(repoRoot, curriculum, week);
  if (!result.attestOnly) {
    console.error(
      `Week ${weekNumber} names a file, so it is checked rather than attested.\n` +
        `Run: msp-lab week check ${weekNumber}`,
    );
    return 2;
  }

  const attested = readAttested(repoRoot);
  attested.add(weekNumber);

  const dir = join(repoRoot, STATE_DIR);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, ATTEST_FILE),
    `${JSON.stringify({ weeks: [...attested].sort((a, b) => a - b) }, null, 2)}\n`,
    'utf8',
  );

  line(`${mark.pass()} Week ${weekNumber} attested — ${week.topic}`);
  line(colour.dim(`  Recorded in ${STATE_DIR}/${ATTEST_FILE}. Commit it with your work.`));
  return 0;
}
