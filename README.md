# LinkedIn OS

A relationship-first LinkedIn operating system built around specialist agents, reusable skills, persistent CRM memory, approval-gated execution, and ChatGPT Work.

## Start here

- [SYSTEM.md](SYSTEM.md) — canonical system definition
- [linkedin-os.yaml](linkedin-os.yaml) — machine-readable manifest
- [instructions/MASTER_INSTRUCTIONS.md](instructions/MASTER_INSTRUCTIONS.md) — global operating instructions
- [agents/README.md](agents/README.md) — agent registry and ownership model
- [memory/README.md](memory/README.md) — persistent memory contract
- [workflows/README.md](workflows/README.md) — canonical workflow contracts
- [work/BOOTSTRAP_FROM_REPO.md](work/BOOTSTRAP_FROM_REPO.md) — bootstrap ChatGPT Work from this repo
- [tests/TEST_PLAN.md](tests/TEST_PLAN.md) — production proof plan

## System architecture

```text
User / ChatGPT Work
        |
        v
LinkedIn Manager
   |       |        |       |
   v       v        v       v
Inbox   Network   Content   CRM
   \       |        /       |
    \      |       /        |
        Persistent Memory
              |
        Approval Queue
              |
      Approval Executor
              |
        Run Control Gate
              |
              v
     Authorized LinkedIn
       browser session
```

## Agents

- **LinkedIn Manager** — orchestration, prioritization, conflict resolution
- **LinkedIn Inbox** — messages, replies, follow-ups, accepted relationships
- **LinkedIn Network** — discovery, qualification, connection strategy
- **LinkedIn Content** — posts, comments, public engagement
- **LinkedIn CRM** — persistent state, tasks, opportunities, dedupe, audit
- **Approval Executor** — exact approved external actions only

## Memory

The private Shared CRM is the V1 operational memory backend.

It stores identity, relationship state, conversation summaries, opportunities, tasks, engagement, approvals, execution history, configuration, ownership, and Run Control.

The repository defines the memory contract. Private relationship data never belongs in this public repo.

## External action model

Research, reading, classification, qualification, drafting, and CRM preparation can run autonomously when Run Control permits.

Visible LinkedIn actions are approval-gated by default:

- DMs / replies
- connection requests and invitation decisions
- comments / reactions
- posts / Page posts
- profile changes

Every action uses exact approval, current Run Control, relationship-state recheck, visible-success verification, and an idempotency guard.

## Repository structure

```text
agents/         Canonical agent definitions
config/         Reusable configuration template
docs/           Architecture, CRM, roadmap, system status
instructions/   Global operating rules
memory/         Persistent-memory model and state rules
runtime/        Current Google Sheets + ChatGPT Work adapters
schemas/        Machine-readable contracts
skills/         Reusable agent skills
tests/          Test plan and edge-case scenarios
work/           ChatGPT Work execution prompts
workflows/      Canonical workflow contracts
```

## Current workflows

- Inbox review
- Connection review
- Accepted connection + contextual DM
- Comment review
- Daily operating loop
- Approval execution

## Current runtime

- **CRM / memory:** Google Sheets
- **Browser / execution:** ChatGPT Work
- **Source control:** GitHub
- **Approval layer:** CRM Approval Queue
- **Permission layer:** CRM Run Control

## Status

**v1.2.0 — complete system architecture, controlled automation under production testing**

Architecture and operating contracts are built. Remaining work is execution proof and operations:

- live prospect discovery → queue test
- one approved connection send
- acceptance detection
- one approved DM
- comment prepare/queue + approved comment
- recurring Work runs
- observability / recovery

See [docs/CURRENT_STATUS.md](docs/CURRENT_STATUS.md), [docs/ROADMAP.md](docs/ROADMAP.md), and [docs/COMPLETE_SYSTEM_CHECKLIST.md](docs/COMPLETE_SYSTEM_CHECKLIST.md).

## Security

LinkedIn OS is not designed for high-volume blind automation or evasion.

It stops on CAPTCHA, identity verification, unusual activity, restrictions, or security warnings. It does not include account rotation, restriction bypass, fake-human timing, or limit probing.

See [SECURITY.md](SECURITY.md).

## Public repository note

Keep credentials, private CRM URLs, browser/session data, LinkedIn message history, prospect lists, and client data outside this repository.

## Disclaimer

This project is not affiliated with or endorsed by LinkedIn. Browser-based use should respect LinkedIn's terms, account protections, and applicable law.
