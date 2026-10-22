-- Read-only LinkedIn organization Page comment monitoring through Zernio.

create table if not exists public.li_social_comment_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.li_tenants(id) on delete cascade,
  integration_account_id uuid not null references public.li_integration_accounts(id) on delete cascade,
  provider text not null,
  platform text not null,
  comment_count integer not null default 0,
  payload jsonb not null default '{}'::jsonb,
  captured_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists li_social_comment_snapshots_tenant_idx
  on public.li_social_comment_snapshots(tenant_id,captured_at desc);

create index if not exists li_social_comment_snapshots_account_idx
  on public.li_social_comment_snapshots(integration_account_id,captured_at desc);

alter table public.li_social_comment_snapshots enable row level security;

drop policy if exists li_social_comment_snapshots_select on public.li_social_comment_snapshots;
drop policy if exists li_social_comment_snapshots_insert on public.li_social_comment_snapshots;
drop policy if exists li_social_comment_snapshots_delete on public.li_social_comment_snapshots;

create policy li_social_comment_snapshots_select
on public.li_social_comment_snapshots for select to authenticated
using ((select li_private.has_tenant_access(tenant_id)));

create policy li_social_comment_snapshots_insert
on public.li_social_comment_snapshots for insert to authenticated
with check ((select li_private.is_tenant_admin(tenant_id)));

create policy li_social_comment_snapshots_delete
on public.li_social_comment_snapshots for delete to authenticated
using ((select li_private.is_tenant_admin(tenant_id)));

grant select,insert,delete on public.li_social_comment_snapshots to authenticated;

create or replace function public.li_zernio_sync_page_comments(
  p_tenant_id uuid,
  p_integration_account_id uuid,
  p_limit integer default 50
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_integration_id uuid;
  v_account_id text;
  v_account_type text;
  v_ref text;
  v_secret text;
  v_response extensions.http_response;
  v_body jsonb;
  v_count integer := 0;
  v_limit integer := greatest(1,least(coalesce(p_limit,50),100));
  v_url text;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if not li_private.is_tenant_admin(p_tenant_id) then raise exception 'Tenant admin access required'; end if;

  select integration_id,external_account_id,account_type
    into v_integration_id,v_account_id,v_account_type
  from public.li_integration_accounts
  where id=p_integration_account_id
    and tenant_id=p_tenant_id
    and provider='zernio'
    and platform='linkedin'
    and status='CONNECTED';

  if not found then raise exception 'Connected Zernio LinkedIn account not found'; end if;
  if v_account_type <> 'ORGANIZATION' then
    raise exception 'LinkedIn Page comment monitoring is available only for organization accounts';
  end if;

  select token_ref into v_ref
  from public.li_integrations
  where id=v_integration_id and tenant_id=p_tenant_id and provider='zernio';

  if v_ref is null then raise exception 'Zernio API key is not configured'; end if;

  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where id=v_ref::uuid;

  if v_secret is null then raise exception 'Zernio API key could not be resolved'; end if;

  v_url:='https://zernio.com/api/v1/inbox/comments?platform=linkedin'
    ||'&accountId='||v_account_id
    ||'&limit='||v_limit::text
    ||'&sortBy=date&sortOrder=desc';

  select * into v_response
  from extensions.http((
    'GET',
    v_url,
    extensions.http_headers(
      'Authorization','Bearer '||v_secret,
      'Accept','application/json'
    ),
    null,
    null
  )::extensions.http_request);

  if v_response.status < 200 or v_response.status >= 300 then
    update public.li_integration_accounts
    set metadata=metadata||jsonb_build_object(
      'last_comment_sync_error_at',now(),
      'last_comment_sync_http_status',v_response.status
    ),
    updated_at=now()
    where id=p_integration_account_id and tenant_id=p_tenant_id;

    raise exception 'Zernio Page-comment sync failed with HTTP %',v_response.status;
  end if;

  v_body:=coalesce(v_response.content::jsonb,'{}'::jsonb);

  v_count:=case
    when jsonb_typeof(v_body->'comments')='array' then jsonb_array_length(v_body->'comments')
    when jsonb_typeof(v_body->'data')='array' then jsonb_array_length(v_body->'data')
    else 0
  end;

  insert into public.li_social_comment_snapshots(
    tenant_id,integration_account_id,provider,platform,comment_count,payload,metadata
  ) values(
    p_tenant_id,p_integration_account_id,'zernio','linkedin',v_count,v_body,
    jsonb_build_object(
      'kind','PAGE_COMMENTS',
      'limit',v_limit,
      'readOnly',true
    )
  );

  update public.li_integration_accounts
  set last_synced_at=now(),
      metadata=metadata||jsonb_build_object(
        'last_comment_sync_at',now(),
        'last_comment_count',v_count
      ),
      updated_at=now()
  where id=p_integration_account_id and tenant_id=p_tenant_id;

  insert into public.li_capabilities(
    tenant_id,integration_id,capability,mode,adapter,
    can_execute,requires_user_action,reason,health,last_verified_at
  ) values(
    p_tenant_id,v_integration_id,'READ_PAGE_COMMENTS',
    'AVAILABLE_OFFICIAL','zernio',true,false,
    'Read-only LinkedIn organization Page comments through Zernio.','HEALTHY',now()
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

  return jsonb_build_object(
    'ok',true,
    'comment_count',v_count,
    'read_only',true,
    'meta',coalesce(v_body->'meta','{}'::jsonb)
  );
end;
$$;

revoke all on function public.li_zernio_sync_page_comments(uuid,uuid,integer)
from public,anon,authenticated;
grant execute on function public.li_zernio_sync_page_comments(uuid,uuid,integer)
to authenticated;
