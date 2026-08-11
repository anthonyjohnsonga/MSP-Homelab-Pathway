/**
 * `npm run validate` — check a curriculum file and exit non-zero if it is broken.
 *
 * Also runs in CI on every push, so a bad curriculum never reaches the platform.
 *
 * Usage: node src/bin/validate.ts [path/to/curriculum.json]
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { formatIssue, validateCurriculum } from '../validate.ts';

const DEFAULT_PATH = fileURLToPath(new URL('../../../data/curriculum.json', import.meta.url));

function main(): number {
  const path = process.argv[2] ?? DEFAULT_PATH;

  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    console.error(`Could not read ${path}`);
    return 1;
  }

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (cause) {
    console.error(`${path} is not valid JSON: ${(cause as Error).message}`);
    return 1;
  }

  const issues = validateCurriculum(data);
  const errors = issues.filter((i) => i.level === 'error');
  const warnings = issues.filter((i) => i.level === 'warning');

  for (const issue of issues) {
    const write = issue.level === 'error' ? console.error : console.warn;
    write(formatIssue(issue));
  }

  const weeks = Array.isArray((data as { weeks?: unknown[] }).weeks)
    ? (data as { weeks: unknown[] }).weeks.length
    : 0;

  if (errors.length > 0) {
    console.error(`\n${errors.length} error(s), ${warnings.length} warning(s). Not valid.`);
    return 1;
  }

  console.log(
    `${weeks} weeks validated. ${warnings.length} warning(s), no errors.`,
  );
  return 0;
}

process.exit(main());
