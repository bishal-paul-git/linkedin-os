create or replace function li_private.prepare_connection_review(
  p_tenant_id uuid,
  p_workflow_run_id uuid,
  p_limit integer default 20,
  p_prepare boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  c public.li_prospect_candidates%rowtype;
  v_contact public.li_contacts%rowtype;
  v_contact_id uuid;
  v_approval_id uuid;
  v_target_url text;
  v_reason text;
  v_limit integer:=greatest(1,least(coalesce(p_limit,20),100));
  v_considered integer:=0;
  v_promoted integer:=0;
  v_approvals integer:=0;
  v_duplicates integer:=0;
  v_dnc integer:=0;
  v_relationship_skip integer:=0;
  v_no_target integer:=0;
begin
  for c in
    select * from public.li_prospect_candidates
    where tenant_id=p_tenant_id
      and fit_label in ('STRONG_FIT','GOOD_FIT')
      and status in ('QUALIFIED','PROMOTED')
    order by case fit_label when 'STRONG_FIT' then 0 else 1 end,
             fit_score desc nulls last,created_at
    limit v_limit
  loop
    v_considered:=v_considered+1;
    v_contact_id:=null;
    v_contact:=null;

    if c.promoted_contact_id is not null then
      select * into v_contact from public.li_contacts
      where tenant_id=p_tenant_id and id=c.promoted_contact_id;
      if found then v_contact_id:=v_contact.id; end if;
    end if;

    if v_contact_id is null and nullif(trim(c.linkedin_url),'') is not null then
      select * into v_contact from public.li_contacts
      where tenant_id=p_tenant_id
        and lower(trim(coalesce(linkedin_url,'')))=lower(trim(c.linkedin_url))
      order by created_at limit 1;
      if found then v_contact_id:=v_contact.id; end if;
    end if;

    if v_contact_id is null then
      select * into v_contact from public.li_contacts
      where tenant_id=p_tenant_id
        and lower(trim(name))=lower(trim(c.name))
        and lower(trim(coalesce(company,'')))=lower(trim(coalesce(c.company,'')))
      order by created_at limit 1;
      if found then v_contact_id:=v_contact.id; end if;
    end if;

    if v_contact_id is null then
      if not p_prepare then continue; end if;

      insert into public.li_contacts(
        tenant_id,name,linkedin_url,role_title,company,location,
        connection_status,relationship_type,relationship_owner,priority,
        fit_class,source,notes,network_state,relationship_stage
      ) values(
        p_tenant_id,c.name,nullif(trim(c.linkedin_url),''),
        nullif(trim(c.role_title),''),nullif(trim(c.company),''),nullif(trim(c.location),''),
        'QUALIFIED','Prospect','NETWORK',
        case when c.fit_label='STRONG_FIT' then 'P2' else 'P3' end,
        case when c.fit_label='STRONG_FIT' then 'STRONG FIT' else 'GOOD FIT' end,
        c.source,nullif(trim(c.reason),''),
        'UNKNOWN','QUALIFIED'
      )
      returning * into v_contact;
      v_contact_id:=v_contact.id;
      v_promoted:=v_promoted+1;

      if nullif(trim(c.linkedin_url),'') is not null then
        insert into public.li_contact_identities(
          tenant_id,contact_id,identity_type,provider,external_id,canonical_value,is_primary
        ) values(
          p_tenant_id,v_contact_id,'LINKEDIN_URL','linkedin',
          lower(trim(c.linkedin_url)),lower(trim(c.linkedin_url)),true
        ) on conflict do nothing;
      end if;
    end if;

    if p_prepare then
      update public.li_prospect_candidates
      set status='PROMOTED',promoted_contact_id=v_contact_id
      where id=c.id and tenant_id=p_tenant_id;
    end if;

    select * into v_contact from public.li_contacts
    where id=v_contact_id and tenant_id=p_tenant_id;

    if v_contact.do_not_contact then
      v_dnc:=v_dnc+1;
      continue;
    end if;

    if v_contact.network_state in ('INVITED','CONNECTED')
       or v_contact.relationship_stage in ('ENGAGED','ACTIVE','OPPORTUNITY','NOT_INTERESTED','DORMANT') then
      v_relationship_skip:=v_relationship_skip+1;
      continue;
    end if;

    v_target_url:=coalesce(nullif(trim(v_contact.linkedin_url),''),nullif(trim(c.linkedin_url),''));
    if v_target_url is null then
      v_no_target:=v_no_target+1;
      continue;
    end if;

    v_reason:=coalesce(
      nullif(trim(c.reason),''),
      concat_ws('; ',
        replace(c.fit_label,'_',' '),
        case
          when nullif(trim(c.role_title),'') is not null and nullif(trim(c.company),'') is not null
            then trim(c.role_title)||' at '||trim(c.company)
          when nullif(trim(c.company),'') is not null then trim(c.company)
          else null end,
        case when nullif(trim(c.location),'') is not null then trim(c.location) else null end,
        'source: '||c.source
      )
    );

    if not p_prepare then continue; end if;

    insert into public.li_approval_queue(
      tenant_id,contact_id,person,company,action_type,target_url,target_ref,
      draft_content,reason,requested_by_agent,approval_state,execution_state,
      idempotency_key,workflow_run_id,metadata
    ) values(
      p_tenant_id,v_contact_id,v_contact.name,v_contact.company,
      'SEND_CONNECTION',v_target_url,'contact:'||v_contact_id::text,
      null,v_reason,'CONNECTION REVIEW','PENDING','NOT_READY',
      'send_connection:'||v_contact_id::text,p_workflow_run_id,
      jsonb_build_object('candidate_id',c.id,'fit_label',c.fit_label,'fit_score',c.fit_score,'source',c.source,'prepare_only',true)
    )
    on conflict(tenant_id,idempotency_key) do nothing
    returning id into v_approval_id;

    if v_approval_id is null then
      v_duplicates:=v_duplicates+1;
      continue;
    end if;

    v_approvals:=v_approvals+1;

    update public.li_contacts
    set relationship_stage='PREPARED',
        connection_status='CONNECTION PREPARED',
        next_action='Review prepared LinkedIn connection request'
    where id=v_contact_id and tenant_id=p_tenant_id
      and relationship_stage in ('DISCOVERED','QUALIFIED','APPROVED','PREPARED');

    insert into public.li_activity_log(
      tenant_id,agent,contact_id,action,reason,result,approval_id,workflow_run_id,source_url,metadata
    ) values(
      p_tenant_id,'NETWORK',v_contact_id,'CONNECTION_PREPARED',
      v_reason,'PENDING_APPROVAL',v_approval_id,p_workflow_run_id,v_target_url,
      jsonb_build_object('candidate_id',c.id,'fit_label',c.fit_label)
    );
  end loop;

  return jsonb_build_object(
    'considered',v_considered,'promoted',v_promoted,'approvals_created',v_approvals,
    'duplicates',v_duplicates,'skipped_do_not_contact',v_dnc,
    'skipped_relationship_state',v_relationship_skip,'skipped_no_linkedin_url',v_no_target,
    'prepare_only',p_prepare
  );
end;
$$;

revoke all on function li_private.prepare_connection_review(uuid,uuid,integer,boolean)
from public,anon,authenticated;

create or replace function li_private.process_queued_runs(p_limit integer default 20)
returns integer
language plpgsql
security definer
set search_path=''
as $$
declare
  r public.li_workflow_runs%rowtype;
  v_required text[];
  v_missing integer;
  v_assisted integer;
  v_ready_approvals integer;
  v_stats jsonb;
  v_processed integer:=0;
  v_mode text;
  v_enabled boolean;
  v_run_limit integer;
  v_eligible integer;
begin
  for r in
    select * from public.li_workflow_runs
    where status='QUEUED'
    order by created_at
    for update skip locked
    limit greatest(1,least(coalesce(p_limit,20),100))
  loop
    update public.li_workflow_runs
    set status='RUNNING',started_at=coalesce(started_at,now()),heartbeat_at=now(),
        attempt=attempt+1,updated_at=now()
    where id=r.id;

    select required_capabilities into v_required
    from public.li_workflow_templates where code=r.workflow_code;

    if r.workflow_code='DAILY_RUN' then
      select jsonb_build_object(
        'contacts',(select count(*) from public.li_contacts where tenant_id=r.tenant_id),
        'pending_approvals',(select count(*) from public.li_approval_queue where tenant_id=r.tenant_id and approval_state='PENDING'),
        'active_opportunities',(select count(*) from public.li_opportunities where tenant_id=r.tenant_id and stage not in ('WON','LOST','DORMANT')),
        'open_tasks',(select count(*) from public.li_tasks where tenant_id=r.tenant_id and status in ('TODO','IN PROGRESS','WAITING','BLOCKED')),
        'unresolved_security_events',(select count(*) from public.li_security_events where tenant_id=r.tenant_id and resolved_at is null)
      ) into v_stats;

      update public.li_workflow_runs
      set status='SUCCEEDED',finished_at=now(),heartbeat_at=now(),stats=v_stats,
          output_summary='Daily operating snapshot refreshed from LinkedIn OS memory.',updated_at=now()
      where id=r.id;

    elsif r.workflow_code='APPROVAL_EXECUTOR' then
      select count(*) into v_ready_approvals from public.li_approval_queue
      where tenant_id=r.tenant_id and approval_state='APPROVED'
        and execution_state in ('NOT_READY','READY');

      update public.li_workflow_runs
      set status=case when v_ready_approvals=0 then 'SUCCEEDED' else 'PARTIAL' end,
          finished_at=now(),heartbeat_at=now(),
          stats=jsonb_build_object('ready_approvals',v_ready_approvals),
          output_summary=case when v_ready_approvals=0
            then 'No approved actions are waiting for execution.'
            else v_ready_approvals::text||' approved action(s) are ready for an API adapter or assisted completion.' end,
          updated_at=now()
      where id=r.id;

    elsif r.workflow_code='CONNECTION_REVIEW' then
      select enabled,mode,greatest(1,least(coalesce((config->>'max_items_per_run')::integer,20),100))
      into v_enabled,v_mode,v_run_limit
      from public.li_workflow_settings
      where tenant_id=r.tenant_id and workflow_code='CONNECTION_REVIEW';

      v_enabled:=coalesce(v_enabled,true);
      v_mode:=coalesce(v_mode,'PREPARE_ONLY');
      v_run_limit:=coalesce(v_run_limit,20);

      if not v_enabled or v_mode='DISABLED' then
        update public.li_workflow_runs
        set status='CANCELLED',finished_at=now(),heartbeat_at=now(),
            stats=jsonb_build_object('reason','workflow_disabled'),
            output_summary='Connection Review is disabled for this workspace.',updated_at=now()
        where id=r.id;
      else
        select count(*) into v_eligible from public.li_prospect_candidates
        where tenant_id=r.tenant_id
          and fit_label in ('STRONG_FIT','GOOD_FIT')
          and status in ('QUALIFIED','PROMOTED');

        v_stats:=li_private.prepare_connection_review(r.tenant_id,r.id,v_run_limit,v_mode<>'READ_ONLY');

        update public.li_workflow_runs
        set status=case
              when v_mode='READ_ONLY' then 'SUCCEEDED'
              when v_eligible=0 then 'SUCCEEDED'
              when coalesce((v_stats->>'approvals_created')::integer,0)>0 then 'SUCCEEDED'
              else 'PARTIAL' end,
            finished_at=now(),heartbeat_at=now(),stats=v_stats,
            output_summary=case
              when v_mode='READ_ONLY' then v_eligible::text||' qualified Strong/Good candidate(s) found; read-only mode made no changes.'
              when v_eligible=0 then 'No qualified Strong/Good candidates are staged. Import or discover candidates first.'
              else coalesce(v_stats->>'approvals_created','0')||' connection approval(s) prepared from staged candidates. No LinkedIn action was sent.' end,
            updated_at=now()
        where id=r.id;

        update public.li_workflow_settings
        set last_status=(select status from public.li_workflow_runs where id=r.id),updated_at=now()
        where tenant_id=r.tenant_id and workflow_code='CONNECTION_REVIEW';
      end if;

    else
      select count(*) into v_missing
      from unnest(coalesce(v_required,'{}'::text[])) req(capability)
      where not exists(
        select 1 from public.li_capabilities c
        where c.tenant_id=r.tenant_id and c.capability=req.capability
          and c.mode<>'UNAVAILABLE' and c.health<>'UNAVAILABLE'
      );

      select count(*) into v_assisted
      from unnest(coalesce(v_required,'{}'::text[])) req(capability)
      where exists(
        select 1 from public.li_capabilities c
        where c.tenant_id=r.tenant_id and c.capability=req.capability
          and c.mode in ('AVAILABLE_ASSISTED','AVAILABLE_BROWSER_READ','RESTRICTED_PARTNER')
          and c.health<>'UNAVAILABLE'
      );

      update public.li_workflow_runs
      set status=case when v_missing>0 then 'BLOCKED' else 'PARTIAL' end,
          finished_at=now(),heartbeat_at=now(),
          stats=jsonb_build_object('missing_capabilities',v_missing,'assisted_capabilities',v_assisted),
          output_summary=case
            when v_missing>0 then 'Required capability is not connected yet.'
            when v_assisted>0 then 'Workflow preparation is available, but an authenticated/user-assisted runtime is required for external LinkedIn context.'
            else 'Capabilities are available; external adapter execution will be connected in the adapter phase.' end,
          updated_at=now()
      where id=r.id;
    end if;

    v_processed:=v_processed+1;
  end loop;
  return v_processed;
end;
$$;

revoke all on function li_private.process_queued_runs(integer) from public,anon,authenticated;
