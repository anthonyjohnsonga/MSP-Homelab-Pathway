#!/usr/bin/env node
/**
 * msp-lab — scaffold and verify a technician's lab repo.
 *
 * Never touches the network. It has to run as a pre-commit hook, in CI, and
 * inside a lab VM with no route out.
 *
 * Exit codes are the contract:
 *   0  everything checked passed
 *   1  a check failed — missing artifact, unfinished dependency, secret found
 *   2  the command itself was wrong — bad week number, unknown subcommand
 */

import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

import type { Curriculum } from '@pathway/shared';
import { loadCurriculum } from '@pathway/shared';

import { runInit } from './commands/init.ts';
import { runWeekAttest, runWeekCheck, runWeekStart } from './commands/week.ts';
import { runStatus } from './commands/status.ts';
import { runDoctor } from './commands/doctor.ts';
import { findRepoRoot } from './lib/repo.ts';
import { colour, line } from './lib/output.ts';

const USAGE = `msp-lab — scaffold and verify your lab repo

Usage
  msp-lab init [--dry-run]        Scaffold the repo structure
  msp-lab week start <n>          Open a week: note stub, concepts, artifact
  msp-lab week check <n>          Verify the artifact and dependencies
  msp-lab week attest <n>         Claim a week that names no file
  msp-lab status                  Where you are and what is outstanding
  msp-lab doctor                  Environment and secret-hygiene checks

Options
  --repo <path>   Repo to work on (default: nearest git repo, else cwd)
  --json          Machine-readable output for status and week check
  --dry-run       For init: report without writing
  -h, --help      This message

Exit codes
  0  passed    1  a check failed    2  bad usage
`;

function loadBundledCurriculum(): Curriculum {
  // Shipped with the CLI so it works with no network and no configuration.
  const path = new URL('../../data/curriculum.json', import.meta.url);
  return loadCurriculum(JSON.parse(readFileSync(path, 'utf8')));
}

function parseWeekNumber(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function main(argv: string[] = process.argv.slice(2)): number {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        repo: { type: 'string' },
        json: { type: 'boolean', default: false },
        'dry-run': { type: 'boolean', default: false },
        help: { type: 'boolean', short: 'h', default: false },
      },
    });
  } catch (cause) {
    console.error(`${(cause as Error).message}\n`);
    console.error(USAGE);
    return 2;
  }

  const { values, positionals } = parsed;

  if (values.help || positionals.length === 0) {
    line(USAGE);
    return positionals.length === 0 && !values.help ? 2 : 0;
  }

  const repoRoot = values.repo ?? findRepoRoot() ?? process.cwd();

  let curriculum: Curriculum;
  try {
    curriculum = loadBundledCurriculum();
  } catch (cause) {
    console.error(`Could not load the curriculum: ${(cause as Error).message}`);
    return 2;
  }

  const [command, ...rest] = positionals;

  switch (command) {
    case 'init':
      return runInit({ repoRoot, curriculum, dryRun: values['dry-run'] });

    case 'status':
      return runStatus({ repoRoot, curriculum, json: values.json });

    case 'doctor':
      return runDoctor({ repoRoot });

    case 'week': {
      const [sub, weekArg] = rest;
      const weekNumber = parseWeekNumber(weekArg);

      if (sub === undefined) {
        console.error('Usage: msp-lab week <start|check|attest> <n>');
        return 2;
      }
      if (weekNumber === null) {
        console.error(`"${weekArg ?? ''}" is not a week number.`);
        return 2;
      }

      const options = { repoRoot, curriculum, weekNumber, json: values.json };
      if (sub === 'start') return runWeekStart(options);
      if (sub === 'check') return runWeekCheck(options);
      if (sub === 'attest') return runWeekAttest(options);

      console.error(`Unknown: msp-lab week ${sub}. Try start, check or attest.`);
      return 2;
    }

    default:
      console.error(`${colour.red(`Unknown command: ${command}`)}\n`);
      console.error(USAGE);
      return 2;
  }
}

// Only run when invoked directly, so tests can import main() freely.
const invokedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url === new URL(`file://${process.argv[1].split('\\').join('/')}`).href;

if (invokedDirectly || process.env.MSP_LAB_FORCE_RUN === '1') {
  process.exit(main());
}
