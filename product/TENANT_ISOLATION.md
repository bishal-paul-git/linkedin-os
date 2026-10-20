# Tenant Isolation

Multi-tenant use requires strict separation.

## Required rules

1. Every database row is tenant-scoped.
2. Every integration credential belongs to one tenant.
3. Every scheduled task resolves exactly one tenant.
4. Every approval row belongs to one tenant.
5. Every idempotency key is tenant-scoped.
6. Agent memory queries must include tenant scope.
7. Cross-tenant search is forbidden unless an explicit admin analytics feature aggregates non-sensitive metadata.
8. Public repository content must never contain tenant secrets or private relationship data.

## Storage recommendation

For a true product, prefer Postgres/Supabase with row-level security over one shared Google Sheet.

Suggested key pattern:

`tenant_id + resource_id`

Examples:

- `tenant_id/contact_id`
- `tenant_id/approval_id`
- `tenant_id/task_id`

## Secrets

Keep OAuth tokens, refresh tokens, API keys, and browser/session state in a secrets store or encrypted integration store, never CRM notes.
