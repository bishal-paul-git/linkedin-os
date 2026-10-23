# Roadmap

## V1-V1.4.1 — completed foundation

- [x] agents and skills
- [x] relationship/network state model
- [x] multi-tenant architecture
- [x] Supabase/Postgres backend
- [x] Approval Queue + Run Control
- [x] capability resolver
- [x] approval fingerprints/idempotency
- [x] workflow lineage/leases/heartbeat
- [x] core tests

## V1.5 — usable product core

- [x] tenant RLS
- [x] auth/onboarding
- [x] Action Centre
- [x] Inbox
- [x] Contacts + relationship timeline
- [x] Tasks
- [x] Opportunities + pipeline
- [x] Approval Queue
- [x] Content & Engagement
- [x] Analytics
- [x] Workflows + schedules
- [x] workflow mode/limit editor
- [x] Integrations/Capabilities
- [x] Security/Run Control
- [x] notification preferences
- [x] public demo dashboard
- [x] Vercel production deployment
- [x] monorepo CI

## V1.6 — team + notifications + external-adapter foundation

### Team/workspaces

- [x] secure team invitation schema/RPCs
- [x] team invitation UI
- [x] revoke/expiry/status handling
- [x] matching-email invite acceptance
- [x] workspace switcher
- [x] invite acceptance rollback tests

### Notifications

- [x] in-app notification table/RLS
- [x] approval/workflow/security/opportunity fan-out
- [x] Notifications centre
- [x] unread/read/dismiss controls
- [x] tenant-isolation rollback test
- [x] notification delivery outbox
- [x] provider-neutral notification adapter registry
- [ ] Email notification delivery adapter
- [ ] Discord notification delivery adapter

### Network/prospecting

- [x] prospect candidate staging
- [x] manual/batch list import
- [x] stable dedupe
- [x] evidence-based fit review
- [x] Strong/Good-only CRM promotion
- [x] typed provider-neutral ProspectDataAdapter
- [x] normalization/dedupe/health registry
- [x] prepare-only Connection Review processor
- [x] Strong/Good → CRM → PENDING SEND_CONNECTION approval flow
- [x] DNC / invited / connected skip rules
- [x] stable connection-approval idempotency
- [ ] connect first licensed B2B prospect-data provider

### Zernio

- [x] provider package
- [x] Vault credential storage
- [x] account/post/analytics/Page-comment read sync architecture
- [x] publishing adapter architecture
- [ ] bind first standalone REST key to QA/permanent workspace
- [ ] first live authenticated no-publish product sync
- [ ] live key replacement/failure-path test

### LinkedIn official

- [x] self-service OAuth client
- [x] server OAuth start/callback routes
- [x] OIDC userinfo
- [x] OAuth access-token Vault storage
- [x] identity-only capability registration
- [x] personal publishing client with explicit transports
- [x] hard-block unsupported DM/connection/invitation actions
- [x] official adapter unit tests
- [x] setup guide + API-access plan
- [ ] create/configure LinkedIn Developer App credentials in Vercel
- [ ] first real OIDC identity connection
- [ ] verify member author Person URN
- [ ] validate actual provisioned personal publishing transport
- [ ] register direct official PUBLISH_MEMBER_POST only after validation
- [ ] prepare/submit Community Management Development Tier application
- [ ] Community Management capabilities only if LinkedIn approves them

## Capabilities still restricted/assisted

- LinkedIn DMs
- connection requests
- invitation accept/decline
- exact relationship-state lookup without approved access
- arbitrary feed reading
- arbitrary LinkedIn prospect search

Do not build around bypassing platform protections.

## Production hardening

- [x] encrypted provider-secret storage
- [x] integration/capability registries
- [x] audit retention policy
- [x] backup/recovery runbook
- [x] callable privileged RPC security review
- [ ] enable Supabase leaked-password protection if account policy allows
- [ ] authenticated end-to-end browser QA
- [ ] backup/restore rehearsal
- [ ] external notification delivery monitoring
- [ ] billing/plan layer if commercialized
- [ ] admin/support tooling
