-- Zernio multi-account registry, encrypted credential setter, and read-only account sync.

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
for select to authenticated using ((select li_private.has_tenant_access(tenant_id)));
create policy li_integration_accounts_insert on public.li_integration_accounts
for insert to authenticated with check ((select li_private.is_tenant_admin(tenant_id)));
create policy li_integration_accounts_update on public.li_integration_accounts
for update to authenticated
using ((select li_private.is_tenant_admin(tenant_id)))
with check ((select li_private.is_tenant_admin(tenant_id)));
create policy li_integration_accounts_delete on public.li_integration_accounts
for delete to authenticated using ((select li_private.is_tenant_admin(tenant_id)));

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
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_ref text;
  v_secret_id uuid;
  v_name text;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if not li_private.is_tenant_admin(p_tenant_id) then raise exception 'Tenant admin access required'; end if;
  if p_secret is null or length(trim(p_secret)) < 20 then raise exception 'Secret is missing or too short'; end if;

  select token_ref into v_ref
  from public.li_integrations
  where id=p_integration_id and tenant_id=p_tenant_id;
  if not found then raise exception 'Integration not found'; end if;

  v_name := 'linkedin-os:'||p_tenant_id::text||':integration:'||p_integration_id::text;
  if v_ref is not null and v_ref ~* '^[0-9a-f-]{36}$' then
    v_secret_id := v_ref::uuid;
    perform vault.update_secret(v_secret_id,p_secret,v_name,'LinkedIn OS integration credential');
  else
    select vault.create_secret(p_secret,v_name,'LinkedIn OS integration credential') into v_secret_id;
  end if;

  update public.li_integrations
  set token_ref=v_secret_id::text, auth_type='API_KEY',
      requires_user_reauth=false, status='CONNECTED', updated_at=now()
  where id=p_integration_id and tenant_id=p_tenant_id;

  return v_secret_id;
end;
$$;

revoke all on function public.li_set_integration_secret(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.li_set_integration_secret(uuid,uuid,text) to authenticated;

-- The live implementation of li_zernio_sync_accounts performs an authenticated
-- GET https://zernio.com/api/v1/accounts using the Vault secret, normalizes only
-- LinkedIn accounts into li_integration_accounts, and registers verified
-- PUBLISH_MEMBER_POST / PUBLISH_PAGE_POST / READ_POST_ANALYTICS capabilities.
-- Keep the function body in the live migration history and test it without
-- invoking POST /v1/posts.
