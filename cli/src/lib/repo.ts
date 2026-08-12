/**
 * Reading a technician's lab repo off local disk.
 *
 * The CLI deliberately never touches the network. It has to work as a
 * pre-commit hook, on a plane, inside a lab VM with no route out — so
 * everything here is filesystem and local git only.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

import type { ArtifactTarget, Curriculum, Week } from '@pathway/shared';
import { artifactTargets } from '@pathway/shared';

/** Where per-week claims live inside the tech's own repo. */
export const STATE_DIR = '.msp-lab';
export const ATTEST_FILE = 'attested.json';

export interface TargetResult {
  target: ArtifactTarget;
  found: boolean;
  /** Why a directory that exists still does not count. */
  note?: string;
}

export interface WeekResult {
  week: number;
  /** Paths the week expects. Empty when the week names no file. */
  targets: TargetResult[];
  /** True when every expected path is present. */
  artifactsPresent: boolean;
  /** The tech has claimed this week by hand. */
  attested: boolean;
  /**
   * Whether the week counts as done: its artifacts exist, or it names no file
   * and has been attested.
   */
  satisfied: boolean;
  /** True when there is nothing to check automatically. */
  attestOnly: boolean;
}

/** Walk up from a starting directory looking for a repo root. */
export function findRepoRoot(start: string = process.cwd()): string | null {
  let dir = resolve(start);
  for (;;) {
    if (existsSync(join(dir, '.git'))) return dir;
    const parent = resolve(dir, '..');
    if (parent === dir) return null;
    dir = parent;
  }
}

/**
 * Does a path exist, and is it the kind of thing the week asked for?
 *
 * A directory only counts when it has something in it. git does not track
 * empty directories, so an empty one means the work is not really there — and
 * `init` deliberately leaves .gitkeep files so scaffolding alone never passes
 * as completed work.
 */
export function checkTarget(repoRoot: string, target: ArtifactTarget): TargetResult {
  const full = join(repoRoot, target.path);

  if (!existsSync(full)) return { target, found: false };

  const stats = statSync(full);

  if (target.kind === 'directory') {
    if (!stats.isDirectory()) {
      return { target, found: false, note: 'exists but is a file, not a directory' };
    }
    const entries = readdirSync(full).filter((name) => name !== '.gitkeep');
    return entries.length > 0
      ? { target, found: true }
      : { target, found: false, note: 'directory is empty' };
  }

  if (stats.isDirectory()) {
    return { target, found: false, note: 'exists but is a directory, not a file' };
  }

  // A file that exists but has nothing in it is a placeholder, not an artifact.
  return stats.size > 0
    ? { target, found: true }
    : { target, found: false, note: 'file is empty' };
}

export function readAttested(repoRoot: string): Set<number> {
  const path = join(repoRoot, STATE_DIR, ATTEST_FILE);
  if (!existsSync(path)) return new Set();
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
    const weeks = (parsed as { weeks?: unknown }).weeks;
    return Array.isArray(weeks)
      ? new Set(weeks.filter((w): w is number => typeof w === 'number'))
      : new Set();
  } catch {
    return new Set();
  }
}

/** Evaluate one week against the repo on disk. */
export function checkWeek(
  repoRoot: string,
  curriculum: Curriculum,
  week: Week,
  attested: Set<number> = readAttested(repoRoot),
): WeekResult {
  const targets = artifactTargets(week, curriculum).map((t) => checkTarget(repoRoot, t));
  const attestOnly = targets.length === 0;
  const artifactsPresent = targets.length > 0 && targets.every((t) => t.found);
  const isAttested = attested.has(week.week);

  return {
    week: week.week,
    targets,
    artifactsPresent,
    attested: isAttested,
    attestOnly,
    // A week with files must have them. A week with none is on the tech's word.
    satisfied: attestOnly ? isAttested : artifactsPresent,
  };
}

/** Dependencies of a week that are not yet satisfied. */
export function unmetDependenciesOnDisk(
  repoRoot: string,
  curriculum: Curriculum,
  week: Week,
): WeekResult[] {
  const attested = readAttested(repoRoot);
  return week.dependsOn
    .map((n) => curriculum.weeks.find((w) => w.week === n))
    .filter((w): w is Week => w !== undefined)
    .map((dep) => checkWeek(repoRoot, curriculum, dep, attested))
    .filter((result) => !result.satisfied);
}
