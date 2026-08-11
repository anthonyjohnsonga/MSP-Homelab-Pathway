# Homelab Build Guide — Free First

The 52-week course and the homelab are the same project. Each week stands something up; by Week 52 the lab is a complete small-business environment you built and can rebuild.

**Rule: free unless free genuinely can't do it.** Where a paid option is listed, it's either required (a domain name) or a meaningful quality-of-life upgrade — never a default.

---

## What you already have

You said you have a spare PC/mini PC, Windows licensing through MSDN, and a cloud account. That covers the three things people usually pay for.

| Asset | What it unlocks | Annual value |
|---|---|---|
| Spare PC / mini PC | The always-on lab host — hypervisor, DC, servers, k8s node | ~$400–900 saved |
| MSDN / Visual Studio subscription | Windows Server and Windows 11 Enterprise keys, **plus monthly Azure credits ($50–150/mo)** and Microsoft 365 E5 developer tenant eligibility | ~$600–1,800 |
| Azure/AWS account | Cloud weeks, with AWS free tier for 12 months | — |

Your MSDN Azure credits are the single most valuable thing here. They cover Sentinel, Key Vault, AKS, and the Terraform weeks with room to spare — as long as you tear resources down between labs.

---

## Hardware plan

**Target for the always-on box:** 8+ cores, 64 GB RAM, 1 TB NVMe.

32 GB works until Week 39, when Kubernetes plus a DC plus a file server plus a monitoring stack starts swapping. If your spare box has 32 GB, budget one RAM upgrade rather than a new machine — DDR4 SODIMM kits are cheap.

| Item | Free path | Paid fallback | Cost |
|---|---|---|---|
| Lab host | Your spare PC | Refurb SFF workstation or mini PC (i5/i7, 64 GB) | $250–500 |
| RAM upgrade | — | 64 GB kit if the spare box is short | $80–140 |
| Storage | Existing disk | 1 TB NVMe | $60–90 |
| Switch (VLANs) | Virtual switches in the hypervisor; GNS3/Containerlab for topology | Managed switch (TP-Link, MikroTik) for real 802.1Q and PoE | $40–90 |
| Firewall | OPNsense/pfSense CE as a VM | Dedicated small appliance or MikroTik router | $60–120 |
| Wi-Fi (Week 35) | Skip physical; study only | One cheap AP with VLAN/RADIUS support | $50–100 |

**Minimum viable:** your existing box, everything else virtual. **$0.**
**Comfortable:** RAM upgrade + a managed switch. **~$150.**

---

## Annual budget

| Category | Free covers | You must pay |
|---|---|---|
| Hypervisor, OS, servers | Proxmox VE, Hyper-V (MSDN keys), Windows evals | $0 |
| Domain name | — | **$10–15/yr — the one unavoidable cost** |
| DNS | Cloudflare free plan | $0 |
| Microsoft 365 / Entra / Intune | M365 E5 developer tenant (renews while in use) | $0 |
| Azure | MSDN monthly credits | $0 if you tear down |
| AWS | Free tier, 12 months | $0–5 |
| Containers, k8s, IaC, CI/CD | Docker CE, k3s, OpenTofu/Terraform, Ansible, GitHub Actions | $0 |
| Monitoring, logging, SIEM | Prometheus/Grafana, Uptime Kuma, Wazuh, Loki | $0 |
| Backup | Veeam Community, Proxmox Backup Server, Restic | $0 |
| Helpdesk / RMM | Zammad or osTicket, Tactical RMM | $0 |
| Vulnerability scanning | Greenbone CE, Nessus Essentials (16 IPs) | $0 |
| LLM work (Weeks 47–52) | Ollama locally | $10–30 total for hosted API calls |

**Realistic year one: $25–50** with your existing assets. **$150–200** if you add the RAM, switch, and a physical AP.

---

## What each week stands up

