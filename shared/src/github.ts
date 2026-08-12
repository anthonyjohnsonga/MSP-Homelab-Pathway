/**
 * Checking whether a week's artifact really exists in the tech's msp-lab repo.
 *
 * This is the mechanic the whole course rests on: a week is not complete until
 * its artifact exists. Self-reporting is allowed but is never dressed up as
 * verification.
 *
 * `fetch` is injected rather than imported so this runs unchanged in the
 * browser, in Azure Functions, and in tests with no network. When the platform
 * is hosted, the same code moves server-side and gains a token; nothing about
 * the shape changes.
 */

import type { ArtifactTarget } from './artifacts.ts';

export interface RepoRef {
  owner: string;
  /** Repository name, e.g. "msp-lab". */
  name: string;
  /** Branch to check. Defaults to the repo's default branch when omitted. */
  ref?: string;
}

export type VerifyOutcome =
  /** The path is there. */
  | { result: 'found'; path: string; kind: 'file' | 'directory'; commitSha?: string }
  /** The repo is reachable but the path is not in it. */
  | { result: 'missing'; path: string }
  /** Repo not found, or private and we have no credentials for it. */
  | { result: 'inaccessible'; reason: string }
  /** GitHub said no for a reason worth showing, e.g. rate limiting. */
  | { result: 'error'; reason: string };

export interface VerifyWeekResult {
  week: number;
  /** Every path the week expects, with what we found for each. */
  targets: VerifyOutcome[];
  /** True only when every expected path was found. */
  satisfied: boolean;
  /** ISO timestamp of the check. */
  checkedAt: string;
}

export type FetchLike = (url: string, init?: { headers?: Record<string, string> }) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}>;

export interface GitHubClientOptions {
  fetch: FetchLike;
  /**
   * Optional token. Absent in the browser during local development, where
   * unauthenticated reads of public repos are enough. Supplied server-side to
   * raise the rate limit and to reach private repos via a GitHub App
   * installation token.
   */
  token?: string;
  /** Overridable so tests never touch the real API. */
  baseUrl?: string;
  now?: () => string;
}

const DEFAULT_BASE = 'https://api.github.com';

export class GitHubArtifactChecker {
  private readonly fetch: FetchLike;
  private readonly token: string | undefined;
  private readonly baseUrl: string;
  private readonly now: () => string;

  constructor(options: GitHubClientOptions) {
    this.fetch = options.fetch;
    this.token = options.token;
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE;
    this.now = options.now ?? (() => new Date().toISOString());
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    return headers;
  }

  /** Does one path exist in the repo? */
  async checkPath(repo: RepoRef, target: ArtifactTarget): Promise<VerifyOutcome> {
    // An empty path means "the repo itself", which is Week 8's artifact.
    const encoded = target.path
      .split('/')
      .filter((segment) => segment !== '')
      .map(encodeURIComponent)
      .join('/');

    const query = repo.ref ? `?ref=${encodeURIComponent(repo.ref)}` : '';
    const url = `${this.baseUrl}/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(
      repo.name,
    )}/contents/${encoded}${query}`;

    let response: Awaited<ReturnType<FetchLike>>;
    try {
      response = await this.fetch(url, { headers: this.headers() });
    } catch (cause) {
      return { result: 'error', reason: `Could not reach GitHub: ${String(cause)}` };
    }

    if (response.status === 404) {
      // GitHub returns 404 both for a missing file and for a repo we cannot
      // see. Distinguishing them matters: one means "do the work", the other
      // means "link your repo". Ask about the repo to tell them apart.
      const repoExists = await this.repoExists(repo);
      return repoExists
        ? { result: 'missing', path: target.path }
        : {
            result: 'inaccessible',
            reason: `Cannot see ${repo.owner}/${repo.name}. It may be private, renamed, or not exist.`,
          };
    }

    if (response.status === 403 || response.status === 429) {
      return {
        result: 'error',
        reason: 'GitHub rate limit reached. Try again shortly.',
      };
    }

    if (!response.ok) {
      return { result: 'error', reason: `GitHub returned ${response.status}.` };
    }

    const body = (await response.json()) as unknown;

    // A directory comes back as an array of entries, a file as an object.
    const isDirectory = Array.isArray(body);
    const sha =
      !isDirectory && typeof body === 'object' && body !== null && 'sha' in body
        ? String((body as { sha: unknown }).sha)
        : undefined;

    // An empty directory is indistinguishable from a missing one on GitHub,
    // because git does not track empty directories at all.
    if (isDirectory && (body as unknown[]).length === 0) {
      return { result: 'missing', path: target.path };
    }

    return {
      result: 'found',
      path: target.path,
      kind: isDirectory ? 'directory' : 'file',
      ...(sha ? { commitSha: sha } : {}),
    };
  }

  private async repoExists(repo: RepoRef): Promise<boolean> {
    try {
      const response = await this.fetch(
        `${this.baseUrl}/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.name)}`,
        { headers: this.headers() },
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  /** Check every path a week expects. Satisfied only when all of them exist. */
  async checkWeek(
    week: number,
    repo: RepoRef,
    targets: readonly ArtifactTarget[],
  ): Promise<VerifyWeekResult> {
    const outcomes: VerifyOutcome[] = [];
    for (const target of targets) {
      outcomes.push(await this.checkPath(repo, target));
    }
    return {
      week,
      targets: outcomes,
      satisfied: outcomes.length > 0 && outcomes.every((o) => o.result === 'found'),
      checkedAt: this.now(),
    };
  }
}

/**
 * Parse what a tech types into the repo field.
 *
 * Accepts "owner/repo", a full GitHub URL, or a .git clone URL, because people
 * paste whatever is in their address bar.
 */
export function parseRepoRef(input: string): RepoRef | null {
  const trimmed = input.trim().replace(/\.git$/, '').replace(/\/+$/, '');
  if (trimmed === '') return null;

  const url = trimmed.match(/github\.com[/:]([^/]+)\/([^/]+)/i);
  if (url && url[1] && url[2]) return { owner: url[1], name: url[2] };

  const plain = trimmed.match(/^([\w.-]+)\/([\w.-]+)$/);
  if (plain && plain[1] && plain[2]) return { owner: plain[1], name: plain[2] };

  return null;
}
