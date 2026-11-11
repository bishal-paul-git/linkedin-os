-- SwarmHit webhook deliveries: at-least-once intake with dedupe.
--
-- Event names are the six the app handles, from
-- packages/swarmhit/src/webhooks.ts (SwarmhitWebhookEventType). That
-- module names more event types, but only these six are stored here;
-- anything else is rejected by li_swarmhit_record_webhook below.
-- Signature verification (HMAC-SHA256, X-Swarmhit-Signature) happens in
-- the server layer using webhooks.ts — never in SQL, and the signing
-- secret is never stored in this table.

create table if not exists public.li_swarmhit_webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.li_tenants(id) on delete cascade,
  delivery_id text not null,
  event text not null
    check (event in ('connection.accepted','message.received','message.sent','lead.status_changed','account.connected','account.checkpoint_required')),
  payload jsonb not null,
  status text not null default 'RECEIVED'
    check (status in ('RECEIVED','PROCESSED','FAILED','DUPLICATE')),
  error text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, delivery_id)
);

create index if not exists li_swarmhit_webhook_deliveries_tenant_idx
  on public.li_swarmhit_webhook_deliveries(tenant_id, event, created_at desc);

alter table public.li_swarmhit_webhook_deliveries enable row level security;

drop policy if exists li_swarmhit_webhook_deliveries_select on public.li_swarmhit_webhook_deliveries;
drop policy if exists li_swarmhit_webhook_deliveries_insert on public.li_swarmhit_webhook_deliveries;
drop policy if exists li_swarmhit_webhook_deliveries_update on public.li_swarmhit_webhook_deliveries;
drop policy if exists li_swarmhit_webhook_deliveries_delete on public.li_swarmhit_webhook_deliveries;

create policy li_swarmhit_webhook_deliveries_select on public.li_swarmhit_webhook_deliveries
for select to authenticated
using ((select li_private.has_tenant_access(tenant_id)));

create policy li_swarmhit_webhook_deliveries_insert on public.li_swarmhit_webhook_deliveries
for insert to authenticated
with check ((select li_private.can_write_tenant(tenant_id)));

create policy li_swarmhit_webhook_deliveries_update on public.li_swarmhit_webhook_deliveries
for update to authenticated
using ((select li_private.can_write_tenant(tenant_id)))
with check ((select li_private.can_write_tenant(tenant_id)));

create policy li_swarmhit_webhook_deliveries_delete on public.li_swarmhit_webhook_deliveries
for delete to authenticated
using ((select li_private.can_write_tenant(tenant_id)));

grant select, insert, update on public.li_swarmhit_webhook_deliveries to authenticated;

drop trigger if exists li_swarmhit_webhook_deliveries_updated_at_trigger on public.li_swarmhit_webhook_deliveries;
create trigger li_swarmhit_webhook_deliveries_updated_at_trigger
before update on public.li_swarmhit_webhook_deliveries
for each row execute function li_private.set_updated_at();

-- Records one delivery. Returns 'RECEIVED' on first sight, 'DUPLICATE'
-- when the same (tenant_id, delivery_id) was already recorded, so a
-- retried SwarmHit delivery is never processed twice. The payload is
-- stored verbatim; processing (status -> PROCESSED / FAILED) happens in
-- a later step, not here.
--
-- Caller gate: tenant admin, or the service role (server-side webhook
-- endpoint). No service-role precedent exists in this repo's SQL, so
-- the auth.role() = 'service_role' branch is the standard Supabase
-- pattern, stated here rather than implied. RLS is not weakened: this
-- is a security-definer RPC whose own check is the gate, and the table
-- policies above still govern direct authenticated access.
create or replace function public.li_swarmhit_record_webhook(
  p_tenant_id uuid,
  p_delivery_id text,
  p_event text,
  p_payload jsonb
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inserted_id uuid;
begin
  if auth.role() <> 'service_role' then
    if auth.uid() is null then
      raise exception 'Authentication required';
    end if;

    if not li_private.is_tenant_admin(p_tenant_id) then
      raise exception 'Tenant admin access required';
    end if;
  end if;

  if p_delivery_id is null or length(trim(p_delivery_id)) = 0 then
    raise exception 'Delivery id is required';
  end if;

  if p_event not in ('connection.accepted','message.received','message.sent','lead.status_changed','account.connected','account.checkpoint_required') then
    raise exception 'Unknown SwarmHit webhook event: %', p_event;
  end if;

  if p_payload is null then
    raise exception 'Webhook payload is required';
  end if;

  insert into public.li_swarmhit_webhook_deliveries(
    tenant_id, delivery_id, event, payload, status
  )
  values (
    p_tenant_id, p_delivery_id, p_event, p_payload, 'RECEIVED'
  )
  on conflict (tenant_id, delivery_id) do nothing
  returning id into v_inserted_id;

  if v_inserted_id is null then
    return 'DUPLICATE';
  end if;

  return 'RECEIVED';
end;
$$;

revoke all on function public.li_swarmhit_record_webhook(uuid,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.li_swarmhit_record_webhook(uuid,text,text,jsonb) to authenticated, service_role;
