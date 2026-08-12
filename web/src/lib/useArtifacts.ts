/**
 * Repo linking and artifact verification.
 *
 * For now the GitHub call goes straight from the browser, which works for
 * public repos at 60 requests an hour. When the platform is hosted this moves
 * behind the Functions API and gains a token — GitHubArtifactChecker takes
 * `fetch` as a parameter precisely so that move is a change of caller, not of
 * logic.
 */

import { useCallback, useEffect, useState } from 'react';

import type { ArtifactCheck, Curriculum, ProgressStore, RepoRef, Week } from '@pathway/shared';
import { GitHubArtifactChecker, artifactTargets, parseRepoRef } from '@pathway/shared';

export interface UseArtifacts {
  repo: RepoRef | null;
  checks: Map<number, ArtifactCheck>;
  /** Week currently being checked, so the button can show progress. */
  verifying: number | null;
  error: string | null;
  linkRepo: (input: string) => Promise<boolean>;
  unlinkRepo: () => Promise<void>;
  verify: (week: Week) => Promise<void>;
  attest: (week: Week) => Promise<void>;
  clearCheck: (week: Week) => Promise<void>;
}

export function useArtifacts(store: ProgressStore, curriculum: Curriculum): UseArtifacts {
  const [repo, setRepo] = useState<RepoRef | null>(null);
  const [checks, setChecks] = useState<Map<number, ArtifactCheck>>(new Map());
  const [verifying, setVerifying] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [linked, existing] = await Promise.all([
        store.getRepoLink(),
        store.listArtifactChecks(),
      ]);
      if (cancelled) return;
      setRepo(linked);
      setChecks(new Map(existing.map((c) => [c.week, c])));
    })();
    return () => {
      cancelled = true;
    };
  }, [store]);

  const linkRepo = useCallback(
    async (input: string) => {
      const parsed = parseRepoRef(input);
      if (!parsed) {
        setError('That does not look like a GitHub repo. Try owner/repo or a github.com URL.');
        return false;
      }
      await store.setRepoLink(parsed);
      setRepo(parsed);
      setError(null);
      return true;
    },
    [store],
  );

  const unlinkRepo = useCallback(async () => {
    await store.setRepoLink(null);
    setRepo(null);
    // The store drops the checks too; mirror that here rather than leaving
    // stale green ticks on screen.
    setChecks(new Map());
    setError(null);
  }, [store]);

  const record = useCallback(
    async (check: ArtifactCheck) => {
      await store.setArtifactCheck(check);
      setChecks((prev) => new Map(prev).set(check.week, check));
    },
    [store],
  );

  const verify = useCallback(
    async (week: Week) => {
      if (!repo) {
        setError('Link your msp-lab repo first.');
        return;
      }
      const targets = artifactTargets(week, curriculum);
      if (targets.length === 0) {
        setError('This week names no file to check. You can attest to it instead.');
        return;
      }

      setVerifying(week.week);
      setError(null);
      try {
        const checker = new GitHubArtifactChecker({
          fetch: (url, init) => window.fetch(url, init),
        });
        const result = await checker.checkWeek(week.week, repo, targets);

        // Surface the first real problem rather than silently reporting "not
        // found" when the truth is a rate limit or an unreachable repo.
        const blocked = result.targets.find(
          (t) => t.result === 'error' || t.result === 'inaccessible',
        );
        if (blocked && (blocked.result === 'error' || blocked.result === 'inaccessible')) {
          setError(blocked.reason);
        }

        const found = result.targets.find((t) => t.result === 'found');
        await record({
          week: week.week,
          source: 'verified',
          found: result.satisfied,
          path: found?.result === 'found' ? found.path : null,
          commitSha: found?.result === 'found' ? (found.commitSha ?? null) : null,
          checkedAt: result.checkedAt,
        });
      } catch (cause) {
        setError(`Verification failed: ${String(cause)}`);
      } finally {
        setVerifying(null);
      }
    },
    [repo, curriculum, record],
  );

  const attest = useCallback(
    async (week: Week) => {
      await record({
        week: week.week,
        source: 'attested',
        found: true,
        path: null,
        commitSha: null,
        checkedAt: new Date().toISOString(),
      });
    },
    [record],
  );

  const clearCheck = useCallback(
    async (week: Week) => {
      await store.setArtifactCheck({
        week: week.week,
        source: 'attested',
        found: false,
        path: null,
        commitSha: null,
        checkedAt: new Date().toISOString(),
      });
      setChecks((prev) => {
        const next = new Map(prev);
        next.delete(week.week);
        return next;
      });
    },
    [store],
  );

  return { repo, checks, verifying, error, linkRepo, unlinkRepo, verify, attest, clearCheck };
}
