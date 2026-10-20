-- Apply as one controlled security change after review.

alter table public.li_profiles enable row level security;
alter table public.li_tenants enable row level security;
alter table public.li_tenant_members enable row level security;
alter table public.li_integrations enable row level security;
alter table public.li_capabilities enable row level security;
alter table public.li_config enable row level security;
alter table public.li_run_control enable row level security;
alter table public.li_agent_settings enable row level security;
alter table public.li_contacts enable row level security;
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

-- Profiles: users manage their own profile.
create policy li_profiles_select_own on public.li_profiles
for select to authenticated using ((select auth.uid()) = user_id);
create policy li_profiles_insert_own on public.li_profiles
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy li_profiles_update_own on public.li_profiles
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- Tenants: creator/owner plus active members can read.
create policy li_tenants_select_member on public.li_tenants
for select to authenticated using (
  created_by = (select auth.uid())
  or id in (
    select tenant_id from public.li_tenant_members
    where user_id = (select auth.uid()) and status = 'ACTIVE'
  )
);
create policy li_tenants_insert_creator on public.li_tenants
for insert to authenticated with check (created_by = (select auth.uid()));
create policy li_tenants_update_creator on public.li_tenants
for update to authenticated
using (created_by = (select auth.uid()))
with check (created_by = (select auth.uid()));
create policy li_tenants_delete_creator on public.li_tenants
for delete to authenticated using (created_by = (select auth.uid()));

-- Membership is visible to the member or tenant creator. Membership management is creator-only in v1.
create policy li_members_select on public.li_tenant_members
for select to authenticated using (
  user_id = (select auth.uid())
  or tenant_id in (
    select id from public.li_tenants where created_by = (select auth.uid())
  )
);
create policy li_members_insert_owner on public.li_tenant_members
for insert to authenticated with check (
  tenant_id in (
    select id from public.li_tenants where created_by = (select auth.uid())
  )
);
create policy li_members_update_owner on public.li_tenant_members
for update to authenticated
using (tenant_id in (select id from public.li_tenants where created_by = (select auth.uid())))
with check (tenant_id in (select id from public.li_tenants where created_by = (select auth.uid())));
create policy li_members_delete_owner on public.li_tenant_members
for delete to authenticated
using (tenant_id in (select id from public.li_tenants where created_by = (select auth.uid())));

-- Helper used only by policies on other tables.
create or replace function public.li_has_tenant_access(p_tenant_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.li_tenants t
    where t.id = p_tenant_id
      and (
        t.created_by = (select auth.uid())
        or exists (
          select 1 from public.li_tenant_members m
          where m.tenant_id = t.id
            and m.user_id = (select auth.uid())
            and m.status = 'ACTIVE'
        )
      )
  );
$$;

create or replace function public.li_can_write_tenant(p_tenant_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.li_tenants t
    where t.id = p_tenant_id
      and (
        t.created_by = (select auth.uid())
        or exists (
          select 1 from public.li_tenant_members m
          where m.tenant_id = t.id
            and m.user_id = (select auth.uid())
            and m.status = 'ACTIVE'
            and m.role in ('OWNER','ADMIN','MEMBER')
        )
      )
  );
$$;

create or replace function public.li_is_tenant_admin(p_tenant_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.li_tenants t
    where t.id = p_tenant_id
      and (
        t.created_by = (select auth.uid())
        or exists (
          select 1 from public.li_tenant_members m
          where m.tenant_id = t.id
            and m.user_id = (select auth.uid())
            and m.status = 'ACTIVE'
            and m.role in ('OWNER','ADMIN')
        )
      )
  );
$$;

revoke all on function public.li_has_tenant_access(uuid) from public, anon;
revoke all on function public.li_can_write_tenant(uuid) from public, anon;
revoke all on function public.li_is_tenant_admin(uuid) from public, anon;
grant execute on function public.li_has_tenant_access(uuid) to authenticated;
grant execute on function public.li_can_write_tenant(uuid) to authenticated;
grant execute on function public.li_is_tenant_admin(uuid) to authenticated;

