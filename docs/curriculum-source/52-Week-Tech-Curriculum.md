# 52 Weeks, 52 Technologies — Sysadmin / MSP Track

One technology per week, built ground-up — hardware to AI agents. Every week is your own outline, expanded with the concepts that matter and one lab.

**How to use it:** read/watch for the first half of the week, then do the lab. If you can't explain the topic to a client in two sentences by Friday, repeat it next week.

---

## Phase 1 — Foundations and Tooling (Weeks 1–11)

### Week 1: Computer Hardware Fundamentals
- What is a CPU (cores, threads, clock, cache)
- Storage (HDD vs SSD vs NVMe, interfaces, IOPS)
- RAM (capacity, speed, ECC, paging)
- UEFI (vs legacy BIOS, Secure Boot, TPM)
- Boot sequences (POST → firmware → bootloader → kernel)

**Lab:** Open a machine's UEFI, document its boot order, then boot a live USB.

### Week 2: Operating System Fundamentals
- Processes (PIDs, parent/child, memory space)
- Systems (kernel vs userland, system calls, scheduling)
- Services (daemons, startup types, dependencies)
- Logs (where they live, log levels, rotation)

**Lab:** Trace one running service end-to-end: its process, its config, its log output.

### Week 3: Windows 11 / Windows Administration
- Users (local vs domain vs Entra, profiles, UAC)
- Groups (local groups, built-in roles, nesting)
- Permissions (NTFS, share, effective access, ownership)
- Event Viewer (channels, event IDs worth knowing, custom views)
- Services (startup types, dependencies, recovery actions)
- Device Manager (drivers, hidden devices, rollback)
- Basic Windows troubleshooting (safe mode, sfc/DISM, msconfig, Task Manager, Reliability Monitor)
- ncpa.cpl and network reset (adapter properties, IP config, winsock/TCP-IP reset)

**Lab:** Break networking on a test VM three ways (bad static IP, disabled adapter, corrupt winsock) and fix each from a command line only.

### Week 4: Linux Fundamentals
- Files (filesystem hierarchy, navigation, viewing/editing, redirection)
- Permissions (rwx, owner/group/other, chmod, chown, sudo)
- Packages (apt/dnf, repos, installing, updating, removing)
- SSH (keys vs passwords, config, copying files with scp)

**Lab:** Stand up a Linux VM, lock down SSH to key-only auth, install a package, and fix a permissions problem you create on purpose.

### Week 5: Network Fundamentals
- IP addressing (IPv4 structure, public vs private, static vs DHCP)
- Subnets (CIDR, masks, host counts, broadcast)
- Gateways (default gateway, routing off-subnet, common misconfigs)
- Ports (well-known ports, listening vs established)
- TCP/IP (the stack, TCP vs UDP, handshake, encapsulation)

**Lab:** Subnet a /24 into six usable networks by hand, then prove it works in a lab topology.

### Week 6: DNS
- Private DNS
- Public DNS
- DNS records (A, AAAA, CNAME, MX, TXT, SRV, PTR)
- Get a Cloudflare account — buy a domain
- How DNS resolution works (recursive vs iterative, root → TLD → authoritative)
- What caching is (TTLs, resolver cache, client cache, flushing)
- Internal vs public DNS (split-brain, conditional forwarders)
- Troubleshooting DNS (nslookup, dig, Resolve-DnsName)

**Lab:** Point your new domain's records at something real, then break DNS three different ways and diagnose each.

