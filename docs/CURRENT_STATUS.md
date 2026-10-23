# Current Status

## v1.6.0 — team workspaces + notifications + Network staging + official LinkedIn scaffold

LinkedIn OS is a live multi-tenant relationship operating system with persistent CRM memory, specialist agents, approval-gated workflows, capability-aware adapters and a public demo preview.

## Live

- App: https://linkedin-os-delta.vercel.app
- Public preview: https://linkedin-os-delta.vercel.app/dashboard
- Source: https://github.com/bishal-paul-git/linkedin-os
- Supabase/Postgres: live
- Vercel production: live

## Product UI

Built:

- Action Centre
- Inbox & Conversations
- Network & Prospecting
- Contacts & Memory
- contact relationship timeline
- Tasks
- evidence-first Opportunity Pipeline
- Approval Queue
- Content & Engagement
- LinkedIn Analytics
- Notifications
- Workflows + schedules + workflow mode/limit editor
- Integrations & Capabilities
- Security & Run Control
- Workspace Settings
- notification preferences
- team invitation management
- workspace switcher

The anonymous `/dashboard` preview uses sample data only; private routes remain authenticated.

## Team workspaces

Built and database-tested:

- secure invite links;
- ADMIN/MEMBER/VIEWER invite roles;
- hashed invite tokens;
- expiry/revocation;
- matching-email acceptance;
- login/signup return-to invite;
- membership creation after acceptance;
- multi-workspace selection through an HttpOnly workspace cookie.

Rollback tests passed for correct-email acceptance, wrong-email rejection and membership creation.

## In-app notifications

Built and tested:

- per-user notification preferences;
- in-app notification centre;
- unread count;
- read/dismiss/mark-all-read;
- DB fan-out for:
  - pending approvals;
  - failed/blocked workflows;
  - unresolved security events;
  - new opportunity signals.

Rollback isolation test passed: tenant member received the synthetic event and unrelated authenticated identity saw zero notifications.

Notification delivery outbox is now live:

- IN_APP deliveries are recorded as SENT immediately;
- selected EMAIL/DISCORD channels are recorded as WAITING_ADAPTER;
- delivery rows are tenant/user isolated;
- `@linkedin-os/notifications` provides a provider-neutral registry with health/fallback behavior.

Email/Discord external providers are still not connected, so no external notification is claimed as delivered.

## Network / prospecting

Built:

- tenant-scoped `li_prospect_candidates`;
- safe manual/batch import up to 100 rows;
- stable dedupe;
- evidence/reason capture;
- STRONG_FIT / GOOD_FIT / WEAK_FIT / REJECT review;
- only qualified Strong/Good candidates can promote into CRM;
- CRM promotion preserves the refined state model;
- provider-neutral `ProspectDataAdapter` contract;
- prospect adapter registry with health checks, normalization, LinkedIn URL cleanup, dedupe and bounded result sizes.

No LinkedIn scraping or outbound action is performed by candidate staging/promotion.

Connection Review is now executable in prepare-only mode:

- consumes staged STRONG_FIT / GOOD_FIT candidates;
- reconciles/promotes them into CRM;
- skips Do Not Contact and already INVITED/CONNECTED relationships;
- requires an exact LinkedIn profile URL before preparing a connection action;
- creates stable-idempotency `SEND_CONNECTION / PENDING / NOT_READY` approvals;
- leaves `network_state` factual and never sets INVITED before verified completion;
- exposes the run directly from the Network screen.

Rollback tests passed for DNC skipping, no INVITED mutation, one pending approval, idempotent reruns and the queued workflow processor.

A real licensed B2B discovery provider is still not connected.

## Zernio

Built:

- `@linkedin-os/zernio`;
- Vault credential storage;
- personal/Page account model;
- read-only account sync;
- external/owned post sync;
- analytics snapshots;
- best-time/frequency snapshots;
- read-only Page comment monitoring;
- publishing adapter architecture;
- Owner/Admin-only provider sync.

The ChatGPT Zernio connector and deployed REST integration are separate credential contexts.

Standalone product blocker:

- a dedicated Zernio REST key still must be connected to QA/permanent workspace before first live product sync.

No LinkedIn post, comment, reaction, DM, connection request or invitation action was sent during these build/review passes.

## LinkedIn Official

Built in code:

- `@linkedin-os/linkedin-official`;
- OpenID Connect authorization URL;
- authorization-code exchange;
- OIDC userinfo;
- server-side OAuth start/callback routes;
- OAuth state protection with short-lived HttpOnly cookies;
- access-token storage in Supabase Vault;
- official identity capability registration;
- personal-post client for explicit `ugcPosts` and versioned `posts` transports;
- hard blocks for unsupported DM/connection/invitation actions.

Important current state:

- LinkedIn Developer App credentials are **not yet configured/proven in Vercel**;
- official identity is therefore **credential-blocked**, not live-connected;
- OIDC `sub` is not treated as a LinkedIn Person URN;
- direct official personal publishing is **not enabled** until the member author URN and real provisioned transport are verified;
- Community Management access is **not approved or connected**.

See:

- `docs/LINKEDIN_OFFICIAL_SETUP.md`
- `docs/LINKEDIN_API_ACCESS_PLAN.md`

## Security verification

Passed:

- tenant RLS;
- Owner/Admin/Member/Viewer boundaries;
- approval invalidation/idempotency;
- notification preference isolation;
- in-app notification isolation;
- notification delivery outbox isolation and channel-state fan-out;
- Connection Review DNC/idempotency/network-state invariants;
- Zernio credential/sync role checks;
- team invite acceptance/email checks;
- official OAuth non-admin denial;
- official OAuth Vault-reference storage;
- direct official publishing remains unregistered after identity-only OAuth.

Callable privileged RPCs are documented in `docs/SECURITY_EXCEPTIONS.md`.

## Build verification

Verified implementation head before v1.6 metadata/docs alignment:

- `677ca665ad19cd4fbc4d5c0a7e8aba617a2d673a`

Results:

- strict TypeScript: PASS
- unit tests: **30/30 PASS**
- Next.js production build: PASS
- GitHub CI: SUCCESS

The final v1.6 documentation/version head must also pass CI/Vercel before being stamped as the release checkpoint.

## Remaining blockers / next work

- connect a dedicated Zernio REST key and run first authenticated no-publish product sync;
- create/configure LinkedIn Developer App credentials in Vercel and run first official identity OAuth;
- verify a real member author URN + publishing transport before registering direct official publishing;
- connect a licensed B2B prospect-data provider to the provider-neutral Network adapter;
- connect Email/Discord notification delivery providers to the existing outbox/adapter registry if desired;
- prepare/submit Community Management API application;
- authenticated end-to-end browser QA;
- backup/restore rehearsal.
