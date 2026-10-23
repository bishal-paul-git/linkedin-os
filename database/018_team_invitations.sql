create table public.li_team_invitations(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.li_tenants(id) on delete cascade,
  email text not null,
  role text not null check(role in ('ADMIN','MEMBER','VIEWER')),
  status text not null default 'PENDING' check(status in ('PENDING','ACCEPTED','REVOKED','EXPIRED')),
  token_hash text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index li_team_invitations_tenant_idx on public.li_team_invitations(tenant_id,created_at desc);
create index li_team_invitations_email_idx on public.li_team_invitations(tenant_id,lower(email));

alter table public.li_team_invitations enable row level security;

create policy li_team_invitations_select on public.li_team_invitations
for select to authenticated using((select li_private.is_tenant_admin(tenant_id)));
create policy li_team_invitations_insert on public.li_team_invitations
for insert to authenticated with check((select li_private.is_tenant_admin(tenant_id)) and created_by=(select auth.uid()));
create policy li_team_invitations_update on public.li_team_invitations
for update to authenticated using((select li_private.is_tenant_admin(tenant_id))) with check((select li_private.is_tenant_admin(tenant_id)));
create policy li_team_invitations_delete on public.li_team_invitations
for delete to authenticated using((select li_private.is_tenant_admin(tenant_id)));

grant select,insert,update,delete on public.li_team_invitations to authenticated;

create trigger li_team_invitations_updated_at_trigger
before update on public.li_team_invitations
for each row execute function li_private.set_updated_at();

create or replace function public.li_create_team_invitation(
  p_tenant_id uuid,p_email text,p_role text,p_expires_hours integer default 168
)
returns table(invitation_id uuid,token text,expires_at timestamptz)
language plpgsql security definer set search_path=''
as $$
declare
  v_uid uuid:=auth.uid();
  v_email text:=lower(btrim(coalesce(p_email,'')));
  v_role text:=upper(btrim(coalesce(p_role,'')));
  v_token text;
  v_hash text;
  v_id uuid:=gen_random_uuid();
  v_expires timestamptz:=now()+make_interval(hours=>greatest(1,least(coalesce(p_expires_hours,168),720)));
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if not li_private.is_tenant_admin(p_tenant_id) then raise exception 'Tenant admin access required'; end if;
  if position('@' in v_email)<=1 then raise exception 'Valid invitation email is required'; end if;
  if v_role not in ('ADMIN','MEMBER','VIEWER') then raise exception 'Invalid invitation role'; end if;

  if exists(
    select 1 from public.li_tenant_members m join auth.users u on u.id=m.user_id
    where m.tenant_id=p_tenant_id and lower(coalesce(u.email,''))=v_email and m.status='ACTIVE'
  ) then raise exception 'This user is already an active workspace member'; end if;

  update public.li_team_invitations set status='REVOKED',updated_at=now()
  where tenant_id=p_tenant_id and lower(email)=v_email and status='PENDING';

  v_token:=encode(extensions.gen_random_bytes(32),'hex');
  v_hash:=encode(extensions.digest(v_token,'sha256'),'hex');

  insert into public.li_team_invitations(id,tenant_id,email,role,status,token_hash,created_by,expires_at)
  values(v_id,p_tenant_id,v_email,v_role,'PENDING',v_hash,v_uid,v_expires);

  insert into public.li_activity_log(tenant_id,agent,action,reason,result)
  values(p_tenant_id,'SYSTEM','TEAM_INVITATION_CREATED','Workspace invitation created for '||v_email,'SUCCEEDED');

  return query select v_id,v_token,v_expires;
end;
$$;

create or replace function public.li_preview_team_invitation(p_token text)
returns table(tenant_name text,organization text,role text,expires_at timestamptz,email_matches boolean,status text)
language plpgsql security definer set search_path=''
as $$
declare v_uid uuid:=auth.uid(); v_hash text;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if coalesce(length(p_token),0)<32 then raise exception 'Invalid invitation token'; end if;
  v_hash:=encode(extensions.digest(p_token,'sha256'),'hex');
  return query
  select t.name,t.organization,i.role,i.expires_at,
         lower(coalesce(u.email,''))=lower(i.email),
         case when i.status='PENDING' and i.expires_at<=now() then 'EXPIRED' else i.status end
  from public.li_team_invitations i
  join public.li_tenants t on t.id=i.tenant_id
  join auth.users u on u.id=v_uid
  where i.token_hash=v_hash
  limit 1;
end;
$$;

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
  on conflict(tenant_id,user_id) do update set status='ACTIVE';

  select role into v_role from public.li_tenant_members
  where tenant_id=v_inv.tenant_id and user_id=v_uid;

  update public.li_team_invitations
  set status='ACCEPTED',accepted_by=v_uid,accepted_at=now(),updated_at=now()
  where id=v_inv.id;

  insert into public.li_activity_log(tenant_id,agent,action,reason,result)
  values(v_inv.tenant_id,'SYSTEM','TEAM_INVITATION_ACCEPTED','Workspace invitation accepted','SUCCEEDED');

  return query select v_inv.tenant_id,v_role;
end;
$$;

revoke all on function public.li_create_team_invitation(uuid,text,text,integer) from public,anon,authenticated;
revoke all on function public.li_preview_team_invitation(text) from public,anon,authenticated;
revoke all on function public.li_accept_team_invitation(text) from public,anon,authenticated;
grant execute on function public.li_create_team_invitation(uuid,text,text,integer) to authenticated;
grant execute on function public.li_preview_team_invitation(text) to authenticated;
grant execute on function public.li_accept_team_invitation(text) to authenticated;
