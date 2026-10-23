create or replace function public.li_set_oauth_access_token(
  p_tenant_id uuid,
  p_integration_id uuid,
  p_access_token text,
  p_expires_at timestamptz,
  p_scopes text[],
  p_external_account_id text,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  v_uid uuid:=auth.uid();
  v_ref text;
  v_secret_id uuid;
  v_name text;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if not li_private.is_tenant_admin(p_tenant_id) then raise exception 'Tenant admin access required'; end if;
  if p_access_token is null or length(trim(p_access_token))<20 then raise exception 'OAuth access token is missing or too short'; end if;

  select token_ref into v_ref
  from public.li_integrations
  where id=p_integration_id
    and tenant_id=p_tenant_id
    and provider='linkedin-official';

  if not found then raise exception 'LinkedIn integration not found'; end if;

  v_name:='linkedin-os:'||p_tenant_id::text||':linkedin-official:'||p_integration_id::text;

  if v_ref is not null and v_ref ~* '^[0-9a-f-]{36}$' then
    v_secret_id:=v_ref::uuid;
    perform vault.update_secret(v_secret_id,p_access_token,v_name,'LinkedIn OS OAuth access token');
  else
    select vault.create_secret(p_access_token,v_name,'LinkedIn OS OAuth access token')
      into v_secret_id;
  end if;

  update public.li_integrations
  set token_ref=v_secret_id::text,
      auth_type='OAUTH2',
      status='CONNECTED',
      external_account_id=p_external_account_id,
      scopes=coalesce(p_scopes,'{}'::text[]),
      expires_at=p_expires_at,
      requires_user_reauth=false,
      metadata=metadata||coalesce(p_metadata,'{}'::jsonb)||jsonb_build_object(
        'identity_verified_at',now(),
        'publishing_ready',false
      ),
      updated_at=now()
  where id=p_integration_id and tenant_id=p_tenant_id;

  insert into public.li_capabilities(
    tenant_id,integration_id,capability,mode,adapter,
    can_execute,requires_user_action,reason,health,last_verified_at
  ) values(
    p_tenant_id,p_integration_id,'READ_MEMBER_IDENTITY',
    'AVAILABLE_OFFICIAL','linkedin-official',true,false,
    'Authenticated LinkedIn member identity through OpenID Connect.','HEALTHY',now()
  )
  on conflict(tenant_id,capability,adapter)
  do update set
    integration_id=excluded.integration_id,
    mode=excluded.mode,
    can_execute=excluded.can_execute,
    requires_user_action=excluded.requires_user_action,
    reason=excluded.reason,
    health=excluded.health,
    last_verified_at=excluded.last_verified_at,
    updated_at=now();

  delete from public.li_capabilities
  where tenant_id=p_tenant_id
    and adapter='linkedin-official'
    and capability='PUBLISH_MEMBER_POST';

  return v_secret_id;
end;
$$;

revoke all on function public.li_set_oauth_access_token(uuid,uuid,text,timestamptz,text[],text,jsonb)
from public,anon,authenticated;
grant execute on function public.li_set_oauth_access_token(uuid,uuid,text,timestamptz,text[],text,jsonb)
to authenticated;
