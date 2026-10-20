-- Synthetic tenant-isolation smoke test.
-- Uses rollback-only UUIDs and does not inspect or modify real auth users.

begin;

create temp table rls_test_results(test text, passed boolean, detail text);
grant select, insert on rls_test_results to authenticated;

set local session_replication_role = replica;

insert into public.li_tenants(id, slug, name, created_by)
values
  ('11111111-1111-1111-1111-111111111111','rls-a','RLS Tenant A','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('22222222-2222-2222-2222-222222222222','rls-b','RLS Tenant B','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

insert into public.li_tenant_members(tenant_id,user_id,role,status)
values
  ('11111111-1111-1111-1111-111111111111','cccccccc-cccc-cccc-cccc-cccccccccccc','MEMBER','ACTIVE'),
  ('11111111-1111-1111-1111-111111111111','dddddddd-dddd-dddd-dddd-dddddddddddd','VIEWER','ACTIVE'),
  ('11111111-1111-1111-1111-111111111111','eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee','ADMIN','ACTIVE');

insert into public.li_contacts(id,tenant_id,name,relationship_owner)
values
  ('31111111-1111-1111-1111-111111111111','11111111-1111-1111-1111-111111111111','Tenant A Contact','CRM'),
  ('32222222-2222-2222-2222-222222222222','22222222-2222-2222-2222-222222222222','Tenant B Contact','CRM');

set local session_replication_role = origin;

set local role authenticated;
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',true);

insert into rls_test_results
select 'owner_sees_only_own_tenant',
       count(*) = 1
       and count(*) filter (where id='11111111-1111-1111-1111-111111111111'::uuid)=1,
       'tenant_count=' || count(*)::text
from public.li_tenants
where id in (
  '11111111-1111-1111-1111-111111111111'::uuid,
  '22222222-2222-2222-2222-222222222222'::uuid
);

insert into rls_test_results
select 'owner_sees_only_own_contacts',
       count(*) = 1
       and count(*) filter (where tenant_id='11111111-1111-1111-1111-111111111111'::uuid)=1,
       'contact_count=' || count(*)::text
from public.li_contacts
where tenant_id in (
  '11111111-1111-1111-1111-111111111111'::uuid,
  '22222222-2222-2222-2222-222222222222'::uuid
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','cccccccc-cccc-cccc-cccc-cccccccccccc',true);

insert into public.li_contacts(tenant_id,name,relationship_owner)
values ('11111111-1111-1111-1111-111111111111','Member Created Contact','CRM');

insert into rls_test_results
select 'member_can_write_own_tenant',
       exists(select 1 from public.li_contacts where name='Member Created Contact'),
       'member insert';

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','dddddddd-dddd-dddd-dddd-dddddddddddd',true);

do $$
begin
  begin
    insert into public.li_contacts(tenant_id,name,relationship_owner)
    values ('11111111-1111-1111-1111-111111111111','Viewer Must Fail','CRM');
    insert into rls_test_results values ('viewer_write_denied',false,'unexpected insert succeeded');
  exception when others then
    insert into rls_test_results values ('viewer_write_denied',true,sqlstate);
  end;
end $$;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','ffffffff-ffff-ffff-ffff-ffffffffffff',true);

insert into rls_test_results
select 'outsider_sees_nothing',
       count(*) = 0,
       'visible=' || count(*)::text
from public.li_contacts
where tenant_id='11111111-1111-1111-1111-111111111111'::uuid;

reset role;

select * from rls_test_results order by test;

rollback;
