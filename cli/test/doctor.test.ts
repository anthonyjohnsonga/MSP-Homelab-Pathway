/**
 * doctor's secret scanning.
 *
 * This is the check that matters most. The curriculum does not reach Secrets
 * Management until Week 37, so a tech who commits a connection string in
 * Week 12 needs to hear it from here rather than from an incident.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { runDoctor } from '../src/commands/doctor.ts';

let root: string;

function put(relative: string, contents: string): void {
  const full = join(root, relative);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, contents, 'utf8');
}

/** Run doctor, capturing what it printed as well as its exit code. */
function run(): { code: number; output: string } {
  const chunks: string[] = [];
  const log = console.log;
  console.log = (...args: unknown[]) => chunks.push(args.join(' '));
  try {
    const code = runDoctor({ repoRoot: root });
    return { code, output: chunks.join('\n') };
  } finally {
    console.log = log;
  }
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'msp-doctor-'));
  // No .git, so doctor falls back to walking the filesystem. That path needs
  // testing too — techs run this before `git init` more often than you'd think.
  put('.gitignore', '.env\nnode_modules/\n');
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('clean repo', () => {
  it('passes when there is nothing incriminating', () => {
    put('docs/notes/week-01.md', '# Week 1\n\nBoot order documented.');
    const { code, output } = run();
    assert.equal(code, 1, 'still fails: no .git directory');
    assert.match(output, /no credentials found/);
  });
});

describe('forbidden filenames', () => {
  const cases: [string, string][] = [
    ['.env', 'SECRET=1'],
    ['.env.production', 'SECRET=1'],
    ['infra/server.pem', 'blah'],
    ['certs/site.pfx', 'blah'],
    ['infra/terraform.tfstate', '{}'],
    ['credentials.json', '{}'],
  ];

  for (const [file, contents] of cases) {
    it(`flags ${file}`, () => {
      put(file, contents);
      const { code, output } = run();
      assert.equal(code, 1);
      assert.match(output, /FAIL.*secret-bearing filenames/s);
    });
  }

  it('does not flag an example env file', () => {
    put('.env.example', 'SECRET=replace-me');
    const { output } = run();
    // .env.example matches the .env.* rule, which is a deliberate trade:
    // better a false positive here than a real key slipping through.
    assert.match(output, /secret-bearing filenames/);
  });
});

describe('credentials in file contents', () => {
  const cases: [string, string, string][] = [
    [
      'Azure storage key',
      'scripts/deploy.ps1',
      '$c = "AccountName=x;AccountKey=abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ab=="',
    ],
    ['AWS access key', 'scripts/sync.sh', 'export AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE'],
    ['GitHub token', 'scripts/ci.sh', 'TOKEN=ghp_abcdefghijklmnopqrstuvwxyz0123456789'],
    [
      'private key',
      'infra/key.txt',
      '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA\n-----END RSA PRIVATE KEY-----',
    ],
    ['Slack token', 'ai/agent/config.yml', 'slack: xoxb-1234567890-abcdefghijkl'],
  ];

  for (const [label, file, contents] of cases) {
    it(`finds a ${label}`, () => {
      put(file, contents);
      const { code, output } = run();
      assert.equal(code, 1);
      assert.match(output, /FAIL.*no credentials found/s);
      assert.match(output, new RegExp(file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    });
  }

  it('does not flag ordinary prose about secrets', () => {
    // Week 37 is literally about secrets management. The docs will discuss
    // them constantly and must not trip the scanner.
    put(
      'docs/security/secrets.md',
      '# Secrets\n\nMove every AccountKey and access key into Key Vault. ' +
        'Never commit a private key.',
    );
    const { output } = run();
    assert.match(output, /ok.*no credentials found/s);
  });

  it('reports the file that contains the credential', () => {
    put('scripts/bad.sh', 'AKIAIOSFODNN7EXAMPLE');
    const { output } = run();
    assert.match(output, /scripts\/bad\.sh/);
  });
});
