-- Zernio multi-account registry, encrypted credential storage, and read-only account sync.

create table if not exists public.li_integration_accounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.li_tenants(id) on delete cascade,
  integration_id uuid references public.li_integrations(id) on delete cascade,
  provider text not null,
  platform text not null,
  external_account_id text not null,
  username text,
  display_name text,
  profile_url text,
  account_type text not null default 'UNKNOWN'
    check (account_type in ('PERSONAL','ORGANIZATION','UNKNOWN')),
  status text not null default 'CONNECTED'
    check (status in ('CONNECTED','NEEDS_RECONNECTION','DISCONNECTED','UNKNOWN')),
  capabilities jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists li_integration_accounts_identity_uq
  on public.li_integration_accounts(tenant_id, provider, platform, external_account_id);

create index if not exists li_integration_accounts_tenant_idx
  on public.li_integration_accounts(tenant_id, provider, platform, status);

alter table public.li_integration_accounts enable row level security;

drop policy if exists li_integration_accounts_select on public.li_integration_accounts;
drop policy if exists li_integration_accounts_insert on public.li_integration_accounts;
drop policy if exists li_integration_accounts_update on public.li_integration_accounts;
drop policy if exists li_integration_accounts_delete on public.li_integration_accounts;

create policy li_integration_accounts_select on public.li_integration_accounts
for select to authenticated
using ((select li_private.has_tenant_access(tenant_id)));

create policy li_integration_accounts_insert on public.li_integration_accounts
for insert to authenticated
with check ((select li_private.is_tenant_admin(tenant_id)));

create policy li_integration_accounts_update on public.li_integration_accounts
for update to authenticated
using ((select li_private.is_tenant_admin(tenant_id)))
with check ((select li_private.is_tenant_admin(tenant_id)));

create policy li_integration_accounts_delete on public.li_integration_accounts
for delete to authenticated
using ((select li_private.is_tenant_admin(tenant_id)));

grant select, insert, update, delete on public.li_integration_accounts to authenticated;

drop trigger if exists li_integration_accounts_updated_at_trigger on public.li_integration_accounts;
create trigger li_integration_accounts_updated_at_trigger
before update on public.li_integration_accounts
for each row execute function li_private.set_updated_at();

create extension if not exists http with schema extensions;

