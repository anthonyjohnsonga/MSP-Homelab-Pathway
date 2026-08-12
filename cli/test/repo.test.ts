/**
 * The CLI's core logic, against real directories in a temp folder.
 *
 * The headline case is the one the brief names as done:
 *   "msp-lab week check 39 fails when Week 32's artifact is missing
 *    and passes when it exists."
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

import { loadCurriculum } from '@pathway/shared';
import { checkTarget, checkWeek, readAttested, unmetDependenciesOnDisk } from '../src/lib/repo.ts';
import { runInit } from '../src/commands/init.ts';
import { runWeekAttest, runWeekCheck } from '../src/commands/week.ts';

const curriculum = loadCurriculum(
  JSON.parse(readFileSync(new URL('../../data/curriculum.json', import.meta.url), 'utf8')),
);

const week = (n: number) => curriculum.weeks.find((w) => w.week === n)!;

let root: string;

/** Create a file with content, making parent directories as needed. */
function put(relative: string, contents = 'x'): void {
  const full = join(root, relative);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, contents, 'utf8');
}

/** Silence CLI output while asserting on exit codes. */
function quietly<T>(fn: () => T): T {
  const log = console.log;
  const err = console.error;
  console.log = () => {};
  console.error = () => {};
  try {
    return fn();
  } finally {
    console.log = log;
    console.error = err;
  }
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'msp-lab-test-'));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('checkTarget', () => {
  it('finds a file with content', () => {
    put('docs/lab/hardware.md', '# Hardware');
    assert.equal(checkTarget(root, { path: 'docs/lab/hardware.md', kind: 'file' }).found, true);
  });

  it('rejects a file that does not exist', () => {
    assert.equal(checkTarget(root, { path: 'docs/nope.md', kind: 'file' }).found, false);
  });

  it('rejects an empty file as a placeholder, not an artifact', () => {
    put('docs/lab/hardware.md', '');
    const result = checkTarget(root, { path: 'docs/lab/hardware.md', kind: 'file' });
    assert.equal(result.found, false);
    assert.match(result.note ?? '', /empty/);
  });

  it('finds a directory that has something in it', () => {
    put('app/inventory/main.py', 'print()');
    assert.equal(checkTarget(root, { path: 'app/inventory', kind: 'directory' }).found, true);
  });

  it('rejects an empty directory', () => {
    // git does not track empty directories, so one is not evidence of work.
    mkdirSync(join(root, 'app/inventory'), { recursive: true });
    const result = checkTarget(root, { path: 'app/inventory', kind: 'directory' });
    assert.equal(result.found, false);
    assert.match(result.note ?? '', /empty/);
  });

  it('ignores .gitkeep so scaffolding never counts as work', () => {
    mkdirSync(join(root, 'infra'), { recursive: true });
    writeFileSync(join(root, 'infra/.gitkeep'), '', 'utf8');
    assert.equal(checkTarget(root, { path: 'infra', kind: 'directory' }).found, false);
  });

  it('notices a file where a directory was expected', () => {
    put('app/inventory', 'oops');
    const result = checkTarget(root, { path: 'app/inventory', kind: 'directory' });
    assert.equal(result.found, false);
    assert.match(result.note ?? '', /is a file/);
  });

  it('notices a directory where a file was expected', () => {
    mkdirSync(join(root, 'docs/lab/hardware.md'), { recursive: true });
    const result = checkTarget(root, { path: 'docs/lab/hardware.md', kind: 'file' });
    assert.equal(result.found, false);
    assert.match(result.note ?? '', /is a directory/);
  });
});

describe('the definition of done: week check 39', () => {
  // Week 39 depends on 32 and 38.
  const w39 = week(39);

  it('is the dependency graph the brief describes', () => {
    assert.ok(w39.dependsOn.includes(32), 'Week 39 should depend on Week 32');
  });

  it('fails when Week 32 is missing', () => {
    const unmet = unmetDependenciesOnDisk(root, curriculum, w39);
    assert.ok(unmet.some((u) => u.week === 32));
    assert.equal(quietly(() => runWeekCheck({ repoRoot: root, curriculum, weekNumber: 39 })), 1);
  });

  it('stops reporting 32 once its artifact exists', () => {
    // Week 32's artifact is docker-compose.yml.
    put('docker-compose.yml', 'services:\n  app:\n');
    const unmet = unmetDependenciesOnDisk(root, curriculum, w39);
    assert.ok(!unmet.some((u) => u.week === 32), 'Week 32 should now be satisfied');
  });

  it('passes once every dependency and its own artifact exist', () => {
    put('docker-compose.yml', 'services:\n  app:\n'); // week 32
    put('.github/workflows/ci.yml', 'name: CI\n'); // week 38
    // Week 39 itself names no file, so it is attest-only.
    quietly(() => runWeekAttest({ repoRoot: root, curriculum, weekNumber: 39 }));
    assert.equal(quietly(() => runWeekCheck({ repoRoot: root, curriculum, weekNumber: 39 })), 0);
  });
});

