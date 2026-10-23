create table public.li_prospect_candidates(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.li_tenants(id) on delete cascade,
  source text not null default 'MANUAL',
  external_id text,
  dedupe_key text not null,
  name text not null,
  role_title text,
  company text,
  location text,
  linkedin_url text,
  reason text,
  fit_label text not null default 'UNREVIEWED' check(fit_label in ('UNREVIEWED','STRONG_FIT','GOOD_FIT','WEAK_FIT','REJECT')),
  fit_score integer check(fit_score is null or (fit_score>=0 and fit_score<=100)),
  status text not null default 'DISCOVERED' check(status in ('DISCOVERED','QUALIFIED','REJECTED','PROMOTED')),
  evidence jsonb not null default '{}'::jsonb,
  raw_data jsonb not null default '{}'::jsonb,
  promoted_contact_id uuid references public.li_contacts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id,dedupe_key)
);

create index li_prospect_candidates_tenant_status_idx
on public.li_prospect_candidates(tenant_id,status,fit_label,created_at desc);

alter table public.li_prospect_candidates enable row level security;

create policy li_prospect_candidates_select on public.li_prospect_candidates
for select to authenticated using((select li_private.has_tenant_access(tenant_id)));
create policy li_prospect_candidates_insert on public.li_prospect_candidates
for insert to authenticated with check((select li_private.can_write_tenant(tenant_id)));
create policy li_prospect_candidates_update on public.li_prospect_candidates
for update to authenticated using((select li_private.can_write_tenant(tenant_id))) with check((select li_private.can_write_tenant(tenant_id)));
create policy li_prospect_candidates_delete on public.li_prospect_candidates
for delete to authenticated using((select li_private.is_tenant_admin(tenant_id)));

grant select,insert,update,delete on public.li_prospect_candidates to authenticated;

create trigger li_prospect_candidates_updated_at_trigger
before update on public.li_prospect_candidates
for each row execute function li_private.set_updated_at();
