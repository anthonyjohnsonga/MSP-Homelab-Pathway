/**
 * The core mechanic, on screen: does this week's artifact actually exist?
 *
 * The one rule this component exists to enforce is that *verified* and
 * *attested* never look the same. Verified means GitHub confirmed the file is
 * there. Attested means the tech said so. Only the first earns green.
 */

import { useState } from 'react';

import type { ArtifactCheck, Curriculum, RepoRef, Week } from '@pathway/shared';
import { artifactTargets } from '@pathway/shared';

/* ---------- repo linking -------------------------------------------------- */

interface RepoLinkProps {
  repo: RepoRef | null;
  onLink: (input: string) => Promise<boolean>;
  onUnlink: () => Promise<void>;
}

export function RepoLink({ repo, onLink, onUnlink }: RepoLinkProps) {
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  if (repo) {
    return (
      <div className="repo-link linked">
        <span>
          Checking{' '}
          <a
            href={`https://github.com/${repo.owner}/${repo.name}`}
            target="_blank"
            rel="noreferrer noopener"
          >
            {repo.owner}/{repo.name}
          </a>
        </span>
        <button className="link-button" onClick={() => void onUnlink()}>
          Unlink
        </button>
      </div>
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const ok = await onLink(draft);
    setBusy(false);
    if (ok) setDraft('');
  }

  return (
    <form className="repo-link" onSubmit={(e) => void submit(e)}>
      <label htmlFor="repo-input">Your lab repo</label>
      <input
        id="repo-input"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="owner/msp-lab"
        spellCheck={false}
        autoComplete="off"
      />
      <button type="submit" disabled={busy || draft.trim() === ''}>
        Link
      </button>
    </form>
  );
}

/* ---------- per-week verification ----------------------------------------- */

interface PanelProps {
  week: Week;
  curriculum: Curriculum;
  repo: RepoRef | null;
  check: ArtifactCheck | undefined;
  verifying: boolean;
  onVerify: () => void;
  onAttest: () => void;
  onClear: () => void;
}

export function ArtifactPanel({
  week,
  curriculum,
  repo,
  check,
  verifying,
  onVerify,
  onAttest,
  onClear,
}: PanelProps) {
  const targets = artifactTargets(week, curriculum);
  const canVerify = targets.length > 0;

  return (
    <div className="artifact-panel">
      {canVerify ? (
        <div className="artifact-targets">
          <span className="artifact-targets-label">Checks for</span>
          <ul>
            {targets.map((t) => (
              <li key={t.path || '(repo root)'}>
                <code>{t.path === '' ? `${curriculum.repo}/` : t.path}</code>
                {t.kind === 'directory' && <span className="target-kind">directory</span>}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="artifact-note">
          This week describes an outcome rather than a file, so it cannot be
          checked automatically. Recording it is on your word.
        </p>
      )}

      <ArtifactStatus check={check} />

      <div className="artifact-actions">
        {canVerify && (
          <button
            className="primary"
            onClick={onVerify}
            disabled={verifying || !repo}
            title={repo ? undefined : 'Link your repo first'}
          >
            {verifying ? 'Checking…' : 'Verify against GitHub'}
          </button>
        )}
        {!check?.found && (
          <button onClick={onAttest}>I built this</button>
        )}
        {check?.found && <button onClick={onClear}>Clear</button>}
      </div>
    </div>
  );
}

function ArtifactStatus({ check }: { check: ArtifactCheck | undefined }) {
  if (!check || !check.found) {
    return (
      <div className="artifact-status none">
        <span className="artifact-badge badge-none">Not recorded</span>
      </div>
    );
  }

  if (check.source === 'verified') {
    return (
      <div className="artifact-status verified">
        <span className="artifact-badge badge-verified">Verified</span>
        <span className="artifact-detail">
          Found in your repo
          {check.path ? (
            <>
              {' '}
              at <code>{check.path}</code>
            </>
          ) : null}
          {check.commitSha ? <> · {check.commitSha.slice(0, 7)}</> : null} ·{' '}
          {check.checkedAt.slice(0, 10)}
        </span>
      </div>
    );
  }

  return (
    <div className="artifact-status attested">
      <span className="artifact-badge badge-attested">Attested</span>
      <span className="artifact-detail">
        Self-reported on {check.checkedAt.slice(0, 10)}. Not checked against your repo.
      </span>
    </div>
  );
}
