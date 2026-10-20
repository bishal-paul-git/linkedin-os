# Roadmap

## V1-V1.3 — OS + multi-tenant architecture

- [x] agents
- [x] skills
- [x] memory/state model
- [x] workflows
- [x] Approval Queue model
- [x] Run Control
- [x] capability-aware execution
- [x] tenant architecture
- [x] adapter strategy
- [x] test plan

## V1.4 — Product backend core

- [x] Supabase/Postgres tenant schema
- [x] workspace/user membership model
- [x] integration registry
- [x] capability registry
- [x] tenant configuration
- [x] persistent relationship memory
- [x] Approval Queue
- [x] workflow templates
- [x] workflow settings
- [x] workflow runs
- [x] schedules
- [x] audit/activity log
- [x] security events
- [x] idempotency model
- [x] capability resolver code
- [x] server orchestration services
- [x] reproducible SQL source
- [x] performance FK indexes
- [x] schema round-trip test
- [x] RLS policy set prepared
- [ ] RLS policy set enabled after explicit approval
- [ ] encrypted secret store implementation

## V1.5 — Product UI + auth

- [ ] Supabase Auth workspace onboarding
- [ ] tenant bootstrap endpoint/adapter
- [ ] dashboard/action centre
- [ ] contacts and relationship-memory UI
- [ ] opportunities/tasks
- [ ] Approval Queue UI
- [ ] workflow controls
- [ ] workflow-run history
- [ ] schedules
- [ ] integrations/capabilities
- [ ] security/health dashboard

## V1.6 — External adapters

- [ ] LinkedIn identity/OAuth
- [ ] supported LinkedIn publishing adapter
- [ ] partner API adapters where approved
- [ ] assisted/manual connection and messaging paths
- [ ] prospect-data adapters
- [ ] CRM/email/calendar adapters

## Production hardening

- [ ] RLS isolation tests with real auth users
- [ ] token/secret encryption
- [ ] tenant membership/admin tests
- [ ] approval concurrency tests
- [ ] worker leases/idempotent jobs
- [ ] adapter reconnect/token-expiry tests
- [ ] audit retention
- [ ] backup/recovery runbook
- [ ] monitoring and alerts
