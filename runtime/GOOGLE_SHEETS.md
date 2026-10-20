# Google Sheets Runtime Adapter

The V1 CRM uses these logical tables:

Contacts, Conversations, Opportunities, Tasks, Content & Engagement, Activity Log, Config, Run Control, Agent Registry, Approval Queue.

## Responsibilities

- persistent state;
- dedupe source;
- workflow coordination;
- approval state;
- run permissions;
- audit history.

## Migration contract

A future database may replace Sheets if it preserves IDs, state enums, ownership, approvals, idempotency keys, and activity history.
