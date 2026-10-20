insert into public.li_workflow_templates
(code, name, description, default_mode, required_capabilities, default_config, version, active)
values
('DAILY_RUN','Daily Operating Loop','Review urgent inbox, follow-ups, accepted connections, approvals, network opportunities, content opportunities and system blockers.','READ_ONLY','{}','{}'::jsonb,'1.0',true),
('INBOX_REVIEW','Inbox Review','Review existing LinkedIn conversations, classify, update memory and prepare replies.','PREPARE_ONLY',array['READ_INBOX'],'{}'::jsonb,'1.0',true),
('CONNECTION_REVIEW','Connection Review','Discover and qualify relevant people, dedupe against memory and prepare connection approvals.','PREPARE_ONLY',array['DISCOVER_PROSPECTS'],'{}'::jsonb,'1.0',true),
('ACCEPTANCE_REVIEW','Accepted Connection Review','Reconcile invited contacts, detect accepted relationships and prepare the best next action.','PREPARE_ONLY',array['CHECK_CONNECTION_STATE'],'{}'::jsonb,'1.0',true),
('COMMENT_REVIEW','Comment Review','Find relevant posts, understand context and prepare high-quality comments for approval.','PREPARE_ONLY',array['READ_RELEVANT_POSTS'],'{}'::jsonb,'1.0',true),
('APPROVAL_EXECUTOR','Approval Executor','Execute only exact approved external actions through the tenant capability resolver.','APPROVAL_GATED','{}','{}'::jsonb,'1.0',true)
on conflict (code) do update set
name=excluded.name,
description=excluded.description,
default_mode=excluded.default_mode,
required_capabilities=excluded.required_capabilities,
default_config=excluded.default_config,
version=excluded.version,
active=excluded.active;
