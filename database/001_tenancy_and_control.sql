create extension if not exists pgcrypto;

create table if not exists public.li_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.li_tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  organization text,
  status text not null default 'ONBOARDING'
    check (status in ('ACTIVE','PAUSED','SUSPENDED','ONBOARDING')),
  default_approval_policy text not null default 'APPROVAL_REQUIRED'
    check (default_approval_policy in ('APPROVAL_REQUIRED','READ_ONLY','NARROWLY_AUTHORIZED')),
  memory_backend text not null default 'SUPABASE'
    check (memory_backend in ('GOOGLE_SHEETS','SUPABASE','POSTGRES','CRM_ADAPTER')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.li_tenant_members (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.li_tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'MEMBER'
    check (role in ('OWNER','ADMIN','MEMBER','VIEWER')),
  status text not null default 'ACTIVE'
    check (status in ('ACTIVE','INVITED','DISABLED')),
  created_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

create table if not exists public.li_integrations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.li_tenants(id) on delete cascade,
  provider text not null,
  name text,
  status text not null default 'DISCONNECTED'
    check (status in ('CONNECTED','DEGRADED','DISCONNECTED','EXPIRED','ERROR')),
  auth_type text,
  external_account_id text,
  scopes text[] not null default '{}',
  token_ref text,
  expires_at timestamptz,
  requires_user_reauth boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.li_capabilities (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.li_tenants(id) on delete cascade,
  integration_id uuid references public.li_integrations(id) on delete set null,
  capability text not null,
  mode text not null default 'UNAVAILABLE'
    check (mode in ('AVAILABLE_OFFICIAL','AVAILABLE_ASSISTED','AVAILABLE_BROWSER_READ','RESTRICTED_PARTNER','UNAVAILABLE','BLOCKED_BY_POLICY')),
  adapter text,
  can_execute boolean not null default false,
  requires_user_action boolean not null default true,
  reason text,
  health text not null default 'UNKNOWN'
    check (health in ('HEALTHY','DEGRADED','UNAVAILABLE','UNKNOWN')),
  last_verified_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, capability, adapter)
);

create table if not exists public.li_config (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.li_tenants(id) on delete cascade,
  key text not null,
  value jsonb not null default 'null'::jsonb,
  description text,
  required boolean not null default false,
  source text not null default 'USER',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, key)
);

create table if not exists public.li_run_control (
  tenant_id uuid primary key references public.li_tenants(id) on delete cascade,
  system_stage text not null default 'STAGE 1 - READ ONLY'
    check (system_stage in ('STAGE 1 - READ ONLY','STAGE 2 - APPROVED SENDS','STAGE 3 - NETWORK ACTIONS','STAGE 4 - CONTENT ACTIONS')),
  linkedin_external_actions text not null default 'BLOCKED'
    check (linkedin_external_actions in ('BLOCKED','APPROVAL REQUIRED','NARROWLY AUTHORIZED')),
  crm_writes text not null default 'ALLOWED'
    check (crm_writes in ('ALLOWED','APPROVAL REQUIRED','BLOCKED')),
  browser_mode text not null default 'READ ONLY'
    check (browser_mode in ('READ ONLY','INTERACTIVE')),
  connection_requests text not null default 'BLOCKED'
    check (connection_requests in ('BLOCKED','APPROVAL REQUIRED')),
  dm_reply_sending text not null default 'BLOCKED'
    check (dm_reply_sending in ('BLOCKED','APPROVAL REQUIRED')),
  comments_reactions text not null default 'BLOCKED'
    check (comments_reactions in ('BLOCKED','APPROVAL REQUIRED')),
  posts_page_posts text not null default 'BLOCKED'
    check (posts_page_posts in ('BLOCKED','APPROVAL REQUIRED')),
  approval_queue text not null default 'ACTIVE'
    check (approval_queue in ('ACTIVE','PAUSED')),
  approved_action_executor text not null default 'BLOCKED'
    check (approved_action_executor in ('BLOCKED','APPROVAL REQUIRED')),
  stop_on_security_warning boolean not null default true,
  current_test text,
  notes text,
  updated_at timestamptz not null default now()
);

create table if not exists public.li_agent_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.li_tenants(id) on delete cascade,
  agent_code text not null
    check (agent_code in ('MANAGER','INBOX','NETWORK','CONTENT','CRM','APPROVAL_EXECUTOR')),
  enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  instruction_version text,
  status text not null default 'ACTIVE'
    check (status in ('ACTIVE','PAUSED','BLOCKED')),
  updated_at timestamptz not null default now(),
  unique (tenant_id, agent_code)
);
