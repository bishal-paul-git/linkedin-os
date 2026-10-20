-- App-facing RPCs and internal scheduler for LinkedIn OS.

alter table public.li_schedules
  add column if not exists interval_seconds integer not null default 3600
  check (interval_seconds >= 60);

create or replace function public.li_bootstrap_workspace(
  p_slug text,
  p_name text,
  p_organization text default null,
  p_timezone text default 'UTC'
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_tenant uuid;
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;

  insert into public.li_tenants(
    slug, name, organization, status, created_by
  )
  values (
    lower(trim(p_slug)), trim(p_name), nullif(trim(p_organization), ''), 'ACTIVE', v_user
  )
  returning id into v_tenant;

  insert into public.li_profiles(user_id, timezone)
  values (v_user, coalesce(nullif(p_timezone,''),'UTC'))
  on conflict (user_id) do update
  set timezone = excluded.timezone, updated_at = now();

  insert into public.li_tenant_members(tenant_id, user_id, role, status)
  values (v_tenant, v_user, 'OWNER', 'ACTIVE')
  on conflict (tenant_id, user_id) do update
  set role = 'OWNER', status = 'ACTIVE';

  insert into public.li_run_control(tenant_id)
  values (v_tenant)
  on conflict (tenant_id) do nothing;

  insert into public.li_agent_settings(tenant_id, agent_code, instruction_version, status)
  select v_tenant, agent_code, '1.4.1', 'ACTIVE'
  from unnest(array['MANAGER','INBOX','NETWORK','CONTENT','CRM','APPROVAL_EXECUTOR']) as agent_code
  on conflict (tenant_id, agent_code) do nothing;

  insert into public.li_workflow_settings(tenant_id, workflow_code, enabled, mode)
  select
    v_tenant,
    code,
    true,
    case
      when code = 'DAILY_RUN' then 'READ_ONLY'
      when code = 'APPROVAL_EXECUTOR' then 'APPROVAL_GATED'
      else 'PREPARE_ONLY'
    end
  from public.li_workflow_templates
  where active = true
  on conflict (tenant_id, workflow_code) do nothing;

  insert into public.li_config(tenant_id, key, value, description, required, source)
  values
    (v_tenant,'default_external_action_policy',to_jsonb('APPROVAL_REQUIRED'::text),'External actions require explicit approval by default.',true,'SYSTEM'),
    (v_tenant,'quality_rule',to_jsonb('Relevance over volume'::text),'Prospecting and engagement quality rule.',true,'SYSTEM'),
    (v_tenant,'writing_style',to_jsonb('Short, clear, human, conversational'::text),'Default personal writing style.',false,'SYSTEM'),
    (v_tenant,'account_safety_rule',to_jsonb('Stop on verification, restriction, CAPTCHA, unusual activity or security warning'::text),'Account safety rule.',true,'SYSTEM')
  on conflict (tenant_id, key) do nothing;

  insert into public.li_capabilities(
    tenant_id, capability, mode, adapter, can_execute,
    requires_user_action, reason, health, last_verified_at
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
  on conflict (tenant_id, capability, adapter) do nothing;

  insert into public.li_activity_log(
    tenant_id, agent, action, reason, result
  )
  values (
    v_tenant, 'SYSTEM', 'TENANT_BOOTSTRAPPED', 'Initial workspace setup', 'SUCCEEDED'
  );

  return v_tenant;
end;
$$;

revoke all on function public.li_bootstrap_workspace(text,text,text,text) from public, anon;
grant execute on function public.li_bootstrap_workspace(text,text,text,text) to authenticated;

create or replace function public.li_decide_approval(
  p_approval_id uuid,
  p_decision text
)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if p_decision not in ('APPROVED','REJECTED') then
    raise exception 'Invalid decision';
  end if;

  update public.li_approval_queue
  set
    approval_state = p_decision,
    execution_state = case when p_decision='APPROVED' then 'READY' else 'NOT_READY' end,
    approved_by = case when p_decision='APPROVED' then auth.uid() else null end,
    approved_at = case when p_decision='APPROVED' then now() else null end,
    error_notes = null
  where id = p_approval_id
    and approval_state = 'PENDING';

  if not found then
    raise exception 'Approval not found or not pending';
  end if;
end;
$$;

revoke all on function public.li_decide_approval(uuid,text) from public, anon;
grant execute on function public.li_decide_approval(uuid,text) to authenticated;

create or replace function public.li_enqueue_workflow(
  p_tenant_id uuid,
  p_workflow_code text,
  p_input_summary text default null,
  p_dedupe_key text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_run uuid;
begin
  insert into public.li_workflow_runs(
    tenant_id, workflow_code, trigger_type, status,
    input_summary, dedupe_key, attempt
  )
  values (
    p_tenant_id, p_workflow_code, 'MANUAL', 'QUEUED',
    p_input_summary, p_dedupe_key, 0
  )
  returning id into v_run;

  return v_run;
end;
$$;

revoke all on function public.li_enqueue_workflow(uuid,text,text,text) from public, anon;
grant execute on function public.li_enqueue_workflow(uuid,text,text,text) to authenticated;

create or replace function li_private.tick_schedules()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer := 0;
begin
  with due as (
    select id, tenant_id, workflow_code, next_run_at, interval_seconds
    from public.li_schedules
    where enabled = true
      and schedule_type = 'INTERVAL'
      and next_run_at is not null
      and next_run_at <= now()
    for update skip locked
  ),
  inserted as (
    insert into public.li_workflow_runs(
      tenant_id, workflow_code, trigger_type, status,
      input_summary, dedupe_key, attempt
    )
    select
      d.tenant_id,
      d.workflow_code,
      'SCHEDULED',
      'QUEUED',
      'Scheduled run: ' || d.id::text,
      'schedule:' || d.id::text || ':' || extract(epoch from d.next_run_at)::bigint::text,
      0
    from due d
    on conflict (tenant_id, dedupe_key) where dedupe_key is not null do nothing
    returning 1
  ),
  advanced as (
    update public.li_schedules s
    set
      next_run_at = greatest(s.next_run_at, now()) + make_interval(secs => s.interval_seconds),
      updated_at = now()
    from due d
    where s.id = d.id
    returning 1
  )
  select count(*) into v_count from inserted;

  return v_count;
end;
$$;

revoke all on function li_private.tick_schedules() from public, anon, authenticated;

create extension if not exists pg_cron;

do $$
begin
  perform cron.unschedule('linkedin-os-scheduler-tick');
exception when others then
  null;
end $$;

select cron.schedule(
  'linkedin-os-scheduler-tick',
  '* * * * *',
  'select li_private.tick_schedules();'
);
