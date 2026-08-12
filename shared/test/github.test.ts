import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import type { FetchLike } from '../src/github.ts';
import { GitHubArtifactChecker, parseRepoRef } from '../src/github.ts';

const REPO = { owner: 'atech', name: 'msp-lab' };

/** A fake GitHub built from a map of path -> response. */
function fakeGitHub(routes: Record<string, { status: number; body?: unknown }>): {
  fetch: FetchLike;
  calls: string[];
} {
  const calls: string[] = [];
  const fetch: FetchLike = async (url) => {
    calls.push(url);
    const matched = Object.entries(routes).find(([suffix]) => url.endsWith(suffix));
    const hit = matched?.[1] ?? { status: 404 };
    return {
      ok: hit.status >= 200 && hit.status < 300,
      status: hit.status,
      json: async () => hit.body ?? {},
    };
  };
  return { fetch, calls };
}

function checker(routes: Record<string, { status: number; body?: unknown }>) {
  const { fetch, calls } = fakeGitHub(routes);
  return {
    checker: new GitHubArtifactChecker({
      fetch,
      baseUrl: 'https://api.example',
      now: () => '2026-08-11T00:00:00.000Z',
    }),
    calls,
  };
}

describe('checkPath', () => {
  it('reports a file that exists, with its sha', async () => {
    const { checker: c } = checker({
      '/contents/docs/lab/hardware.md': { status: 200, body: { sha: 'abc123', type: 'file' } },
    });
    const outcome = await c.checkPath(REPO, { path: 'docs/lab/hardware.md', kind: 'file' });
    assert.equal(outcome.result, 'found');
    assert.equal(outcome.result === 'found' && outcome.commitSha, 'abc123');
  });

  it('reports a directory that has contents', async () => {
    const { checker: c } = checker({
      '/contents/app/inventory': { status: 200, body: [{ name: 'main.py' }] },
    });
    const outcome = await c.checkPath(REPO, { path: 'app/inventory', kind: 'directory' });
    assert.equal(outcome.result, 'found');
    assert.equal(outcome.result === 'found' && outcome.kind, 'directory');
  });

  it('treats an empty directory as missing', async () => {
    // git does not track empty directories, so an empty listing means the work
    // is not there.
    const { checker: c } = checker({
      '/contents/app/inventory': { status: 200, body: [] },
    });
    const outcome = await c.checkPath(REPO, { path: 'app/inventory', kind: 'directory' });
    assert.equal(outcome.result, 'missing');
  });

  it('distinguishes a missing file from an unreachable repo', async () => {
    const { checker: c } = checker({
      '/repos/atech/msp-lab': { status: 200, body: { name: 'msp-lab' } },
      // the contents path is absent, so it 404s
    });
    const outcome = await c.checkPath(REPO, { path: 'docs/missing.md', kind: 'file' });
    assert.equal(outcome.result, 'missing');
  });

  it('reports an inaccessible repo rather than blaming the tech', async () => {
    // Both the repo and the path 404. GitHub cannot tell us which, so we ask.
    const { checker: c } = checker({});
    const outcome = await c.checkPath(REPO, { path: 'docs/x.md', kind: 'file' });
    assert.equal(outcome.result, 'inaccessible');
    assert.match(
      outcome.result === 'inaccessible' ? outcome.reason : '',
      /private, renamed, or not exist/,
    );
  });

  it('reports rate limiting as its own thing', async () => {
    const { checker: c } = checker({ '/contents/docs/x.md': { status: 403 } });
    const outcome = await c.checkPath(REPO, { path: 'docs/x.md', kind: 'file' });
    assert.equal(outcome.result, 'error');
    assert.match(outcome.result === 'error' ? outcome.reason : '', /rate limit/i);
  });

  it('survives the network being down', async () => {
    const c = new GitHubArtifactChecker({
      fetch: async () => {
        throw new Error('ENOTFOUND');
      },
      baseUrl: 'https://api.example',
    });
    const outcome = await c.checkPath(REPO, { path: 'docs/x.md', kind: 'file' });
    assert.equal(outcome.result, 'error');
    assert.match(outcome.result === 'error' ? outcome.reason : '', /Could not reach GitHub/);
  });

  it('checks the repo root for an empty path', async () => {
    const { checker: c, calls } = checker({
      '/contents/': { status: 200, body: [{ name: 'README.md' }] },
    });
    const outcome = await c.checkPath(REPO, { path: '', kind: 'directory' });
    assert.equal(outcome.result, 'found');
    assert.ok(calls[0]?.endsWith('/contents/'));
  });

  it('passes a branch through when one is given', async () => {
    const { checker: c, calls } = checker({
      '/contents/docs/x.md?ref=develop': { status: 200, body: { sha: 'z' } },
    });
    await c.checkPath({ ...REPO, ref: 'develop' }, { path: 'docs/x.md', kind: 'file' });
    assert.ok(calls[0]?.includes('ref=develop'));
  });
});

describe('checkWeek', () => {
  it('is satisfied only when every path is present', async () => {
    const { checker: c } = checker({
      '/contents/a.md': { status: 200, body: { sha: '1' } },
      '/contents/b.md': { status: 200, body: { sha: '2' } },
    });
    const result = await c.checkWeek(12, REPO, [
      { path: 'a.md', kind: 'file' },
      { path: 'b.md', kind: 'file' },
    ]);
    assert.equal(result.satisfied, true);
    assert.equal(result.week, 12);
    assert.equal(result.checkedAt, '2026-08-11T00:00:00.000Z');
  });

  it('is not satisfied when one path is missing', async () => {
    const { checker: c } = checker({
      '/repos/atech/msp-lab': { status: 200, body: {} },
      '/contents/a.md': { status: 200, body: { sha: '1' } },
    });
    const result = await c.checkWeek(12, REPO, [
      { path: 'a.md', kind: 'file' },
      { path: 'b.md', kind: 'file' },
    ]);
    assert.equal(result.satisfied, false);
  });

  it('is not satisfied when there is nothing to check', async () => {
    // A week whose artifact names no file must never come back green.
    const { checker: c } = checker({});
    const result = await c.checkWeek(24, REPO, []);
    assert.equal(result.satisfied, false);
    assert.deepEqual(result.targets, []);
  });
});

describe('parseRepoRef', () => {
  it('accepts owner/repo', () => {
    assert.deepEqual(parseRepoRef('atech/msp-lab'), { owner: 'atech', name: 'msp-lab' });
  });

  it('accepts a browser URL', () => {
    assert.deepEqual(parseRepoRef('https://github.com/atech/msp-lab'), {
      owner: 'atech',
      name: 'msp-lab',
    });
  });

  it('accepts a URL with trailing path and slash', () => {
    assert.deepEqual(parseRepoRef('https://github.com/atech/msp-lab/'), {
      owner: 'atech',
      name: 'msp-lab',
    });
  });

  it('accepts an https clone URL', () => {
    assert.deepEqual(parseRepoRef('https://github.com/atech/msp-lab.git'), {
      owner: 'atech',
      name: 'msp-lab',
    });
  });

  it('accepts an ssh clone URL', () => {
    assert.deepEqual(parseRepoRef('git@github.com:atech/msp-lab.git'), {
      owner: 'atech',
      name: 'msp-lab',
    });
  });

  it('rejects nonsense', () => {
    assert.equal(parseRepoRef(''), null);
    assert.equal(parseRepoRef('   '), null);
    assert.equal(parseRepoRef('just-a-name'), null);
    assert.equal(parseRepoRef('https://gitlab.com/atech/msp-lab'), null);
  });
});