-- General tenant tables: members read, non-viewers write.
do $$
declare t text;
begin
  foreach t in array array[
    'li_contacts','li_conversations','li_opportunities','li_tasks',
    'li_content_engagement','li_memory_facts','li_workflow_settings'
  ]
  loop
    execute format('create policy %I on public.%I for select to authenticated using ((select public.li_has_tenant_access(tenant_id)))', t||'_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select public.li_can_write_tenant(tenant_id)))', t||'_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using ((select public.li_can_write_tenant(tenant_id))) with check ((select public.li_can_write_tenant(tenant_id)))', t||'_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using ((select public.li_can_write_tenant(tenant_id)))', t||'_delete', t);
  end loop;
end $$;

-- Admin-controlled tenant configuration/integration tables.
do $$
declare t text;
begin
  foreach t in array array[
    'li_integrations','li_capabilities','li_config','li_run_control',
    'li_agent_settings','li_schedules'
  ]
  loop
    execute format('create policy %I on public.%I for select to authenticated using ((select public.li_has_tenant_access(tenant_id)))', t||'_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select public.li_is_tenant_admin(tenant_id)))', t||'_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using ((select public.li_is_tenant_admin(tenant_id))) with check ((select public.li_is_tenant_admin(tenant_id)))', t||'_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using ((select public.li_is_tenant_admin(tenant_id)))', t||'_delete', t);
  end loop;
end $$;

-- Approval queue: members can read/create; owner/admin/member may update decisions/execution state.
create policy li_approval_select on public.li_approval_queue
for select to authenticated using ((select public.li_has_tenant_access(tenant_id)));
create policy li_approval_insert on public.li_approval_queue
for insert to authenticated with check ((select public.li_can_write_tenant(tenant_id)));
create policy li_approval_update on public.li_approval_queue
for update to authenticated
using ((select public.li_can_write_tenant(tenant_id)))
with check ((select public.li_can_write_tenant(tenant_id)));

-- Append-oriented audit/run/security tables.
create policy li_activity_select on public.li_activity_log
for select to authenticated using ((select public.li_has_tenant_access(tenant_id)));
create policy li_activity_insert on public.li_activity_log
for insert to authenticated with check ((select public.li_can_write_tenant(tenant_id)));

create policy li_runs_select on public.li_workflow_runs
for select to authenticated using ((select public.li_has_tenant_access(tenant_id)));
create policy li_runs_insert on public.li_workflow_runs
for insert to authenticated with check ((select public.li_can_write_tenant(tenant_id)));
create policy li_runs_update on public.li_workflow_runs
for update to authenticated
using ((select public.li_can_write_tenant(tenant_id)))
with check ((select public.li_can_write_tenant(tenant_id)));

create policy li_security_select on public.li_security_events
for select to authenticated using ((select public.li_has_tenant_access(tenant_id)));
create policy li_security_insert on public.li_security_events
for insert to authenticated with check ((select public.li_can_write_tenant(tenant_id)));
create policy li_security_update on public.li_security_events
for update to authenticated
using ((select public.li_is_tenant_admin(tenant_id)))
with check ((select public.li_is_tenant_admin(tenant_id)));

-- Shared workflow templates are authenticated read-only.
create policy li_workflow_templates_read on public.li_workflow_templates
for select to authenticated using (true);

-- Explicit table grants. RLS still controls row access.
grant select, insert, update on public.li_profiles to authenticated;
grant select, insert, update, delete on public.li_tenants, public.li_tenant_members to authenticated;
grant select, insert, update, delete on
  public.li_integrations, public.li_capabilities, public.li_config,
  public.li_run_control, public.li_agent_settings, public.li_contacts,
  public.li_conversations, public.li_opportunities, public.li_tasks,
  public.li_content_engagement, public.li_memory_facts,
  public.li_workflow_settings, public.li_schedules
to authenticated;
grant select, insert, update on public.li_approval_queue, public.li_workflow_runs, public.li_security_events to authenticated;
grant select, insert on public.li_activity_log to authenticated;
grant select on public.li_workflow_templates to authenticated;
