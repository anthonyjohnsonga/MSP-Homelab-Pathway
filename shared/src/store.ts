/**
 * Where a tech's progress lives.
 *
 * Deliberately an interface with more than one implementation:
 *
 *   - InMemoryProgressStore  — below, for tests
 *   - LocalProgressStore     — browser localStorage, so the app works with no
 *                              cloud account at all
 *   - TableStorageProgressStore — Azure, added when the platform is hosted
 *
 * Every method is async even though localStorage is synchronous. That is the
 * whole point: the UI is written against promises from the first commit, so
 * moving to Azure is a constructor change rather than a rewrite.
 *
 * None of this data ever enters the repo.
 */

import type { ArtifactCheck, WeekProgress, WeekStatus } from './types.ts';
import type { RepoRef } from './github.ts';

/**
 * Who the progress belongs to.
 *
 * In v1 every tech is their own org, so `orgId` equals `userId`. The field is
 * here from the start so an MSP manager view is additive later rather than a
 * migration — it becomes the Table Storage partition key, `{orgId}:{userId}`.
 */
export interface Identity {
  orgId: string;
  userId: string;
}

/** A tech's weekly write-up. Becomes the RAG corpus in Week 49 of the course. */
export interface WeekNote {
  week: number;
  /** Markdown, in the tech's own words. */
  markdown: string;
  /** ISO timestamp of the last edit. */
  updatedAt: string;
}

export interface ProgressStore {
  readonly identity: Identity;

  /** Every week the tech has touched. Weeks never started are simply absent. */
  listProgress(): Promise<WeekProgress[]>;

  setStatus(week: number, status: WeekStatus): Promise<WeekProgress>;

  /** Pass null to clear a logged figure. */
  setHours(week: number, hours: number | null): Promise<WeekProgress>;

  getNote(week: number): Promise<WeekNote | null>;

  /** Writing an empty string deletes the note rather than storing a blank. */
  setNote(week: number, markdown: string): Promise<WeekNote | null>;

  /** Every note the tech has written, for export and for search. */
  listNotes(): Promise<WeekNote[]>;

  /** The tech's own msp-lab repo, once they have linked it. */
  getRepoLink(): Promise<RepoRef | null>;

  /** Pass null to unlink. */
  setRepoLink(repo: RepoRef | null): Promise<void>;

  getArtifactCheck(week: number): Promise<ArtifactCheck | null>;

  setArtifactCheck(check: ArtifactCheck): Promise<ArtifactCheck>;

  listArtifactChecks(): Promise<ArtifactCheck[]>;
}

/** A blank record for a week that has not been touched yet. */
export function emptyProgress(week: number): WeekProgress {
  return { week, status: 'not_started', hours: null, completedAt: null };
}

/**
 * Reference implementation, used by the tests and as the shape the Azure
 * adapter has to match.
 */
export class InMemoryProgressStore implements ProgressStore {
  readonly identity: Identity;

  private readonly progress = new Map<number, WeekProgress>();
  private readonly notes = new Map<number, WeekNote>();
  private readonly checks = new Map<number, ArtifactCheck>();
  private repoLink: RepoRef | null = null;
  private readonly now: () => string;

  constructor(identity: Identity, now: () => string = () => new Date().toISOString()) {
    this.identity = identity;
    this.now = now;
  }

  async listProgress(): Promise<WeekProgress[]> {
    return [...this.progress.values()].sort((a, b) => a.week - b.week);
  }

  async setStatus(week: number, status: WeekStatus): Promise<WeekProgress> {
    const current = this.progress.get(week) ?? emptyProgress(week);
    const updated: WeekProgress = {
      ...current,
      status,
      // completedAt records when the week was finished, and is cleared if the
      // tech reopens it — otherwise a reopened week keeps a stale timestamp.
      completedAt: status === 'complete' ? (current.completedAt ?? this.now()) : null,
    };
    this.progress.set(week, updated);
    return updated;
  }

  async setHours(week: number, hours: number | null): Promise<WeekProgress> {
    const current = this.progress.get(week) ?? emptyProgress(week);
    const updated: WeekProgress = { ...current, hours };
    this.progress.set(week, updated);
    return updated;
  }

  async getNote(week: number): Promise<WeekNote | null> {
    return this.notes.get(week) ?? null;
  }

  async setNote(week: number, markdown: string): Promise<WeekNote | null> {
    if (markdown.trim() === '') {
      this.notes.delete(week);
      return null;
    }
    const note: WeekNote = { week, markdown, updatedAt: this.now() };
    this.notes.set(week, note);
    return note;
  }

  async listNotes(): Promise<WeekNote[]> {
    return [...this.notes.values()].sort((a, b) => a.week - b.week);
  }

  async getRepoLink(): Promise<RepoRef | null> {
    return this.repoLink;
  }

  async setRepoLink(repo: RepoRef | null): Promise<void> {
    this.repoLink = repo;
    if (repo === null) {
      // Checks were made against the old repo, so they say nothing about the
      // new one. Keeping them would show green ticks earned somewhere else.
      this.checks.clear();
    }
  }

  async getArtifactCheck(week: number): Promise<ArtifactCheck | null> {
    return this.checks.get(week) ?? null;
  }

  async setArtifactCheck(check: ArtifactCheck): Promise<ArtifactCheck> {
    this.checks.set(check.week, check);
    return check;
  }

  async listArtifactChecks(): Promise<ArtifactCheck[]> {
    return [...this.checks.values()].sort((a, b) => a.week - b.week);
  }
}
