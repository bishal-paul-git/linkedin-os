create schema if not exists li_private;
revoke all on schema li_private from public, anon, authenticated;

alter table public.li_approval_queue
  alter column target_url drop not null,
  add column if not exists target_ref text,
  add column if not exists approval_fingerprint text,
  add column if not exists approved_fingerprint text,
  add column if not exists workflow_run_id uuid references public.li_workflow_runs(id) on delete set null;

alter table public.li_approval_queue drop constraint if exists li_approval_target_required;
alter table public.li_approval_queue
  add constraint li_approval_target_required
  check (target_url is not null or target_ref is not null);

alter table public.li_activity_log
  add column if not exists workflow_run_id uuid references public.li_workflow_runs(id) on delete set null;

alter table public.li_security_events
  add column if not exists workflow_run_id uuid references public.li_workflow_runs(id) on delete set null;

alter table public.li_workflow_runs
  add column if not exists lease_owner text,
  add column if not exists lease_expires_at timestamptz,
  add column if not exists heartbeat_at timestamptz,
  add column if not exists attempt integer not null default 0,
  add column if not exists dedupe_key text,
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists li_workflow_runs_dedupe_uq
  on public.li_workflow_runs(tenant_id, dedupe_key)
  where dedupe_key is not null;

create index if not exists li_workflow_runs_lease_idx
  on public.li_workflow_runs(status, lease_expires_at)
  where status in ('QUEUED','RUNNING');

create or replace function li_private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function li_private.approval_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  new_fp text;
  old_fp text;
begin
  new_fp := md5(
    coalesce(new.action_type,'') || '|' ||
    coalesce(new.target_url,'') || '|' ||
    coalesce(new.target_ref,'') || '|' ||
    coalesce(new.draft_content,'') || '|' ||
    coalesce(new.reason,'')
  );
  new.approval_fingerprint := new_fp;

  if tg_op = 'INSERT' then
    if new.approval_state = 'APPROVED' then
      new.approved_fingerprint := new_fp;
    end if;
    return new;
  end if;

  old_fp := md5(
    coalesce(old.action_type,'') || '|' ||
    coalesce(old.target_url,'') || '|' ||
    coalesce(old.target_ref,'') || '|' ||
    coalesce(old.draft_content,'') || '|' ||
    coalesce(old.reason,'')
  );

  if new.approval_state = 'APPROVED' and old.approval_state <> 'APPROVED' then
    new.approved_fingerprint := new_fp;
  end if;

  if old.approval_state = 'APPROVED'
     and new_fp <> old_fp
     and new.execution_state <> 'SUCCEEDED' then
    new.approval_state := 'PENDING';
    new.execution_state := 'NOT_READY';
    new.approved_by := null;
    new.approved_at := null;
    new.approved_fingerprint := null;
  end if;

  return new;
end;
$$;

revoke all on function li_private.set_updated_at() from public, anon, authenticated;
revoke all on function li_private.approval_guard() from public, anon, authenticated;

drop trigger if exists li_approval_guard_trigger on public.li_approval_queue;
create trigger li_approval_guard_trigger
before insert or update on public.li_approval_queue
for each row execute function li_private.approval_guard();

do $$
declare
  t text;
begin
  foreach t in array array[
    'li_profiles','li_tenants','li_integrations','li_capabilities','li_config',
    'li_run_control','li_agent_settings','li_contacts','li_conversations',
    'li_opportunities','li_tasks','li_content_engagement','li_approval_queue',
    'li_workflow_settings','li_workflow_runs','li_schedules'
  ]
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_updated_at_trigger', t);
    execute format(
      'create trigger %I before update on public.%I for each row execute function li_private.set_updated_at()',
      t || '_updated_at_trigger', t
    );
  end loop;
end $$;
