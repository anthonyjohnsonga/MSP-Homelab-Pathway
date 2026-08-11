# The Thread Project — Northgate Legal

One fictional client. One repo. One lab. Every week of the curriculum adds a layer to the same thing instead of producing a disposable exercise.

By Week 52 you have a functioning small-business environment you built from bare metal, an internal tool that runs on it, and an AI agent that operates it — plus a public repo that proves all of it.

---

## The client

**Northgate Legal** — 20 staff, two sites (main office + a three-person satellite), one line-of-business application, Windows fleet, Microsoft 365.

Fictional, so you can break it. Realistic enough that every decision maps to a real MSP problem.

| | |
|---|---|
| Staff | 14 main office, 3 satellite, 3 remote |
| Devices | 20 Windows laptops, 1 DC, 1 file/app server, 1 Linux utility server |
| Cloud | Microsoft 365 tenant, a small Azure footprint |
| Domain | Whatever you buy in Week 6 — that domain *is* Northgate |
| Constraint | No IT staff, one owner who signs cheques, low tolerance for downtime |

Name three fake staff early (an owner, a paralegal, a new hire). You'll onboard and offboard them repeatedly.

---

## The lab — hybrid

**Local box (always on).** Domain controller, file server, Linux utility server, hypervisor, later a single-node Kubernetes cluster.

Target spec: 8+ cores, **64 GB RAM** (32 GB is workable but painful once Kubernetes arrives), 1 TB NVMe. A refurbished small-form-factor workstation or a mini PC does this for a few hundred dollars — much cheaper than running the same thing in the cloud for twelve months.

**Cloud (spin up, tear down).** Weeks 28–30, 36–39, and 42–43. Everything cloud-side is defined in Terraform from Week 36 on, so `destroy` is cheap and `apply` gets it back.

**Cost guardrails, set in Week 28 and never removed:**

- A budget alert on every subscription/account before you deploy anything
- Tear down after each cloud lab — the Terraform is the durable artifact, not the running resources
- No public IPs unless the lab is about public IPs
- Free-tier first, and check egress pricing before moving data

---

## The repo

One repo, `msp-lab`, created in Week 8. It's the deliverable.

```
msp-lab/
├── README.md              # what this is, how to run it, current state
├── docs/
│   ├── lab/               # hardware, IP plan, DNS records, diagrams
│   ├── runbooks/          # step-by-step, tested procedures
│   ├── sop/               # how work gets done
│   ├── security/          # threat model, access model, scan reports
│   ├── design/            # architecture and failure modes
│   └── notes/             # weekly learning notes, in your own words
├── scripts/               # PowerShell and Bash
├── app/                   # the inventory tool, as it evolves
├── infra/                 # terraform, ansible, gpo exports, k8s manifests
├── ai/                    # prompts, RAG index, agent, MCP server
└── .github/workflows/     # CI from Week 38
```

`docs/notes/` matters more than it looks. It's your weekly write-up, and in Week 49 it becomes the corpus your RAG bot answers from. The year literally feeds itself.

---

## The two strands

**Strand A — the environment.** Hardware → OS → domain → policy → cloud → automation → monitoring → recovery. Each week hardens or extends Northgate's infrastructure. Nothing gets deleted.

**Strand B — the tool.** One application, rewritten as your ability grows: an asset inventory that becomes a service, then a monitored service, then something an agent can query.

```
Week 10  PowerShell script → CSV
Week 16  Python rewrite → JSON
Week 33  Reads a live API
Week 35  Writes to SQL — now it has history
Week 31  Containerized
Week 32  Compose stack with its database
Week 38  CI pipeline on every PR
Week 39  Running on Kubernetes with TLS
Week 41  Two replicas behind a load balancer
Week 42  Emitting metrics and alerts
Week 49  Its docs answerable by RAG
Week 51  An agent that uses it
Week 52  Exposed to that agent over MCP
```

The strands meet in Week 46 (you design the whole thing on one page) and Week 52 (an agent operates the environment you built).

---

## Rules

