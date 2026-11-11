-- SwarmHit integration: sender registry, daily usage, account sync.
--
-- API key storage reuses public.li_set_integration_secret (009) — do NOT
-- duplicate the Vault logic here. Create a li_integrations row with
-- provider = 'swarmhit', then call li_set_integration_secret with the
-- SwarmHit API key (swh_live_...). The sync RPC below reads the key back
-- from Vault via that row's token_ref.
--
-- Opt-in lives in 027 (li_run_control.swarmhit_enabled). This file must
-- NOT reference swarmhit_enabled: it is added by 027, after this file.
--
-- Account fields used below come only from SwarmHitAccount in
-- packages/swarmhit/src/types.ts and the listAccounts/getAccount calls in
-- packages/swarmhit/src/client.ts (GET /accounts returns a paged
-- { data: [...], paging } envelope; dataOf unwraps the "data" key).
-- SwarmHit does not publish an enumerated account "status" vocabulary in
-- that client, so the status mapping below is defensive and documented
-- inline; an unrecognised status lands on UNKNOWN, never on CONNECTED.

-- 001 defined the li_capabilities mode check inline, so its constraint
-- name is auto-generated. Drop whichever check constraint carries the
-- mode list, then re-add the full list including AVAILABLE_PROVIDER.
-- Idempotent: no-op once AVAILABLE_PROVIDER is already in the list.
do $$
declare
  r record;
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.li_capabilities'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%AVAILABLE_PROVIDER%'
  ) then
    return;
  end if;

  for r in
    select conname
    from pg_constraint
    where conrelid = 'public.li_capabilities'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%AVAILABLE_OFFICIAL%'
  loop
    execute 'alter table public.li_capabilities drop constraint ' || quote_ident(r.conname);
  end loop;

  alter table public.li_capabilities
    add constraint li_capabilities_mode_check
    check (mode in ('AVAILABLE_OFFICIAL','AVAILABLE_ASSISTED','AVAILABLE_BROWSER_READ','AVAILABLE_PROVIDER','RESTRICTED_PARTNER','UNAVAILABLE','BLOCKED_BY_POLICY'));
end $$;

create table if not exists public.li_swarmhit_senders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.li_tenants(id) on delete cascade,
  integration_id uuid references public.li_integrations(id) on delete set null,
  swarmhit_account_id text not null,
  linkedin_url text,
  linkedin_type text not null default 'FREE'
    check (linkedin_type in ('FREE','PAID')),
  status text not null default 'UNKNOWN'
    check (status in ('CONNECTED','PAUSED','NEEDS_RECONNECTION','DISCONNECTED','UNKNOWN')),
  ssi integer,
  paused boolean not null default false,
  paused_reason text,
  last_synced_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, swarmhit_account_id)
);

create table if not exists public.li_swarmhit_usage (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.li_tenants(id) on delete cascade,
  sender_id uuid not null references public.li_swarmhit_senders(id) on delete cascade,
  usage_date date not null,
  invites_sent integer not null default 0,
  dm_sent integer not null default 0,
  comments_sent integer not null default 0,
  reactions_sent integer not null default 0,
  rate_limit_reset_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, sender_id, usage_date)
);

create index if not exists li_swarmhit_senders_tenant_idx
  on public.li_swarmhit_senders(tenant_id, status);

create index if not exists li_swarmhit_usage_sender_idx
  on public.li_swarmhit_usage(tenant_id, sender_id, usage_date desc);

alter table public.li_swarmhit_senders enable row level security;
alter table public.li_swarmhit_usage enable row level security;

drop policy if exists li_swarmhit_senders_select on public.li_swarmhit_senders;
drop policy if exists li_swarmhit_senders_insert on public.li_swarmhit_senders;
drop policy if exists li_swarmhit_senders_update on public.li_swarmhit_senders;
drop policy if exists li_swarmhit_senders_delete on public.li_swarmhit_senders;

