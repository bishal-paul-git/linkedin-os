create or replace function public.li_accept_team_invitation(p_token text)
returns table(tenant_id uuid,member_role text)
language plpgsql security definer set search_path=''
as $$
declare
  v_uid uuid:=auth.uid();
  v_hash text;
  v_inv public.li_team_invitations%rowtype;
  v_email text;
  v_role text;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if coalesce(length(p_token),0)<32 then raise exception 'Invalid invitation token'; end if;
  select lower(coalesce(email,'')) into v_email from auth.users where id=v_uid;
  if coalesce(v_email,'')='' then raise exception 'Authenticated account has no email'; end if;
  v_hash:=encode(extensions.digest(p_token,'sha256'),'hex');

  select * into v_inv from public.li_team_invitations where token_hash=v_hash for update;
  if not found then raise exception 'Invitation not found'; end if;
  if v_inv.status<>'PENDING' then raise exception 'Invitation is no longer pending'; end if;
  if v_inv.expires_at<=now() then
    update public.li_team_invitations set status='EXPIRED',updated_at=now() where id=v_inv.id;
    raise exception 'Invitation has expired';
  end if;
  if lower(v_inv.email)<>v_email then raise exception 'Invitation email does not match signed-in account'; end if;

  insert into public.li_tenant_members(tenant_id,user_id,role,status)
  values(v_inv.tenant_id,v_uid,v_inv.role,'ACTIVE')
  on conflict on constraint li_tenant_members_tenant_id_user_id_key
  do update set status='ACTIVE';

  select m.role into v_role
  from public.li_tenant_members m
  where m.tenant_id=v_inv.tenant_id and m.user_id=v_uid;

  update public.li_team_invitations
  set status='ACCEPTED',accepted_by=v_uid,accepted_at=now(),updated_at=now()
  where id=v_inv.id;

  insert into public.li_activity_log(tenant_id,agent,action,reason,result)
  values(v_inv.tenant_id,'SYSTEM','TEAM_INVITATION_ACCEPTED','Workspace invitation accepted','SUCCEEDED');

  return query select v_inv.tenant_id,v_role;
end;
$$;

revoke all on function public.li_accept_team_invitation(text) from public,anon,authenticated;
grant execute on function public.li_accept_team_invitation(text) to authenticated;
