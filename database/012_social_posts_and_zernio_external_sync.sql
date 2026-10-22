-- Normalized owned social posts + analytics snapshots and read-only Zernio external-post sync.

create table if not exists public.li_social_posts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.li_tenants(id) on delete cascade,
  integration_account_id uuid not null references public.li_integration_accounts(id) on delete cascade,
  provider text not null,
  platform text not null,
  external_post_id text not null,
  post_url text,
  author_type text not null default 'UNKNOWN'
    check (author_type in ('PERSONAL','ORGANIZATION','UNKNOWN')),
  source text not null default 'PROVIDER_SYNC'
    check (source in ('PROVIDER_SYNC','PLATFORM_DISCOVERED','EXTERNAL_IMPORTED','MANUAL')),
  content text,
  published_at timestamptz,
  media_type text,
  media_url text,
  thumbnail_url text,
  metrics jsonb not null default '{}'::jsonb,
  metrics_synced_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists li_social_posts_identity_uq
  on public.li_social_posts(tenant_id,integration_account_id,external_post_id);
create index if not exists li_social_posts_tenant_published_idx
  on public.li_social_posts(tenant_id,published_at desc);
create index if not exists li_social_posts_account_idx
  on public.li_social_posts(integration_account_id);

create table if not exists public.li_social_analytics_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.li_tenants(id) on delete cascade,
  integration_account_id uuid not null references public.li_integration_accounts(id) on delete cascade,
  social_post_id uuid references public.li_social_posts(id) on delete cascade,
  provider text not null,
  platform text not null,
  scope text not null default 'POST'
    check (scope in ('POST','ACCOUNT','PROFILE','ORGANIZATION')),
  metrics jsonb not null default '{}'::jsonb,
  captured_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists li_social_analytics_tenant_captured_idx
  on public.li_social_analytics_snapshots(tenant_id,captured_at desc);
create index if not exists li_social_analytics_account_idx
  on public.li_social_analytics_snapshots(integration_account_id,captured_at desc);

alter table public.li_content_engagement
  add column if not exists social_post_id uuid references public.li_social_posts(id) on delete set null;

alter table public.li_social_posts enable row level security;
alter table public.li_social_analytics_snapshots enable row level security;

drop policy if exists li_social_posts_select on public.li_social_posts;
drop policy if exists li_social_posts_insert on public.li_social_posts;
drop policy if exists li_social_posts_update on public.li_social_posts;
drop policy if exists li_social_posts_delete on public.li_social_posts;

create policy li_social_posts_select on public.li_social_posts
for select to authenticated using ((select li_private.has_tenant_access(tenant_id)));
create policy li_social_posts_insert on public.li_social_posts
for insert to authenticated with check ((select li_private.can_write_tenant(tenant_id)));
create policy li_social_posts_update on public.li_social_posts
for update to authenticated
using ((select li_private.can_write_tenant(tenant_id)))
with check ((select li_private.can_write_tenant(tenant_id)));
create policy li_social_posts_delete on public.li_social_posts
for delete to authenticated using ((select li_private.is_tenant_admin(tenant_id)));

drop policy if exists li_social_analytics_select on public.li_social_analytics_snapshots;
drop policy if exists li_social_analytics_insert on public.li_social_analytics_snapshots;
drop policy if exists li_social_analytics_delete on public.li_social_analytics_snapshots;

create policy li_social_analytics_select on public.li_social_analytics_snapshots
for select to authenticated using ((select li_private.has_tenant_access(tenant_id)));
create policy li_social_analytics_insert on public.li_social_analytics_snapshots
for insert to authenticated with check ((select li_private.can_write_tenant(tenant_id)));
create policy li_social_analytics_delete on public.li_social_analytics_snapshots
for delete to authenticated using ((select li_private.is_tenant_admin(tenant_id)));

grant select,insert,update,delete on public.li_social_posts to authenticated;
grant select,insert,delete on public.li_social_analytics_snapshots to authenticated;

drop trigger if exists li_social_posts_updated_at_trigger on public.li_social_posts;
create trigger li_social_posts_updated_at_trigger
before update on public.li_social_posts
for each row execute function li_private.set_updated_at();

