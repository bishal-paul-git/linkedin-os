-- Apply only as one reviewed security change.
-- This file is intentionally idempotent so policy revisions can be reapplied safely.

create schema if not exists li_private;
revoke all on schema li_private from public, anon, authenticated;

create or replace function li_private.current_tenant_role(p_tenant_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when t.created_by = (select auth.uid()) then 'OWNER'
    else (
      select m.role
      from public.li_tenant_members m
      where m.tenant_id = t.id
        and m.user_id = (select auth.uid())
        and m.status = 'ACTIVE'
      limit 1
    )
  end
  from public.li_tenants t
  where t.id = p_tenant_id;
$$;

create or replace function li_private.has_tenant_access(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select li_private.current_tenant_role(p_tenant_id) is not null;
$$;

create or replace function li_private.can_write_tenant(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(li_private.current_tenant_role(p_tenant_id) in ('OWNER','ADMIN','MEMBER'), false);
$$;

create or replace function li_private.is_tenant_admin(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(li_private.current_tenant_role(p_tenant_id) in ('OWNER','ADMIN'), false);
$$;

revoke all on function li_private.current_tenant_role(uuid) from public, anon;
revoke all on function li_private.has_tenant_access(uuid) from public, anon;
revoke all on function li_private.can_write_tenant(uuid) from public, anon;
revoke all on function li_private.is_tenant_admin(uuid) from public, anon;

grant execute on function li_private.current_tenant_role(uuid) to authenticated;
grant execute on function li_private.has_tenant_access(uuid) to authenticated;
grant execute on function li_private.can_write_tenant(uuid) to authenticated;
grant execute on function li_private.is_tenant_admin(uuid) to authenticated;

alter table public.li_profiles enable row level security;
alter table public.li_tenants enable row level security;
alter table public.li_tenant_members enable row level security;
alter table public.li_integrations enable row level security;
alter table public.li_capabilities enable row level security;
alter table public.li_config enable row level security;
alter table public.li_run_control enable row level security;
alter table public.li_agent_settings enable row level security;
alter table public.li_contacts enable row level security;
alter table public.li_contact_identities enable row level security;
alter table public.li_conversations enable row level security;
alter table public.li_opportunities enable row level security;
alter table public.li_tasks enable row level security;
alter table public.li_content_engagement enable row level security;
alter table public.li_approval_queue enable row level security;
alter table public.li_memory_facts enable row level security;
alter table public.li_activity_log enable row level security;
alter table public.li_workflow_templates enable row level security;
alter table public.li_workflow_settings enable row level security;
alter table public.li_workflow_runs enable row level security;
alter table public.li_schedules enable row level security;
alter table public.li_security_events enable row level security;

drop policy if exists li_profiles_select_own on public.li_profiles;
drop policy if exists li_profiles_insert_own on public.li_profiles;
drop policy if exists li_profiles_update_own on public.li_profiles;

create policy li_profiles_select_own on public.li_profiles
for select to authenticated using ((select auth.uid()) = user_id);
create policy li_profiles_insert_own on public.li_profiles
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy li_profiles_update_own on public.li_profiles
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists li_tenants_select_member on public.li_tenants;
drop policy if exists li_tenants_insert_creator on public.li_tenants;
drop policy if exists li_tenants_update_owner on public.li_tenants;
drop policy if exists li_tenants_delete_owner on public.li_tenants;

create policy li_tenants_select_member on public.li_tenants
for select to authenticated
using ((select li_private.has_tenant_access(id)));

create policy li_tenants_insert_creator on public.li_tenants
for insert to authenticated
with check (created_by = (select auth.uid()));

create policy li_tenants_update_owner on public.li_tenants
for update to authenticated
using ((select li_private.current_tenant_role(id)) = 'OWNER')
with check ((select li_private.current_tenant_role(id)) = 'OWNER');

create policy li_tenants_delete_owner on public.li_tenants
for delete to authenticated
using ((select li_private.current_tenant_role(id)) = 'OWNER');

drop policy if exists li_members_select on public.li_tenant_members;
drop policy if exists li_members_insert_admin on public.li_tenant_members;
drop policy if exists li_members_update_admin on public.li_tenant_members;
drop policy if exists li_members_delete_admin on public.li_tenant_members;

create policy li_members_select on public.li_tenant_members
for select to authenticated
using ((select li_private.has_tenant_access(tenant_id)));

create policy li_members_insert_admin on public.li_tenant_members
for insert to authenticated
with check ((select li_private.is_tenant_admin(tenant_id)));

create policy li_members_update_admin on public.li_tenant_members
for update to authenticated
using ((select li_private.is_tenant_admin(tenant_id)))
with check ((select li_private.is_tenant_admin(tenant_id)));

create policy li_members_delete_admin on public.li_tenant_members
for delete to authenticated
using ((select li_private.is_tenant_admin(tenant_id)));

do $$
declare
  t text;
begin
  foreach t in array array[
    'li_contacts','li_contact_identities','li_conversations','li_opportunities',
    'li_tasks','li_content_engagement','li_memory_facts'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', t||'_select', t);
    execute format('drop policy if exists %I on public.%I', t||'_insert', t);
    execute format('drop policy if exists %I on public.%I', t||'_update', t);
    execute format('drop policy if exists %I on public.%I', t||'_delete', t);

    execute format('create policy %I on public.%I for select to authenticated using ((select li_private.has_tenant_access(tenant_id)))', t||'_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select li_private.can_write_tenant(tenant_id)))', t||'_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using ((select li_private.can_write_tenant(tenant_id))) with check ((select li_private.can_write_tenant(tenant_id)))', t||'_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using ((select li_private.can_write_tenant(tenant_id)))', t||'_delete', t);
  end loop;
end $$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'li_integrations','li_capabilities','li_config','li_run_control',
    'li_agent_settings','li_workflow_settings','li_schedules'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', t||'_select', t);
    execute format('drop policy if exists %I on public.%I', t||'_insert', t);
    execute format('drop policy if exists %I on public.%I', t||'_update', t);
    execute format('drop policy if exists %I on public.%I', t||'_delete', t);

    execute format('create policy %I on public.%I for select to authenticated using ((select li_private.has_tenant_access(tenant_id)))', t||'_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select li_private.is_tenant_admin(tenant_id)))', t||'_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using ((select li_private.is_tenant_admin(tenant_id))) with check ((select li_private.is_tenant_admin(tenant_id)))', t||'_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using ((select li_private.is_tenant_admin(tenant_id)))', t||'_delete', t);
  end loop;
end $$;

drop policy if exists li_approval_select on public.li_approval_queue;
drop policy if exists li_approval_insert on public.li_approval_queue;
drop policy if exists li_approval_update on public.li_approval_queue;

create policy li_approval_select on public.li_approval_queue
for select to authenticated using ((select li_private.has_tenant_access(tenant_id)));

create policy li_approval_insert on public.li_approval_queue
for insert to authenticated with check ((select li_private.can_write_tenant(tenant_id)));

-- Decisions are privileged. Execution itself is performed server-side.
create policy li_approval_update on public.li_approval_queue
for update to authenticated
using ((select li_private.is_tenant_admin(tenant_id)))
with check ((select li_private.is_tenant_admin(tenant_id)));

drop policy if exists li_activity_select on public.li_activity_log;
drop policy if exists li_activity_insert on public.li_activity_log;
create policy li_activity_select on public.li_activity_log
for select to authenticated using ((select li_private.has_tenant_access(tenant_id)));
create policy li_activity_insert on public.li_activity_log
for insert to authenticated with check ((select li_private.can_write_tenant(tenant_id)));

drop policy if exists li_runs_select on public.li_workflow_runs;
drop policy if exists li_runs_insert on public.li_workflow_runs;
drop policy if exists li_runs_update on public.li_workflow_runs;
create policy li_runs_select on public.li_workflow_runs
for select to authenticated using ((select li_private.has_tenant_access(tenant_id)));
create policy li_runs_insert on public.li_workflow_runs
for insert to authenticated with check ((select li_private.can_write_tenant(tenant_id)));
create policy li_runs_update on public.li_workflow_runs
for update to authenticated
using ((select li_private.can_write_tenant(tenant_id)))
with check ((select li_private.can_write_tenant(tenant_id)));

drop policy if exists li_security_select on public.li_security_events;
drop policy if exists li_security_insert on public.li_security_events;
drop policy if exists li_security_update on public.li_security_events;
create policy li_security_select on public.li_security_events
for select to authenticated using ((select li_private.has_tenant_access(tenant_id)));
create policy li_security_insert on public.li_security_events
for insert to authenticated with check ((select li_private.can_write_tenant(tenant_id)));
create policy li_security_update on public.li_security_events
for update to authenticated
using ((select li_private.is_tenant_admin(tenant_id)))
with check ((select li_private.is_tenant_admin(tenant_id)));

drop policy if exists li_workflow_templates_read on public.li_workflow_templates;
create policy li_workflow_templates_read on public.li_workflow_templates
for select to authenticated using (true);

grant usage on schema public to authenticated;
grant select, insert, update on public.li_profiles to authenticated;
grant select, insert, update, delete on public.li_tenants, public.li_tenant_members to authenticated;

grant select, insert, update, delete on
  public.li_integrations, public.li_capabilities, public.li_config,
  public.li_run_control, public.li_agent_settings, public.li_contacts,
  public.li_contact_identities, public.li_conversations, public.li_opportunities,
  public.li_tasks, public.li_content_engagement, public.li_memory_facts,
  public.li_workflow_settings, public.li_schedules
to authenticated;

grant select, insert, update on
  public.li_approval_queue, public.li_workflow_runs, public.li_security_events
to authenticated;

grant select, insert on public.li_activity_log to authenticated;
grant select on public.li_workflow_templates to authenticated;
