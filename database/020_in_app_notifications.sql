create table public.li_notifications(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.li_tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  title text not null,
  body text,
  severity text not null default 'INFO' check(severity in ('INFO','WARN','CRITICAL')),
  status text not null default 'UNREAD' check(status in ('UNREAD','READ','DISMISSED')),
  source_type text,
  source_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index li_notifications_user_idx on public.li_notifications(tenant_id,user_id,status,created_at desc);
alter table public.li_notifications enable row level security;

create policy li_notifications_select on public.li_notifications
for select to authenticated
using(user_id=(select auth.uid()) and (select li_private.has_tenant_access(tenant_id)));

create policy li_notifications_update on public.li_notifications
for update to authenticated
using(user_id=(select auth.uid()) and (select li_private.has_tenant_access(tenant_id)))
with check(user_id=(select auth.uid()) and (select li_private.has_tenant_access(tenant_id)));

grant select,update on public.li_notifications to authenticated;

create or replace function li_private.fanout_notification(
  p_tenant_id uuid,p_event_type text,p_title text,p_body text,p_severity text,p_source_type text,p_source_id uuid,p_preference text
)
returns void language plpgsql security definer set search_path=''
as $$
begin
  insert into public.li_notifications(tenant_id,user_id,event_type,title,body,severity,source_type,source_id)
  select p_tenant_id,m.user_id,p_event_type,p_title,p_body,p_severity,p_source_type,p_source_id
  from public.li_tenant_members m
  left join public.li_notification_preferences p on p.tenant_id=m.tenant_id and p.user_id=m.user_id
  where m.tenant_id=p_tenant_id and m.status='ACTIVE'
    and case p_preference
      when 'approval_alerts' then coalesce(p.approval_alerts,true)
      when 'workflow_failures' then coalesce(p.workflow_failures,true)
      when 'security_alerts' then coalesce(p.security_alerts,true)
      when 'opportunity_alerts' then coalesce(p.opportunity_alerts,true)
      else true
    end;
end;
$$;

revoke all on function li_private.fanout_notification(uuid,text,text,text,text,text,uuid,text) from public,anon,authenticated;

create or replace function li_private.notify_approval_pending()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  if new.approval_state='PENDING' and (tg_op='INSERT' or old.approval_state is distinct from new.approval_state) then
    perform li_private.fanout_notification(new.tenant_id,'APPROVAL_PENDING','Approval required',coalesce(new.person,new.company,new.action_type)||' · '||coalesce(new.reason,'Action requires review'),'WARN','APPROVAL',new.id,'approval_alerts');
  end if;
  return new;
end;
$$;

create or replace function li_private.notify_workflow_failure()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  if new.status in ('FAILED','BLOCKED') and (tg_op='INSERT' or old.status is distinct from new.status) then
    perform li_private.fanout_notification(new.tenant_id,'WORKFLOW_FAILURE','Workflow needs attention',new.workflow_code||' · '||coalesce(new.output_summary,new.status),case when new.status='FAILED' then 'CRITICAL' else 'WARN' end,'WORKFLOW_RUN',new.id,'workflow_failures');
  end if;
  return new;
end;
$$;

create or replace function li_private.notify_security_event()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  if new.resolved_at is null then
    perform li_private.fanout_notification(new.tenant_id,'SECURITY_EVENT','Security event',new.event_type||' · '||coalesce(new.summary,'Review required'),case when new.severity in ('CRITICAL','HIGH') then 'CRITICAL' else 'WARN' end,'SECURITY_EVENT',new.id,'security_alerts');
  end if;
  return new;
end;
$$;

create or replace function li_private.notify_opportunity_created()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  perform li_private.fanout_notification(new.tenant_id,'OPPORTUNITY_CREATED','New opportunity signal',coalesce(new.company,new.opportunity_type,'Opportunity')||' · '||coalesce(new.problem_need,new.evidence,'Evidence recorded'),'INFO','OPPORTUNITY',new.id,'opportunity_alerts');
  return new;
end;
$$;

create trigger li_approval_queue_notify_pending after insert or update of approval_state on public.li_approval_queue for each row execute function li_private.notify_approval_pending();
create trigger li_workflow_runs_notify_failure after insert or update of status on public.li_workflow_runs for each row execute function li_private.notify_workflow_failure();
create trigger li_security_events_notify after insert on public.li_security_events for each row execute function li_private.notify_security_event();
create trigger li_opportunities_notify after insert on public.li_opportunities for each row execute function li_private.notify_opportunity_created();
