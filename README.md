# LinkedIn OS

A reusable, multi-tenant LinkedIn relationship operating system with specialist agents, persistent memory, team workspaces, prospect staging, approval-gated actions, notifications, capability-aware adapters and scheduling.

## Current release

**v1.6.0 — team/network/external-adapter foundation**

Live app:

https://linkedin-os-delta.vercel.app

Public preview:

https://linkedin-os-delta.vercel.app/dashboard

Source:

https://github.com/bishal-paul-git/linkedin-os

## What is built

- Supabase Auth + tenant-isolated RLS
- workspace onboarding + team invitations + workspace switching
- Manager, Inbox, Network, Content, CRM and Approval Executor agents
- Inbox/conversation memory
- Network prospect staging, qualification and CRM promotion
- Contacts + relationship timeline
- Tasks + Opportunity Pipeline
- Approval Queue + Run Control
- Content & Engagement
- LinkedIn analytics
- in-app notifications + per-user preferences
- workflow editor + schedules + pg_cron processor
- integration/capability registries
- Zernio provider package with Vault credentials and read-sync layers
- official LinkedIn self-service package with OAuth/OIDC scaffold
- provider-neutral prospecting package
- concrete Supabase repository adapter
- idempotency, approval fingerprints, worker leases and workflow lineage
- public sample-data dashboard preview
- CI for typecheck, tests and production web build

## Product navigation

- Action Centre
- Inbox
- Network
- Contacts
- Tasks
- Opportunities
- Approvals
- Content
- LinkedIn Analytics
- Notifications
- Workflows
- Integrations & Capabilities
- Security & Run Control
- Settings

## Execution model

```text
Tenant / Workspace
  ↓
Agents + Persistent Memory
  ↓
Workflow Run
  ↓
Approval Queue
  ↓
Run Control + Capability Resolver
  ├─ Healthy authorized official adapter
  ├─ Provider adapter
  ├─ Assisted/manual completion
  └─ Blocked/unavailable
```

No adapter bypasses Run Control, exact approval or security blockers.

## Current integration state

### Zernio

Built, but the deployed product still needs its own dedicated REST key before the first live product sync.

### LinkedIn official

The OAuth/OIDC/self-service package is built, but LinkedIn Developer App credentials are not yet configured/proven. Identity connection and direct official publishing must not be described as live yet.

Direct personal publishing remains disabled until the real member author Person URN and provisioned publishing transport are verified.

DMs, connections and invitations are not part of the self-service adapter.

### Prospect data

The staging model and provider-neutral registry are built. A real licensed B2B discovery provider is still to be connected.

## Security

- RLS enabled/tested
- provider OAuth/API tokens stored through Supabase Vault
- team invite tokens stored hashed
- privileged RPCs narrowly scoped and reviewed
- no credentials committed to this public repo
- unsupported LinkedIn capabilities remain assisted/unavailable

See:

- [Current status](docs/CURRENT_STATUS.md)
- [Progress log](docs/PROGRESS_LOG.md)
- [Continuation handover](docs/CONTINUATION_HANDOVER.md)
- [LinkedIn official setup](docs/LINKEDIN_OFFICIAL_SETUP.md)
- [LinkedIn API access plan](docs/LINKEDIN_API_ACCESS_PLAN.md)
- [Zernio setup](docs/ZERNIO_SETUP.md)
- [Security exceptions](docs/SECURITY_EXCEPTIONS.md)
- [Backup/recovery](docs/BACKUP_RECOVERY.md)
- [Audit retention](docs/AUDIT_RETENTION.md)
- [Database order](database/ORDER.md)

## Development

```bash
npm install
npm run check
npm run build:web
```

Never commit OAuth tokens, API keys, browser sessions, private CRM data, LinkedIn messages or external-provider secrets.
