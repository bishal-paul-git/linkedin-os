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
- [x] Contacts / Memory UI
- [x] Opportunities UI
- [x] Approval Queue UI
- [x] Workflows UI
- [x] manual workflow execution
- [x] schedules
- [x] pg_cron scheduler
- [x] internal workflow processor
- [x] Integrations / Capabilities UI
- [x] Security / Run Control UI
- [x] assisted completion reconciliation
- [x] Vercel production deployment
- [x] runtime/auth hardening

## V1.6 — external adapters

- [ ] LinkedIn identity/OAuth
- [ ] supported LinkedIn member publishing
- [ ] Community Management/Page adapter where approved
- [ ] restricted partner APIs when/if approved
- [ ] prospect-data provider
- [ ] CRM/email/calendar adapters
- [ ] optional Google Sheets import/export

## V1.7 — product expansion

- [ ] team invitation UI
- [ ] richer contact detail timeline
- [ ] opportunity pipeline board
- [ ] task management UI
- [ ] workflow builder/config editor
- [ ] notification preferences
- [ ] billing/plan layer if commercialized
- [ ] admin/support tooling

## Production hardening

- [ ] encrypted external-secret store
- [ ] adapter token refresh/reconnect tests
- [ ] end-to-end authenticated browser test with a real test account
- [ ] audit retention policy
- [ ] backups/recovery runbook
- [ ] monitoring/alerts
