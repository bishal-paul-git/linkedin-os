# Approval Queue

The Approval Queue is the control plane for external LinkedIn actions.

## Runtime status

Implemented in the live private Shared CRM. Public repositories should contain the schema and workflow rules only, never private approval rows or relationship data.

## Fields

`Approval ID | Created At | Contact ID | Person | Company | Action Type | Target URL | Draft / Content | Reason | Requested By Agent | Approval State | Approved By | Approved At | Execution State | Executed At | Result | Related Task ID | Related Opportunity ID | Idempotency Key | Error / Notes`

## Action types

- SEND_DM
- REPLY_DM
- SEND_CONNECTION
- ACCEPT_CONNECTION
- DECLINE_CONNECTION
- COMMENT
- REACT
- PUBLISH_POST
- PUBLISH_PAGE_POST

## Approval state

`PENDING | APPROVED | REJECTED | EXPIRED`

## Execution state

`NOT_READY | READY | RUNNING | SUCCEEDED | FAILED | BLOCKED`

## Creation rules

1. External actions enter as `PENDING`.
2. Store the exact proposed content/action and target URL.
3. Link the Contact ID and related task/opportunity where known.
4. Record the requesting workflow.
5. Generate one stable Idempotency Key for the exact action.
6. Set Execution State to `NOT_READY`.
7. A workflow must never self-approve its own row.

## Approval rules

1. Approval applies only to the exact row/action unless the user explicitly authorizes a defined batch.
2. Editing substantive content after approval invalidates the approval.
3. Approval does not override Run Control.
4. Security restrictions always override approval.

## Execution rules

Before execution:

1. re-read Run Control;
2. require `Approval State = APPROVED`;
3. confirm that action class is currently permitted;
4. re-check current relationship state;
5. verify exact approved content;
6. confirm no earlier `SUCCEEDED` row has the same Idempotency Key.

Then:

- set `RUNNING` immediately before the action;
- perform only the exact approved action;
- on success set `SUCCEEDED`, record timestamp/result, and update CRM/activity history;
- on ordinary failure set `FAILED`;
- on LinkedIn security/restriction/verification issues set `BLOCKED` and stop the workflow.

## Idempotency

Every external action needs a stable Idempotency Key. A Work run must not repeat an action if an earlier successful row has the same key.
