import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import type { Week } from '../src/types.ts';
import { artifactTargets, isVerifiable, verifiableCoverage } from '../src/artifacts.ts';
import { loadCurriculum } from '../src/curriculum.ts';
import { makeCurriculum, makeWeek, MONDAY } from './fixtures.ts';

const realCurriculum = loadCurriculum(
  JSON.parse(readFileSync(new URL('../../data/curriculum.json', import.meta.url), 'utf8')),
);

/** A week with a given artifact description and nothing else of interest. */
function weekWith(artifact: string, verifyPaths?: string[]): Week {
  const week = makeWeek(1, MONDAY, 'Phase 1 — Test Phase');
  return { ...week, artifact, ...(verifyPaths ? { verifyPaths } : {}) };
}

describe('extracting a path from prose', () => {
  it('finds a backticked file path', () => {
    assert.deepEqual(
      artifactTargets(weekWith('Spec the box; `docs/lab/hardware.md` with boot order')),
      [{ path: 'docs/lab/hardware.md', kind: 'file' }],
    );
  });

  it('treats a trailing slash as a directory', () => {
    assert.deepEqual(
      artifactTargets(weekWith('`app/inventory/` v1 — Python rewrite')),
      [{ path: 'app/inventory', kind: 'directory' }],
    );
  });

  it('sees through surrounding bold markers', () => {
    assert.deepEqual(
      artifactTargets(weekWith('**`app/inventory/Dockerfile`** — the tool, containerized')),
      [{ path: 'app/inventory/Dockerfile', kind: 'file' }],
    );
  });

  it('accepts a bare filename when the extension is recognisable', () => {
    assert.deepEqual(
      artifactTargets(weekWith('**`docker-compose.yml`** — app + database + proxy')),
      [{ path: 'docker-compose.yml', kind: 'file' }],
    );
  });

  it('finds several paths in one description', () => {
    assert.deepEqual(
      artifactTargets(weekWith('`ai/rag/` indexed over `docs/` — ten questions logged')),
      [
        { path: 'ai/rag', kind: 'directory' },
        { path: 'docs', kind: 'directory' },
      ],
    );
  });

  it('ignores hostnames that are not paths', () => {
    // "NG-DC01" is a machine, not a file. Guessing here would mark real work
    // as missing.
    assert.deepEqual(artifactTargets(weekWith('`NG-DC01` and the domain; NG-WS01 joined')), []);
  });

  it('ignores prose with no backticks at all', () => {
    assert.deepEqual(
      artifactTargets(weekWith('Defender onboarded across the fleet; one exclusion documented')),
      [],
    );
  });

  it('strips trailing punctuation left by the prose', () => {
    assert.deepEqual(
      artifactTargets(weekWith('Committed to `infra/gpo/`.')),
      [{ path: 'infra/gpo', kind: 'directory' }],
    );
  });

  it('deduplicates a path mentioned twice', () => {
    assert.deepEqual(
      artifactTargets(weekWith('`docs/notes/x.md` — see `docs/notes/x.md`')),
      [{ path: 'docs/notes/x.md', kind: 'file' }],
    );
  });

  it('recognises extensionless filenames that are still files', () => {
    assert.deepEqual(
      artifactTargets(weekWith('Add a `Dockerfile`')),
      [{ path: 'Dockerfile', kind: 'file' }],
    );
  });
});

describe('the repo itself as an artifact', () => {
  it('treats the repo name as the repo root', () => {
    const curriculum = makeCurriculum(10);
    const week = weekWith('Create `msp-lab` — README, .gitignore, everything committed');
    assert.deepEqual(artifactTargets(week, curriculum), [{ path: '', kind: 'directory' }]);
  });

  it('does not do that without a curriculum to compare against', () => {
    assert.deepEqual(artifactTargets(weekWith('Create `msp-lab` — README')), []);
  });
});

describe('verifyPaths override', () => {
  it('wins over whatever the prose says', () => {
    const week = weekWith('`docs/from-prose.md` mentioned here', ['infra/k8s/ingress.yaml']);
    assert.deepEqual(artifactTargets(week), [
      { path: 'infra/k8s/ingress.yaml', kind: 'file' },
    ]);
  });

  it('makes an otherwise unverifiable week verifiable', () => {
    const week = weekWith('Defender onboarded across the fleet', ['docs/security/edr.md']);
    assert.ok(isVerifiable(week));
  });

  it('supports directories', () => {
    const week = weekWith('anything', ['infra/terraform/']);
    assert.deepEqual(artifactTargets(week), [{ path: 'infra/terraform', kind: 'directory' }]);
  });
});

describe('against the real curriculum', () => {
  it('extracts a path for most of the year', () => {
    const coverage = verifiableCoverage(realCurriculum);
    assert.equal(coverage.total, 52);
    // Recorded deliberately: if this number moves, either the extractor changed
    // or verifyPaths were added, and both deserve to be noticed.
    assert.equal(coverage.verifiable, 36);
  });

  it('names the weeks that cannot be checked automatically', () => {
    const { unverifiableWeeks } = verifiableCoverage(realCurriculum);
    assert.deepEqual(
      unverifiableWeeks,
      [17, 19, 20, 24, 28, 29, 30, 33, 34, 37, 39, 40, 41, 43, 50, 52],
    );
  });

  it('reads Week 1 as the hardware doc', () => {
    const week = realCurriculum.weeks.find((w) => w.week === 1)!;
    assert.deepEqual(artifactTargets(week, realCurriculum), [
      { path: 'docs/lab/hardware.md', kind: 'file' },
    ]);
  });

  it('reads Week 8 as the repo itself', () => {
    const week = realCurriculum.weeks.find((w) => w.week === 8)!;
    assert.deepEqual(artifactTargets(week, realCurriculum), [{ path: '', kind: 'directory' }]);
  });

  it('reads Week 38 as the CI workflow', () => {
    const week = realCurriculum.weeks.find((w) => w.week === 38)!;
    assert.deepEqual(artifactTargets(week, realCurriculum), [
      { path: '.github/workflows/ci.yml', kind: 'file' },
    ]);
  });

  it('never produces a path with a leading slash or a backtick', () => {
    for (const week of realCurriculum.weeks) {
      for (const target of artifactTargets(week, realCurriculum)) {
        assert.ok(!target.path.startsWith('/'), `week ${week.week}: ${target.path}`);
        assert.ok(!target.path.includes('`'), `week ${week.week}: ${target.path}`);
      }
    }
  });
});
