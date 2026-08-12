/**
 * Behaviour every ProgressStore implementation must have.
 *
 * Written against the interface rather than the in-memory class, so the Azure
 * Table Storage adapter can be dropped in and run the identical suite. If it
 * passes this, the UI cannot tell the two apart.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import type { Identity, ProgressStore } from '../src/store.ts';
import { InMemoryProgressStore, emptyProgress } from '../src/store.ts';

const IDENTITY: Identity = { orgId: 'user-1', userId: 'user-1' };

/** Fixed clock so timestamp assertions are not flaky. */
let tick = 0;
const clock = () => `2026-08-${String(10 + tick++).padStart(2, '0')}T09:00:00.000Z`;

let store: ProgressStore;

beforeEach(() => {
  tick = 0;
  store = new InMemoryProgressStore(IDENTITY, clock);
});

describe('emptyProgress', () => {
  it('describes a week nobody has touched', () => {
    assert.deepEqual(emptyProgress(7), {
      week: 7,
      status: 'not_started',
      hours: null,
      completedAt: null,
    });
  });
});

describe('identity', () => {
  it('is carried on the store', () => {
    assert.deepEqual(store.identity, IDENTITY);
  });
});

describe('status', () => {
  it('starts with nothing recorded', async () => {
    assert.deepEqual(await store.listProgress(), []);
  });

  it('records a status change', async () => {
    const result = await store.setStatus(3, 'in_progress');
    assert.equal(result.status, 'in_progress');
    assert.equal((await store.listProgress()).length, 1);
  });

  it('stamps completedAt when a week is completed', async () => {
    const result = await store.setStatus(3, 'complete');
    assert.equal(result.completedAt, '2026-08-10T09:00:00.000Z');
  });

  it('keeps the original completedAt if completed twice', async () => {
    await store.setStatus(3, 'complete');
    const again = await store.setStatus(3, 'complete');
    assert.equal(again.completedAt, '2026-08-10T09:00:00.000Z');
  });

  it('clears completedAt when a week is reopened', async () => {
    await store.setStatus(3, 'complete');
    const reopened = await store.setStatus(3, 'in_progress');
    // A reopened week keeping a completion timestamp would make the pace
    // calculation and any future manager view lie.
    assert.equal(reopened.completedAt, null);
  });

  it('does not stamp completedAt for skipped', async () => {
    assert.equal((await store.setStatus(3, 'skipped')).completedAt, null);
  });

  it('returns weeks in order regardless of the order they were written', async () => {
    await store.setStatus(9, 'complete');
    await store.setStatus(2, 'complete');
    await store.setStatus(5, 'complete');
    assert.deepEqual((await store.listProgress()).map((p) => p.week), [2, 5, 9]);
  });
});

describe('hours', () => {
  it('logs hours on an untouched week', async () => {
    const result = await store.setHours(4, 6.5);
    assert.equal(result.hours, 6.5);
    assert.equal(result.status, 'not_started');
  });

  it('preserves status when hours change', async () => {
    await store.setStatus(4, 'in_progress');
    assert.equal((await store.setHours(4, 3)).status, 'in_progress');
  });

  it('preserves hours when status changes', async () => {
    await store.setHours(4, 3);
    assert.equal((await store.setStatus(4, 'complete')).hours, 3);
  });

  it('clears hours when set to null', async () => {
    await store.setHours(4, 3);
    assert.equal((await store.setHours(4, null)).hours, null);
  });

  it('accepts zero as distinct from null', async () => {
    assert.equal((await store.setHours(4, 0)).hours, 0);
  });
});

