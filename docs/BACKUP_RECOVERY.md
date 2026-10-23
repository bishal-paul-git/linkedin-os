# Backup & Recovery Runbook

## Scope

Covers LinkedIn OS application code and tenant data.

## Code

Source of truth:

- GitHub repository `bishal-paul-git/linkedin-os`
- default branch `main`

Recovery:

1. identify last known-good commit;
2. verify CI status;
3. redeploy that commit through Vercel;
4. do not roll back database migrations blindly;
5. if application code is incompatible with a newer database schema, deploy a forward-compatible fix instead.

## Supabase data

Critical tables include:

- li_tenants
- li_tenant_members
- li_profiles
- li_config
- li_run_control
- li_contacts
- li_contact_identities
- li_conversations
- li_tasks
- li_opportunities
- li_content_engagement
- li_approval_queue
- li_workflow_settings
- li_workflow_runs
- li_schedules
- li_integrations
- li_integration_accounts
- li_social_posts
- li_social_analytics_snapshots
- li_social_comment_snapshots
- li_notification_preferences
- li_activity_log
- li_security_events

Provider credentials are stored through Supabase Vault. Never export plaintext provider secrets into Git, logs or support tickets.

## Recovery priorities

1. authentication + tenant isolation;
2. contacts/relationship memory;
3. approvals and Run Control;
4. workflow/schedule state;
5. opportunities/tasks;
6. integration metadata;
7. analytics snapshots.

## Restore validation

After any restore/recovery:

1. verify RLS is enabled;
2. run tenant-isolation tests;
3. verify Owner/Admin/Member/Viewer behavior;
4. verify Run Control defaults;
5. verify no approval became executable unintentionally;
6. verify provider secrets still resolve through Vault;
7. verify scheduler jobs;
8. verify Vercel runtime errors;
9. use synthetic QA records before real tenant actions.

## Destructive recovery rule

Never delete production tenant data or replace a database from backup without explicit owner approval and a verified recovery point.

## Rehearsal

A full backup/restore rehearsal is still pending and remains a production-hardening task.
