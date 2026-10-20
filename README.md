# LinkedIn OS

A reusable, multi-tenant LinkedIn relationship operating system with specialist agents, persistent memory, approval-gated actions, capability-aware adapters, scheduling, and a live web product.

## Current release

**v1.5.0 — usable multi-tenant product core**

Live app:

https://linkedin-os-delta.vercel.app

Source:

https://github.com/bishal-paul-git/linkedin-os

## What is built

- Supabase Auth + workspace onboarding
- tenant-isolated Postgres/Supabase memory
- Owner/Admin/Member/Viewer RLS
- Manager, Inbox, Network, Content, CRM and Approval Executor agents
- Contacts / relationship memory
- Opportunities / tasks model
- Approval Queue
- Run Control
- capability registry
- integration registry
- manual + scheduled workflow runs
- internal pg_cron scheduler and workflow processor
- assisted/manual completion path when an external API is not connected
- activity log + security events
- responsive Next.js dashboard
- concrete Supabase repository adapter
- idempotency, approval fingerprints, worker leases and workflow lineage

## Product navigation

- Action Centre
- Contacts
- Opportunities
- Approvals
- Workflows
- Integrations & Capabilities
- Security & Run Control

## Execution model

```text
Tenant
  ↓
Agents + Memory
  ↓
Workflow Run
  ↓
Approval Queue
  ↓
Run Control + Capability Resolver
  ├─ Official adapter
  ├─ Assisted/manual completion
  └─ Blocked/unavailable
```

External LinkedIn APIs are intentionally not required by the core. Until an authorized adapter is connected, relevant actions remain assisted/manual and are reconciled into memory only after completion is confirmed.

## Security

RLS is enabled and tested. Synthetic isolation tests pass for:

- owner sees only own tenant/data
- member write access
- viewer write denial
- outsider isolation

Anonymous requests to protected product routes are redirected to login before tenant data is queried.

See:

- [docs/CURRENT_STATUS.md](docs/CURRENT_STATUS.md)
- [docs/AUTH_SETUP.md](docs/AUTH_SETUP.md)
- [docs/OPERATIONS.md](docs/OPERATIONS.md)
- [database/ORDER.md](database/ORDER.md)

## Development

```bash
npm install
npm run check
npm run build:web
```

Never commit OAuth tokens, browser sessions, private CRM data, LinkedIn messages or external-provider secrets to this repository.
