# Database

LinkedIn OS v1.4 uses a tenant-scoped Postgres/Supabase core.

The live development schema currently uses `li_*` tables so it can coexist with other systems in the same Supabase project.

## Core domains

- tenancy: `li_profiles`, `li_tenants`, `li_tenant_members`
- integrations: `li_integrations`, `li_capabilities`
- runtime configuration: `li_config`, `li_run_control`, `li_agent_settings`
- relationship memory: `li_contacts`, `li_conversations`, `li_memory_facts`
- commercial state: `li_opportunities`, `li_tasks`
- content: `li_content_engagement`
- approvals: `li_approval_queue`
- workflows: `li_workflow_templates`, `li_workflow_settings`, `li_workflow_runs`, `li_schedules`
- audit/safety: `li_activity_log`, `li_security_events`

## Security state

Direct anonymous/authenticated grants are revoked on the new tables.

The tenant RLS policy set is prepared in `rls.sql`. Enabling RLS is a controlled security change and should be applied together with the policies, never separately.

## Secrets

Integration tokens are never stored directly in these tables. `li_integrations.token_ref` is only a reference to a future encrypted secret store.
