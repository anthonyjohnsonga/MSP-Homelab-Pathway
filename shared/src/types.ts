/**
 * Shape of the curriculum data and of a tech's progress against it.
 *
 * Two things are deliberately kept apart:
 *
 *   - Curriculum content (Week, Curriculum) ships in the repo. It is the same
 *     for everyone and never changes at runtime.
 *   - Per-user state (WeekProgress) lives in Azure Table Storage, keyed by user.
 *     It never enters the repo.
 */

/** Where a tech is on a given week. Stored per user, never in curriculum.json. */
export type WeekStatus = 'not_started' | 'in_progress' | 'complete' | 'skipped';

export const WEEK_STATUSES: readonly WeekStatus[] = [
  'not_started',
  'in_progress',
  'complete',
  'skipped',
];

/**
 * A time-limited way to get a tool for free. This is the middle rung of the
 * free -> trial -> paid ladder every week presents, and the reason a tech with
 * no budget can still complete weeks that need Windows Server or an EDR.
 */
export interface Trial {
  /** What you are signing up for, e.g. "Windows Server 2025 evaluation". */
  name: string;
  /** How long it lasts in plain words, e.g. "180 days", "12 months". */
  duration: string;
  /** Who qualifies and any catch, e.g. "Renews while the tenant stays active". */
  eligibility?: string;
  /** Where to sign up. */
  url?: string;
  /**
   * ISO date this trial's terms were last confirmed.
   *
   * Vendors change trial lengths, eligibility and URLs constantly — this is the
   * fastest-rotting data in the curriculum. Recording when we last looked lets
   * the UI flag stale entries instead of quietly sending techs to dead links.
   */
  checkedOn?: string;
}

/** What a week stands up, and how to obtain the tools to do it. */
export interface Tooling {
  /** The thing that exists at the end of the week that did not exist before. */
  standsUp: string;
  /** The best genuinely free path. Always presented first. */
  freeOption: string;
  /** A time-limited free path, when one exists. */
  trial?: Trial | null;
  /** What to buy if free and trial both fall short. "—" when nothing is needed. */
  paidFallback: string;
}

/** One week of the curriculum. Content only — no per-user state. */
export interface Week {
  week: number;
  topic: string;
  phase: string;
  concepts: string[];
  lab: string;
  /** ISO date, YYYY-MM-DD. The Monday the week opens. */
  startDate: string;
  /** ISO date, YYYY-MM-DD. The Sunday the week closes. */
  endDate: string;
  /** What must land in the tech's repo before the week counts as complete. */
  artifact: string;
  /** Week numbers that must be complete first. Always strictly earlier. */
  dependsOn: number[];
  tooling: Tooling;

  /**
   * schemaVersion 1 carried per-user state inline, back when this was a
   * single-user local tracker. The platform ignores these; they are typed only
   * so an older curriculum.json still parses.
   *
   * @deprecated Per-user state lives in Table Storage. See WeekProgress.
   */
  status?: WeekStatus;
  /** @deprecated See WeekProgress. */
  hours?: number | null;
  /** @deprecated See WeekProgress. */
  notes?: string;
}

export interface Client {
  name: string;
  staff: number;
  sites: number;
  description: string;
}

export interface Lab {
  model: string;
  localHost: string;
  cloud: string;
  targetSpec: string;
}

/** The whole curriculum. Loaded from data/curriculum.json. */
export interface Curriculum {
  schemaVersion: number;
  title: string;
  client: Client;
  lab: Lab;
  /** Name of the repo each tech creates for their own lab work. */
  repo: string;
  startDate: string;
  endDate: string;
  phases: string[];
  weeks: Week[];
}

/**
 * A tech's state on one week. Lives in Table Storage, partitioned by
 * `{orgId}:{userId}` with row key `week-{n}`.
 *
 * In v1 every tech is their own org, so orgId equals userId. The field exists
 * from day one so that adding an MSP manager view later is additive rather
 * than a migration.
 */
export interface WeekProgress {
  week: number;
  status: WeekStatus;
  /** Hours logged. null when the tech has not recorded any. */
  hours: number | null;
  /** ISO timestamp the week was marked complete, if it was. */
  completedAt?: string | null;
}

/**
 * How we came to believe a week's artifact exists.
 *
 * The distinction matters and must never be collapsed in the UI: `verified`
 * means the GitHub API confirmed the file is really there, `attested` means the
 * tech said so. Only `verified` earns a green indicator.
 */
export type ArtifactCheckSource = 'verified' | 'attested';

export interface ArtifactCheck {
  week: number;
  source: ArtifactCheckSource;
  /** Whether the artifact was found. Meaningless for `attested` unless true. */
  found: boolean;
  /** Repo path that satisfied the check, when known. */
  path?: string | null;
  /** Commit SHA the file was seen at. Only set for `verified`. */
  commitSha?: string | null;
  /** ISO timestamp of the check. */
  checkedAt: string;
}
