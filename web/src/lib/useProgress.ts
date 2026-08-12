/**
 * React binding over a ProgressStore.
 *
 * Holds the whole progress list in state because it is at most a few dozen
 * small rows, and because almost every view needs it at once: the year bar,
 * the phase bars, the pace calculation and the dependency warnings.
 *
 * Writes go to the store first and then to state. With a local store that is
 * instant; over the network it means the UI never claims a save that did not
 * happen.
 */

import { useCallback, useEffect, useState } from 'react';

import type { ProgressStore, WeekProgress, WeekStatus } from '@pathway/shared';

function upsert(list: WeekProgress[], updated: WeekProgress): WeekProgress[] {
  const without = list.filter((p) => p.week !== updated.week);
  return [...without, updated].sort((a, b) => a.week - b.week);
}

export interface UseProgress {
  progress: WeekProgress[];
  loading: boolean;
  /** Non-null when a write failed, so the UI can say so rather than lie. */
  error: string | null;
  setStatus: (week: number, status: WeekStatus) => Promise<void>;
  setHours: (week: number, hours: number | null) => Promise<void>;
  isComplete: (week: number) => boolean;
}

export function useProgress(store: ProgressStore): UseProgress {
  const [progress, setProgress] = useState<WeekProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    store
      .listProgress()
      .then((rows) => {
        if (!cancelled) setProgress(rows);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(`Could not load progress: ${String(cause)}`);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [store]);

  const setStatus = useCallback(
    async (week: number, status: WeekStatus) => {
      try {
        const updated = await store.setStatus(week, status);
        setProgress((prev) => upsert(prev, updated));
        setError(null);
      } catch (cause) {
        setError(`Could not save status: ${String(cause)}`);
      }
    },
    [store],
  );

  const setHours = useCallback(
    async (week: number, hours: number | null) => {
      try {
        const updated = await store.setHours(week, hours);
        setProgress((prev) => upsert(prev, updated));
        setError(null);
      } catch (cause) {
        setError(`Could not save hours: ${String(cause)}`);
      }
    },
    [store],
  );

  const isComplete = useCallback(
    (week: number) => progress.some((p) => p.week === week && p.status === 'complete'),
    [progress],
  );

  return { progress, loading, error, setStatus, setHours, isComplete };
}
