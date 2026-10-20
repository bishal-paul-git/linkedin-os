-- Refines relationship state without breaking the legacy connection_status column.

alter table public.li_contacts
  add column if not exists network_state text not null default 'UNKNOWN',
  add column if not exists relationship_stage text not null default 'DISCOVERED';

alter table public.li_contacts drop constraint if exists li_contacts_network_state_check;
alter table public.li_contacts
  add constraint li_contacts_network_state_check
  check (network_state in ('UNKNOWN','NOT_CONNECTED','INVITED','CONNECTED','DECLINED','WITHDRAWN'));

alter table public.li_contacts drop constraint if exists li_contacts_relationship_stage_check;
alter table public.li_contacts
  add constraint li_contacts_relationship_stage_check
  check (relationship_stage in ('DISCOVERED','QUALIFIED','APPROVED','PREPARED','ENGAGED','ACTIVE','OPPORTUNITY','NOT_INTERESTED','DORMANT'));

update public.li_contacts
set
  network_state = case
    when connection_status = 'INVITED' then 'INVITED'
    when connection_status in ('ACCEPTED','CONVERSATION STARTED','ACTIVE','OPPORTUNITY') then 'CONNECTED'
    when connection_status in ('NOT CONNECTED','DISCOVERED','QUALIFIED','APPROVED','CONNECTION PREPARED','NOT INTERESTED','DORMANT') then 'NOT_CONNECTED'
    else network_state
  end,
  relationship_stage = case
    when connection_status = 'DISCOVERED' then 'DISCOVERED'
    when connection_status = 'QUALIFIED' then 'QUALIFIED'
    when connection_status = 'APPROVED' then 'APPROVED'
    when connection_status = 'CONNECTION PREPARED' then 'PREPARED'
    when connection_status in ('ACCEPTED','CONVERSATION STARTED') then 'ENGAGED'
    when connection_status = 'ACTIVE' then 'ACTIVE'
    when connection_status = 'OPPORTUNITY' then 'OPPORTUNITY'
    when connection_status = 'NOT INTERESTED' then 'NOT_INTERESTED'
    when connection_status = 'DORMANT' then 'DORMANT'
    else relationship_stage
  end;

create table if not exists public.li_contact_identities (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.li_tenants(id) on delete cascade,
  contact_id uuid not null references public.li_contacts(id) on delete cascade,
  identity_type text not null
    check (identity_type in ('LINKEDIN_URL','LINKEDIN_URN','EMAIL','CRM_ID','PROVIDER_ID')),
  provider text,
  external_id text not null,
  canonical_value text,
  is_primary boolean not null default false,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists li_contact_identities_unique
  on public.li_contact_identities(tenant_id, identity_type, coalesce(provider,''), external_id);

create index if not exists li_contact_identities_contact_idx
  on public.li_contact_identities(contact_id, identity_type);
