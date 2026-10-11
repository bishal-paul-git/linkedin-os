# Approval Queue Contract

The Approval Queue is the only default path from a prepared external LinkedIn action to execution.

Expected columns:

`Approval ID | Created At | Contact ID | Person | Company | Action Type | Target URL | Draft / Content | Reason | Requested By Agent | Approval State | Approved By | Approved At | Execution State | Executed At | Result | Related Task ID | Related Opportunity ID | Idempotency Key | Error / Notes`

## Action types

`SEND_DM | REPLY_DM | SEND_CONNECTION | ACCEPT_CONNECTION | DECLINE_CONNECTION | COMMENT | REACT | PUBLISH_POST | PUBLISH_PAGE_POST`

## Approval states

`PENDING | APPROVED | REJECTED | EXPIRED`

## Execution states

`NOT_READY | READY | RUNNING | SUCCEEDED | FAILED | BLOCKED`

## Creation rules

When preparing an external action:

1. Create one stable Approval ID.
2. Link the relevant Contact ID when known.
3. Store the exact target URL.
4. Store the exact draft/content being proposed.
5. State the genuine reason for the action.
6. Identify the requesting workflow/agent.
7. Set Approval State to `PENDING`.
8. Set Execution State to `NOT_READY`.
9. Set a stable Idempotency Key for the exact action.

Do not mark a row approved yourself.

## Execution rules

Before executing an approved row:

1. Re-read Run Control.
2. Confirm the specific action type is currently allowed.
3. Confirm Approval State is `APPROVED`.
4. Confirm the approved content/action still exactly matches what will be performed.
5. Re-check relevant CRM/LinkedIn relationship state for material changes.
6. Confirm no earlier `SUCCEEDED` row has the same Idempotency Key.
7. Set Execution State to `RUNNING` only immediately before execution.
8. Perform only the exact approved action.
9. On success, set `SUCCEEDED`, record result/time, and update CRM/activity state.
10. On failure, set `FAILED` or `BLOCKED` with a factual reason.

Security warnings/restrictions always override approval.
