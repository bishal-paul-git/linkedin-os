create table public.li_notification_deliveries(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.li_tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_id uuid not null references public.li_notifications(id) on delete cascade,
  channel text not null check(channel in ('IN_APP','EMAIL','DISCORD')),
  provider text,
  status text not null check(status in ('SENT','WAITING_ADAPTER','READY','RUNNING','FAILED','SKIPPED')),
  attempts integer not null default 0,
  last_error text,
  delivered_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(notification_id,channel)
);

create index li_notification_deliveries_user_idx
on public.li_notification_deliveries(tenant_id,user_id,status,created_at desc);

alter table public.li_notification_deliveries enable row level security;

create policy li_notification_deliveries_select on public.li_notification_deliveries
for select to authenticated
using(user_id=(select auth.uid()) and (select li_private.has_tenant_access(tenant_id)));

grant select on public.li_notification_deliveries to authenticated;

create trigger li_notification_deliveries_updated_at_trigger
before update on public.li_notification_deliveries
for each row execute function li_private.set_updated_at();

create or replace function li_private.queue_notification_deliveries()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_channels jsonb;
begin
  insert into public.li_notification_deliveries(
    tenant_id,user_id,notification_id,channel,provider,status,attempts,delivered_at,metadata
  ) values(
    new.tenant_id,new.user_id,new.id,'IN_APP','linkedin-os','SENT',1,now(),
    jsonb_build_object('source','notification_insert')
  )
  on conflict(notification_id,channel) do nothing;

  select channels into v_channels
  from public.li_notification_preferences
  where tenant_id=new.tenant_id and user_id=new.user_id;

  v_channels:=coalesce(v_channels,'["IN_APP"]'::jsonb);

  if v_channels ? 'EMAIL' then
    insert into public.li_notification_deliveries(
      tenant_id,user_id,notification_id,channel,status,metadata
    ) values(
      new.tenant_id,new.user_id,new.id,'EMAIL','WAITING_ADAPTER',
      jsonb_build_object('reason','Email delivery adapter not connected')
    )
    on conflict(notification_id,channel) do nothing;
  end if;

  if v_channels ? 'DISCORD' then
    insert into public.li_notification_deliveries(
      tenant_id,user_id,notification_id,channel,status,metadata
    ) values(
      new.tenant_id,new.user_id,new.id,'DISCORD','WAITING_ADAPTER',
      jsonb_build_object('reason','Discord delivery adapter not connected')
    )
    on conflict(notification_id,channel) do nothing;
  end if;

  return new;
end;
$$;

revoke all on function li_private.queue_notification_deliveries() from public,anon,authenticated;

create trigger li_notifications_queue_deliveries
after insert on public.li_notifications
for each row execute function li_private.queue_notification_deliveries();
