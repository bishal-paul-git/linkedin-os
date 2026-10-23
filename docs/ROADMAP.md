# Roadmap

## V1-V1.4.1 — completed foundation

- [x] agents and skills
- [x] memory/state model
- [x] multi-tenant architecture
- [x] Supabase/Postgres backend
- [x] contacts, conversations, opportunities and tasks
- [x] Approval Queue
- [x] Run Control
- [x] capability model
- [x] idempotency and approval fingerprints
- [x] worker-run lineage / leases / heartbeat
- [x] core tests

## V1.5 — usable product core

- [x] RLS enabled
- [x] synthetic tenant-isolation tests
- [x] Supabase repository adapter
- [x] Supabase Auth
- [x] workspace onboarding
- [x] Action Centre
- [x] Inbox / Conversations UI
- [x] Contacts / Memory UI
- [x] Tasks UI
- [x] Opportunities UI
- [x] Approval Queue UI
- [x] Content / Engagement UI
- [x] Workflows UI
- [x] workspace Config / Settings
- [x] manual workflow execution
- [x] schedules
- [x] pg_cron scheduler
- [x] internal workflow processor
- [x] Integrations / Capabilities UI
- [x] Security / Run Control UI
- [x] assisted completion reconciliation
- [x] Vercel production deployment
- [x] runtime/auth hardening
- [x] GitHub CI for monorepo typecheck, tests and web build

## V1.6 — external adapters

- [x] Zernio provider package
- [x] Zernio multi-account LinkedIn binding model
- [x] encrypted Zernio secret storage with Supabase Vault
- [x] read-only Zernio account discovery/sync
- [x] personal LinkedIn publishing capability adapter
- [x] organization Page publishing capability adapter
- [x] owned-account analytics capability registration
- [ ] first real workspace → Zernio REST key binding
- [ ] authenticated no-publish live Zernio account sync from the web product
- [x] read-only organization Page comment monitoring
- [ ] approval-gated organization Page comment replies/likes/deletes if required
- [ ] LinkedIn identity/OAuth where useful
- [ ] prospect-data provider
- [ ] CRM/email/calendar adapters
- [ ] optional Google Sheets import/export
- [ ] restricted partner LinkedIn APIs only if approved

## Capabilities that remain assisted/unavailable

- LinkedIn DMs
- connection requests
- invitation accept/decline
- exact person relationship-state lookup
- arbitrary LinkedIn feed reading
- prospect discovery without a separate data provider

## V1.7 — product expansion

- [ ] team invitation UI
- [x] richer contact detail timeline
- [x] opportunity pipeline board
- [x] workflow builder/config editor
- [x] notification preferences
- [ ] billing/plan layer if commercialized
- [ ] admin/support tooling

## Production hardening

- [x] encrypted external-secret store for Zernio
- [x] integration account registry
- [x] provider account-health verification before CONNECTED
- [x] repository-wide CI
- [ ] Zernio token/key replacement and failure-path live test with a real workspace
- [ ] end-to-end authenticated browser test with a real test workspace
- [x] audit retention policy
- [x] backups/recovery runbook
- [ ] monitoring/alerts