describe('runWeekCheck exit codes', () => {
  it('returns 2 for a week outside the curriculum', () => {
    assert.equal(quietly(() => runWeekCheck({ repoRoot: root, curriculum, weekNumber: 99 })), 2);
  });

  it('returns 1 when the artifact is missing', () => {
    assert.equal(quietly(() => runWeekCheck({ repoRoot: root, curriculum, weekNumber: 1 })), 1);
  });

  it('returns 0 when a week with no dependencies has its artifact', () => {
    put('docs/lab/hardware.md', '# Boot order');
    assert.equal(quietly(() => runWeekCheck({ repoRoot: root, curriculum, weekNumber: 1 })), 0);
  });
});

describe('attestation', () => {
  it('marks an attest-only week as satisfied', () => {
    const w24 = week(24); // "Defender onboarded across the fleet" — names no file
    assert.equal(checkWeek(root, curriculum, w24).satisfied, false);
    quietly(() => runWeekAttest({ repoRoot: root, curriculum, weekNumber: 24 }));
    assert.equal(checkWeek(root, curriculum, w24).satisfied, true);
  });

  it('refuses to attest a week that names a file', () => {
    // Week 1 has docs/lab/hardware.md, so it gets checked rather than claimed.
    assert.equal(quietly(() => runWeekAttest({ repoRoot: root, curriculum, weekNumber: 1 })), 2);
  });

  it('persists to .msp-lab/attested.json', () => {
    quietly(() => runWeekAttest({ repoRoot: root, curriculum, weekNumber: 24 }));
    quietly(() => runWeekAttest({ repoRoot: root, curriculum, weekNumber: 30 }));
    assert.deepEqual([...readAttested(root)].sort((a, b) => a - b), [24, 30]);
  });

  it('survives a corrupt state file', () => {
    mkdirSync(join(root, '.msp-lab'), { recursive: true });
    writeFileSync(join(root, '.msp-lab/attested.json'), '{ not json', 'utf8');
    assert.deepEqual([...readAttested(root)], []);
  });
});

describe('init', () => {
  it('creates the structure from Thread-Project.md', () => {
    quietly(() => runInit({ repoRoot: root, curriculum }));
    for (const dir of [
      'docs/lab',
      'docs/runbooks',
      'docs/sop',
      'docs/security',
      'docs/design',
      'docs/notes',
      'scripts',
      'app',
      'infra',
      'ai',
      '.github/workflows',
    ]) {
      assert.ok(
        checkTarget(root, { path: dir, kind: 'directory' }).note === 'directory is empty',
        `${dir} should exist but be empty apart from .gitkeep`,
      );
    }
  });

  it('writes a README and a .gitignore that covers secrets', () => {
    quietly(() => runInit({ repoRoot: root, curriculum }));
    assert.ok(checkTarget(root, { path: 'README.md', kind: 'file' }).found);
    const gitignore = readFileSync(join(root, '.gitignore'), 'utf8');
    for (const pattern of ['.env', '*.pem', '*.tfstate']) {
      assert.ok(gitignore.includes(pattern), `.gitignore should cover ${pattern}`);
    }
  });

  it('never overwrites an existing README', () => {
    put('README.md', 'my own words');
    quietly(() => runInit({ repoRoot: root, curriculum }));
    assert.equal(readFileSync(join(root, 'README.md'), 'utf8'), 'my own words');
  });

  it('writes nothing on a dry run', () => {
    quietly(() => runInit({ repoRoot: root, curriculum, dryRun: true }));
    assert.equal(checkTarget(root, { path: 'README.md', kind: 'file' }).found, false);
  });

  it('leaves a freshly scaffolded repo failing every week check', () => {
    // Scaffolding is not work. This is the guarantee that makes `init`
    // followed by `week check` honest.
    quietly(() => runInit({ repoRoot: root, curriculum }));
    assert.equal(quietly(() => runWeekCheck({ repoRoot: root, curriculum, weekNumber: 1 })), 1);
  });
});
