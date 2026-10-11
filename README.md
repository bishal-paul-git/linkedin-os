# LinkedIn OS

A modular, relationship-first LinkedIn operating system built around ChatGPT Work, reusable skills, a shared CRM, and approval-gated actions.

## What it does

LinkedIn OS separates LinkedIn work into five specialist capabilities:

- **LinkedIn Manager** — orchestration, priorities, approvals, safety, and one unified action queue.
- **LinkedIn Inbox** — inbox triage, conversation context, replies, follow-ups, and accepted connections.
- **LinkedIn Prospecting** — people discovery, qualification, connection strategy, and network handoff.
- **LinkedIn Content** — posts, comments, replies, and relationship-aware public engagement.
- **LinkedIn CRM** — shared memory, deduplication, tasks, opportunities, approval state, and activity history.

## Architecture

```text
User / ChatGPT Work
        |
        v
LinkedIn Manager
   |    |    |    |
   v    v    v    v
Inbox  Prospecting  Content  CRM
   \       |        /       |
    \      |       /        |
       Shared CRM / State
             |
             v
      Authorized LinkedIn
        browser session
```

The CRM is the persistent source of truth. Skills read state before acting and record meaningful state changes after approved actions.

## Safety model

LinkedIn OS is intentionally not designed as a blind high-volume bot.

By default:

- research, reading, classification, drafting, and CRM preparation can run without approval;
- sending DMs, connection requests, comments, reactions, posts, or other visible LinkedIn actions require explicit approval;
- workflows stop on CAPTCHA, verification, unusual-activity warnings, restrictions, or security checkpoints;
- the system does not include limit evasion, account rotation, fake-human timing, or restriction bypass logic.

See [SECURITY.md](SECURITY.md).

## Repository structure

```text
skills/
  linkedin-manager/
  linkedin-inbox/
  linkedin-prospecting/
  linkedin-content/
  linkedin-crm/
  _shared/
docs/
  ARCHITECTURE.md
  CRM_SCHEMA.md
  ROADMAP.md
work/
  WORK_LAUNCH.md
config/
  config.example.md
```

## Quick start

1. Create or connect a shared CRM using the schema in [docs/CRM_SCHEMA.md](docs/CRM_SCHEMA.md).
2. Fill the configuration values in [config/config.example.md](config/config.example.md).
3. Load the five skills, or use the Manager plus specialist files as Work instructions.
4. Start in **read-only mode**.
5. Verify inbox navigation, relationship context, CRM reads/writes, and draft quality.
6. Only then enable narrowly approved external actions.

The initial Work prompt is in [work/WORK_LAUNCH.md](work/WORK_LAUNCH.md).

## Status

**V1 foundation**

- [x] Multi-agent architecture
- [x] Shared CRM contract
- [x] Approval model
- [x] Run-control model
- [x] Inbox skill
- [x] Prospecting skill
- [x] Content skill
- [x] CRM skill
- [x] Manager/orchestrator skill
- [ ] Approval Queue workflow
- [ ] Scheduled comment review workflow
- [ ] Accepted-connection follow-up workflow
- [ ] Connection-review workflow
- [ ] End-to-end browser reliability tests
- [ ] Production observability and recovery

## Public repository note

This repo contains reusable instructions and schemas only. Keep live credentials, session data, private CRM URLs, client data, and account-specific secrets outside the repository.

## Disclaimer

This project is not affiliated with or endorsed by LinkedIn. Any browser-based use should respect LinkedIn's terms, account protections, and applicable law.
