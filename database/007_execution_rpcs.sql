-- Atomic approval claim and assisted completion reconciliation.

create or replace function public.li_claim_approval(
  p_approval_id uuid
)
returns setof public.li_approval_queue
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  return query
  update public.li_approval_queue a
  set
    execution_state = 'RUNNING',
    error_notes = null,
    updated_at = now()
  where a.id = p_approval_id
    and a.approval_state = 'APPROVED'
    and a.execution_state in ('NOT_READY','READY')
    and a.approval_fingerprint is not null
    and a.approval_fingerprint = a.approved_fingerprint
    and not exists (
      select 1
      from public.li_approval_queue done
      where done.tenant_id = a.tenant_id
        and done.idempotency_key = a.idempotency_key
        and done.execution_state = 'SUCCEEDED'
        and done.id <> a.id
    )
  returning a.*;
end;
$$;

revoke all on function public.li_claim_approval(uuid) from public, anon;
grant execute on function public.li_claim_approval(uuid) to authenticated;

create or replace function public.li_mark_assisted_complete(
  p_approval_id uuid,
  p_result text default 'Completed by user'
)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v public.li_approval_queue%rowtype;
begin
  select * into v
  from public.li_approval_queue
  where id = p_approval_id
  for update;

  if not found then
    raise exception 'Approval not found';
  end if;

  if v.approval_state <> 'APPROVED'
     or v.execution_state not in ('READY','RUNNING') then
    raise exception 'Approval is not ready for assisted completion';
  end if;

  if v.approval_fingerprint is null
     or v.approval_fingerprint <> v.approved_fingerprint then
    raise exception 'Approved content changed; re-approval required';
  end if;

  update public.li_approval_queue
  set
    execution_state = 'SUCCEEDED',
    executed_at = now(),
    result = coalesce(nullif(trim(p_result),''),'Completed by user'),
    error_notes = null
  where id = p_approval_id;

  if v.contact_id is not null then
    if v.action_type = 'SEND_CONNECTION' then
      update public.li_contacts
      set
        network_state = 'INVITED',
        relationship_stage = case
          when relationship_stage in ('DISCOVERED','QUALIFIED','APPROVED') then 'PREPARED'
          else relationship_stage
        end
      where id = v.contact_id;
    elsif v.action_type in ('SEND_DM','REPLY_DM') then
      update public.li_contacts
      set relationship_stage = case
        when relationship_stage in ('DISCOVERED','QUALIFIED','APPROVED','PREPARED') then 'ENGAGED'
        else relationship_stage
      end
      where id = v.contact_id;
    end if;
  end if;

  insert into public.li_activity_log(
    tenant_id, agent, contact_id, action, reason, result,
    approval_id, workflow_run_id, source_url
  )
  values (
    v.tenant_id,
    'APPROVAL_EXECUTOR',
    v.contact_id,
    v.action_type,
    'Assisted/manual completion confirmed by user',
    'SUCCEEDED',
    v.id,
    v.workflow_run_id,
    v.target_url
  );
end;
$$;

revoke all on function public.li_mark_assisted_complete(uuid,text) from public, anon;
grant execute on function public.li_mark_assisted_complete(uuid,text) to authenticated;
