create table if not exists public.li_contacts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.li_tenants(id) on delete cascade,
  name text not null,
  linkedin_url text,
  linkedin_member_urn text,
  role_title text,
  company text,
  location text,
  connection_status text not null default 'NOT CONNECTED'
    check (connection_status in ('NOT CONNECTED','DISCOVERED','QUALIFIED','APPROVED','CONNECTION PREPARED','INVITED','ACCEPTED','CONVERSATION STARTED','ACTIVE','OPPORTUNITY','NOT INTERESTED','DORMANT','DO NOT CONTACT')),
  relationship_type text not null default 'Unknown'
    check (relationship_type in ('Prospect','Client','Former Client','Partner','Potential Partner','Colleague','Supplier','Recruiter','Candidate','Investor','Industry Contact','Friend','Unknown')),
  relationship_owner text not null default 'CRM',
  priority text not null default 'P3' check (priority in ('P0','P1','P2','P3','P4')),
  fit_class text check (fit_class is null or fit_class in ('STRONG FIT','GOOD FIT','POSSIBLE','REJECTED')),
  source text,
  first_discovered_at timestamptz not null default now(),
  first_interaction_at timestamptz,
  last_interaction_at timestamptz,
  next_action text,
  next_action_at timestamptz,
  do_not_contact boolean not null default false,
  opportunity_status text not null default 'NONE'
    check (opportunity_status in ('NONE','SIGNAL','DISCOVERY','CONVERSATION','MEETING','QUALIFIED','PROPOSAL','NEGOTIATION','WON','LOST','DORMANT')),
  email text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.li_conversations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.li_tenants(id) on delete cascade,
  contact_id uuid references public.li_contacts(id) on delete cascade,
  occurred_at timestamptz not null default now(),
  direction text check (direction is null or direction in ('INBOUND','OUTBOUND','MIXED')),
  category text,
  priority text not null default 'P3' check (priority in ('P0','P1','P2','P3','P4')),
  summary text,
  what_they_want text,
  what_we_want text,
  question_awaiting_answer text,
  commitment_made text,
  requires_reply boolean not null default false,
  reply_status text not null default 'NOT REQUIRED'
    check (reply_status in ('NOT REQUIRED','NEEDS DRAFT','APPROVAL NEEDED','APPROVED','SENT','NO ACTION')),
  next_action text,
  next_action_at timestamptz,
  opportunity_signal text,
  owner_agent text not null default 'INBOX',
  source_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.li_opportunities (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.li_tenants(id) on delete cascade,
  contact_id uuid references public.li_contacts(id) on delete set null,
  company text,
  opportunity_type text,
  problem_need text,
  evidence text,
  potential_solution text,
  stage text not null default 'SIGNAL'
    check (stage in ('SIGNAL','DISCOVERY','CONVERSATION','MEETING','QUALIFIED','PROPOSAL','NEGOTIATION','WON','LOST','DORMANT')),
  priority text not null default 'P2' check (priority in ('P0','P1','P2','P3','P4')),
  owner_agent text not null default 'MANAGER',
  last_interaction_at timestamptz,
  next_action text,
  next_action_at timestamptz,
  estimated_value numeric,
  currency text,
  meeting_status text,
  source_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.li_tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.li_tenants(id) on delete cascade,
  contact_id uuid references public.li_contacts(id) on delete set null,
  opportunity_id uuid references public.li_opportunities(id) on delete set null,
  name text,
  task text not null,
  owner_agent text not null,
  priority text not null default 'P3' check (priority in ('P0','P1','P2','P3','P4')),
  status text not null default 'TODO'
    check (status in ('TODO','IN PROGRESS','BLOCKED','WAITING','DONE','CANCELLED')),
  due_at timestamptz,
  requires_approval boolean not null default false,
  approval_state text not null default 'NOT REQUIRED'
    check (approval_state in ('NOT REQUIRED','PENDING','APPROVED','REJECTED')),
  source_url text,
  notes text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.li_content_engagement (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.li_tenants(id) on delete cascade,
  contact_id uuid references public.li_contacts(id) on delete set null,
  person_company text,
  linkedin_url text,
  activity_type text not null
    check (activity_type in ('COMMENT','REACT','PERSONAL_POST','PAGE_POST','PUBLIC_REPLY','WATCH')),
  topic text,
  relationship_relevance text,
  objective text,
  draft_summary text,
  approval_state text not null default 'PENDING'
    check (approval_state in ('NOT REQUIRED','PENDING','APPROVED','REJECTED','EXPIRED')),
  status text not null default 'DRAFTED'
    check (status in ('DRAFTED','READY','SCHEDULED','PERFORMED','SKIPPED','BLOCKED','FAILED')),
  scheduled_at timestamptz,
  performed_at timestamptz,
  result text,
  owner_agent text not null default 'CONTENT',
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.li_approval_queue (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.li_tenants(id) on delete cascade,
  contact_id uuid references public.li_contacts(id) on delete set null,
  task_id uuid references public.li_tasks(id) on delete set null,
  opportunity_id uuid references public.li_opportunities(id) on delete set null,
  person text,
  company text,
  action_type text not null
    check (action_type in ('SEND_DM','REPLY_DM','SEND_CONNECTION','ACCEPT_CONNECTION','DECLINE_CONNECTION','COMMENT','REACT','PUBLISH_POST','PUBLISH_PAGE_POST')),
  target_url text not null,
  draft_content text,
  reason text not null,
  requested_by_agent text not null,
  approval_state text not null default 'PENDING'
    check (approval_state in ('PENDING','APPROVED','REJECTED','EXPIRED')),
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  execution_state text not null default 'NOT_READY'
    check (execution_state in ('NOT_READY','READY','RUNNING','SUCCEEDED','FAILED','BLOCKED')),
  executed_at timestamptz,
  result text,
  idempotency_key text not null,
  error_notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, idempotency_key)
);

create table if not exists public.li_memory_facts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.li_tenants(id) on delete cascade,
  contact_id uuid references public.li_contacts(id) on delete cascade,
  subject_type text not null default 'CONTACT'
    check (subject_type in ('TENANT','CONTACT','COMPANY','RELATIONSHIP','WORKFLOW','INTEGRATION')),
  subject_ref text,
  fact_key text not null,
  fact_value jsonb not null,
  confidence numeric(4,3) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  provenance text,
  source_url text,
  observed_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.li_activity_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.li_tenants(id) on delete cascade,
  occurred_at timestamptz not null default now(),
  agent text not null,
  contact_id uuid references public.li_contacts(id) on delete set null,
  name text,
  action text not null,
  reason text,
  result text not null,
  related_task_id uuid references public.li_tasks(id) on delete set null,
  related_opportunity_id uuid references public.li_opportunities(id) on delete set null,
  approval_id uuid references public.li_approval_queue(id) on delete set null,
  source_url text,
  notes text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.li_workflow_templates (
  code text primary key,
  name text not null,
  description text not null,
  default_mode text not null default 'PREPARE_ONLY',
  required_capabilities text[] not null default '{}',
  default_config jsonb not null default '{}'::jsonb,
  version text not null default '1.0',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.li_workflow_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.li_tenants(id) on delete cascade,
  workflow_code text not null references public.li_workflow_templates(code),
  enabled boolean not null default true,
  mode text not null default 'PREPARE_ONLY'
    check (mode in ('READ_ONLY','PREPARE_ONLY','APPROVAL_GATED','DISABLED')),
  config jsonb not null default '{}'::jsonb,
  last_status text,
  updated_at timestamptz not null default now(),
  unique (tenant_id, workflow_code)
);

create table if not exists public.li_workflow_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.li_tenants(id) on delete cascade,
  workflow_code text not null references public.li_workflow_templates(code),
  trigger_type text not null default 'MANUAL'
    check (trigger_type in ('MANUAL','SCHEDULED','EVENT','SYSTEM')),
  status text not null default 'QUEUED'
    check (status in ('QUEUED','RUNNING','SUCCEEDED','PARTIAL','FAILED','BLOCKED','CANCELLED')),
  started_at timestamptz,
  finished_at timestamptz,
  cursor_state jsonb not null default '{}'::jsonb,
  stats jsonb not null default '{}'::jsonb,
  input_summary text,
  output_summary text,
  error text,
  created_at timestamptz not null default now()
);

create table if not exists public.li_schedules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.li_tenants(id) on delete cascade,
  workflow_code text not null references public.li_workflow_templates(code),
  name text not null,
  schedule_type text not null default 'CRON'
    check (schedule_type in ('CRON','INTERVAL','MANUAL_ONLY')),
  schedule_expression text,
  timezone text not null default 'UTC',
  enabled boolean not null default false,
  next_run_at timestamptz,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.li_security_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.li_tenants(id) on delete cascade,
  integration_id uuid references public.li_integrations(id) on delete set null,
  event_type text not null,
  severity text not null default 'WARNING'
    check (severity in ('INFO','WARNING','HIGH','CRITICAL')),
  source text,
  summary text not null,
  blocked_workflow boolean not null default false,
  occurred_at timestamptz not null default now(),
  resolved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);
