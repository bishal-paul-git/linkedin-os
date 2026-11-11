-- SwarmHit run control: tenant opt-in flag and daily usage recording.
--
-- Opt-in and capability promotion are deliberately separate steps:
-- enabling swarmhit_enabled only permits SwarmHit use; it does NOT mark
-- any capability AVAILABLE_PROVIDER. That promotion happens only inside
-- li_swarmhit_sync_accounts (025), after a CONNECTED sender is verified
-- against the live SwarmHit API. Disabling reverses the promotion at
-- once (capabilities fall back to AVAILABLE_ASSISTED, execution off).

alter table public.li_run_control
  add column if not exists swarmhit_enabled boolean not null default false;

-- Same idempotent guard as 025: no-op once AVAILABLE_PROVIDER is already
-- in the li_capabilities mode list (e.g. when 025 ran first).
do $$
declare
  r record;
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.li_capabilities'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%AVAILABLE_PROVIDER%'
  ) then
    return;
  end if;

  for r in
    select conname
    from pg_constraint
    where conrelid = 'public.li_capabilities'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%AVAILABLE_OFFICIAL%'
  loop
    execute 'alter table public.li_capabilities drop constraint ' || quote_ident(r.conname);
  end loop;

  alter table public.li_capabilities
    add constraint li_capabilities_mode_check
    check (mode in ('AVAILABLE_OFFICIAL','AVAILABLE_ASSISTED','AVAILABLE_BROWSER_READ','AVAILABLE_PROVIDER','RESTRICTED_PARTNER','UNAVAILABLE','BLOCKED_BY_POLICY'));
end $$;

create or replace function public.li_swarmhit_opt_in(
  p_tenant_id uuid,
  p_enabled boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if not li_private.is_tenant_admin(p_tenant_id) then
    raise exception 'Tenant admin access required';
  end if;

  insert into public.li_run_control(tenant_id, swarmhit_enabled)
  values (p_tenant_id, coalesce(p_enabled, false))
  on conflict (tenant_id)
  do update set swarmhit_enabled = excluded.swarmhit_enabled;

  if not coalesce(p_enabled, false) then
    -- Opting out revokes provider execution immediately. Opting in does
    -- NOT restore it: AVAILABLE_PROVIDER is only granted again by
    -- li_swarmhit_sync_accounts after a CONNECTED sender is verified.
    update public.li_capabilities
    set mode = 'AVAILABLE_ASSISTED',
        can_execute = false,
        requires_user_action = true,
        reason = 'SwarmHit disabled for this workspace; sends need user action.',
        health = 'UNKNOWN',
        last_verified_at = now(),
        updated_at = now()
    where tenant_id = p_tenant_id
      and adapter = 'swarmhit'
      and mode = 'AVAILABLE_PROVIDER';
  end if;

  return jsonb_build_object(
    'ok', true,
    'swarmhit_enabled', coalesce(p_enabled, false)
  );
end;
$$;

revoke all on function public.li_swarmhit_opt_in(uuid,boolean) from public, anon, authenticated;
grant execute on function public.li_swarmhit_opt_in(uuid,boolean) to authenticated;

-- Records one sent action against today's per-sender usage row.
-- p_kind matches the direct-action names in packages/swarmhit/src/client.ts:
-- invite = sendConnection, message = sendDirectMessage, post_comment =
-- commentPost, post_like = likePost. Limits themselves live in
-- packages/swarmhit/src/limits.ts (free 130 / paid 150 invites per week,
-- ~20 invites/day, DM safe zone 30-40/day) and are enforced by the
-- adapter layer, not by this recording RPC.
create or replace function public.li_swarmhit_record_usage(
  p_tenant_id uuid,
  p_sender_id uuid,
  p_kind text,
  p_reset_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_row jsonb;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if not li_private.can_write_tenant(p_tenant_id) then
    raise exception 'Tenant write access required';
  end if;

  if p_kind not in ('invite','message','post_comment','post_like') then
    raise exception 'Unknown usage kind: %', p_kind;
  end if;

  if not exists (
    select 1
    from public.li_swarmhit_senders
    where id = p_sender_id
      and tenant_id = p_tenant_id
  ) then
    raise exception 'SwarmHit sender not found for this tenant';
  end if;

  insert into public.li_swarmhit_usage(
    tenant_id, sender_id, usage_date,
    invites_sent, dm_sent, comments_sent, reactions_sent,
    rate_limit_reset_at
  )
  values (
    p_tenant_id, p_sender_id, current_date,
    case when p_kind = 'invite' then 1 else 0 end,
    case when p_kind = 'message' then 1 else 0 end,
    case when p_kind = 'post_comment' then 1 else 0 end,
    case when p_kind = 'post_like' then 1 else 0 end,
    p_reset_at
  )
  on conflict (tenant_id, sender_id, usage_date)
  do update set
    invites_sent = public.li_swarmhit_usage.invites_sent
      + case when p_kind = 'invite' then 1 else 0 end,
    dm_sent = public.li_swarmhit_usage.dm_sent
      + case when p_kind = 'message' then 1 else 0 end,
    comments_sent = public.li_swarmhit_usage.comments_sent
      + case when p_kind = 'post_comment' then 1 else 0 end,
    reactions_sent = public.li_swarmhit_usage.reactions_sent
      + case when p_kind = 'post_like' then 1 else 0 end,
    rate_limit_reset_at = coalesce(excluded.rate_limit_reset_at, public.li_swarmhit_usage.rate_limit_reset_at),
    updated_at = now();

  select to_jsonb(u)
    into v_row
  from public.li_swarmhit_usage u
  where u.tenant_id = p_tenant_id
    and u.sender_id = p_sender_id
    and u.usage_date = current_date;

  return v_row;
end;
$$;

revoke all on function public.li_swarmhit_record_usage(uuid,uuid,text,timestamptz) from public, anon, authenticated;
grant execute on function public.li_swarmhit_record_usage(uuid,uuid,text,timestamptz) to authenticated;