create or replace function public.li_set_integration_secret(
  p_tenant_id uuid,
  p_integration_id uuid,
  p_secret text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_ref text;
  v_secret_id uuid;
  v_name text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if not li_private.is_tenant_admin(p_tenant_id) then
    raise exception 'Tenant admin access required';
  end if;

  if p_secret is null or length(trim(p_secret)) < 20 then
    raise exception 'Secret is missing or too short';
  end if;

  select token_ref
    into v_ref
  from public.li_integrations
  where id = p_integration_id
    and tenant_id = p_tenant_id;

  if not found then
    raise exception 'Integration not found';
  end if;

  v_name := 'linkedin-os:' || p_tenant_id::text || ':integration:' || p_integration_id::text;

  if v_ref is not null and v_ref ~* '^[0-9a-f-]{36}$' then
    v_secret_id := v_ref::uuid;
    perform vault.update_secret(
      v_secret_id,
      p_secret,
      v_name,
      'LinkedIn OS integration credential'
    );
  else
    select vault.create_secret(
      p_secret,
      v_name,
      'LinkedIn OS integration credential'
    ) into v_secret_id;
  end if;

  update public.li_integrations
  set token_ref = v_secret_id::text,
      auth_type = 'API_KEY',
      requires_user_reauth = false,
      status = 'CONNECTED',
      updated_at = now()
  where id = p_integration_id
    and tenant_id = p_tenant_id;

  return v_secret_id;
end;
$$;

revoke all on function public.li_set_integration_secret(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.li_set_integration_secret(uuid,uuid,text) to authenticated;

create or replace function public.li_zernio_sync_accounts(
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
  v_account jsonb;
  v_external_id text;
  v_profile_url text;
  v_type text;
  v_status text;
  v_has_analytics boolean;
  v_count integer := 0;
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
    and lower(provider) = 'zernio';

  if not found then
    raise exception 'Zernio integration not found';
  end if;

  if v_ref is null then
    raise exception 'Zernio API key is not configured';
  end if;

  select decrypted_secret
    into v_secret
  from vault.decrypted_secrets
  where id = v_ref::uuid;

  if v_secret is null then
    raise exception 'Zernio API key could not be resolved';
  end if;

  select *
    into v_response
  from extensions.http((
    'GET',
    'https://zernio.com/api/v1/accounts',
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

    raise exception 'Zernio account sync failed with HTTP %', v_response.status;
  end if;

  v_body := coalesce(v_response.content::jsonb, '{}'::jsonb);

  for v_account in
    select value
    from jsonb_array_elements(coalesce(v_body->'accounts', '[]'::jsonb))
  loop
    if lower(coalesce(v_account->>'platform','')) <> 'linkedin' then
      continue;
    end if;

    v_external_id := coalesce(v_account->>'id', v_account->>'_id');
    if v_external_id is null then
      continue;
    end if;

    v_profile_url := coalesce(v_account->>'profileUrl', v_account->>'profile_url');
    v_type := case
      when v_profile_url ilike '%linkedin.com/company/%' then 'ORGANIZATION'
      when v_profile_url ilike '%linkedin.com/in/%' then 'PERSONAL'
      else 'UNKNOWN'
    end;

    v_status := case
      when coalesce((v_account->>'isActive')::boolean, true) then 'CONNECTED'
      else 'DISCONNECTED'
    end;

    v_has_analytics := coalesce((v_account->>'hasAnalyticsAccess')::boolean, false);

    insert into public.li_integration_accounts(
      tenant_id, integration_id, provider, platform, external_account_id,
      username, display_name, profile_url, account_type, status,
      capabilities, metadata, last_synced_at
    )
    values (
      p_tenant_id,
      p_integration_id,
      'zernio',
      'linkedin',
      v_external_id,
      v_account->>'username',
      coalesce(v_account->>'displayName', v_account->>'display_name'),
      v_profile_url,
      v_type,
      v_status,
      case
        when v_type = 'PERSONAL' then jsonb_build_object(
          'PUBLISH_MEMBER_POST', true,
          'READ_POST_ANALYTICS', v_has_analytics,
          'LIST_OWN_POSTS', true
        )
        when v_type = 'ORGANIZATION' then jsonb_build_object(
          'PUBLISH_PAGE_POST', true,
          'READ_POST_ANALYTICS', v_has_analytics,
          'LIST_OWN_POSTS', true,
          'READ_PAGE_COMMENTS', true
        )
        else jsonb_build_object('LIST_OWN_POSTS', true)
      end,
      jsonb_build_object(
        'profileId', v_account->'profileId',
        'isActive', v_account->'isActive',
        'hasAnalyticsAccess', v_account->'hasAnalyticsAccess'
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

    v_count := v_count + 1;
  end loop;

  if exists (
    select 1 from public.li_integration_accounts
    where tenant_id = p_tenant_id
      and integration_id = p_integration_id
      and provider = 'zernio'
      and platform = 'linkedin'
      and status = 'CONNECTED'
      and account_type = 'PERSONAL'
  ) then
    insert into public.li_capabilities(
      tenant_id, integration_id, capability, mode, adapter,
      can_execute, requires_user_action, reason, health, last_verified_at
    )
    values (
      p_tenant_id, p_integration_id, 'PUBLISH_MEMBER_POST',
      'AVAILABLE_OFFICIAL', 'zernio', true, false,
      'Connected LinkedIn personal profile via Zernio.', 'HEALTHY', now()
    )
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

  if exists (
    select 1 from public.li_integration_accounts
    where tenant_id = p_tenant_id
      and integration_id = p_integration_id
      and provider = 'zernio'
      and platform = 'linkedin'
      and status = 'CONNECTED'
      and account_type = 'ORGANIZATION'
  ) then
    insert into public.li_capabilities(
      tenant_id, integration_id, capability, mode, adapter,
      can_execute, requires_user_action, reason, health, last_verified_at
    )
    values (
      p_tenant_id, p_integration_id, 'PUBLISH_PAGE_POST',
      'AVAILABLE_OFFICIAL', 'zernio', true, false,
      'Connected LinkedIn organization Page via Zernio.', 'HEALTHY', now()
    )
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

  insert into public.li_capabilities(
    tenant_id, integration_id, capability, mode, adapter,
    can_execute, requires_user_action, reason, health, last_verified_at
  )
  select
    p_tenant_id, p_integration_id, 'READ_POST_ANALYTICS',
    'AVAILABLE_OFFICIAL', 'zernio', true, false,
    'Zernio analytics available for at least one connected LinkedIn account.',
    'HEALTHY', now()
  where exists (
    select 1 from public.li_integration_accounts
    where tenant_id = p_tenant_id
      and integration_id = p_integration_id
      and provider = 'zernio'
      and platform = 'linkedin'
      and status = 'CONNECTED'
      and coalesce((capabilities->>'READ_POST_ANALYTICS')::boolean, false)
  )
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

  update public.li_integrations
  set status = 'CONNECTED',
      requires_user_reauth = false,
      metadata = metadata || jsonb_build_object(
        'last_account_sync_at', now(),
        'linkedin_account_count', v_count
      ),
      updated_at = now()
  where id = p_integration_id;

  return jsonb_build_object(
    'ok', true,
    'linkedin_accounts_synced', v_count
  );
end;
$$;

revoke all on function public.li_zernio_sync_accounts(uuid,uuid) from public, anon, authenticated;
grant execute on function public.li_zernio_sync_accounts(uuid,uuid) to authenticated;
