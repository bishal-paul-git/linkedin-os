# Operations

## Production

App:

https://linkedin-os-delta.vercel.app

Vercel project:

`linkedin-os`

Supabase project:

`bishal-os` / `itauumqzqgewrfkoishh`

## Health model

Check:

1. Vercel deployment is READY.
2. Vercel runtime errors are empty/reviewed.
3. Supabase project is ACTIVE_HEALTHY.
4. RLS policies remain enabled.
5. scheduler jobs remain active.
6. unresolved `li_security_events` are reviewed.
7. workflow runs are not accumulating in QUEUED/RUNNING unexpectedly.

## Scheduler

Active jobs:

- `linkedin-os-scheduler-tick` — enqueues due interval schedules.
- `linkedin-os-workflow-processor` — processes up to 20 queued runs per minute.

## External integrations

An external provider is not considered available merely because its integration record exists.

It must register a healthy capability in `li_capabilities`.

Execution preference:

1. healthy authorized official adapter
2. assisted/manual mode
3. restricted/unavailable → do not execute

## Incident behavior

Security warnings override approvals.

Do not bypass CAPTCHA, identity verification, restrictions, access controls or platform protections.

Record meaningful blockers in `li_security_events`.
