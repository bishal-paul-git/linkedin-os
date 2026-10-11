# Run Control Contract

Before LinkedIn work, read the shared CRM `Run Control` state when available.

Run Control is authoritative and overrides any more permissive skill default.

Expected controls:

- System Stage
- LinkedIn External Actions
- CRM Writes
- Browser Mode
- Connection Requests
- DM / Reply Sending
- Comments / Reactions
- Posts / Page Posts
- Stop On Security Warning
- Current Test

Rules:

1. Never escalate a control from BLOCKED to allowed on your own.
2. Never convert an earlier approval into permanent permission.
3. CRM writes may be allowed while external LinkedIn actions remain blocked.
4. If a requested action conflicts with Run Control, prepare it but do not execute it.
5. After a meaningful approved external action, update CRM/activity state when CRM writes are allowed.
6. Stop the affected workflow on security warnings or restrictions.
