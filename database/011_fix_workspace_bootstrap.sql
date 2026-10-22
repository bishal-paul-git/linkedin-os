-- Fix first-workspace creation under RLS.
create or replace function public.li_bootstrap_workspace(
  p_slug text,
  p_name text,
  p_organization text default null::text,
  p_timezone text default 'UTC'::text
)
returns uuid
language plpgsql
security definer
set search_path = 'pg_catalog','public'
as $function$
declare
  v_user uuid := auth.uid();
  v_tenant uuid := gen_random_uuid();
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if nullif(trim(p_name),'') is null then raise exception 'Workspace name is required'; end if;
  if nullif(trim(p_slug),'') is null then raise exception 'Workspace slug is required'; end if;

  insert into public.li_tenants(id,slug,name,organization,status,created_by)
  values(v_tenant,lower(trim(p_slug)),trim(p_name),nullif(trim(p_organization),''),'ACTIVE',v_user);

  insert into public.li_profiles(user_id,timezone)
  values(v_user,coalesce(nullif(p_timezone,''),'UTC'))
  on conflict(user_id) do update set timezone=excluded.timezone,updated_at=now();

  insert into public.li_tenant_members(tenant_id,user_id,role,status)
  values(v_tenant,v_user,'OWNER','ACTIVE')
  on conflict(tenant_id,user_id) do update set role='OWNER',status='ACTIVE';

  insert into public.li_run_control(tenant_id) values(v_tenant)
  on conflict(tenant_id) do nothing;

  insert into public.li_agent_settings(tenant_id,agent_code,instruction_version,status)
  select v_tenant,agent_code,'1.5.0','ACTIVE'
  from unnest(array['MANAGER','INBOX','NETWORK','CONTENT','CRM','APPROVAL_EXECUTOR']) as agent_code
  on conflict(tenant_id,agent_code) do nothing;

  insert into public.li_workflow_settings(tenant_id,workflow_code,enabled,mode)
  select v_tenant,code,true,
    case when code='DAILY_RUN' then 'READ_ONLY'
         when code='APPROVAL_EXECUTOR' then 'APPROVAL_GATED'
         else 'PREPARE_ONLY' end
  from public.li_workflow_templates
  where active=true
  on conflict(tenant_id,workflow_code) do nothing;

  insert into public.li_config(tenant_id,key,value,description,required,source)
  values
    (v_tenant,'default_external_action_policy',to_jsonb('APPROVAL_REQUIRED'::text),'External actions require explicit approval by default.',true,'SYSTEM'),
    (v_tenant,'quality_rule',to_jsonb('Relevance over volume'::text),'Prospecting and engagement quality rule.',true,'SYSTEM'),
    (v_tenant,'writing_style',to_jsonb('Short, clear, human, conversational'::text),'Default personal writing style.',false,'SYSTEM'),
    (v_tenant,'account_safety_rule',to_jsonb('Stop on verification, restriction, CAPTCHA, unusual activity or security warning'::text),'Account safety rule.',true,'SYSTEM')
  on conflict(tenant_id,key) do nothing;

  insert into public.li_capabilities(
    tenant_id,capability,mode,adapter,can_execute,requires_user_action,reason,health,last_verified_at
  )
  values
    (v_tenant,'SEND_CONNECTION','AVAILABLE_ASSISTED','assisted',false,true,'Final LinkedIn action is user-completed until an authorized adapter is connected.','HEALTHY',now()),
    (v_tenant,'MANAGE_INVITATIONS','AVAILABLE_ASSISTED','assisted',false,true,'Final LinkedIn action is user-completed until an authorized adapter is connected.','HEALTHY',now()),
    (v_tenant,'SEND_MESSAGE','AVAILABLE_ASSISTED','assisted',false,true,'Final LinkedIn action is user-completed until an authorized adapter is connected.','HEALTHY',now()),
    (v_tenant,'WRITE_COMMENT','AVAILABLE_ASSISTED','assisted',false,true,'Final LinkedIn action is user-completed until an authorized adapter is connected.','HEALTHY',now()),
    (v_tenant,'WRITE_REACTION','AVAILABLE_ASSISTED','assisted',false,true,'Final LinkedIn action is user-completed until an authorized adapter is connected.','HEALTHY',now()),
    (v_tenant,'PUBLISH_MEMBER_POST','AVAILABLE_ASSISTED','assisted',false,true,'Final LinkedIn action is user-completed until an authorized adapter is connected.','HEALTHY',now()),
    (v_tenant,'PUBLISH_PAGE_POST','AVAILABLE_ASSISTED','assisted',false,true,'Final LinkedIn action is user-completed until an authorized adapter is connected.','HEALTHY',now()),
    (v_tenant,'CHECK_CONNECTION_STATE','AVAILABLE_ASSISTED','assisted',false,true,'Connection state requires an authorized runtime or user confirmation.','HEALTHY',now()),
    (v_tenant,'READ_INBOX','AVAILABLE_ASSISTED','assisted',false,true,'Inbox review requires an authorized runtime or user-provided context.','HEALTHY',now()),
    (v_tenant,'READ_RELEVANT_POSTS','AVAILABLE_ASSISTED','assisted',false,true,'Post review requires an authorized runtime or user-provided context.','HEALTHY',now()),
    (v_tenant,'DISCOVER_PROSPECTS','UNAVAILABLE','none',false,true,'Connect a licensed/authorized prospect source or provide candidate data.','UNAVAILABLE',now())
  on conflict(tenant_id,capability,adapter) do nothing;

  insert into public.li_activity_log(tenant_id,agent,action,reason,result)
  values(v_tenant,'SYSTEM','TENANT_BOOTSTRAPPED','Initial workspace setup','SUCCEEDED');

  return v_tenant;
end;
$function$;

revoke all on function public.li_bootstrap_workspace(text,text,text,text) from public,anon,authenticated;
grant execute on function public.li_bootstrap_workspace(text,text,text,text) to authenticated;
