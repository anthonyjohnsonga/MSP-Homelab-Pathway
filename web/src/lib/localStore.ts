/**
 * Progress kept in the browser.
 *
 * This is what makes the platform usable with no Azure account and no network:
 * a tech can work the whole year locally. When hosting arrives, the Azure
 * adapter implements the same interface and the UI does not change.
 *
 * Everything is namespaced by identity so the same browser can hold more than
 * one tech's work, and so the local keys line up with the Azure partition key.
 */

import type { Identity, ProgressStore, WeekNote, WeekProgress, WeekStatus } from '@pathway/shared';
import { emptyProgress } from '@pathway/shared';

/** Bump if the stored shape ever changes incompatibly. */
const SCHEMA = 'v1';

type ProgressMap = Record<string, WeekProgress>;
type NoteMap = Record<string, WeekNote>;

/**
 * localStorage throws rather than returning null in some privacy modes, and
 * Safari throws on write when the quota is zero. Falling back to memory keeps
 * the app usable instead of white-screening — the tech loses persistence, not
 * the session.
 */
function safeStorage(): Storage | null {
  try {
    const probe = '__pathway_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

export class LocalProgressStore implements ProgressStore {
  readonly identity: Identity;

  private readonly storage: Storage | null;
  private readonly now: () => string;
  /** Used when localStorage is unavailable, so the session still works. */
  private memory = new Map<string, string>();

  constructor(identity: Identity, now: () => string = () => new Date().toISOString()) {
    this.identity = identity;
    this.storage = safeStorage();
    this.now = now;
  }

  /** True when writes actually survive a reload. */
  get isPersistent(): boolean {
    return this.storage !== null;
  }

  private key(kind: 'progress' | 'notes'): string {
    return `pathway:${SCHEMA}:${this.identity.orgId}:${this.identity.userId}:${kind}`;
  }

  private read<T>(kind: 'progress' | 'notes'): T {
    const key = this.key(kind);
    // Memory is checked first and wins when present: a previous write may have
    // fallen back to it after a quota failure, in which case it holds newer
    // data than storage does. Reading storage first would silently lose
    // everything written since that failure.
    const raw = this.memory.get(key) ?? (this.storage ? this.storage.getItem(key) : null);
    if (!raw) return {} as T;
    try {
      return JSON.parse(raw) as T;
    } catch {
      // Corrupt entry — better to start clean than to crash on every load.
      return {} as T;
    }
  }

  private write(kind: 'progress' | 'notes', value: unknown): void {
    const key = this.key(kind);
    const raw = JSON.stringify(value);
    if (this.storage) {
      try {
        this.storage.setItem(key, raw);
        // Storage is authoritative again, so drop any stale memory fallback
        // that would otherwise keep shadowing it.
        this.memory.delete(key);
        return;
      } catch {
        // Quota exceeded mid-session. Fall through to memory.
      }
    }
    this.memory.set(key, raw);
  }

  async listProgress(): Promise<WeekProgress[]> {
    const map = this.read<ProgressMap>('progress');
    return Object.values(map).sort((a, b) => a.week - b.week);
  }

  async setStatus(week: number, status: WeekStatus): Promise<WeekProgress> {
    const map = this.read<ProgressMap>('progress');
    const current = map[String(week)] ?? emptyProgress(week);
    const updated: WeekProgress = {
      ...current,
      status,
      completedAt: status === 'complete' ? (current.completedAt ?? this.now()) : null,
    };
    map[String(week)] = updated;
    this.write('progress', map);
    return updated;
  }

  async setHours(week: number, hours: number | null): Promise<WeekProgress> {
    const map = this.read<ProgressMap>('progress');
    const current = map[String(week)] ?? emptyProgress(week);
    const updated: WeekProgress = { ...current, hours };
    map[String(week)] = updated;
    this.write('progress', map);
    return updated;
  }

  async getNote(week: number): Promise<WeekNote | null> {
    return this.read<NoteMap>('notes')[String(week)] ?? null;
  }

  async setNote(week: number, markdown: string): Promise<WeekNote | null> {
    const map = this.read<NoteMap>('notes');
    if (markdown.trim() === '') {
      delete map[String(week)];
      this.write('notes', map);
      return null;
    }
    const note: WeekNote = { week, markdown, updatedAt: this.now() };
    map[String(week)] = note;
    this.write('notes', map);
    return note;
  }

  async listNotes(): Promise<WeekNote[]> {
    const map = this.read<NoteMap>('notes');
    return Object.values(map).sort((a, b) => a.week - b.week);
  }
}

/**
 * The identity used before sign-in exists.
 *
 * Matches the v1 rule that every tech is their own org. When Static Web Apps
 * auth lands, this is replaced by the real principal and nothing else changes.
 */
export const LOCAL_IDENTITY: Identity = { orgId: 'local', userId: 'local' };
