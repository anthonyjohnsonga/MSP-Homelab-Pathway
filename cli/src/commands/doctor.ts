/**
 * `msp-lab doctor` — environment and hygiene checks.
 *
 * The secret scan is the one that earns its keep. The curriculum teaches
 * Secrets Management in Week 37, and a tech who has committed a .env by Week 12
 * should find out from this rather than from an incident.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { colour, line, mark } from '../lib/output.ts';

export interface DoctorOptions {
  repoRoot: string;
}

interface Check {
  label: string;
  ok: boolean;
  detail?: string;
  /** A warning does not fail the run. */
  warnOnly?: boolean;
}

/** Filenames that should never be committed, whatever they contain. */
const FORBIDDEN_NAMES = [
  /^\.env$/,
  /^\.env\..+$/,
  /\.pem$/,
  /\.pfx$/,
  /^id_rsa$/,
  /^id_ed25519$/,
  /\.tfstate$/,
  /^credentials\.json$/,
];

/** Content that looks like a live credential. */
const SECRET_PATTERNS: { label: string; pattern: RegExp }[] = [
  { label: 'Azure storage key', pattern: /AccountKey=[A-Za-z0-9+/=]{40,}/ },
  { label: 'AWS access key', pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { label: 'GitHub token', pattern: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/ },
  { label: 'private key block', pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { label: 'Slack token', pattern: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/ },
];

const SKIP_DIRS = new Set(['.git', 'node_modules', '.terraform', 'dist', 'build', '__pycache__']);
const MAX_SCAN_BYTES = 512 * 1024;

function git(repoRoot: string, args: string[]): string | null {
  try {
    return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return null;
  }
}

/** Every tracked file, or every file on disk if git is unavailable. */
function filesToScan(repoRoot: string): string[] {
  const tracked = git(repoRoot, ['ls-files']);
  if (tracked !== null) {
    return tracked.split('\n').map((f) => f.trim()).filter((f) => f !== '');
  }
  const found: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(join(dir, entry.name));
      } else {
        found.push(relative(repoRoot, join(dir, entry.name)).split('\\').join('/'));
      }
    }
  };
  walk(repoRoot);
  return found;
}

export function runDoctor(options: DoctorOptions): number {
  const { repoRoot } = options;
  const checks: Check[] = [];

  // ---- git ---------------------------------------------------------------
  const version = git(repoRoot, ['--version']);
  checks.push({
    label: 'git is installed',
    ok: version !== null,
    detail: version?.trim() ?? 'git not found on PATH',
  });

  const isRepo = existsSync(join(repoRoot, '.git'));
  checks.push({ label: 'this is a git repo', ok: isRepo, detail: repoRoot });

  if (isRepo) {
    const status = git(repoRoot, ['status', '--porcelain']);
    const dirty = (status ?? '').trim() !== '';
    checks.push({
      label: 'working tree is clean',
      ok: !dirty,
      warnOnly: true,
      detail: dirty ? `${(status ?? '').trim().split('\n').length} uncommitted change(s)` : undefined,
    });

    const remote = git(repoRoot, ['remote', '-v']);
    checks.push({
      label: 'a remote is configured',
      ok: (remote ?? '').trim() !== '',
      warnOnly: true,
      detail: (remote ?? '').trim() === '' ? 'no remote — your work exists in one place only' : undefined,
    });
  }

  // ---- .gitignore --------------------------------------------------------
  const gitignorePath = join(repoRoot, '.gitignore');
  const hasGitignore = existsSync(gitignorePath);
  const gitignore = hasGitignore ? readFileSync(gitignorePath, 'utf8') : '';
  checks.push({ label: '.gitignore exists', ok: hasGitignore });
  if (hasGitignore) {
    checks.push({
      label: '.gitignore covers .env',
      ok: /^\.env\b/m.test(gitignore),
      warnOnly: true,
    });
  }

  // ---- secrets -----------------------------------------------------------
  const files = filesToScan(repoRoot);
  const badNames = files.filter((f) => {
    const base = f.split('/').pop() ?? '';
    return FORBIDDEN_NAMES.some((rx) => rx.test(base));
  });
  checks.push({
    label: 'no secret-bearing filenames committed',
    ok: badNames.length === 0,
    detail: badNames.length > 0 ? badNames.slice(0, 5).join(', ') : undefined,
  });

  const hits: string[] = [];
  for (const file of files) {
    const full = join(repoRoot, file);
    try {
      if (!existsSync(full) || statSync(full).size > MAX_SCAN_BYTES) continue;
      const contents = readFileSync(full, 'utf8');
      for (const { label, pattern } of SECRET_PATTERNS) {
        if (pattern.test(contents)) hits.push(`${file} (${label})`);
      }
    } catch {
      // Binary or unreadable — nothing to scan.
    }
  }
  checks.push({
    label: 'no credentials found in file contents',
    ok: hits.length === 0,
    detail: hits.length > 0 ? hits.slice(0, 5).join('; ') : undefined,
  });

  // ---- report ------------------------------------------------------------
  line(colour.bold('msp-lab doctor'));
  line(colour.dim(repoRoot));
  line();

  let failures = 0;
  for (const check of checks) {
    const badge = check.ok ? mark.pass() : check.warnOnly ? mark.warn() : mark.fail();
    line(`  ${badge} ${check.label}`);
    if (check.detail) line(`       ${colour.dim(check.detail)}`);
    if (!check.ok && !check.warnOnly) failures += 1;
  }

  line();
  if (failures === 0) {
    line(colour.green('No problems found.'));
    return 0;
  }
  line(colour.red(`${failures} problem(s) need attention.`));
  return 1;
}