1. **The week isn't done until something lands in the repo.** A script, a config, a runbook, a diagram, a screenshot in `docs/`. No artifact, no completion — this replaces "I read about it."
2. **Never delete the lab.** Rebuild it, restore it, migrate it, but the DC you stand up in Week 17 should still be running in Week 52. That's what makes Week 44's restore test real.
3. **Commit weekly, even when it's ugly.** The commit history is the evidence you did the year.
4. **Check dependencies before you start a week.** Some weeks need an earlier artifact to exist (the table below flags them). If you skipped it, do that first — the topics are ordered for a reason.
5. **Write the note before you close the week.** One page, your own words, in `docs/notes/`. Future-you and the Week 49 RAG bot both need it.

---

## Week-by-week contributions

| Week | Topic | Thread contribution (the artifact) | Depends on |
|---|---|---|---|
| 1 | Computer Hardware Fundamentals | Spec and acquire the lab box; `docs/lab/hardware.md` with boot order and firmware settings | — |
| 2 | Operating System Fundamentals | `docs/notes/os-service-trace.md` — one service traced from process to log on the lab box | 1 |
| 3 | Windows 11 / Windows Administration | First client VM `NG-WS01`; `docs/runbooks/windows-network-reset.md` | 1 |
| 4 | Linux Fundamentals | `NG-SRV01` Linux VM, SSH key-only; `docs/runbooks/linux-baseline.md` | 1 |
| 5 | Network Fundamentals | `docs/lab/ip-plan.md` — mgmt, servers, clients, guest subnets for both sites | — |
| 6 | DNS | Buy the domain; Cloudflare zone live; `docs/lab/dns-records.md` | 5 |
| 7 | HTTP / HTTPS | First TLS-served page on the lab domain; `docs/notes/request-lifecycle.md` | 6 |
| 8 | Git and GitHub | **Create `msp-lab`** — README, .gitignore, everything above committed | — |
| 9 | Command Line Basics | `docs/notes/gui-free-day.md` and a CLI cheat sheet | 8 |
| 10 | PowerShell | **`scripts/inventory/Get-Inventory.ps1`** → CSV. Strand B begins | 8 |
| 11 | Bash | `scripts/backup/lab-backup.sh` on cron on NG-SRV01, with its own log | 4, 8 |
| 12 | Markdown and Technical Documentation | Full `docs/` structure, SOP template, README rewritten | 8 |
| 13 | Ticketing Systems and ITIL Basics | A helpdesk instance for Northgate; `docs/sop/ticket-flow.md` and 5 seeded tickets | 12 |
| 14 | Remote Support Solutions | Jump host + RDP gateway; `docs/runbooks/remote-access.md` | 4, 5 |
| 15 | Virtualization | The permanent hypervisor chosen and rebuilt; VM templates; `docs/lab/hypervisor-comparison.md` | 1 |
| 16 | Basic Scripting with Python | **`app/inventory/` v1** — Python rewrite emitting JSON | 10 |
| 17 | Active Directory | **`NG-DC01`** and the domain; NG-WS01 joined; helpdesk delegation | 15 |
| 18 | Group Policy | Baseline GPO set exported to `infra/gpo/` | 17 |
| 19 | Microsoft Entra ID | M365 dev tenant on your real domain; dynamic group; MFA via Conditional Access | 6, 17 |
| 20 | Microsoft 365 | Onboard and offboard your three fake staff; both runbooks written | 19 |
| 21 | IAM Concepts | `docs/security/access-model.md` — roles, tiers, least-privilege plan | 19, 20 |
| 22 | Authentication Protocols | Federate a test app; `docs/notes/auth-traces.md` with a decoded SAML assertion and ID token | 19 |
| 23 | Security Fundamentals | `docs/security/threat-model.md` for Northgate — assets, threats, controls, top 3 gaps | 21 |
| 24 | Endpoint Security | Defender onboarded across the fleet; one tuned exclusion documented | 20, 23 |
| 25 | Vulnerability Management | `docs/security/vuln-report-01.md` — prioritized by EPSS, not just CVSS | 24 |
| 26 | SIEM Basics | Sign-in logs ingested; KQL rule committed to `infra/siem/` | 19 |
| 27 | Cloud Fundamentals | `docs/cloud/pricing-comparison.md` — same workload, Azure vs AWS | — |
| 28 | Azure Fundamentals | **Northgate's Azure footprint** — RG, VM, NSG, RBAC, and the budget alert | 27 |
| 29 | AWS Fundamentals | EC2 in a private subnet + S3, reached via bastion; comparison notes | 27 |
| 30 | Cloud Networking | Hub-and-spoke where the app tier has no inbound path | 28 |
| 31 | Docker | **`app/inventory/Dockerfile`** — the tool, containerized | 16 |
| 32 | Docker Compose | **`docker-compose.yml`** — app + database + reverse proxy | 31 |
| 33 | APIs | Inventory tool reads the helpdesk/RMM API; Postman collection in repo | 13, 16 |
| 34 | JSON and YAML | App config schema + linting; every config in the repo validates | 32 |
| 35 | SQL | **Database schema and history** in `app/db/` — the tool stops overwriting itself | 32 |
| 36 | Infrastructure as Code | **`infra/terraform/`** rebuilds the entire cloud footprint from scratch | 28, 30 |
| 37 | Secrets Management | Every secret moved to a vault; git history scanned and cleaned | 36 |
| 38 | CI/CD | **`.github/workflows/ci.yml`** — lint and test on PR, deploy on merge | 8, 37 |
| 39 | Kubernetes Basics | Compose stack deployed to k3s/AKS with Ingress and working TLS | 32, 38 |
| 40 | Web Servers | Same app behind nginx, Caddy, and Apache; chosen config committed | 39 |
| 41 | Load Balancers and Reverse Proxies | Two replicas, health checks, one killed mid-request with no user impact | 40 |
| 42 | Monitoring | One actionable dashboard + three alerts in `infra/monitoring/` | 41 |
| 43 | Logging | Windows, Linux, and app logs centralized; an incident timeline rebuilt from them | 42 |
| 44 | Backups and Disaster Recovery | **Restore NG-DC01 for real.** Measured RTO in `docs/runbooks/dr-northgate.md` | 17, 43 |
| 45 | Ansible | `infra/ansible/` builds `NG-SRV02` from bare OS; run twice, zero changes | 4, 36 |
| 46 | Basic System Design | `docs/design/northgate-architecture.md` — diagram, data flow, failure modes | 43, 44 |
| 47 | LLM Fundamentals | `docs/ai/model-eval.md` (hosted vs local, token cost) and the AI usage policy | — |
| 48 | Prompt Engineering | `ai/prompts/` — tested prompts with eval cases, not one-offs | 47 |
| 49 | RAG | **`ai/rag/` indexed over `docs/`** — your own year, queryable. Ten test questions logged | 12, 48 |
| 50 | Vector Databases and Embeddings | Semantic vs keyword benchmark; hybrid search added to the RAG index | 49 |
| 51 | AI Agents | `ai/agent/` triages the Week 13 ticket queue with approval gates | 13, 50 |
| 52 | MCP and Agent Tool Integrations | **MCP server exposing the inventory DB and docs** — scoped permissions, full audit log | 35, 51 |

---

## Where the buffer weeks go

If you add the consolidation weeks from the earlier critique, put them after Weeks 11, 21, 33, and 44 — each one lands right after a strand milestone, and each has an obvious cold-start exercise:

| After week | Consolidation exercise |
|---|---|
| 11 | Rebuild NG-SRV01 from scratch using only your own runbooks |
| 21 | Offboard and re-onboard a staff member across AD, Entra, and M365 with no notes |
| 33 | Break the Compose stack three ways and fix it from logs alone |
| 44 | Full DR: restore the environment from backup and time every step |

Adding four weeks makes this a 56-week plan. It's worth it — but it's your call, and the tracker dates assume 52.