### Week 7: HTTP / HTTPS
- Requests (methods, headers, body)
- Response (headers, body, content types)
- Status codes (2xx, 3xx, 4xx, 5xx and the ones you'll actually see)
- TLS and headers (handshake, certificates, HSTS, security headers)
- What happens when you open a website (DNS → TCP → TLS → HTTP → render)

**Lab:** Load a site with dev tools open and narrate every step; then inspect its certificate chain.

### Week 8: Git and GitHub
- Version control (why, and what problem it solves)
- Repos (init, clone, remotes, .gitignore)
- Commits (staging, messages, history, revert)
- Branches (creating, switching, merging, conflicts)
- Pull requests (review, comments, merge strategies)

**Lab:** Put every script you own into a GitHub repo with a README, a .gitignore, and no hardcoded secrets.

### Week 9: Command Line Basics
- CMD (legacy commands, ipconfig, sfc, net use)
- PowerShell (the console, cmdlet naming, help system)
- Terminal navigation (paths, listing, copying, moving, deleting)
- Pipes (chaining commands)
- Redirects (output to file, append, error streams)

**Lab:** Complete one full workday's routine tasks without touching a GUI.

### Week 10: PowerShell
- Windows automation (cmdlets, the object pipeline, filtering)
- User/account tasks (create, disable, reset, bulk changes)
- System info (hardware, disks, services, installed software)
- Basic scripts (variables, loops, conditionals, saving and running .ps1)

**Lab:** Write a script that reports on stale accounts and disables them on approval.

### Week 11: Bash
- Linux/macOS automation (shebangs, running scripts, exit codes)
- File operations (find, copy, move, archive, permissions at scale)
- Grep and find patterns (regex basics, searching logs)
- Cron basics (syntax, scheduling, logging, common failures)

**Lab:** Write a cron-scheduled backup-and-prune script and prove it ran from its own log.

---

## Phase 2 — Working Like a Tech (Weeks 12–17)

### Week 12: Markdown and Technical Documentation
- READMEs (structure, what belongs in one)
- Markdown (headings, lists, tables, code blocks, links, images)
- Runbooks (step-by-step, assumptions, rollback steps)
- SOPs (scope, roles, triggers, review cadence)

**Lab:** Write a README for your Week 8 repo and a runbook for a task you do from memory today.

### Week 13: Ticketing Systems and ITIL Basics
- Incidents (something is broken)
- Requests (something is needed)
- SLAs (response vs resolution, priority matrix)
- Escalation (tiers, when and how, warm handoffs)
- Documentation (ticket notes that a stranger can act on)
- How IT work generally flows (intake → triage → work → resolve → review)

**Lab:** Rewrite five of your worst-documented closed tickets so a tech with no context could follow them.

### Week 14: Remote Support Solutions
- RDP (ports, gateways, session hosts, restrictions)
- SSH (tunneling, jump hosts, key management)
- Screensharing (attended vs unattended, consent, session recording)
- VPN basics (client VPN, split vs full tunnel)
- Safe remote troubleshooting (least privilege, change notes, avoiding lockouts)

**Lab:** Support a machine end-to-end remotely without a screenshare — RDP and SSH only.

### Week 15: Virtualization
- VMware, VirtualBox, Hyper-V — do a lab in all three
- Snapshots (and their dangers)
- Virtual networks (NAT, bridged, host-only, internal)
- Lab environments (nested virtualization, resource planning, templates)

**Lab:** Build the same two-VM isolated network in all three hypervisors and note what each does better.

### Week 16: Basic Scripting with Python
- Automation (scripts, virtual environments, pip)
- Parse files (CSV, JSON, logs, regex)
- Call APIs (requests, auth headers, handling JSON responses)
- Basics along the way (variables, loops, functions, error handling)

**Lab:** Script that pulls data from an API, parses it, and writes a CSV report — committed to your repo.

### Week 17: Active Directory
- Domains (structure, DCs, AD-integrated DNS)
- Domain joining (requirements, process, troubleshooting)
- Users (accounts, attributes, lifecycle)
- Groups (security vs distribution, scopes, nesting)
- Permissions (delegation, AGDLP, effective rights)
- Remote access (RSAT, remote management of DCs)

**Lab:** Build a lab domain, join a client, delegate password resets to a helpdesk group, and prove the delegation works.

---

## Phase 3 — Enterprise Identity and Cloud (Weeks 18–21)

### Week 18: Group Policy
- How enterprise environments actually work (domain-joined fleets, standardization, drift)
- How we enforce policy centrally (GPO structure, computer vs user)
- Link order, inheritance, enforcement, blocking
- Security filtering and loopback processing
- gpresult / RSoP troubleshooting

**Lab:** Deploy a drive map, a security baseline, and a software restriction via GPO; prove precedence.

### Week 19: Microsoft Entra ID
- Cloud identity (tenants, cloud-only vs hybrid, Entra Connect)
- Users (accounts, attributes, lifecycle, guests)
- Groups (assigned vs dynamic, group-based licensing)
- MFA (methods, registration, phishing-resistant options)
- Conditional Access (signals, policies, report-only mode)

**Lab:** Build a dynamic group, enforce MFA through Conditional Access in report-only, review impact, then turn it on.

### Week 20: Microsoft 365
- Exchange (mailboxes, permissions, basic mail flow)
- Teams (teams vs channels, policies, guest access)
- Licenses (SKUs, assignment, group-based licensing)
- Users (provisioning, offboarding, shared mailbox conversion)
- Security basics (Secure Score, admin roles, service health)

**Lab:** Run a full onboard and a full offboard in a test tenant and document both as runbooks.

### Week 21: IAM Concepts
- Identity (authentication vs authorization, identity sources)
- Roles (RBAC, role assignment, scope)
- Permissions (inheritance, effective permissions, permission creep)
- Least privilege (JIT access, admin tiering, separation of duties)

**Lab:** Audit admin rights across one environment and produce a least-privilege remediation plan.

---

## Phase 4 — Security, Cloud, and Modern Tooling (Weeks 22–33)

### Week 22: Authentication Protocols
- MFA (factors, methods, phishing-resistant options, MFA fatigue attacks)
- OAuth 2.0 (flows, tokens, scopes, consent)
- SAML (assertions, IdP vs SP, federation)
- OIDC (ID tokens, how it builds on OAuth)
- Where each is used, and Kerberos/NTLM/LDAP on the on-prem side

**Lab:** Federate a test app with Entra ID, then decode the SAML assertion and the OIDC ID token.

### Week 23: Security Fundamentals
- CIA triad (confidentiality, integrity, availability)
- Threats (actors, vectors, phishing, ransomware, insider)
- Risk (likelihood × impact, accept/mitigate/transfer/avoid)
- Hardening (baselines, attack surface reduction, secure defaults)
- Patching (why it's the highest-value control)
- Least privilege (admin separation, standing vs just-in-time)

**Lab:** Threat-model one client environment on one page: assets, threats, existing controls, top three gaps.

### Week 24: Endpoint Security
- Microsoft Defender (AV, cloud protection, tamper protection)
- EDR basics (telemetry, detections, response actions)
- Alerts (triage, severity, false positives, tuning)
- Device posture (compliance, encryption, firewall, ASR rules)
- Common endpoint problems (persistence, unwanted software, exclusion abuse)

**Lab:** Trigger a benign detection, triage it end-to-end, and write the tuning exclusion correctly.

### Week 25: Vulnerability Management
- Scanning (authenticated vs unauthenticated, agent vs network)
- CVEs (structure, sources, vendor advisories)
- Severity (CVSS base vs environmental)
- Patch priority (EPSS, exploited-in-the-wild, KEV catalog)
- Remediation tracking (SLAs, exceptions, reporting)

**Lab:** Scan a lab network and produce a prioritized one-page remediation report using EPSS, not just CVSS.

### Week 26: SIEM Basics
- Logging (sources, collection, retention, normalization)
- Alerting (rules, thresholds, alert fatigue)
- Correlation (linking events across sources)
- Investigations (timeline building, pivoting, evidence)
- Microsoft Sentinel and KQL basics

**Lab:** Ingest sign-in logs and write a KQL rule for impossible-travel, then investigate a hit end-to-end.

### Week 27: Cloud Fundamentals
- Regions (geography, latency, data residency)
- Availability (zones, SLAs, redundancy models)
- Shared responsibility (what the provider secures vs what you secure)
- Pricing (consumption, reserved, egress, the surprise line items)
- Core services (compute, storage, network, identity)

**Lab:** Price the same small workload in Azure and AWS and explain the difference in one page.

### Week 28: Azure Fundamentals
- Resource groups (scope, tagging, lifecycle)
- VMs (sizing, disks, availability options)
- Networking (VNets, subnets, NSGs, public IPs)
- Identity (Entra ID, RBAC, managed identities)
- Cost management and budgets

**Lab:** Deploy a VM into a scoped resource group with RBAC, NSG rules, and a budget alert.

### Week 29: AWS Fundamentals
- EC2 (instances, AMIs, key pairs, security groups)
- S3 (buckets, storage classes, public access blocks)
- IAM (users, roles, policies, least privilege)
- VPC basics (subnets, internet/NAT gateways, route tables)
- VPN basics (site-to-site to a VPC)

**Lab:** Launch an EC2 instance in a private subnet, reach it via a bastion, and store output in S3 with public access blocked.

### Week 30: Cloud Networking
- VNets and VPCs
- Subnets (public vs private, sizing, segmentation)
- NSGs and security groups (stateful rules, ordering, defaults)
- Routing (route tables, gateways, peering, hub-and-spoke)
- Private vs public access (private endpoints, service endpoints, no-public-IP designs)

**Lab:** Build a hub-and-spoke network where the app tier has zero inbound internet path and still reaches updates.

### Week 31: Docker
- Containers (vs VMs, lifecycle, when they're the wrong answer)
- Images (Dockerfiles, layers, tags, registries)
- Volumes (persistence, bind mounts)
- Ports (publishing, networking modes)
- Registries and image hygiene (tags, size, base images)

**Lab:** Containerize your Week 16 Python tool with a volume and a published port, and run it from a single `docker run`.

---

### Week 32: Docker Compose
- Run multi-service apps locally (services, dependencies, startup order)
- Compose file structure (services, networks, volumes, env files)
- Networking between containers (service names as DNS)
- Persistent data and bind mounts across a stack
- Rebuilds, logs, and teardown (`up`, `down`, `logs`, `ps`)

**Lab:** Stand up a three-service stack (app + database + reverse proxy) from one Compose file, then destroy and rebuild it with data intact.

### Week 33: APIs
- REST (resources, statelessness, JSON)
- Endpoints (paths, query parameters, versioning)
- Methods (GET, POST, PUT, PATCH, DELETE and what each should do)
- Auth (API keys, bearer tokens, OAuth flows)
- Postman/curl (building requests, headers, collections, saving and sharing calls)
- Reading docs, pagination, rate limits, error handling

**Lab:** Pull data from your RMM or PSA API — first in Postman, then as a curl one-liner — page through the full result set, and reconcile it against AD.

---

## Phase 5 — Data and Infrastructure as Code (Weeks 34–38)

### Week 34: JSON and YAML
- Config files (syntax, indentation traps, comments, validation)
- API payloads (nesting, arrays, parsing, jq and ConvertFrom-Json)
- Cloud/devops tooling (where each format shows up: Compose, Actions, Terraform vars, Kubernetes)
- Converting between them and linting before you ship

**Lab:** Take a working config, break it four ways (tabs, bad nesting, missing quotes, wrong type), and fix each from the error message alone.

### Week 35: SQL
- SELECT (columns, aliases, filtering, ordering, limits)
- JOIN (inner, left, and why row counts explode)
- WHERE (operators, NULL handling, grouping with HAVING)
- Indexes (what they cost, why queries crawl without them)
- Basic database thinking (normalization, keys, transactions)

**Lab:** Restore a sample database, answer five real questions with queries, then add an index and measure the difference.

### Week 36: Infrastructure as Code
- Terraform (providers, resources, variables, outputs)
- Infrastructure as code (declarative vs imperative, why drift matters)
- Define cloud resources in files (plan, apply, destroy)
- State (where it lives, locking, never editing by hand)
- Modules and reuse

**Lab:** Redeploy your Week 28/30 cloud network entirely from code, destroy it, and rebuild it identically.

### Week 37: Secrets Management
- Why secrets never belong in code or config files
- Vaults (Azure Key Vault, AWS Secrets Manager, HashiCorp Vault)
- Environment variables and .env hygiene
- Managed identities and workload identity (no credentials at all)
- Rotation, expiry, and what to do after a leak

**Lab:** Refactor one script and one Terraform config to pull every secret from a vault, then scan your Git history for anything you've already leaked.

### Week 38: CI/CD
- GitHub Actions (workflows, triggers, runners, jobs)
- How pipelines work (stages, artifacts, caching)
- Automated testing (linting scripts, unit tests, failing fast)
- Deployment basics (environments, approvals, rollback)
- Secrets in pipelines

**Lab:** Build a pipeline that lints and tests your scripts on every pull request and deploys on merge to main.

---

## Phase 6 — Platform and Application Infrastructure (Weeks 39–43)

### Week 39: Kubernetes Basics
- Pods (containers, lifecycle, why you rarely create them directly)
- Deployments (replicas, rollouts, rollbacks)
- Services (ClusterIP, NodePort, LoadBalancer, service discovery)
- Ingress (routing, TLS, controllers)
- kubectl fundamentals and reading cluster state

**Lab:** Deploy your Week 32 Compose stack to a local cluster (k3s/kind/Docker Desktop) with an Ingress and working TLS.

### Week 40: Web Servers
- Nginx (config structure, server blocks, static vs proxied)
- Caddy (automatic TLS, minimal config)
- Apache (where you'll still meet it, .htaccess, modules)
- Reverse proxies (proxy_pass, headers, X-Forwarded-For)
- TLS and serving apps (certs, renewal, HTTP→HTTPS redirects)

**Lab:** Serve the same app behind all three, then compare configs and pick a default for your own stack.

### Week 41: Load Balancers and Reverse Proxies
- Traffic routing (round robin, least connections, sticky sessions)
- High availability (health checks, failover, draining nodes)
- SSL/TLS termination (at the edge vs end-to-end, re-encryption)
- Layer 4 vs Layer 7 balancing
- Cloud load balancers vs self-hosted (HAProxy, Nginx, Azure/AWS LB)

**Lab:** Put two app instances behind a load balancer with health checks, kill one mid-request, and prove no user-visible failure.

### Week 42: Monitoring
- Metrics vs telemetry (what each answers)
- Uptime checks (synthetic, external, from where)
- CPU, memory, disk (what "normal" looks like, saturation vs utilization)
- Dashboards (signal vs decoration, who reads them)
- Alerting (thresholds vs baselines, severity, on-call routing)

**Lab:** Instrument one host and one app, build a single dashboard someone could act on, and set three alerts that would have caught real past incidents.

### Week 43: Logging
- Application logs (levels, structured logging, correlation IDs)
- System logs (Event Log, journald, syslog)
- Centralized logging (shippers, retention, cost)
- Gathering logs (agents, forwarders, what to collect and what to skip)
- Troubleshooting with evidence (timelines, not guesses)

**Lab:** Ship logs from a Windows host, a Linux host, and an app into one place, then reconstruct an incident timeline from them alone.

---

## Phase 7 — Operations and Resilience (Weeks 44–47)

### Week 44: Backups and Disaster Recovery
- RPO and RTO (what the business actually agreed to)
- Snapshots (and why a snapshot is not a backup)
- Restore testing (the only proof a backup works)
- 3-2-1-1-0, retention, and immutability
- Runbooks, failover, and outage communications

**Lab:** Perform a bare-metal restore and time it. That number is your real RTO — then write the DR runbook around it.

### Week 45: Ansible
- Configuration management (desired state, idempotency)
- Inventories, playbooks, roles
- Repeatable server setup (from bare OS to serving traffic)
- Variables, templates, and secrets (ansible-vault)
- Ad-hoc commands vs playbooks

**Lab:** Build a playbook that takes a fresh VM to a fully configured web server, then run it twice and prove nothing changed the second time.

### Week 46: Basic System Design
- Apps (tiers, stateless vs stateful, scaling)
- Networks (segmentation, ingress/egress, latency)
- Databases (read replicas, connection limits, backup implications)
- Caches (what to cache, invalidation, when caching hides bugs)
- Queues (decoupling, retries, dead-letter handling)

**Lab:** Design a small multi-tier system on one page — components, data flow, failure modes — then explain how each piece is monitored and backed up.

### Week 47: LLM Fundamentals
- Tokens (what they are, why they cost)
- Context windows (limits, chunking, what falls out)
- Models (sizes, families, tradeoffs, hosted vs local)
- Inference (temperature, latency, streaming, determinism)
- Limitations (hallucination, cutoffs, prompt injection, data privacy)

**Lab:** Run the same task against a hosted and a local model, measure token cost and quality, and write your team's AI usage policy from what you learn.

---

## Phase 8 — Applied AI (Weeks 48–52)

### Week 48: Prompt Engineering
- Clear instructions (specificity, format, constraints, role)
- Examples (few-shot, showing the output shape you want)
- Managing the context window (what to include, what to summarize, what to drop)
- Structured output (JSON schemas, XML tags, parseable responses)
- Evaluating prompts (testing variations, catching silent failures)

**Lab:** Take one recurring task you do by hand, write a prompt that does it, then improve it across five test cases until output is consistent.

### Week 49: RAG (Retrieval-Augmented Generation)
- Letting AI answer from your docs and data
- The pipeline (ingest → chunk → index → retrieve → generate)
- Chunking strategy (size, overlap, why it makes or breaks quality)
- Grounding and citations (making answers traceable)
- Failure modes (missing context, stale data, confident wrong answers)

**Lab:** Build a RAG bot over your Week 12 runbooks and SOPs, then test it on ten real questions and log where it fails.

### Week 50: Vector Databases and Embeddings
- How semantic search works (meaning vs keyword matching)
- Embeddings (vectors, dimensions, similarity metrics)
- Vector stores (pgvector, Chroma, Pinecone, Azure AI Search)
- Indexes, metadata filters, and hybrid search
- How AI apps use it (retrieval, dedup, classification, clustering)

**Lab:** Embed your documentation set, run semantic vs keyword search on the same queries, and measure which finds the right doc more often.

### Week 51: AI Agents
- Tools (function calling, giving a model real capabilities)
- Memory (short-term context vs persistent state)
- Planning (decomposition, multi-step reasoning, reflection)
- Task management (loops, checkpoints, knowing when to stop)
- Guardrails (permissions, cost limits, human approval gates)

**Lab:** Build an agent that triages a ticket queue: reads tickets, classifies them, drafts responses, and escalates what it can't handle.

### Week 52: MCP and Agent Tool Integrations
- Connecting agents to real tools (MCP servers, clients, transports)
- Files (reading, writing, scoped directory access)
- APIs (wrapping REST endpoints as tools)
- CLIs and SDKs (shelling out safely, vendor SDKs)
- Notion, email, and other business systems
- Security (least privilege for agents, prompt injection, audit trails)

**Lab:** Build or configure an MCP server that connects an agent to one real system you use daily, with scoped permissions and a full audit log.

---

## Didn't fit in 52 weeks

The plan trades traditional MSP depth for cloud, platform, and AI skills. These are worth year two, or slotting in if something above proves less useful:

**Microsoft and endpoint**

- Intune, Autopilot, and device provisioning
- Exchange Online and email security (SPF/DKIM/DMARC, Defender for Office)
- Patch and update management (Update rings, Autopatch, third-party)
- SharePoint and OneDrive administration
- File, print, and storage services (DFS, FSRM, Universal Print)

**Network and security operations**

- Firewalls, VPN, and edge security
- Incident response (lifecycle, containment, postmortems)
- Cloud identity hardening (PIM, break-glass, legacy auth blocking)
- Switching, wireless, and LAN infrastructure (VLANs, 802.1X/RADIUS)
- Routing, NAT, and packet analysis (Wireshark)
- DHCP and IP address management

**MSP business**

- RMM platform depth and automation engineering (Graph API, webhooks)
- Compliance frameworks (CIS Controls, NIST CSF, cyber insurance, audits)
- Advanced PowerShell scripting (modules, error handling, remoting)

---

## Rules that make this stick

1. **One lab per week, always.** Reading without building doesn't survive contact with a client.
2. **Write it down.** Every week produces a note in your own words — in Markdown (Week 12), committed to the Git repo you build in Week 8. By Week 49 those notes become the corpus your RAG bot answers from.
3. **Miss a week? Don't skip it.** Slide the schedule. The order is dependency-driven.
4. **Revisit weeks 1–11 in month 12.** Fundamentals read differently once you've seen the stack.
