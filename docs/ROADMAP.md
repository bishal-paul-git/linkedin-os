# Roadmap

## V1-V1.2 — Core OS

- [x] agents
- [x] skills
- [x] memory/state model
- [x] CRM schema
- [x] Run Control
- [x] Approval Queue
- [x] workflows
- [x] idempotency
- [x] safety
- [x] tests
- [x] Work prompts

## V1.3 — Reusable multi-tenant architecture

- [x] tenant model
- [x] tenant isolation
- [x] tenant onboarding
- [x] connector strategy
- [x] capability matrix
- [x] capability resolver
- [x] capability gating
- [x] tenant/integration/capability schemas
- [x] official-vs-assisted execution model

## V1.4 — Product backend

- [ ] Supabase/Postgres tenant schema
- [ ] row-level security
- [ ] workspace/user membership
- [ ] encrypted integration store
- [ ] LinkedIn OAuth onboarding
- [ ] capability detection service
- [ ] adapter registry
- [ ] workflow runs
- [ ] scheduled jobs
- [ ] audit/security events
- [ ] approval API
- [ ] idempotent execution service

## V1.5 — Product UI

- [ ] onboarding wizard
- [ ] integrations page
- [ ] capability/status page
- [ ] CRM/contact view
- [ ] action centre
- [ ] Approval Queue UI
- [ ] workflow/schedule controls
- [ ] run/activity log
- [ ] health/blockers dashboard

## V1.6 — LinkedIn integrations

- [ ] OpenID Connect identity
- [ ] supported member social publishing adapter
- [ ] Community Management/Page adapter where approved
- [ ] restricted partner adapters when approved
- [ ] assisted connection/inbox/message flows where official access is unavailable
- [ ] licensed prospect-data adapters

## Production proof

- [ ] tenant isolation tests
- [ ] adapter permission tests
- [ ] capability fallback tests
- [ ] approval/execution tests
- [ ] idempotency tests
- [ ] security-stop tests
- [ ] reconnect/token-expiry tests
- [ ] schedule reliability tests
