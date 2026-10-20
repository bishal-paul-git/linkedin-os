-- LinkedIn OS database invariant smoke test.
-- Runs inside one transaction and leaves no test data.

begin;

do $$
declare
  t uuid := gen_random_uuid();
  c uuid;
  a uuid;
  r uuid;
  approval_state_after text;
  execution_state_after text;
  approved_fp_after text;
begin
  insert into public.li_tenants(id, slug, name)
  values (t, 'db-test-' || replace(t::text,'-',''), 'LinkedIn OS DB Test');

  insert into public.li_contacts(
    tenant_id, name, network_state, relationship_stage, relationship_owner
  ) values (
    t, 'DB Test Contact', 'NOT_CONNECTED', 'QUALIFIED', 'NETWORK'
  ) returning id into c;

  insert into public.li_workflow_runs(
    tenant_id, workflow_code, dedupe_key, status
  ) values (
    t, 'CONNECTION_REVIEW', 'db-test:' || t::text, 'QUEUED'
  ) returning id into r;

  insert into public.li_approval_queue(
    tenant_id, contact_id, workflow_run_id, person, action_type, target_url,
    draft_content, reason, requested_by_agent, approval_state, execution_state,
    idempotency_key, approved_at
  ) values (
    t, c, r, 'DB Test Contact', 'SEND_CONNECTION',
    'https://www.linkedin.com/in/db-test',
    'Approved note', 'Invariant test', 'CONNECTION REVIEW',
    'APPROVED', 'READY', 'db-test-action:' || t::text, now()
  ) returning id into a;

  update public.li_approval_queue
  set draft_content = 'Edited after approval'
  where id = a;

  select approval_state, execution_state, approved_fingerprint
  into approval_state_after, execution_state_after, approved_fp_after
  from public.li_approval_queue
  where id = a;

  if approval_state_after <> 'PENDING'
     or execution_state_after <> 'NOT_READY'
     or approved_fp_after is not null then
    raise exception 'stale approval was not invalidated';
  end if;

  begin
    insert into public.li_workflow_runs(
      tenant_id, workflow_code, dedupe_key, status
    ) values (
      t, 'CONNECTION_REVIEW', 'db-test:' || t::text, 'QUEUED'
    );
    raise exception 'workflow dedupe constraint did not fire';
  exception when unique_violation then
    null;
  end;

  delete from public.li_tenants where id = t;
end $$;

rollback;