create policy li_swarmhit_senders_select on public.li_swarmhit_senders
for select to authenticated
using ((select li_private.has_tenant_access(tenant_id)));

create policy li_swarmhit_senders_insert on public.li_swarmhit_senders
for insert to authenticated
with check ((select li_private.is_tenant_admin(tenant_id)));

create policy li_swarmhit_senders_update on public.li_swarmhit_senders
for update to authenticated
using ((select li_private.is_tenant_admin(tenant_id)))
with check ((select li_private.is_tenant_admin(tenant_id)));

create policy li_swarmhit_senders_delete on public.li_swarmhit_senders
for delete to authenticated
using ((select li_private.is_tenant_admin(tenant_id)));

drop policy if exists li_swarmhit_usage_select on public.li_swarmhit_usage;
drop policy if exists li_swarmhit_usage_insert on public.li_swarmhit_usage;
drop policy if exists li_swarmhit_usage_update on public.li_swarmhit_usage;
drop policy if exists li_swarmhit_usage_delete on public.li_swarmhit_usage;

create policy li_swarmhit_usage_select on public.li_swarmhit_usage
for select to authenticated
using ((select li_private.has_tenant_access(tenant_id)));

create policy li_swarmhit_usage_insert on public.li_swarmhit_usage
for insert to authenticated
with check ((select li_private.can_write_tenant(tenant_id)));

create policy li_swarmhit_usage_update on public.li_swarmhit_usage
for update to authenticated
using ((select li_private.can_write_tenant(tenant_id)))
with check ((select li_private.can_write_tenant(tenant_id)));

create policy li_swarmhit_usage_delete on public.li_swarmhit_usage
for delete to authenticated
using ((select li_private.can_write_tenant(tenant_id)));

grant select, insert, update, delete on public.li_swarmhit_senders to authenticated;
grant select, insert, update, delete on public.li_swarmhit_usage to authenticated;

drop trigger if exists li_swarmhit_senders_updated_at_trigger on public.li_swarmhit_senders;
create trigger li_swarmhit_senders_updated_at_trigger
before update on public.li_swarmhit_senders
for each row execute function li_private.set_updated_at();

drop trigger if exists li_swarmhit_usage_updated_at_trigger on public.li_swarmhit_usage;
create trigger li_swarmhit_usage_updated_at_trigger
before update on public.li_swarmhit_usage
for each row execute function li_private.set_updated_at();

create extension if not exists http with schema extensions;

