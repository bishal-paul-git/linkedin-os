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

create or replace function public.li_zernio_sync_account_analytics(
  p_tenant_id uuid,
  p_integration_account_id uuid,
  p_from_date date default (current_date - 30),
  p_to_date date default current_date
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
  v_best extensions.http_response;
  v_best_body jsonb;
  v_frequency extensions.http_response;
  v_frequency_body jsonb;
  v_item jsonb;
  v_external_id text;
  v_post_id uuid;
  v_post_count integer := 0;
  v_scope text;
  v_url text;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if not li_private.is_tenant_admin(p_tenant_id) then raise exception 'Tenant admin access required'; end if;
  if p_from_date is null or p_to_date is null then raise exception 'Analytics date range is required'; end if;
  if p_from_date > p_to_date then raise exception 'Analytics start date must be on or before end date'; end if;
  if (p_to_date - p_from_date) > 366 then raise exception 'Analytics range cannot exceed 366 days'; end if;

  select integration_id,external_account_id,account_type
    into v_integration_id,v_account_id,v_account_type
  from public.li_integration_accounts
  where id=p_integration_account_id
    and tenant_id=p_tenant_id
    and provider='zernio'
    and platform='linkedin'
    and status='CONNECTED';

  if not found then raise exception 'Connected Zernio LinkedIn account not found'; end if;

  select token_ref into v_ref
  from public.li_integrations
  where id=v_integration_id and tenant_id=p_tenant_id and provider='zernio';

  if v_ref is null then raise exception 'Zernio API key is not configured'; end if;

  select decrypted_secret into v_secret
  from vault.decrypted_secrets where id=v_ref::uuid;

  if v_secret is null then raise exception 'Zernio API key could not be resolved'; end if;

  v_scope:=case when v_account_type='ORGANIZATION' then 'ORGANIZATION' else 'PROFILE' end;

  v_url:='https://zernio.com/api/v1/analytics?platform=linkedin'
    ||'&accountId='||v_account_id
    ||'&fromDate='||p_from_date::text
    ||'&toDate='||p_to_date::text;

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
    raise exception 'Zernio analytics sync failed with HTTP %',v_response.status;
  end if;

  v_body:=coalesce(v_response.content::jsonb,'{}'::jsonb);

  insert into public.li_social_analytics_snapshots(
    tenant_id,integration_account_id,provider,platform,scope,metrics,metadata
  ) values(
    p_tenant_id,p_integration_account_id,'zernio','linkedin',v_scope,
    v_body,
    jsonb_build_object(
      'kind','ACCOUNT_ANALYTICS',
      'fromDate',p_from_date,
      'toDate',p_to_date
    )
  );

  for v_item in
    select value
    from jsonb_array_elements(
      case
        when jsonb_typeof(v_body->'posts')='array' then v_body->'posts'
        else '[]'::jsonb
      end
    )
  loop
    v_external_id:=coalesce(
      nullif(v_item->>'platformPostId',''),
      nullif(v_item->>'platformPostUrl',''),
      nullif(v_item->>'_id',''),
      nullif(v_item->>'id','')
    );
    if v_external_id is null then continue; end if;

    insert into public.li_social_posts(
      tenant_id,integration_account_id,provider,platform,external_post_id,
      post_url,author_type,source,content,published_at,metrics,metrics_synced_at,metadata
    ) values(
      p_tenant_id,p_integration_account_id,'zernio','linkedin',v_external_id,
      nullif(v_item->>'platformPostUrl',''),
      v_account_type,
      'PROVIDER_SYNC',
      nullif(v_item->>'content',''),
      nullif(v_item->>'publishedAt','')::timestamptz,
      coalesce(v_item->'analytics','{}'::jsonb),
      case when v_item->'analytics' is not null then now() else null end,
      jsonb_build_object(
        'zernioPostId',coalesce(v_item->>'_id',v_item->>'id'),
        'status',v_item->>'status'
      )
    )
    on conflict(tenant_id,integration_account_id,external_post_id)
    do update set
      post_url=coalesce(excluded.post_url,public.li_social_posts.post_url),
      content=coalesce(excluded.content,public.li_social_posts.content),
      published_at=coalesce(excluded.published_at,public.li_social_posts.published_at),
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
        v_item->'analytics',
        jsonb_build_object(
          'kind','POST_ANALYTICS',
          'fromDate',p_from_date,
          'toDate',p_to_date
        )
      );
    end if;

    v_post_count:=v_post_count+1;
  end loop;

  select * into v_best
  from extensions.http((
    'GET',
    'https://zernio.com/api/v1/analytics/best-time?platform=linkedin&accountId='||v_account_id,
    extensions.http_headers(
      'Authorization','Bearer '||v_secret,
      'Accept','application/json'
    ),
    null,
    null
  )::extensions.http_request);

  if v_best.status >= 200 and v_best.status < 300 then
    v_best_body:=coalesce(v_best.content::jsonb,'{}'::jsonb);
    insert into public.li_social_analytics_snapshots(
      tenant_id,integration_account_id,provider,platform,scope,metrics,metadata
    ) values(
      p_tenant_id,p_integration_account_id,'zernio','linkedin',v_scope,
      v_best_body,jsonb_build_object('kind','BEST_TIME')
    );
  else
    v_best_body:=jsonb_build_object('unavailable',true,'httpStatus',v_best.status);
  end if;

  select * into v_frequency
  from extensions.http((
    'GET',
    'https://zernio.com/api/v1/analytics/posting-frequency?platform=linkedin&accountId='||v_account_id,
    extensions.http_headers(
      'Authorization','Bearer '||v_secret,
      'Accept','application/json'
    ),
    null,
    null
  )::extensions.http_request);

  if v_frequency.status >= 200 and v_frequency.status < 300 then
    v_frequency_body:=coalesce(v_frequency.content::jsonb,'{}'::jsonb);
    insert into public.li_social_analytics_snapshots(
      tenant_id,integration_account_id,provider,platform,scope,metrics,metadata
    ) values(
      p_tenant_id,p_integration_account_id,'zernio','linkedin',v_scope,
      v_frequency_body,jsonb_build_object('kind','POSTING_FREQUENCY')
    );
  else
    v_frequency_body:=jsonb_build_object('unavailable',true,'httpStatus',v_frequency.status);
  end if;

  update public.li_integration_accounts
  set last_synced_at=now(),
      metadata=metadata||jsonb_build_object(
        'last_analytics_sync_at',now(),
        'last_analytics_from_date',p_from_date,
        'last_analytics_to_date',p_to_date
      )
  where id=p_integration_account_id and tenant_id=p_tenant_id;

  insert into public.li_capabilities(
    tenant_id,integration_id,capability,mode,adapter,
    can_execute,requires_user_action,reason,health,last_verified_at
  ) values(
    p_tenant_id,v_integration_id,'READ_ACCOUNT_ANALYTICS',
    'AVAILABLE_OFFICIAL','zernio',true,false,
    'Read-only LinkedIn account analytics through Zernio.','HEALTHY',now()
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
    'account_type',v_account_type,
    'fromDate',p_from_date,
    'toDate',p_to_date,
    'posts_refreshed',v_post_count,
    'analytics',v_body,
    'bestTime',v_best_body,
    'postingFrequency',v_frequency_body
  );
end;
$$;

revoke all on function public.li_zernio_sync_account_analytics(uuid,uuid,date,date)
from public,anon,authenticated;
grant execute on function public.li_zernio_sync_account_analytics(uuid,uuid,date,date)
to authenticated;