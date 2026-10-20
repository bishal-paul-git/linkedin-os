# Database

LinkedIn OS uses a tenant-scoped Supabase/Postgres core.

## Apply order

See [ORDER.md](ORDER.md).

The full product database includes:

- tenancy and memberships
- integration/capability registry
- Config / Run Control / agent settings
- contacts and normalized identities
- conversations and memory facts
- opportunities and tasks
- content/engagement
- Approval Queue
- workflow templates/settings/runs
- schedules
- activity/security events
- app-facing RPCs
- execution/reconciliation RPCs
- pg_cron scheduler and internal workflow processor
- row-level security

## Security state

RLS is enabled.

The private-schema tenant-role helpers back policies for Owner/Admin/Member/Viewer access.

Reproducible tests:

- `database/tests/001_invariants.sql`
- `database/tests/002_rls_isolation.sql`

The live synthetic isolation suite passed.

## Scheduling

Two active pg_cron jobs run every minute:

- `linkedin-os-scheduler-tick`
- `linkedin-os-workflow-processor`

The scheduler creates idempotent workflow runs. The processor completes database-only work and marks external-context workflows honestly as assisted/blocked rather than fabricating results.

## Secrets

OAuth/API secrets must not be stored directly in ordinary `li_*` tables.

`li_integrations.token_ref` is a reference point for a future encrypted secret store/provider.
