/**
 * The three things a tech records against a week: where they are, how long it
 * took, and what they learned.
 */

import { useEffect, useRef, useState } from 'react';

import type { ProgressStore, WeekProgress, WeekStatus } from '@pathway/shared';
import { WEEK_STATUSES } from '@pathway/shared';

const STATUS_LABELS: Record<WeekStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  complete: 'Complete',
  skipped: 'Skipped',
};

/* ---------- status ------------------------------------------------------- */

interface StatusProps {
  value: WeekStatus;
  onChange: (status: WeekStatus) => void;
}

export function StatusControl({ value, onChange }: StatusProps) {
  return (
    <div className="segmented" role="group" aria-label="Week status">
      {WEEK_STATUSES.map((status) => (
        <button
          key={status}
          type="button"
          className={`segment status-${status}`}
          aria-pressed={status === value}
          onClick={() => onChange(status)}
        >
          {STATUS_LABELS[status]}
        </button>
      ))}
    </div>
  );
}

/* ---------- hours -------------------------------------------------------- */

interface HoursProps {
  value: number | null;
  onChange: (hours: number | null) => void;
}

export function HoursInput({ value, onChange }: HoursProps) {
  // Kept as a string while editing so a half-typed "1." does not get parsed
  // into something the tech did not mean.
  const [draft, setDraft] = useState(value === null ? '' : String(value));

  useEffect(() => {
    setDraft(value === null ? '' : String(value));
  }, [value]);

  function commit() {
    const trimmed = draft.trim();
    if (trimmed === '') {
      onChange(null);
      return;
    }
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed) && parsed >= 0) {
      onChange(parsed);
    } else {
      setDraft(value === null ? '' : String(value));
    }
  }

  return (
    <label className="hours">
      <span>Hours</span>
      <input
        type="number"
        min="0"
        step="0.25"
        inputMode="decimal"
        value={draft}
        placeholder="—"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
      />
    </label>
  );
}

/* ---------- note --------------------------------------------------------- */

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const AUTOSAVE_MS = 800;

interface NoteProps {
  week: number;
  store: ProgressStore;
}

/**
 * The weekly write-up. Autosaves shortly after typing stops and again on blur,
 * because this is the artifact people most resent losing — and in Week 49 of
 * the course these notes become the corpus the tech's own RAG bot answers from.
 */
export function NoteEditor({ week, store }: NoteProps) {
  const [markdown, setMarkdown] = useState('');
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guards against a slow load for week N landing after the tech has already
  // switched to week N+1 and overwriting the editor.
  const loadedWeek = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadedWeek.current = null;
    setSaveState('idle');
    store.getNote(week).then((note) => {
      if (cancelled) return;
      setMarkdown(note?.markdown ?? '');
      setUpdatedAt(note?.updatedAt ?? null);
      loadedWeek.current = week;
    });
    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [week, store]);

  async function save(text: string) {
    setSaveState('saving');
    try {
      const note = await store.setNote(week, text);
      setUpdatedAt(note?.updatedAt ?? null);
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  }

  function onType(text: string) {
    setMarkdown(text);
    // Ignore edits that arrive before the existing note has loaded, otherwise
    // an empty editor could overwrite a real note.
    if (loadedWeek.current !== week) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(text), AUTOSAVE_MS);
  }

  return (
    <div className="note">
      <textarea
        value={markdown}
        onChange={(e) => onType(e.target.value)}
        onBlur={() => {
          if (timer.current) clearTimeout(timer.current);
          if (loadedWeek.current === week) void save(markdown);
        }}
        placeholder="What you did, what broke, what you'd do differently. Markdown."
        rows={8}
        spellCheck
      />
      <div className="note-status">
        {saveState === 'saving' && <span>Saving…</span>}
        {saveState === 'saved' && <span>Saved</span>}
        {saveState === 'error' && <span className="save-error">Could not save</span>}
        {saveState === 'idle' && updatedAt && (
          <span>Last edited {updatedAt.slice(0, 10)}</span>
        )}
      </div>
    </div>
  );
}

/* ---------- year progress ------------------------------------------------ */

interface YearProps {
  progress: WeekProgress[];
  totalWeeks: number;
}

export function YearProgress({ progress, totalWeeks }: YearProps) {
  const complete = progress.filter((p) => p.status === 'complete').length;
  const started = progress.filter((p) => p.status === 'in_progress').length;
  const pct = totalWeeks === 0 ? 0 : Math.round((complete / totalWeeks) * 100);

  return (
    <div className="year-progress">
      <div
        className="bar"
        role="progressbar"
        aria-valuenow={complete}
        aria-valuemin={0}
        aria-valuemax={totalWeeks}
        aria-label="Weeks complete"
      >
        <div className="bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="year-progress-label">
        <strong>{complete}</strong> of {totalWeeks} complete
        {started > 0 && <> · {started} in progress</>}
      </div>
    </div>
  );
}
