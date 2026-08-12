/**
 * `msp-lab init` — scaffold the lab repo.
 *
 * The layout comes from Thread-Project.md and is the structure every later
 * week's artifact path assumes. Directories get a .gitkeep so git tracks them,
 * and `week check` deliberately ignores .gitkeep so an empty scaffolded folder
 * never passes as completed work.
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import type { Curriculum } from '@pathway/shared';
import { colour, line, mark } from '../lib/output.ts';

const DIRECTORIES = [
  'docs/lab',
  'docs/runbooks',
  'docs/sop',
  'docs/security',
  'docs/design',
  'docs/notes',
  'scripts',
  'app',
  'infra',
  'ai',
  '.github/workflows',
];

function readme(curriculum: Curriculum): string {
  return `# ${curriculum.repo}

The lab repo for a 52-week homelab curriculum, built around ${curriculum.client.name} —
a fictional ${curriculum.client.staff}-person firm across ${curriculum.client.sites} sites.

Every week adds a layer to the same environment. Nothing here is disposable.

## Layout

| Path | Holds |
|---|---|
| \`docs/lab/\` | Hardware, IP plan, DNS records, diagrams |
| \`docs/runbooks/\` | Step-by-step procedures that have actually been tested |
| \`docs/sop/\` | How work gets done |
| \`docs/security/\` | Threat model, access model, scan reports |
| \`docs/design/\` | Architecture and failure modes |
| \`docs/notes/\` | Weekly write-ups, in your own words |
| \`scripts/\` | PowerShell and Bash |
| \`app/\` | The inventory tool, as it evolves |
| \`infra/\` | Terraform, Ansible, GPO exports, Kubernetes manifests |
| \`ai/\` | Prompts, RAG index, agent, MCP server |

\`docs/notes/\` matters more than it looks. It is the corpus the Week 49 RAG
bot answers from — the year feeds itself.

## Rules

1. **The week is not done until something lands here.** No artifact, no completion.
2. **Never delete the lab.** Rebuild it, restore it, migrate it — but the domain
   controller stood up in Week 17 should still be running in Week 52.
3. **Commit weekly, even when it is ugly.** The history is the evidence.
4. **Check dependencies before starting a week.** Run \`msp-lab week check <n>\`.
5. **Write the note before closing the week.**

## Checking your work

\`\`\`bash
msp-lab status        # where you are, what is outstanding
msp-lab week check 17 # verify a week's artifact and its dependencies
msp-lab doctor        # environment and hygiene checks
\`\`\`
`;
}

const GITIGNORE = `# Secrets. Never commit these.
.env
.env.*
!.env.example
*.pem
*.key
*.pfx
*.ovpn
credentials.json
secrets.yml
*.tfvars
!*.tfvars.example

# Terraform state holds secrets in plain text.
.terraform/
*.tfstate
*.tfstate.*
*.tfplan

# Ansible
*.retry
vault-password*

# Dependencies and build output
node_modules/
__pycache__/
*.pyc
.venv/
venv/
dist/
build/

# Editors and OS
.vscode/
.idea/
.DS_Store
Thumbs.db
`;

export interface InitOptions {
  repoRoot: string;
  curriculum: Curriculum;
  /** Report what would happen without writing anything. */
  dryRun?: boolean;
}

export function runInit(options: InitOptions): number {
  const { repoRoot, curriculum, dryRun = false } = options;
  let created = 0;
  let skipped = 0;

  function ensureDir(relative: string): void {
    const full = join(repoRoot, relative);
    if (existsSync(full)) {
      line(`  ${mark.skip()} ${relative}/ ${colour.dim('(exists)')}`);
      skipped += 1;
      return;
    }
    if (!dryRun) {
      mkdirSync(full, { recursive: true });
      // git will not track an empty directory, and the scaffold is worthless
      // if it disappears on clone.
      writeFileSync(join(full, '.gitkeep'), '', 'utf8');
    }
    line(`  ${mark.pass()} ${relative}/`);
    created += 1;
  }

  function ensureFile(relative: string, contents: string): void {
    const full = join(repoRoot, relative);
    if (existsSync(full)) {
      // Never clobber a tech's own README or .gitignore.
      line(`  ${mark.skip()} ${relative} ${colour.dim('(exists, left alone)')}`);
      skipped += 1;
      return;
    }
    if (!dryRun) {
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, contents, 'utf8');
    }
    line(`  ${mark.pass()} ${relative}`);
    created += 1;
  }

  line(colour.bold(`Scaffolding ${curriculum.repo} in ${repoRoot}`));
  if (dryRun) line(colour.dim('  dry run — nothing will be written'));
  line();

  for (const dir of DIRECTORIES) ensureDir(dir);
  ensureFile('README.md', readme(curriculum));
  ensureFile('.gitignore', GITIGNORE);

  line();
  line(`${created} created, ${skipped} left alone.`);
  if (created > 0 && !dryRun) {
    line(colour.dim('Next: git init && git add -A && git commit -m "Scaffold lab repo"'));
  }
  return 0;
}