describe('notes', () => {
  it('returns null for a week with no note', async () => {
    assert.equal(await store.getNote(1), null);
  });

  it('round-trips Markdown', async () => {
    const markdown = '# Week 1\n\nTraced `sshd` from process to log.';
    await store.setNote(1, markdown);
    assert.equal((await store.getNote(1))?.markdown, markdown);
  });

  it('stamps updatedAt', async () => {
    await store.setNote(1, 'first');
    assert.equal((await store.getNote(1))?.updatedAt, '2026-08-10T09:00:00.000Z');
  });

  it('moves updatedAt forward on edit', async () => {
    await store.setNote(1, 'first');
    await store.setNote(1, 'second');
    const note = await store.getNote(1);
    assert.equal(note?.markdown, 'second');
    assert.equal(note?.updatedAt, '2026-08-11T09:00:00.000Z');
  });

  it('deletes rather than storing an empty note', async () => {
    await store.setNote(1, 'something');
    assert.equal(await store.setNote(1, ''), null);
    assert.equal(await store.getNote(1), null);
  });

  it('treats whitespace as empty', async () => {
    await store.setNote(1, 'something');
    assert.equal(await store.setNote(1, '   \n  '), null);
    assert.equal(await store.getNote(1), null);
  });

  it('lists notes in week order', async () => {
    await store.setNote(12, 'twelve');
    await store.setNote(3, 'three');
    assert.deepEqual((await store.listNotes()).map((n) => n.week), [3, 12]);
  });

  it('keeps notes independent of progress', async () => {
    await store.setNote(5, 'note');
    // Writing a note should not fabricate a progress row.
    assert.deepEqual(await store.listProgress(), []);
  });
});

describe('repo link', () => {
  it('starts unlinked', async () => {
    assert.equal(await store.getRepoLink(), null);
  });

  it('round-trips a repo', async () => {
    await store.setRepoLink({ owner: 'atech', name: 'msp-lab' });
    assert.deepEqual(await store.getRepoLink(), { owner: 'atech', name: 'msp-lab' });
  });

  it('can be unlinked', async () => {
    await store.setRepoLink({ owner: 'atech', name: 'msp-lab' });
    await store.setRepoLink(null);
    assert.equal(await store.getRepoLink(), null);
  });

  it('discards artifact checks when the repo is unlinked', async () => {
    // Checks were earned against the old repo. Carrying them over would show
    // green ticks for work that is not in the repo now linked.
    await store.setRepoLink({ owner: 'atech', name: 'msp-lab' });
    await store.setArtifactCheck({
      week: 1,
      source: 'verified',
      found: true,
      path: 'docs/lab/hardware.md',
      checkedAt: '2026-08-10T00:00:00.000Z',
    });
    await store.setRepoLink(null);
    assert.deepEqual(await store.listArtifactChecks(), []);
  });
});

describe('artifact checks', () => {
  it('starts with none recorded', async () => {
    assert.equal(await store.getArtifactCheck(1), null);
  });

  it('round-trips a verified check with its sha', async () => {
    await store.setArtifactCheck({
      week: 1,
      source: 'verified',
      found: true,
      path: 'docs/lab/hardware.md',
      commitSha: 'abc123',
      checkedAt: '2026-08-10T00:00:00.000Z',
    });
    const check = await store.getArtifactCheck(1);
    assert.equal(check?.source, 'verified');
    assert.equal(check?.commitSha, 'abc123');
  });

  it('keeps attested separate from verified', async () => {
    await store.setArtifactCheck({
      week: 2,
      source: 'attested',
      found: true,
      checkedAt: '2026-08-10T00:00:00.000Z',
    });
    // The distinction is the whole point: attested must never read as verified.
    assert.equal((await store.getArtifactCheck(2))?.source, 'attested');
  });

  it('replaces an earlier check for the same week', async () => {
    const base = { week: 3, found: false, checkedAt: '2026-08-10T00:00:00.000Z' } as const;
    await store.setArtifactCheck({ ...base, source: 'attested' });
    await store.setArtifactCheck({ ...base, source: 'verified', found: true });
    const checks = await store.listArtifactChecks();
    assert.equal(checks.length, 1);
    assert.equal(checks[0]?.source, 'verified');
  });

  it('lists checks in week order', async () => {
    for (const week of [9, 2, 5]) {
      await store.setArtifactCheck({
        week,
        source: 'attested',
        found: true,
        checkedAt: '2026-08-10T00:00:00.000Z',
      });
    }
    assert.deepEqual((await store.listArtifactChecks()).map((c) => c.week), [2, 5, 9]);
  });
});
