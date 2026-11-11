# Changelog

## Unreleased — SwarmHit full system (branch `swarmhit-full-system`)

Code complete, not live. No LinkedIn action was sent and no credential was used.

Added:

- `@linkedin-os/swarmhit` — full SwarmHit REST client (OpenAPI v1.25.0), LinkedIn adapter (SEND_CONNECTION / SEND_DM / REPLY_DM / COMMENT / REACT), prospect adapter, in-memory rate budget, HMAC-SHA256 webhook verification;
- `AVAILABLE_PROVIDER` capability mode and resolver branch (never `AVAILABLE_OFFICIAL`);
- migrations 025–027 — `li_swarmhit_senders`, `li_swarmhit_usage`, webhook delivery log with dedupe, `li_run_control.swarmhit_enabled`, sync / opt-in / usage RPCs;
- server `SwarmhitAdapterRegistry` + prospect registration and Supabase config resolver;
- webhook Edge Function `supabase/functions/swarmhit-webhook` with checkpoint auto-pause;
- usage recording wired end-to-end: `recordSwarmhitUsage` (`packages/supabase/src/swarmhit.ts`) calls `li_swarmhit_record_usage`, `ExecutionService` records it after every successful SwarmHit send (best-effort, never fails the send), and `RunControl.swarmhitEnabled` is now mapped from `li_run_control.swarmhit_enabled` in the Supabase repository;
- web app SwarmHit Integrations card, API-key form, sync and opt-in toggle;
- `database/tests/003_swarmhit.sql` smoke checks.

Verified:

- **88/88 unit tests pass** (was 30/30 on v1.6.0, 82/82 before the usage-wiring follow-up);
- strict TypeScript passes;
- Next.js production build passes.

Still needs the user's access, in order: apply migrations 025–027, start the 7-day trial (card, temporary $16.90 hold), connect 1 LinkedIn sender (login + 2FA), create and Vault-store the `swh_live_…` API key, deploy the webhook function, then a 1-invite + 1-DM approval-gated test.

## 1.6.0

Team/workspace, notification, Network/prospecting and official LinkedIn adapter foundation.

Added:

- secure team invitations with hashed tokens, expiry and revoke;
- matching-email invitation acceptance;
- multi-workspace switcher;
- in-app notification event system and Notifications centre;
- approval/workflow/security/opportunity notification fan-out;
- Network & Prospecting candidate staging;
- manual/batch prospect import and stable dedupe;
- evidence-based fit review and Strong/Good-only CRM promotion;
- typed provider-neutral prospect-data adapter;
- `@linkedin-os/prospecting` normalizer/registry;
- `@linkedin-os/linkedin-official` OAuth/OIDC client and adapter;
- server-side LinkedIn OAuth start/callback routes;
- Supabase Vault storage for official LinkedIn OAuth tokens;
- official identity-only capability registration;
- explicit personal publishing transports with hard blocks for unsupported actions;
- LinkedIn official setup and API-access plan;
- migrations 018–022;
- prepare-only Connection Review processor with DNC/state/idempotency guards;
- Network-screen Connection Review run control;
- notification delivery outbox with explicit channel states;
- `@linkedin-os/notifications` provider-neutral delivery registry;
- migrations 023–024.

Fixed:

- team invitation acceptance SQL ambiguity discovered by rollback testing;
- multi-workspace selection behavior;
- login/signup/callback return-to handling for invite flow;
- Next.js workspace TypeScript import configuration;
- version drift across root/core/server/web/integration packages.

Verified:

- team invite correct-email/wrong-email rollback tests pass;
- notification tenant isolation rollback test passes;
- OAuth role/Vault/publishing-boundary rollback tests pass;
- **30/30 unit tests pass**;
- strict TypeScript passes;
- Next.js production build passes;
- GitHub CI succeeds on implementation head `677ca665ad19cd4fbc4d5c0a7e8aba617a2d673a`.

No LinkedIn public write action was sent during this release build.

## 1.5.0

Usable product-core release plus integration/completeness hardening.

Added:

- live Next.js web product;
- Supabase Auth/onboarding/RLS;
- relationship CRM/memory;
- contact timeline;
- tasks/opportunities/approvals/content;
- workflow scheduler/processor/editor;
- Zernio provider package and read-sync/analytics layers;
- notification preferences;
- public demo dashboard;
- operations/handover documentation.

## 1.4.1

Backend refinement and consistency pass.

## 1.4.0

Backend-core implementation.

## 1.3.0

Multi-tenant/capability-aware architecture.

## 1.2.0

System-completeness pass.

## 1.1.0

Controlled-automation foundation.
