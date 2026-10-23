create table if not exists public.li_notification_preferences(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.li_tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  approval_alerts boolean not null default true,
  workflow_failures boolean not null default true,
  security_alerts boolean not null default true,
  opportunity_alerts boolean not null default true,
  daily_summary boolean not null default false,
  channels jsonb not null default '["IN_APP"]'::jsonb,
  quiet_hours jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id,user_id)
);

create index if not exists li_notification_preferences_tenant_idx
  on public.li_notification_preferences(tenant_id,user_id);

alter table public.li_notification_preferences enable row level security;

drop policy if exists li_notification_preferences_select on public.li_notification_preferences;
drop policy if exists li_notification_preferences_insert on public.li_notification_preferences;
drop policy if exists li_notification_preferences_update on public.li_notification_preferences;
drop policy if exists li_notification_preferences_delete on public.li_notification_preferences;

create policy li_notification_preferences_select
on public.li_notification_preferences for select to authenticated
using(
  (select li_private.has_tenant_access(tenant_id))
  and (
    user_id=(select auth.uid())
    or (select li_private.is_tenant_admin(tenant_id))
  )
);

create policy li_notification_preferences_insert
on public.li_notification_preferences for insert to authenticated
with check(
  user_id=(select auth.uid())
  and (select li_private.has_tenant_access(tenant_id))
);

create policy li_notification_preferences_update
on public.li_notification_preferences for update to authenticated
using(
  user_id=(select auth.uid())
  and (select li_private.has_tenant_access(tenant_id))
)
with check(
  user_id=(select auth.uid())
  and (select li_private.has_tenant_access(tenant_id))
);

create policy li_notification_preferences_delete
on public.li_notification_preferences for delete to authenticated
using(
  user_id=(select auth.uid())
  and (select li_private.has_tenant_access(tenant_id))
);

grant select,insert,update,delete on public.li_notification_preferences to authenticated;

drop trigger if exists li_notification_preferences_updated_at_trigger on public.li_notification_preferences;
create trigger li_notification_preferences_updated_at_trigger
before update on public.li_notification_preferences
for each row execute function li_private.set_updated_at();
