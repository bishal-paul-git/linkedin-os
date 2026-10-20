create index if not exists li_tenant_members_user_idx on public.li_tenant_members(user_id, status, tenant_id);
create index if not exists li_integrations_tenant_provider_idx on public.li_integrations(tenant_id, provider, status);
create index if not exists li_capabilities_tenant_cap_idx on public.li_capabilities(tenant_id, capability, can_execute);
create index if not exists li_capabilities_integration_idx on public.li_capabilities(integration_id);
create index if not exists li_agent_settings_tenant_idx on public.li_agent_settings(tenant_id, enabled);

create unique index if not exists li_contacts_tenant_linkedin_url_uq
  on public.li_contacts(tenant_id, linkedin_url)
  where linkedin_url is not null;
create index if not exists li_contacts_tenant_network_idx on public.li_contacts(tenant_id, network_state, priority);
create index if not exists li_contacts_tenant_relationship_idx on public.li_contacts(tenant_id, relationship_stage, priority);
create index if not exists li_contacts_tenant_company_idx on public.li_contacts(tenant_id, company);

create unique index if not exists li_contact_identities_unique
  on public.li_contact_identities(tenant_id, identity_type, coalesce(provider,''), external_id);
create index if not exists li_contact_identities_contact_idx
  on public.li_contact_identities(contact_id, identity_type);

create index if not exists li_conversations_tenant_contact_idx on public.li_conversations(tenant_id, contact_id, occurred_at desc);
create index if not exists li_conversations_contact_idx on public.li_conversations(contact_id);
create index if not exists li_opportunities_tenant_stage_idx on public.li_opportunities(tenant_id, stage, priority);
create index if not exists li_opportunities_contact_idx on public.li_opportunities(contact_id);
create index if not exists li_tasks_tenant_status_idx on public.li_tasks(tenant_id, status, priority, due_at);
create index if not exists li_tasks_contact_idx on public.li_tasks(contact_id);
create index if not exists li_tasks_opportunity_idx on public.li_tasks(opportunity_id);

create index if not exists li_content_tenant_status_idx on public.li_content_engagement(tenant_id, status, activity_type);
create index if not exists li_content_contact_idx on public.li_content_engagement(contact_id);

create index if not exists li_approval_tenant_state_idx on public.li_approval_queue(tenant_id, approval_state, execution_state, created_at);
create index if not exists li_approval_approved_by_idx on public.li_approval_queue(approved_by);
create index if not exists li_approval_contact_idx on public.li_approval_queue(contact_id);
create index if not exists li_approval_opp_idx on public.li_approval_queue(opportunity_id);
create index if not exists li_approval_task_idx on public.li_approval_queue(task_id);
create index if not exists li_approval_workflow_run_idx on public.li_approval_queue(workflow_run_id);

create index if not exists li_memory_tenant_subject_idx on public.li_memory_facts(tenant_id, subject_type, contact_id, fact_key);
create index if not exists li_memory_contact_idx on public.li_memory_facts(contact_id);

create index if not exists li_activity_tenant_time_idx on public.li_activity_log(tenant_id, occurred_at desc);
create index if not exists li_activity_approval_idx on public.li_activity_log(approval_id);
create index if not exists li_activity_contact_idx on public.li_activity_log(contact_id);
create index if not exists li_activity_opp_idx on public.li_activity_log(related_opportunity_id);
create index if not exists li_activity_task_idx on public.li_activity_log(related_task_id);
create index if not exists li_activity_workflow_run_idx on public.li_activity_log(workflow_run_id);

create index if not exists li_workflow_runs_tenant_idx on public.li_workflow_runs(tenant_id, workflow_code, created_at desc);
create index if not exists li_workflow_runs_workflow_idx on public.li_workflow_runs(workflow_code);
create unique index if not exists li_workflow_runs_dedupe_uq
  on public.li_workflow_runs(tenant_id, dedupe_key)
  where dedupe_key is not null;
create index if not exists li_workflow_runs_lease_idx
  on public.li_workflow_runs(status, lease_expires_at)
  where status in ('QUEUED','RUNNING');

create index if not exists li_workflow_settings_workflow_idx on public.li_workflow_settings(workflow_code);
create index if not exists li_schedules_due_idx on public.li_schedules(enabled, next_run_at) where enabled = true;
create index if not exists li_schedules_tenant_idx on public.li_schedules(tenant_id);
create index if not exists li_schedules_workflow_idx on public.li_schedules(workflow_code);

create index if not exists li_security_tenant_idx on public.li_security_events(tenant_id, occurred_at desc, severity);
create index if not exists li_security_integration_idx on public.li_security_events(integration_id);
create index if not exists li_security_workflow_run_idx on public.li_security_events(workflow_run_id);

create index if not exists li_tenants_created_by_idx on public.li_tenants(created_by);
