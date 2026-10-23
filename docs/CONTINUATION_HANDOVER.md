# Continuation Handover

Use this file when continuing LinkedIn OS from ChatGPT Work, Claude Code, Codex or another development session.

## Repository / runtime

- Repo: https://github.com/bishal-paul-git/linkedin-os
- Branch: `main`
- Live app: https://linkedin-os-delta.vercel.app
- Public preview: https://linkedin-os-delta.vercel.app/dashboard
- Supabase: `bishal-os` / `itauumqzqgewrfkoishh`
- Vercel project: `linkedin-os`

Current release metadata: **v1.6.0**

## Product definition

LinkedIn OS is a multi-tenant LinkedIn relationship operating system, not a high-volume outreach bot.

Core value:

- prospect/research intelligence;
- persistent relationship memory;
- inbox/conversation memory;
- tasks/follow-ups;
- opportunities;
- content/engagement;
- approvals;
- workflows/schedules;
- analytics;
- notifications;
- capability-aware integrations;
- audit/security controls.

## Agents

- MANAGER
- INBOX
- NETWORK
- CONTENT
- CRM
- APPROVAL_EXECUTOR

## State model

Network:
`UNKNOWN → NOT_CONNECTED → INVITED → CONNECTED`

Relationship:
`DISCOVERED → QUALIFIED → APPROVED → PREPARED → ENGAGED → ACTIVE → OPPORTUNITY`

Opportunity:
`SIGNAL → DISCOVERY → CONVERSATION → MEETING → QUALIFIED → PROPOSAL → NEGOTIATION → WON | LOST | DORMANT`

Approval:
`PENDING → APPROVED | REJECTED | EXPIRED`

Execution:
`NOT_READY → READY → RUNNING → SUCCEEDED | FAILED | BLOCKED`

DNC remains a separate safety flag.

## Latest database work

Read `database/ORDER.md` before schema work.

Latest migrations:

- 017 notification preferences
- 018 team invitations
- 019 invite acceptance fix
- 020 in-app notifications
- 021 prospect candidate staging
- 022 official LinkedIn OAuth token storage
- 023 prepare-only Connection Review processor
- 024 notification delivery outbox

Do not create parallel schemas for contacts, approvals, workflows, integrations, notifications or prospect staging.

## Product screens

Private workspace:

- Action Centre
- Inbox
- Network & Prospecting
- Contacts
- Contact timeline
- Tasks
- Opportunity Pipeline
- Approval Queue
- Content & Engagement
- LinkedIn Analytics
- Notifications
- Workflows
- Integrations & Capabilities
- Security & Run Control
- Settings

Anonymous:

- safe sample-data Action Centre at `/dashboard`

## Team/workspaces

Built:

- secure invite links;
- hashed tokens;
- expiry/revoke;
- matching-email acceptance;
- multi-workspace switcher.

Email delivery is not required for invite acceptance; invite links are currently shared manually.

## Notifications

Built:

- preferences;
- in-app delivery;
- DB fan-out;
- read/dismiss/unread.

Delivery outbox is live. IN_APP is recorded as SENT; selected Email/Discord deliveries stay WAITING_ADAPTER until a real provider is connected.

`@linkedin-os/notifications` contains the provider-neutral delivery registry.

## Network/prospecting

Built:

- `li_prospect_candidates`;
- manual/batch list staging;
- dedupe/qualification/CRM promotion;
- typed provider-neutral adapter contract;
- `@linkedin-os/prospecting` registry.

Still missing:

- a real licensed B2B prospect-data provider credential/adapter binding.

Connection Review is implemented for already-staged candidates:

`Strong/Good candidate → CRM reconcile → DNC/state checks → exact PENDING SEND_CONNECTION approval`

It is prepare-only and must never set network state to INVITED before verified execution.

## Zernio

Keep two credential contexts separate:

1. ChatGPT connector;
2. deployed standalone REST adapter.

The web product still needs its own dedicated Zernio REST key before first live product sync.

Zernio does not replace DMs, connections, invitations or arbitrary prospect/feed access.

## LinkedIn official

Package:

- `@linkedin-os/linkedin-official`

Docs:

- `docs/LINKEDIN_OFFICIAL_SETUP.md`
- `docs/LINKEDIN_API_ACCESS_PLAN.md`

Built:

- OIDC + self-service OAuth client;
- start/callback routes;
- Vault token storage;
- identity-only capability;
- explicit personal publishing client transports.

Current state:

- code-ready;
- **LinkedIn Developer App credentials not yet configured/proven**;
- official member identity not live-connected;
- OIDC `sub` is not assumed to be a Person URN;
- direct official publishing not registered until author URN/transport validation;
- Community Management not approved/connected.

Never add DMs/connections/invitations to the self-service adapter unless LinkedIn explicitly grants the required access.

## Safe defaults

- external actions BLOCKED by default;
- approval required;
- security warnings override approval;
- no CAPTCHA/restriction bypass;
- unsupported capabilities remain assisted/unavailable.

## Verification

Verified implementation head before version/docs alignment:

- `677ca665ad19cd4fbc4d5c0a7e8aba617a2d673a`
- 30/30 unit tests PASS
- TypeScript PASS
- Next.js build PASS
- GitHub CI SUCCESS

Final v1.6 metadata/docs head must be re-verified before claiming release checkpoint.

## Immediate blockers

1. dedicated Zernio REST key for deployed product;
2. LinkedIn Developer App client ID/secret + redirect setup;
3. official member author URN/publishing transport verification;
4. licensed B2B prospect-data provider;
5. Email/Discord provider binding for the existing delivery outbox;
6. Community Management application/approval;
7. authenticated E2E browser QA.

## Continuation procedure

Before changes:

1. read README;
2. read CURRENT_STATUS;
3. read ROADMAP;
4. read PROGRESS_LOG;
5. read this handover;
6. inspect current `main`;
7. inspect latest CI/deployment.

After changes:

- commit verified code/migrations/docs;
- run relevant security tests;
- update canonical logs;
- report exact commits, tests, deployment and blockers.
