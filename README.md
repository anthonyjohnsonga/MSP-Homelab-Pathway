# MSP-Homelab-Pathway

A 52-week curriculum platform that takes an MSP technician from computer hardware to AI agents — and produces a working homelab along the way, not a pile of finished tutorials.

Techs sign in, work one topic per week, and log what they built. The platform's core rule is that **a week is not complete until its artifact exists** — a script, a config, a runbook, a diagram committed to the tech's own lab repo. The platform checks. It doesn't take your word for it.

Every week presents the **best free option first**, then where to get a trial, then what a paid alternative costs. A tech with a spare PC and no budget can complete the entire year.

---

## The two strands

The curriculum builds one fictional client, **Northgate Legal** — a 20-person law firm with two sites, a Windows fleet, and no IT staff. Every week adds a layer to the same environment instead of producing a disposable exercise.

**Strand A — the environment.** Hardware → OS → domain → policy → cloud → automation → monitoring → recovery. Nothing gets deleted; the domain controller stood up in Week 17 is the one restored for real in Week 44.

**Strand B — the tool.** One inventory application, rewritten as ability grows:

| Week | The tool becomes |
|---|---|
| 10 | A PowerShell script emitting CSV |
| 16 | A Python rewrite emitting JSON |
| 33 | A client reading a live API |
| 35 | SQL-backed, so it has history |
| 31–32 | Containerized, then a Compose stack |
| 38–39 | CI on every PR, then running on Kubernetes with TLS |
| 42 | Emitting metrics and alerts |
| 49–52 | Answerable by RAG, then operated by an agent over MCP |

---

## Stack, and why

The brief called for something a sysadmin can read and extend — not a developer-only codebase — with a low dependency count, free hosting, and cost minimized throughout.

| Layer | Choice | Why |
|---|---|---|
| Language | **TypeScript** everywhere | One language across web, API, and CLI. Best-supported runtime for Static Web Apps' managed Functions. |
| Frontend | **React + Vite** | Static output, no server to run or pay for. Vite's dev server is one command. |
| API | **Azure Functions**, managed by the Static Web App | Included in the free tier. No separate resource, no separate deploy, scales to zero. |
| Data | **Azure Table Storage** | Progress and notes are a pure key-value workload: partition by user, one row per week. Costs pennies. |
| Auth | **Static Web Apps built-in** (GitHub + Microsoft) | Zero auth code and zero cost. GitHub sign-in doubles as the identity used to verify artifacts. |
| Tests | **`node:test`** | Built into Node. No test framework dependency at all. |

**Why Table Storage over Cosmos DB.** Cosmos DB's free tier is also $0, but there is only **one per Azure subscription**. Spending it on a low-volume progress tracker wastes it. Table Storage handles this access pattern for cents per month and leaves the Cosmos free tier available for something that needs it.

---

## Architecture

Code lives in GitHub. Everything a user types lives in Azure. The two never mix.

```
  you push to main
         │
         ▼
  GitHub Actions ─── builds React frontend + TypeScript Functions
         │
         ▼
  Azure Static Web App  (Free tier)
         ├── static frontend + curriculum.json
         └── /api  →  Azure Functions
                         │
                         ▼
                  Azure Table Storage
                  progress · hours · notes
```

| In this repo (public) | In Azure (private) |
|---|---|
| Frontend, API, CLI, tests | User accounts and identities |
| `data/curriculum.json` — the 52 weeks | Each tech's status, hours, notes |
| Docs, Bicep infra templates | Artifact verification results |
| CI workflow | Connection strings and OAuth secrets |

The curriculum is content and ships with the code, so any MSP can read, fork, or adapt it. User data never touches the repo.

### Running cost

| Component | Tier | Monthly |
|---|---|---|
| Static Web Apps | Free — 100 GB bandwidth, managed Functions, free SSL, custom domain | $0 |
| Table Storage | Pay-as-you-go, low volume | ~$0.05–0.50 |
| **Total** | | **under $1** |

---

## Repo layout

```
MSP-Homelab-Pathway/
├── data/curriculum.json      # source of truth: every week, dependency, artifact, tool
├── shared/                   # types, loader, invariant validation — used by all three
├── web/                      # React + Vite frontend
├── api/                      # Azure Functions
├── cli/                      # msp-lab — scaffolds and verifies a tech's lab repo
├── infra/                    # Bicep: Static Web App + Table Storage
├── docs/curriculum-source/   # the Markdown curriculum.json is generated from
└── .github/workflows/        # build, validate, deploy
```

---

## Running it

```bash
npm install
npm run validate     # check curriculum.json invariants — fails loudly if broken
npm test             # run the test suite
npm run dev          # frontend at http://localhost:5173
```

No network and no Azure account required for local development. The frontend reads `data/curriculum.json` directly; sign-in and saved notes are the only features that need the cloud.

---

## The `msp-lab` CLI

The second deliverable. It scaffolds a technician's lab repo and enforces the artifact rule mechanically, so "no artifact, no completion" survives contact with a bad week.

```bash
msp-lab init             # scaffold docs/, scripts/, app/, infra/, ai/, README, .gitignore
msp-lab week start 17    # concepts, lab, artifact, and a note stub
msp-lab week check 17    # verify the artifact and every dependency
msp-lab week attest 24   # claim a week that names no file
msp-lab status           # where you are, what is outstanding, what is blocking
msp-lab doctor           # git hygiene and a scan for committed credentials
```

**It never touches the network.** It has to run as a pre-commit hook, in CI, and inside a lab VM with no route out — so it reads the local filesystem and local git only.

Exit codes are the contract, which is what makes it usable in a hook:

| Code | Meaning |
|---|---|
| `0` | Everything checked passed |
| `1` | A check failed — missing artifact, unfinished dependency, secret found |
| `2` | Bad usage — unknown command, week number out of range |

```bash
# .git/hooks/pre-commit
msp-lab doctor || exit 1
```

Three rules keep it honest:

- **An empty file or directory does not count.** `init` leaves `.gitkeep` files and `week check` ignores them, so scaffolding can never pass as completed work.
- **Completion is derived from artifacts existing**, not from a status someone set. There is no way to mark a week done that doesn't involve the work being there.
- **The 16 weeks that name no file** are attested with `week attest`, recorded in `.msp-lab/attested.json` inside the repo so the claim is part of the history and reviewable like anything else.

---

## The curriculum data

`data/curriculum.json` is the source of truth, and the Markdown it came from lives in `docs/curriculum-source/`.

> **Planned:** `npm run generate:curriculum` will rebuild the JSON from `docs/curriculum-source/` so the Markdown stays authoritative. **Not yet implemented.** Until it lands, edit `data/curriculum.json` directly and run `npm run validate` — and mirror the change back into the source Markdown so the two don't drift.

Invariants enforced by `npm run validate`, in CI on every push:

- Week numbers are contiguous from 1, with no gaps
- Every `dependsOn` entry refers to a **strictly earlier** week
- Dates are consecutive Monday–Sunday blocks from `startDate`
- `status` is one of `not_started` · `in_progress` · `complete` · `skipped`
- Every week's `phase` resolves to a declared phase

The week count is **not** hardcoded. A 56-week variant — adding consolidation weeks after 11, 21, 33, and 44 — validates without code changes.

---

## Contributing

This repo has a single author and maintainer, [@anthonyjohnsonga](https://github.com/anthonyjohnsonga). Issues and discussion are welcome; pull requests are not accepted.

The curriculum's week list is fixed input, written and revised deliberately. Suggestions to reorder or replace topics belong in an issue, not a PR.

## License

MIT — see [LICENSE](LICENSE).
