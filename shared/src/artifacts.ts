/**
 * Working out what file a week's artifact actually is.
 *
 * The curriculum describes artifacts in prose written for humans:
 *
 *   "Spec and acquire the lab box; `docs/lab/hardware.md` with boot order"
 *   "`app/inventory/` v1 — Python rewrite emitting JSON"
 *   "Defender onboarded across the fleet; one tuned exclusion documented"
 *
 * The first two name a path in backticks. The third names an outcome and no
 * file at all. Roughly a third of the year is like the third one, so this
 * module is careful to report "nothing to check here" rather than guessing —
 * a wrong path would mark real work as missing, which is worse than admitting
 * the week can only be self-reported.
 */

import type { Curriculum, Week } from './types.ts';

export interface ArtifactTarget {
  /** Repo-relative path, e.g. "docs/lab/hardware.md" or "app/inventory". */
  path: string;
  kind: 'file' | 'directory';
}

/**
 * Extensions that mark a backticked token as a file even without a slash,
 * so `docker-compose.yml` is recognised but `NG-DC01` is not.
 */
const FILE_EXTENSIONS =
  /\.(md|markdown|ps1|psm1|sh|bash|py|ya?ml|json|jsonc|tf|tfvars|sql|ts|js|conf|cfg|ini|toml|xml|csv)$/i;

/** Bare filenames with no extension that are still real files. */
const KNOWN_FILENAMES = new Set(['Dockerfile', 'Makefile', 'Vagrantfile', '.gitignore']);

/** Trailing punctuation the prose leaves attached to a path. */
const TRAILING_JUNK = /[.,;:—–-]+$/;

function looksLikeAPath(token: string): boolean {
  if (token.includes(' ')) return false;
  if (KNOWN_FILENAMES.has(token)) return true;
  if (FILE_EXTENSIONS.test(token)) return true;
  // A slash is the other strong signal, but not a bare leading one.
  return token.includes('/') && token !== '/';
}

/**
 * Every path a week's artifact description names.
 *
 * An explicit `verifyPaths` on the week always wins. That field is the escape
 * hatch for the weeks whose prose names no file: fill it in the data and
 * verification starts working with no code change.
 */
export function artifactTargets(week: Week, curriculum?: Curriculum): ArtifactTarget[] {
  if (week.verifyPaths && week.verifyPaths.length > 0) {
    return week.verifyPaths.map(toTarget);
  }

  const tokens = [...week.artifact.matchAll(/`([^`]+)`/g)].map((m) => m[1] ?? '');
  const targets: ArtifactTarget[] = [];

  for (const raw of tokens) {
    const token = raw.trim().replace(TRAILING_JUNK, '');
    if (token === '') continue;

    // Week 8's artifact is the repo itself. The repo existing is the check.
    if (curriculum && token === curriculum.repo) {
      targets.push({ path: '', kind: 'directory' });
      continue;
    }

    if (looksLikeAPath(token)) targets.push(toTarget(token));
  }

  // Dedupe while preserving order; the prose sometimes repeats a path.
  const seen = new Set<string>();
  return targets.filter((t) => {
    if (seen.has(t.path)) return false;
    seen.add(t.path);
    return true;
  });
}

function toTarget(raw: string): ArtifactTarget {
  const trimmed = raw.trim().replace(TRAILING_JUNK, '');
  const isDirectory = trimmed.endsWith('/');
  return {
    path: isDirectory ? trimmed.slice(0, -1) : trimmed,
    kind: isDirectory ? 'directory' : 'file',
  };
}

/**
 * Whether this week can be checked automatically at all.
 *
 * False means the week is honestly self-reported. The UI must say so rather
 * than showing a green tick it did not earn.
 */
export function isVerifiable(week: Week, curriculum?: Curriculum): boolean {
  return artifactTargets(week, curriculum).length > 0;
}

/** How much of the year can be machine-checked as things stand. */
export function verifiableCoverage(curriculum: Curriculum): {
  verifiable: number;
  total: number;
  unverifiableWeeks: number[];
} {
  const unverifiableWeeks = curriculum.weeks
    .filter((w) => !isVerifiable(w, curriculum))
    .map((w) => w.week);
  return {
    verifiable: curriculum.weeks.length - unverifiableWeeks.length,
    total: curriculum.weeks.length,
    unverifiableWeeks,
  };
}