| Week | Topic | What you stand up | Free option | Paid fallback |
|---|---|---|---|---|
| 1 | Computer Hardware Fundamentals | The lab host itself | Existing spare PC; UEFI/TPM config | Refurb mini PC, RAM/NVMe upgrade |
| 2 | Operating System Fundamentals | Nothing new — study on the host | Any installed OS | — |
| 3 | Windows 11 / Windows Administration | First Windows client VM | Windows 11 Enterprise 90-day eval, or MSDN key | Windows 11 Pro retail |
| 4 | Linux Fundamentals | Linux utility server | Ubuntu Server or Debian | — |
| 5 | Network Fundamentals | The lab IP plan and virtual networks | Hypervisor virtual switches | Managed switch |
| 6 | DNS | Public domain + DNS zone | Cloudflare free DNS plan | **Domain registration, $10–15/yr (required)** |
| 7 | HTTP / HTTPS | First TLS-served page | Caddy + Let's Encrypt (auto certs) | Paid cert (unnecessary) |
| 8 | Git and GitHub | The `msp-lab` repo | GitHub free (unlimited private repos) | GitHub Pro |
| 9 | Command Line Basics | Terminal tooling | Windows Terminal, PowerShell 7, bash | — |
| 10 | PowerShell | Inventory script v1 | PowerShell 7, VS Code | — |
| 11 | Bash | Scheduled backup script | cron on the Linux VM | — |
| 12 | Markdown and Technical Documentation | Docs structure | VS Code, Obsidian free | Obsidian Sync |
| 13 | Ticketing Systems and ITIL Basics | A real helpdesk | Zammad, osTicket, or GLPI (self-hosted) | Freshdesk/HaloPSA free tiers |
| 14 | Remote Support Solutions | Jump host + remote access | OpenSSH, RDP, Guacamole, Tailscale free tier | RustDesk self-host, ScreenConnect |
| 15 | Virtualization | **The permanent hypervisor** | Proxmox VE (free), Hyper-V (MSDN), VirtualBox, VMware Workstation Pro (free for personal use) | vSphere Essentials |
| 16 | Basic Scripting with Python | Inventory tool v2 | Python 3, VS Code | — |
| 17 | Active Directory | Domain controller | Windows Server 2022/2025 eval (180 days) or MSDN key; Samba AD as a fallback | Windows Server license |
| 18 | Group Policy | Baseline GPO set | Built into AD; use CIS/Microsoft Security Baselines (free) | — |
| 19 | Microsoft Entra ID | Cloud tenant | **M365 E5 developer tenant** (free via MSDN, renews while active) | M365 Business Premium, ~$22/user/mo |
| 20 | Microsoft 365 | Exchange, Teams, licensing in that tenant | Same dev tenant | Same as above |
| 21 | IAM Concepts | Access model docs | — | — |
| 22 | Authentication Protocols | Federated test app | Entra + a sample SAML/OIDC app; jwt.io to decode | — |
| 23 | Security Fundamentals | Threat model | CIS Controls v8 (free), NIST CSF (free) | — |
| 24 | Endpoint Security | EDR across the fleet | Defender for Endpoint in the E5 dev tenant | Defender for Business, ~$3/user/mo |
| 25 | Vulnerability Management | Scanner | Greenbone/OpenVAS CE, or Nessus Essentials (16 IPs) | Nessus Pro (~$4k — skip) |
| 26 | SIEM Basics | Log analytics + rules | Wazuh (free) or Sentinel on MSDN credits | Sentinel at retail ingest rates |
| 27 | Cloud Fundamentals | Accounts and budgets | Azure free account, AWS free tier | — |
| 28 | Azure Fundamentals | Azure footprint | MSDN credits + budget alerts | Pay-as-you-go |
| 29 | AWS Fundamentals | EC2, S3, VPC | AWS free tier (12 months, t2/t3.micro) | ~$5/mo beyond free tier |
| 30 | Cloud Networking | Hub-and-spoke | Same free/credit path | — |
| 31 | Docker | Containerized app | Docker CE on Linux, or Podman | Docker Desktop business licence |
| 32 | Docker Compose | Multi-service stack | Compose v2 (free) | — |
| 33 | APIs | API integration | Postman free tier, curl, Bruno (open source) | Postman paid |
| 34 | JSON and YAML | Config schemas | jq, yq, VS Code extensions | — |
| 35 | SQL | Database with history | PostgreSQL or SQL Server Developer Edition (free) | Azure SQL |
| 36 | Infrastructure as Code | Terraform for the cloud footprint | OpenTofu or Terraform CE | Terraform Cloud teams |
| 37 | Secrets Management | Vault | Azure Key Vault (pennies on credits), OpenBao/Vault OSS, Bitwarden free | HashiCorp Vault Enterprise |
| 38 | CI/CD | Pipelines | GitHub Actions free tier (2,000 min/mo) | Actions minutes overage |
| 39 | Kubernetes Basics | Cluster | k3s or kind on the lab box (free) | AKS/EKS node costs |
| 40 | Web Servers | nginx / Caddy / Apache | All open source | — |
| 41 | Load Balancers and Reverse Proxies | LB with health checks | HAProxy, nginx, Traefik | Cloud LB (~$18/mo — tear down) |
| 42 | Monitoring | Dashboards and alerts | Prometheus + Grafana, Uptime Kuma, Zabbix | Grafana Cloud free tier is generous |
| 43 | Logging | Central log stack | Grafana Loki, Graylog OSS, Wazuh | Elastic Cloud |
| 44 | Backups and Disaster Recovery | Backup + real restore | Veeam Community Edition (10 workloads), Proxmox Backup Server, Restic | Veeam Essentials |
| 45 | Ansible | Config management | Ansible core (free) | Ansible Automation Platform |
| 46 | Basic System Design | Architecture diagram | draw.io, Excalidraw, Mermaid | Lucidchart |
| 47 | LLM Fundamentals | Local + hosted models | Ollama (local, free) | ~$5–10 in API credits for comparison |
| 48 | Prompt Engineering | Prompt library + evals | Any API free credits; local models | ~$5 in API calls |
| 49 | RAG | RAG over your own docs | LangChain/LlamaIndex + Ollama embeddings | Hosted embedding API, a few dollars |
| 50 | Vector Databases and Embeddings | Vector store | pgvector (on your Week 35 Postgres), Chroma, Qdrant | Pinecone paid tier |
| 51 | AI Agents | Ticket-triage agent | Open-source agent frameworks + local model | Hosted model API, ~$10 |
| 52 | MCP and Agent Tool Integrations | MCP server | MCP SDKs (open source), Claude Code | — |

---

## Standing rules for the lab

**Snapshot before every week.** The hypervisor snapshot is your undo button. Take one Monday, delete it Friday if the week went fine.

**Tear down cloud on Fridays.** From Week 36 on, the Terraform is the artifact — running resources aren't. This is the difference between $0 and a surprise bill.

**Evals expire; plan for it.** Windows Server eval is 180 days, Windows 11 Enterprise is 90. Use MSDN keys where you can; where you can't, note the expiry date in `docs/lab/hardware.md` and rebuild deliberately — rebuilding is a legitimate exercise.

**Keep the dev tenant active.** The M365 E5 developer tenant renews as long as you keep using it. Two months of inactivity and it goes away, taking Weeks 19–26 with it.

**Everything gets a name.** `NG-DC01`, `NG-SRV01`, `NG-WS01`. Consistent naming is what makes the Week 45 Ansible inventory and the Week 52 agent possible.
