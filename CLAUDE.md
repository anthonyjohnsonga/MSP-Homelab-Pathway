# CLAUDE.md — MSP-Homelab-Pathway

Build brief for Claude Code. Read this first, then `data/curriculum.json`.

> **This supersedes the original brief** in the parent folder, which described a
> single-user, local-first, no-auth tracker with state in a repo file. The project
> was re-scoped on 2026-08-10 into a hosted multi-user platform on Azure. Where the
> two disagree, this file wins.

---

## What this is

A 52-week curriculum platform MSPs give their technicians. Completing it produces a functioning homelab, not a pile of finished tutorials.

Two things are built at once:

1. **The lab** — a fictional 20-person client, *Northgate Legal*, stood up week by week: hardware, hypervisor, domain controller, M365 tenant, cloud footprint, Kubernetes, monitoring, backups.
2. **The tool** — one application (`app/inventory` in the tech's own repo) rewritten each phase as skills allow: PowerShell → Python → API client → SQL-backed → containerized → CI/CD → Kubernetes → RAG → AI agent.

Free-tier-first throughout. Every week leads with the best free option, then trials, then paid — and paid appears only where free genuinely can't do the job.

---

## Non-negotiables

**Authorship.** Every commit is authored by `anthonyjohnsonga` alone. No `Co-Authored-By` trailers, no additional contributors, ever. Pull requests are not accepted.

**Code in GitHub, data in Azure.** The repo contains code and curriculum content and nothing else. No user data, no notes, no progress, no secrets — not in fixtures, not in tests, not in examples. Azure is updated by pushing to `main`; GitHub Actions builds and deploys.

**No secrets, anywhere.** Connection strings, deployment tokens, and OAuth secrets live in Azure app settings and GitHub Actions secrets. This repo teaches Secrets Management in Week 37; it has to model what it teaches.

**Cost stays near zero.** Static Web Apps Free tier, its managed Functions, and Table Storage. Before adding any Azure resource, confirm it is free-tier eligible or costs cents. Do not spend the subscription's single Cosmos DB free-tier slot on this.

**Don't hardcode 52.** Four consolidation weeks may be added after Weeks 11, 21, 33, and 44, making a 56-week variant. Derive counts from the data.

**The week list is fixed input.** The curriculum was written and revised deliberately by the author. Do not improve, reorder, or replace topics.

---

## Data model

`data/curriculum.json`, `schemaVersion` 2:

```jsonc
{
  "schemaVersion": 2,
  "title": "...",
  "client": { "name": "Northgate Legal", "staff": 20, "sites": 2, "description": "..." },
  "lab":    { "model": "hybrid", "localHost": "...", "cloud": "...", "targetSpec": "..." },
  "repo": "msp-lab",
  "startDate": "2026-08-10",
  "endDate":   "2027-08-08",
  "phases": ["Phase 1 — Foundations and Tooling (Weeks 1–11)", "..."],
  "weeks": [
    {
      "week": 16,
      "topic": "Basic Scripting with Python",
      "phase": "Phase 2 — Working Like a Tech (Weeks 12–17)",
      "concepts": ["Automation (scripts, virtual environments, pip)"],
      "lab": "Script that pulls data from an API...",
      "startDate": "2026-11-23",
      "endDate":   "2026-11-29",
      "artifact": "`app/inventory/` v1 — Python rewrite emitting JSON",
      "dependsOn": [10],
      "tooling": {
        "standsUp":     "Inventory tool v2",
        "freeOption":   "Python 3, VS Code",
        "trial":        null,
        "paidFallback": "—"
      }
    }
  ]
}
```

Per-user `status`, `hours`, and `notes` are **not** in this file. They live in Table Storage, keyed by user. The JSON is immutable content shipped with the build.

### Invariants — validated in CI, fail loudly

- Week numbers contiguous from 1, no gaps
- Every `dependsOn` refers to a **strictly earlier** week
- Dates are consecutive Monday–Sunday blocks from `startDate`
- Every `phase` resolves to a declared phase
- `status` values (in storage) are `not_started` · `in_progress` · `complete` · `skipped`

---

## Stack

TypeScript throughout. React + Vite frontend, Azure Functions API, Azure Table Storage, Static Web Apps built-in auth (GitHub + Microsoft), `node:test` for tests.

Keep the dependency count low and the code readable by a sysadmin — the target user's programming background starts at Week 10 of this very curriculum. Prefer clear code over clever code, and comment intent rather than mechanics.

---

## Storage model

Table Storage, partitioned so MSP-manager rollups can be added later without migration:

| Table | PartitionKey | RowKey | Holds |
|---|---|---|---|
| `Progress` | `{orgId}:{userId}` | `week-{n}` | status, hours, completedAt |
| `Notes` | `{orgId}:{userId}` | `week-{n}` | Markdown note, updatedAt |
| `Artifacts` | `{orgId}:{userId}` | `week-{n}` | verified/attested, path, commit SHA, checkedAt |
| `Users` | `{orgId}` | `{userId}` | display name, linked repo, joinedAt |

In v1 every tech is their own org — `orgId` equals their user id. The field exists from day one so a v2 manager view is additive.

---

## Artifact verification

The core mechanic. A week is not complete until its artifact exists.

1. **Verified** (green) — the GitHub API confirms the expected file or directory is really in the tech's `msp-lab` repo. Record the commit SHA it was seen at.
2. **Attested** (amber) — the tech self-reported. The fallback for someone who hasn't linked a repo at all. Always labelled unverified. **Never rendered green.**

Both public and private repos can reach *verified*:

| Repo | How it verifies | What it needs |
|---|---|---|
| Public | Server-side read of the contents API | A server-side token for rate limit headroom. No user token, no OAuth scope. |
| Private | A **GitHub App** the tech installs on their `msp-lab` | App registration, install flow, short-lived installation tokens |

Private-repo support is deliberate: MSP employers frequently forbid public repos, and a tech who can't go public shouldn't be stuck at amber forever.

**The GitHub App private key is a secret and gets treated like one.** It lives in Azure app settings or Key Vault, never in this repo, never in an environment file that could be committed. Installation access tokens are short-lived — mint them per request, never persist them. Scope the App to repository contents, read-only, and nothing else.

Dependency warnings use the same data: opening Week 39 when Week 32 is incomplete must say so prominently.

---

## Order of work

1. Scaffold, README, this file ✅
2. Shared curriculum layer: types, loader, week/phase helpers
3. Invariant validation + tests, wired into CI
4. `schemaVersion` 2 — add `tooling.trial` (duration, eligibility, link)
5. Read-only web app: phase list, week detail, current week, ahead/behind
6. Auth + persistence: status, hours, notes
7. Dependency warnings + artifact verification
8. Tooling access view and year cost view
9. Bicep infra + GitHub Actions deploy
10. `msp-lab` CLI — `init`, `week start`, `week check`, `status`, `doctor`

---

## Definition of done

- The platform loads every week, shows the correct current week for today, and persists a status change across sign-out
- Opening a week with incomplete dependencies warns prominently
- Artifact verification distinguishes *verified* from *attested* and never conflates them
- `msp-lab week check 39` exits non-zero when Week 32's artifact is missing
- A 56-week curriculum validates without code changes
- No secrets, no user data, and no paid dependencies in the repo
- Local development needs no network and no Azure account
