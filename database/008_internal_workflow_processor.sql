-- Internal workflow processor for adapter-free/product-core operation.

create or replace function li_private.process_queued_runs(p_limit integer default 20)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.li_workflow_runs%rowtype;
  v_required text[];
  v_missing integer;
  v_assisted integer;
  v_ready_approvals integer;
  v_stats jsonb;
  v_processed integer := 0;
begin
  for r in
    select *
    from public.li_workflow_runs
    where status = 'QUEUED'
    order by created_at
    for update skip locked
    limit greatest(1, least(coalesce(p_limit,20),100))
  loop
    update public.li_workflow_runs
    set status='RUNNING', started_at=coalesce(started_at,now()), heartbeat_at=now(),
        attempt=attempt+1, updated_at=now()
    where id=r.id;

    select required_capabilities
    into v_required
    from public.li_workflow_templates
    where code=r.workflow_code;

    if r.workflow_code = 'DAILY_RUN' then
      select jsonb_build_object(
        'contacts', (select count(*) from public.li_contacts where tenant_id=r.tenant_id),
        'pending_approvals', (select count(*) from public.li_approval_queue where tenant_id=r.tenant_id and approval_state='PENDING'),
        'active_opportunities', (select count(*) from public.li_opportunities where tenant_id=r.tenant_id and stage not in ('WON','LOST','DORMANT')),
        'open_tasks', (select count(*) from public.li_tasks where tenant_id=r.tenant_id and status in ('TODO','IN PROGRESS','WAITING','BLOCKED')),
        'unresolved_security_events', (select count(*) from public.li_security_events where tenant_id=r.tenant_id and resolved_at is null)
      ) into v_stats;

      update public.li_workflow_runs
      set status='SUCCEEDED', finished_at=now(), heartbeat_at=now(),
          stats=v_stats,
          output_summary='Daily operating snapshot refreshed from LinkedIn OS memory.',
          updated_at=now()
      where id=r.id;

    elsif r.workflow_code = 'APPROVAL_EXECUTOR' then
      select count(*) into v_ready_approvals
      from public.li_approval_queue
      where tenant_id=r.tenant_id
        and approval_state='APPROVED'
        and execution_state in ('NOT_READY','READY');

      update public.li_workflow_runs
      set status=case when v_ready_approvals=0 then 'SUCCEEDED' else 'PARTIAL' end,
          finished_at=now(),
          heartbeat_at=now(),
          stats=jsonb_build_object('ready_approvals',v_ready_approvals),
          output_summary=case
            when v_ready_approvals=0 then 'No approved actions are waiting for execution.'
            else v_ready_approvals::text || ' approved action(s) are ready for an API adapter or assisted completion.'
          end,
          updated_at=now()
      where id=r.id;

    else
      select count(*) into v_missing
      from unnest(coalesce(v_required,'{}'::text[])) req(capability)
      where not exists (
        select 1 from public.li_capabilities c
        where c.tenant_id=r.tenant_id
          and c.capability=req.capability
          and c.mode <> 'UNAVAILABLE'
          and c.health <> 'UNAVAILABLE'
      );

      select count(*) into v_assisted
      from unnest(coalesce(v_required,'{}'::text[])) req(capability)
      where exists (
        select 1 from public.li_capabilities c
        where c.tenant_id=r.tenant_id
          and c.capability=req.capability
          and c.mode in ('AVAILABLE_ASSISTED','AVAILABLE_BROWSER_READ','RESTRICTED_PARTNER')
          and c.health <> 'UNAVAILABLE'
      );

      update public.li_workflow_runs
      set status=case
            when v_missing>0 then 'BLOCKED'
            when v_assisted>0 then 'PARTIAL'
            else 'PARTIAL'
          end,
          finished_at=now(),
          heartbeat_at=now(),
          stats=jsonb_build_object('missing_capabilities',v_missing,'assisted_capabilities',v_assisted),
          output_summary=case
            when v_missing>0 then 'Required capability is not connected yet.'
            when v_assisted>0 then 'Workflow preparation is available, but an authenticated/user-assisted runtime is required for external LinkedIn context.'
            else 'Capabilities are available; external adapter execution will be connected in the adapter phase.'
          end,
          updated_at=now()
      where id=r.id;
    end if;

    v_processed := v_processed + 1;
  end loop;

  return v_processed;
end;
$$;

revoke all on function li_private.process_queued_runs(integer) from public, anon, authenticated;

do $$
begin
  perform cron.unschedule('linkedin-os-workflow-processor');
exception when others then
  null;
end $$;

select cron.schedule(
  'linkedin-os-workflow-processor',
  '* * * * *',
  'select li_private.process_queued_runs(20);'
);
