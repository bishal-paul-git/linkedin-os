# Database

LinkedIn OS uses a tenant-scoped Postgres/Supabase core.

The live development schema uses `li_*` tables so it can coexist safely with other systems in the current Supabase project.

## Apply order

See [ORDER.md](ORDER.md).

## Core domains

- tenancy: `li_profiles`, `li_tenants`, `li_tenant_members`
- integrations/capabilities: `li_integrations`, `li_capabilities`
- runtime controls: `li_config`, `li_run_control`, `li_agent_settings`
- relationship memory: `li_contacts`, `li_contact_identities`, `li_conversations`, `li_memory_facts`
- commercial state: `li_opportunities`, `li_tasks`
- content: `li_content_engagement`
- approvals: `li_approval_queue`
- workflows: `li_workflow_templates`, `li_workflow_settings`, `li_workflow_runs`, `li_schedules`
- audit/safety: `li_activity_log`, `li_security_events`

## Relationship model

The product separates:

- `network_state`: factual connection state;
- `relationship_stage`: maturity of the relationship;
- `do_not_contact`: safety/control override.

The older `connection_status` field remains only for compatibility while the product moves fully to the refined model.

## Approval safety

Approval rows contain both current and approved fingerprints. Substantive content edits invalidate prior approval automatically.

Workflow runs have dedupe keys, worker leases, attempts and heartbeats so background workers can be made idempotent.

## Security state

Direct `anon` and `authenticated` grants are revoked on the LinkedIn OS tables while RLS is pending.

The refined RLS policy set in `rls.sql` uses private security-definer membership helpers specifically to avoid recursive RLS checks. It remains intentionally unapplied until explicitly approved.

## Secrets

OAuth/API secrets are never stored directly in normal tables. `li_integrations.token_ref` is only a reference to a future encrypted secret store.
