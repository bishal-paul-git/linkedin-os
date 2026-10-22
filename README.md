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
- Inbox / conversation memory
- Contacts / relationship memory
- contact-level relationship timeline
- Tasks and next-action tracking
- Opportunities
- evidence-first opportunity pipeline
- Content & Engagement
- Approval Queue
- Workspace Config / ICP / writing voice
- Run Control
- capability and integration registries
- manual + scheduled workflow runs
- internal pg_cron scheduler and workflow processor
- assisted/manual completion for unsupported external actions
- activity log + security events
- responsive Next.js dashboard
- concrete Supabase repository adapter
- idempotency, approval fingerprints, worker leases and workflow lineage
- Zernio provider package for owned LinkedIn publishing/analytics
- encrypted Zernio credential storage in Supabase Vault
- multi-account personal/Page provider bindings
- read-only provider account sync
- normalized owned/external LinkedIn post history
- stored account/post analytics snapshots
- best-time and posting-frequency analytics sync
- read-only organization Page comment monitoring
- GitHub CI for typecheck, tests and web build

## Product navigation

- Action Centre
- Inbox
- Contacts
- Tasks
- Opportunities
- Approvals
- Content
- LinkedIn Analytics
- Workflows
- Integrations & Capabilities
- Security & Run Control
- Settings

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

Zernio is treated as an owned-account publishing/analytics adapter, not as a replacement for LinkedIn DMs, connections, invitation management or prospect discovery.

External actions never bypass Run Control or exact Approval Queue approval.

## Security

RLS is enabled and tested. External credentials are not committed to this public repository. Zernio REST keys are stored in Supabase Vault and only Vault references are stored with tenant integration rows.

See:

- [docs/CURRENT_STATUS.md](docs/CURRENT_STATUS.md)
- [docs/ZERNIO_SETUP.md](docs/ZERNIO_SETUP.md)
- [docs/SECURITY_EXCEPTIONS.md](docs/SECURITY_EXCEPTIONS.md)
- [docs/AUTH_SETUP.md](docs/AUTH_SETUP.md)
- [docs/OPERATIONS.md](docs/OPERATIONS.md)
- [database/ORDER.md](database/ORDER.md)

## Development

```bash
npm install
npm run check
npm run build:web
```

Never commit OAuth tokens, API keys, browser sessions, private CRM data, LinkedIn messages or external-provider secrets to this repository.
