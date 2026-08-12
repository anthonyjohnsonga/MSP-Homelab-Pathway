/**
 * LocalProgressStore against a fake localStorage.
 *
 * Runs the same behavioural expectations as the in-memory store in
 * @pathway/shared, plus the failure modes only a browser has: storage that
 * throws, quota exhaustion mid-session, and a corrupt entry left behind by an
 * older version.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { LOCAL_IDENTITY, LocalProgressStore } from '../src/lib/localStore.ts';

/** Minimal localStorage stand-in, with knobs for the ways real ones fail. */
class FakeStorage implements Storage {
  private map = new Map<string, string>();
  failOnWrite = false;

  get length(): number {
    return this.map.size;
  }
  clear(): void {
    this.map.clear();
  }
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  setItem(key: string, value: string): void {
    if (this.failOnWrite) throw new DOMException('QuotaExceededError');
    this.map.set(key, value);
  }
  /** Reach past the store to plant a corrupt value. */
  poke(key: string, value: string): void {
    this.map.set(key, value);
  }
  keys(): string[] {
    return [...this.map.keys()];
  }
}

let storage: FakeStorage;
let tick: number;
const clock = () => `2026-08-${String(10 + tick++).padStart(2, '0')}T09:00:00.000Z`;

function newStore() {
  return new LocalProgressStore(LOCAL_IDENTITY, clock);
}

beforeEach(() => {
  tick = 0;
  storage = new FakeStorage();
  (globalThis as { window?: unknown }).window = { localStorage: storage };
});

afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
});

describe('persistence', () => {
  it('reports itself persistent when storage works', () => {
    assert.equal(newStore().isPersistent, true);
  });

  it('survives being reconstructed, as it would across a reload', async () => {
    await newStore().setStatus(4, 'complete');
    const reloaded = newStore();
    const rows = await reloaded.listProgress();
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.status, 'complete');
  });

  it('keeps notes across a reload', async () => {
    await newStore().setNote(4, 'rebuilt NG-SRV01 from the runbook');
    assert.equal(
      (await newStore().getNote(4))?.markdown,
      'rebuilt NG-SRV01 from the runbook',
    );
  });

  it('namespaces keys by identity so two techs do not collide', async () => {
    await new LocalProgressStore({ orgId: 'a', userId: 'a' }, clock).setStatus(1, 'complete');
    await new LocalProgressStore({ orgId: 'b', userId: 'b' }, clock).setStatus(2, 'skipped');

    const a = await new LocalProgressStore({ orgId: 'a', userId: 'a' }, clock).listProgress();
    const b = await new LocalProgressStore({ orgId: 'b', userId: 'b' }, clock).listProgress();
    assert.deepEqual(a.map((p) => p.week), [1]);
    assert.deepEqual(b.map((p) => p.week), [2]);
  });
});

describe('status and hours', () => {
  it('stamps completedAt on completion and clears it on reopen', async () => {
    const store = newStore();
    assert.equal((await store.setStatus(3, 'complete')).completedAt, '2026-08-10T09:00:00.000Z');
    assert.equal((await store.setStatus(3, 'in_progress')).completedAt, null);
  });

  it('keeps hours and status independent', async () => {
    const store = newStore();
    await store.setHours(3, 5);
    assert.equal((await store.setStatus(3, 'complete')).hours, 5);
    assert.equal((await store.setHours(3, 7)).status, 'complete');
  });

  it('returns weeks in numeric order, not insertion order', async () => {
    const store = newStore();
    await store.setStatus(12, 'complete');
    await store.setStatus(2, 'complete');
    assert.deepEqual((await store.listProgress()).map((p) => p.week), [2, 12]);
  });
});

describe('notes', () => {
  it('deletes rather than storing an empty or whitespace note', async () => {
    const store = newStore();
    await store.setNote(1, 'something');
    assert.equal(await store.setNote(1, '   '), null);
    assert.equal(await store.getNote(1), null);
  });

  it('does not fabricate a progress row', async () => {
    const store = newStore();
    await store.setNote(5, 'note');
    assert.deepEqual(await store.listProgress(), []);
  });
});

describe('browser failure modes', () => {
  it('falls back to memory when localStorage is unavailable entirely', async () => {
    (globalThis as { window?: unknown }).window = {
      get localStorage(): Storage {
        throw new DOMException('SecurityError');
      },
    };
    const store = newStore();
    assert.equal(store.isPersistent, false);

    // The session must still work — the tech loses persistence, not the app.
    await store.setStatus(1, 'complete');
    assert.equal((await store.listProgress())[0]?.status, 'complete');
  });

  it('keeps working when the quota is exhausted mid-session', async () => {
    const store = newStore();
    await store.setStatus(1, 'complete');
    storage.failOnWrite = true;

    await store.setStatus(2, 'in_progress');
    const rows = await store.listProgress();
    // The failed write fell back to memory rather than throwing at the user.
    assert.deepEqual(rows.map((p) => p.week), [1, 2]);
  });

  it('recovers from a corrupt entry instead of crashing on load', async () => {
    storage.poke('pathway:v1:local:local:progress', '{ this is not json');
    const store = newStore();
    assert.deepEqual(await store.listProgress(), []);

    // And it can be written over cleanly.
    await store.setStatus(1, 'complete');
    assert.equal((await store.listProgress()).length, 1);
  });
});
