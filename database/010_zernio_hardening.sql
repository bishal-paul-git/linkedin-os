-- Zernio integration hardening after the initial provider migration.

create index if not exists li_integration_accounts_integration_idx
  on public.li_integration_accounts(integration_id);

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

  -- Credential storage alone does not prove provider health.
  -- The read-only account sync promotes the integration to CONNECTED.
  update public.li_integrations
  set token_ref = v_secret_id::text,
      auth_type = 'API_KEY',
      requires_user_reauth = false,
      status = 'DISCONNECTED',
      updated_at = now()
  where id = p_integration_id
    and tenant_id = p_tenant_id;

  return v_secret_id;
end;
$$;

revoke all on function public.li_set_integration_secret(uuid,uuid,text)
  from public, anon, authenticated;
grant execute on function public.li_set_integration_secret(uuid,uuid,text)
  to authenticated;
