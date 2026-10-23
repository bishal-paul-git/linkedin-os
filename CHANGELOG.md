# Changelog

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
- migrations 018–022.

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
