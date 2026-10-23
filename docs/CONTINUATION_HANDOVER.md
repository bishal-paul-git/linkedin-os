# Continuation Handover

Use this file when continuing LinkedIn OS from ChatGPT Work, Claude Code, Codex or another development session.

## Repository

https://github.com/bishal-paul-git/linkedin-os

Default branch: `main`

Live app: https://linkedin-os-delta.vercel.app

Public preview: https://linkedin-os-delta.vercel.app/dashboard

## Product definition

LinkedIn OS is a multi-tenant relationship operating system, not a high-volume LinkedIn bot.

Core value:

- prospect/research intelligence;
- persistent relationship memory;
- inbox/conversation memory;
- tasks/follow-ups;
- opportunities;
- content/engagement;
- approval-gated actions;
- workflows/schedules;
- analytics;
- integration capability routing;
- audit/security controls.

## Core agents

- MANAGER
- INBOX
- NETWORK
- CONTENT
- CRM
- APPROVAL_EXECUTOR

## Key state model

Network state:

`UNKNOWN → NOT_CONNECTED → INVITED → CONNECTED`

Relationship stage:

`DISCOVERED → QUALIFIED → APPROVED → PREPARED → ENGAGED → ACTIVE → OPPORTUNITY`

Do Not Contact is a separate safety flag.

Opportunity stage:

`SIGNAL → DISCOVERY → CONVERSATION → MEETING → QUALIFIED → PROPOSAL → NEGOTIATION → WON | LOST | DORMANT`

Approval:

`PENDING → APPROVED | REJECTED | EXPIRED`

Execution:

`NOT_READY → READY → RUNNING → SUCCEEDED | FAILED | BLOCKED`

## Live infrastructure

Supabase project:

- `bishal-os`
- project ID `itauumqzqgewrfkoishh`

Vercel project:

- `linkedin-os`

## Database

Read `database/ORDER.md` before schema work.

Latest material migration in this pass:

- `database/017_notification_preferences.sql`

Do not create parallel schemas for contacts, approvals, workflows, integrations or analytics.

## Product screens

Private workspace:

- Action Centre
- Inbox
- Contacts
- Contact timeline
- Tasks
- Opportunity Pipeline
- Approval Queue
- Content & Engagement
- LinkedIn Analytics
- Workflows
- Integrations & Capabilities
- Security & Run Control
- Settings

Anonymous:

- safe demo Action Centre at `/dashboard`

## Zernio

Two runtimes remain separate:

1. ChatGPT Zernio connector;
2. standalone REST adapter used by deployed LinkedIn OS.

Never assume the ChatGPT connector credential is available to Vercel.

Standalone REST key:

- stored in Supabase Vault;
- only a Vault reference is stored in tenant integration rows;
- provider syncs are Owner/Admin-only.

Zernio is not a replacement for DMs, connections, invitation management, arbitrary feed access or prospect discovery.

## Current safe defaults

- external LinkedIn actions: BLOCKED;
- approvals required by default;
- security warnings override approvals;
- never bypass CAPTCHA, verification, restrictions or platform protections;
- unsupported capabilities stay assisted/unavailable.

## Current feature state

Built:

- multi-tenant RLS;
- auth/onboarding;
- QA workspace;
- dashboard + public demo preview;
- contacts/timeline;
- inbox memory;
- tasks;
- opportunities/pipeline;
- approvals;
- content;
- analytics;
- workflows/schedules;
- workflow mode editor;
- editable schedule controls;
- integration capability registry;
- Zernio provider package;
- read-only account/post/analytics/Page-comment sync;
- Run Control;
- per-user notification preferences;
- CI;
- Vercel production deployment.

## Immediate blockers

1. No dedicated Zernio REST key has been bound to QA/permanent workspace yet.
2. No prospect-data adapter is connected.
3. No official LinkedIn OIDC/Share/Community Management adapter is implemented yet.
4. DMs/connections/invitations remain restricted/assisted.
5. Email/Discord notification delivery adapters are not connected.

## Next recommended build order

1. team invitation UI;
2. notification delivery adapter abstraction;
3. prospect-data adapter;
4. official LinkedIn OIDC + Share adapter;
5. prepare Community Management API application;
6. monitoring/alert delivery;
7. backup/restore rehearsal;
8. authenticated end-to-end browser QA.

## Required continuation behavior

Before changing code:

1. read `README.md`;
2. read `docs/CURRENT_STATUS.md`;
3. read `docs/ROADMAP.md`;
4. read `docs/PROGRESS_LOG.md`;
5. read this handover;
6. inspect current `main`;
7. inspect latest CI/deployment;
8. never assume a feature is live merely because code exists.

After changes:

- commit verified changes;
- update logs/status/roadmap;
- report exact commit(s), tests, deployment and blockers.
