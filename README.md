# LinkedIn OS

A reusable, multi-tenant LinkedIn relationship operating system with specialist agents, persistent memory, capability-aware integrations, approval-gated actions, and a live Supabase/Postgres backend core.

## Current version

**v1.4.1 — backend refinement release**

The product core now includes:

- tenant/workspace isolation;
- persistent CRM and relationship memory;
- separate network state and relationship stage;
- normalized contact identities;
- agents and workflows;
- Run Control;
- Approval Queue with approval fingerprints;
- idempotency keys;
- workflow run lineage and worker leases;
- capability resolver;
- official/assisted/unavailable execution modes;
- provider-independent adapter contracts;
- server orchestration services;
- strict TypeScript workspace and core tests.

## Architecture

```text
Tenant
  ↓
Manager
  ├─ Inbox
  ├─ Network
  ├─ Content
  └─ CRM / Memory
        ↓
   Workflow Run
        ↓
   Approval Queue
        ↓
 Capability Resolver
   ├─ Official adapter
   ├─ Assisted/manual
   └─ Unavailable/restricted
```

## State model

LinkedIn connection facts and relationship maturity are separate.

Network:

`UNKNOWN → NOT_CONNECTED → INVITED → CONNECTED`

Relationship:

`DISCOVERED → QUALIFIED → APPROVED → PREPARED → ENGAGED → ACTIVE → OPPORTUNITY`

`Do Not Contact` is a separate safety flag.

## Start here

- [SYSTEM.md](SYSTEM.md)
- [linkedin-os.yaml](linkedin-os.yaml)
- [database/README.md](database/README.md)
- [memory/STATE_MODEL.md](memory/STATE_MODEL.md)
- [product/MULTI_TENANT_ARCHITECTURE.md](product/MULTI_TENANT_ARCHITECTURE.md)
- [product/CAPABILITY_MATRIX.md](product/CAPABILITY_MATRIX.md)
- [docs/CURRENT_STATUS.md](docs/CURRENT_STATUS.md)
- [docs/ROADMAP.md](docs/ROADMAP.md)

## Development

```bash
npm install
npm run check
```

The test command uses Node's built-in test runner with type stripping. TypeScript is used for strict source checking.

## Security

The live LinkedIn OS tables currently have direct client grants revoked. The refined tenant RLS policy set is prepared but intentionally not enabled without explicit approval.

Never store OAuth tokens, browser sessions, private CRM records or LinkedIn messages in this public repository.
