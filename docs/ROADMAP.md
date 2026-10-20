# Roadmap

## V1-V1.3 — OS + multi-tenant architecture

- [x] agents and skills
- [x] memory model
- [x] workflows
- [x] Approval Queue
- [x] Run Control
- [x] tenant architecture
- [x] capability-aware adapter model

## V1.4 — Backend core

- [x] Supabase/Postgres tenant schema
- [x] memberships
- [x] integrations/capabilities
- [x] persistent relationship memory
- [x] workflow engine schema
- [x] schedules
- [x] audit/security events
- [x] server orchestration contracts
- [x] reproducible SQL
- [x] indexes
- [x] schema validation

## V1.4.1 — Refinement/hardening

- [x] network state separated from relationship stage
- [x] normalized contact identities
- [x] approval fingerprints
- [x] automatic approval invalidation on content edits
- [x] workflow-run lineage
- [x] worker leases/heartbeat/dedupe keys
- [x] atomic execution-claim contract
- [x] adapter exception handling
- [x] healthy-adapter capability selection
- [x] default assisted capabilities
- [x] non-recursive RLS design
- [x] strict TypeScript workspace
- [x] core unit tests
- [ ] enable RLS after explicit approval
- [ ] run authenticated RLS isolation suite

## V1.5 — Product UI + auth

- [ ] Supabase repository adapter
- [ ] Supabase Auth workspace onboarding
- [ ] dashboard/action centre
- [ ] contacts/memory UI
- [ ] opportunities/tasks UI
- [ ] Approval Queue UI
- [ ] workflow controls/history
- [ ] schedules
- [ ] integrations/capabilities
- [ ] health/security dashboard

## V1.6 — External adapters

- [ ] LinkedIn identity/OAuth
- [ ] supported publishing adapters
- [ ] restricted partner adapters where approved
- [ ] assisted/manual connection and messaging flows
- [ ] prospect-data adapters
- [ ] CRM/email/calendar adapters

## Production hardening

- [ ] encrypted secret store
- [ ] approval concurrency integration tests
- [ ] background-worker implementation
- [ ] adapter reconnect/token-expiry tests
- [ ] audit retention
- [ ] backup/recovery runbook
- [ ] monitoring and alerts