create or replace function public.li_zernio_sync_external_posts(
  p_tenant_id uuid,
  p_integration_account_id uuid,
  p_url text default null
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
  v_item jsonb;
  v_post_id uuid;
  v_external_id text;
  v_count integer := 0;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if not li_private.can_write_tenant(p_tenant_id) then raise exception 'Tenant write access required'; end if;

  select integration_id,external_account_id,account_type
    into v_integration_id,v_account_id,v_account_type
  from public.li_integration_accounts
  where id=p_integration_account_id
    and tenant_id=p_tenant_id
    and provider='zernio'
    and platform='linkedin'
    and status='CONNECTED';

  if not found then raise exception 'Connected Zernio LinkedIn account not found'; end if;

  if v_account_type='PERSONAL' and nullif(trim(p_url),'') is null then
    raise exception 'A LinkedIn post URL or URN is required for personal-profile external post sync';
  end if;

  select token_ref into v_ref
  from public.li_integrations
  where id=v_integration_id and tenant_id=p_tenant_id and provider='zernio';

  if v_ref is null then raise exception 'Zernio API key is not configured'; end if;

  select decrypted_secret into v_secret
  from vault.decrypted_secrets where id=v_ref::uuid;

  if v_secret is null then raise exception 'Zernio API key could not be resolved'; end if;

  select * into v_response
  from extensions.http((
    'POST',
    'https://zernio.com/api/v1/posts/sync-external',
    extensions.http_headers(
      'Authorization','Bearer '||v_secret,
      'Accept','application/json',
      'Content-Type','application/json'
    ),
    'application/json',
    jsonb_strip_nulls(jsonb_build_object(
      'accountId',v_account_id,
      'url',nullif(trim(p_url),'')
    ))::text
  )::extensions.http_request);

  if v_response.status < 200 or v_response.status >= 300 then
    raise exception 'Zernio external-post sync failed with HTTP %',v_response.status;
  end if;

  v_body:=coalesce(v_response.content::jsonb,'{}'::jsonb);

  for v_item in
    select value from jsonb_array_elements(
      case
        when jsonb_typeof(v_body->'posts')='array' then v_body->'posts'
        when v_body->'post' is not null then jsonb_build_array(v_body->'post')
        else '[]'::jsonb
      end
    )
  loop
    v_external_id:=coalesce(v_item->>'platformPostId',v_item->>'id');
    if v_external_id is null then continue; end if;

    insert into public.li_social_posts(
      tenant_id,integration_account_id,provider,platform,external_post_id,
      post_url,author_type,source,content,published_at,media_type,media_url,
      thumbnail_url,metrics,metrics_synced_at,metadata
    )
    values(
      p_tenant_id,p_integration_account_id,'zernio','linkedin',v_external_id,
      v_item->>'platformPostUrl',v_account_type,
      case when nullif(trim(p_url),'') is null then 'PLATFORM_DISCOVERED' else 'EXTERNAL_IMPORTED' end,
      nullif(v_item->>'content',''),
      nullif(v_item->>'publishedAt','')::timestamptz,
      v_item->>'mediaType',v_item->>'mediaUrl',v_item->>'thumbnailUrl',
      coalesce(v_item->'analytics','{}'::jsonb),
      case when v_item->'analytics' is not null then now() else null end,
      jsonb_build_object('mediaItems',coalesce(v_item->'mediaItems','[]'::jsonb))
    )
    on conflict(tenant_id,integration_account_id,external_post_id)
    do update set
      post_url=excluded.post_url,
      content=coalesce(excluded.content,public.li_social_posts.content),
      published_at=coalesce(excluded.published_at,public.li_social_posts.published_at),
      media_type=coalesce(excluded.media_type,public.li_social_posts.media_type),
      media_url=coalesce(excluded.media_url,public.li_social_posts.media_url),
      thumbnail_url=coalesce(excluded.thumbnail_url,public.li_social_posts.thumbnail_url),
      metrics=case when excluded.metrics='{}'::jsonb then public.li_social_posts.metrics else excluded.metrics end,
      metrics_synced_at=coalesce(excluded.metrics_synced_at,public.li_social_posts.metrics_synced_at),
      metadata=public.li_social_posts.metadata||excluded.metadata,
      updated_at=now()
    returning id into v_post_id;

    if v_item->'analytics' is not null then
      insert into public.li_social_analytics_snapshots(
        tenant_id,integration_account_id,social_post_id,provider,platform,scope,metrics,metadata
      ) values(
        p_tenant_id,p_integration_account_id,v_post_id,'zernio','linkedin','POST',
        v_item->'analytics',jsonb_build_object('source','sync-external')
      );
    end if;

    v_count:=v_count+1;
  end loop;

  update public.li_integration_accounts
  set last_synced_at=now(),
      metadata=metadata||jsonb_build_object('last_external_post_sync_at',now())
  where id=p_integration_account_id and tenant_id=p_tenant_id;

  return jsonb_build_object(
    'ok',true,
    'account_type',v_account_type,
    'posts_synced',v_count,
    'provider_sync',coalesce(v_body->'synced','{}'::jsonb),
    'found',coalesce(v_body->'found','null'::jsonb)
  );
end;
$$;

revoke all on function public.li_zernio_sync_external_posts(uuid,uuid,text)
from public,anon,authenticated;
grant execute on function public.li_zernio_sync_external_posts(uuid,uuid,text)
to authenticated;
