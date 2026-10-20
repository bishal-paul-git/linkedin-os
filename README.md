# LinkedIn OS

A reusable, multi-tenant LinkedIn relationship operating system with specialist agents, persistent memory, capability-aware integrations, and approval-gated actions.

## v1.3

The same shared system can support many independent users/teams. Each tenant gets isolated configuration, CRM/memory, integrations, LinkedIn authorization, Run Control, Approval Queue, schedules, and audit state.

Before doing anything on LinkedIn, the system resolves what that tenant can actually do.

## Execution modes

- **Official API** — execute through authorized API access.
- **Assisted** — research/draft/approve, then the user performs the final LinkedIn action.
- **Read-only** — analyze without writing.
- **Restricted partner** — capability exists but requires LinkedIn approval/partner access.
- **Unavailable** — no supported adapter exists.

## Start here

- [SYSTEM.md](SYSTEM.md)
- [linkedin-os.yaml](linkedin-os.yaml)
- [product/MULTI_TENANT_ARCHITECTURE.md](product/MULTI_TENANT_ARCHITECTURE.md)
- [product/CAPABILITY_MATRIX.md](product/CAPABILITY_MATRIX.md)
- [product/CONNECTOR_STRATEGY.md](product/CONNECTOR_STRATEGY.md)
- [product/TENANT_ONBOARDING.md](product/TENANT_ONBOARDING.md)
- [runtime/CAPABILITY_RESOLVER.md](runtime/CAPABILITY_RESOLVER.md)
- [docs/ROADMAP.md](docs/ROADMAP.md)

## Core agents

Manager, Inbox, Network, Content, CRM, Approval Executor.

## Product architecture

Shared code is separate from private tenant runtime.

For the current single-user V1, Google Sheets is supported as memory. For a real multi-user product, the recommended backend is Postgres/Supabase with tenant isolation and row-level security.

## Status

**v1.3.0 — multi-tenant product architecture defined; software product implementation is next.**

The repository now contains the reusable OS contracts. The next engineering phase is the tenant backend, OAuth/integrations, capability service, workers/schedules, and dashboard.

## Security

Never store OAuth tokens, browser/session data, private CRM records, or LinkedIn messages in this public repository.

Every production operation must be tenant-scoped, capability-gated, approval-aware, and auditable.