create or replace function public.li_swarmhit_sync_accounts(
  p_tenant_id uuid,
  p_integration_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_ref text;
  v_secret text;
  v_response extensions.http_response;
  v_body jsonb;
  v_items jsonb;
  v_account jsonb;
  v_external_id text;
  v_profile_url text;
  v_platform text;
  v_type text;
  v_sender_status text;
  v_account_status text;
  v_count integer := 0;
  v_connected integer := 0;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if not li_private.is_tenant_admin(p_tenant_id) then
    raise exception 'Tenant admin access required';
  end if;

  select token_ref
    into v_ref
  from public.li_integrations
  where id = p_integration_id
    and tenant_id = p_tenant_id
    and lower(provider) = 'swarmhit';

  if not found then
    raise exception 'SwarmHit integration not found';
  end if;

  if v_ref is null then
    raise exception 'SwarmHit API key is not configured';
  end if;

  select decrypted_secret
    into v_secret
  from vault.decrypted_secrets
  where id = v_ref::uuid;

  if v_secret is null then
    raise exception 'SwarmHit API key could not be resolved';
  end if;

  select *
    into v_response
  from extensions.http((
    'GET',
    'https://app.swarmhit.com/api/v1/accounts',
    extensions.http_headers(
      'Authorization', 'Bearer ' || v_secret,
      'Accept', 'application/json'
    ),
    null,
    null
  )::extensions.http_request);

  if v_response.status < 200 or v_response.status >= 300 then
    update public.li_integrations
    set status = case when v_response.status = 401 then 'ERROR' else status end,
        requires_user_reauth = (v_response.status = 401),
        updated_at = now()
    where id = p_integration_id;

    raise exception 'SwarmHit account sync failed with HTTP %', v_response.status;
  end if;

  v_body := coalesce(v_response.content::jsonb, '{}'::jsonb);

  -- client.ts listAccounts reads record["data"] as the account array
  -- (dataOf unwraps the "data" key). Accept a bare top-level array too,
  -- so a future envelope change degrades to an empty sync, not a crash.
  v_items := case
    when jsonb_typeof(v_body->'data') = 'array' then v_body->'data'
    when jsonb_typeof(v_body) = 'array' then v_body
    else '[]'::jsonb
  end;

  for v_account in
    select value
    from jsonb_array_elements(v_items)
  loop
    -- SwarmHit is LinkedIn-only; skip only when the account names a
    -- different platform explicitly.
    v_platform := v_account->>'platform';
    if v_platform is not null and lower(v_platform) <> 'linkedin' then
      continue;
    end if;

    v_external_id := v_account->>'id';
    if v_external_id is null then
      continue;
    end if;

    v_profile_url := v_account->>'profileUrl';

    -- Defensive status mapping. SwarmHitAccount.status is an open string
    -- in types.ts (no published vocabulary), so only the generic values
    -- below are recognised; anything else stays UNKNOWN and never grants
    -- AVAILABLE_PROVIDER. "checkpoint_required" / "connection_failed"
    -- appear as webhook event names in webhooks.ts, not as verified
    -- account status values.
    v_sender_status := case
      when coalesce((v_account->>'paused')::boolean, false) then 'PAUSED'
      when lower(coalesce(v_account->>'status', '')) in ('connected', 'active') then 'CONNECTED'
      when lower(coalesce(v_account->>'status', '')) in ('disconnected', 'archived', 'deleted') then 'DISCONNECTED'
      when lower(coalesce(v_account->>'status', '')) in ('checkpoint_required', 'checkpoint', 'needs_reconnection', 'connection_failed') then 'NEEDS_RECONNECTION'
      else 'UNKNOWN'
    end;

    -- li_integration_accounts.status has no PAUSED value (009), so a
    -- paused sender still reads as CONNECTED there; the paused flag
    -- itself is preserved on li_swarmhit_senders and in metadata.
    v_account_status := case
      when v_sender_status in ('CONNECTED', 'PAUSED') then 'CONNECTED'
      when v_sender_status = 'NEEDS_RECONNECTION' then 'NEEDS_RECONNECTION'
      when v_sender_status = 'DISCONNECTED' then 'DISCONNECTED'
      else 'UNKNOWN'
    end;

    v_type := case
      when v_profile_url ilike '%linkedin.com/company/%' then 'ORGANIZATION'
      when v_profile_url ilike '%linkedin.com/in/%' then 'PERSONAL'
      else 'UNKNOWN'
    end;

    insert into public.li_integration_accounts(
      tenant_id, integration_id, provider, platform, external_account_id,
      username, display_name, profile_url, account_type, status,
      capabilities, metadata, last_synced_at
    )
    values (
      p_tenant_id,
      p_integration_id,
      'swarmhit',
      'linkedin',
      v_external_id,
      v_account->>'username',
      coalesce(v_account->>'displayName', v_account->>'label'),
      v_profile_url,
      v_type,
      v_account_status,
      jsonb_build_object(
        'SEND_CONNECTION', v_sender_status = 'CONNECTED',
        'SEND_MESSAGE', v_sender_status = 'CONNECTED'
      ),
      jsonb_build_object(
        'label', v_account->'label',
        'platform', v_account->'platform',
        'status', v_account->'status',
        'paused', v_account->'paused',
        'pausedReason', v_account->'pausedReason',
        'isPremium', v_account->'isPremium',
        'health', v_account->'health',
        'cooldownUntil', v_account->'cooldownUntil'
      ),
      now()
    )
    on conflict (tenant_id, provider, platform, external_account_id)
    do update set
      integration_id = excluded.integration_id,
      username = excluded.username,
      display_name = excluded.display_name,
      profile_url = excluded.profile_url,
      account_type = excluded.account_type,
      status = excluded.status,
      capabilities = excluded.capabilities,
      metadata = excluded.metadata,
      last_synced_at = excluded.last_synced_at,
      updated_at = now();

    insert into public.li_swarmhit_senders(
      tenant_id, integration_id, swarmhit_account_id, linkedin_url,
      linkedin_type, status, ssi, paused, paused_reason,
      last_synced_at, metadata
    )
    values (
      p_tenant_id,
      p_integration_id,
      v_external_id,
      v_profile_url,
      case when coalesce((v_account->>'isPremium')::boolean, false) then 'PAID' else 'FREE' end,
      v_sender_status,
      (v_account->>'ssi')::integer,
      coalesce((v_account->>'paused')::boolean, false),
      v_account->>'pausedReason',
      now(),
      jsonb_build_object(
        'label', v_account->'label',
        'username', v_account->'username',
        'displayName', v_account->'displayName',
        'platform', v_account->'platform',
        'status', v_account->'status',
        'isPremium', v_account->'isPremium',
        'inmailCredits', v_account->'inmailCredits',
        'health', v_account->'health',
        'cooldownUntil', v_account->'cooldownUntil'
      )
    )
    on conflict (tenant_id, swarmhit_account_id)
    do update set
      integration_id = excluded.integration_id,
      linkedin_url = excluded.linkedin_url,
      linkedin_type = excluded.linkedin_type,
      status = excluded.status,
      ssi = excluded.ssi,
      paused = excluded.paused,
      paused_reason = excluded.paused_reason,
      last_synced_at = excluded.last_synced_at,
      metadata = excluded.metadata,
      updated_at = now();

    v_count := v_count + 1;
    if v_sender_status = 'CONNECTED' then
      v_connected := v_connected + 1;
    end if;
  end loop;

  -- Capabilities become AVAILABLE_PROVIDER only when at least one
  -- CONNECTED sender was verified in this sync. A paused, unknown or
  -- disconnected-only sync leaves existing rows untouched, so a prior
  -- AVAILABLE_ASSISTED default is never silently upgraded.
  if v_connected > 0 then
    insert into public.li_capabilities(
      tenant_id, integration_id, capability, mode, adapter,
      can_execute, requires_user_action, reason, health, last_verified_at
    )
    select
      p_tenant_id, p_integration_id, c.capability,
      'AVAILABLE_PROVIDER', 'swarmhit', true, false,
      'Connected LinkedIn sender via SwarmHit.', 'HEALTHY', now()
    from (values
      ('SEND_CONNECTION'),
      ('SEND_MESSAGE'),
      ('WRITE_COMMENT'),
      ('WRITE_REACTION')
    ) as c(capability)
    on conflict (tenant_id, capability, adapter)
    do update set
      integration_id = excluded.integration_id,
      mode = excluded.mode,
      can_execute = excluded.can_execute,
      requires_user_action = excluded.requires_user_action,
      reason = excluded.reason,
      health = excluded.health,
      last_verified_at = excluded.last_verified_at,
      updated_at = now();
  end if;

  update public.li_integrations
  set status = 'CONNECTED',
      requires_user_reauth = false,
      metadata = metadata || jsonb_build_object(
        'last_account_sync_at', now(),
        'swarmhit_account_count', v_count,
        'swarmhit_connected_count', v_connected
      ),
      updated_at = now()
  where id = p_integration_id;

  return jsonb_build_object(
    'ok', true,
    'accounts_synced', v_count,
    'connected_senders', v_connected
  );
end;
$$;

revoke all on function public.li_swarmhit_sync_accounts(uuid,uuid) from public, anon, authenticated;
grant execute on function public.li_swarmhit_sync_accounts(uuid,uuid) to authenticated;
