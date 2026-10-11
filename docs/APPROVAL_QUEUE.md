# Approval Queue

The Approval Queue is the control plane for external LinkedIn actions.

## Purpose

Keep research/drafting automated while making visible LinkedIn actions explicit, reviewable, and auditable.

## Recommended fields

`Approval ID | Contact ID | Person | Action Type | Target URL | Draft / Content | Reason | Requested By Agent | Created At | Approval State | Approved By | Approved At | Execution State | Executed At | Result | Error / Notes`

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

## Rules

1. External actions enter as `PENDING`.
2. The approval record must contain the exact proposed content/action.
3. Approval applies only to that row/action unless the user explicitly authorizes a defined batch.
4. Editing the content after approval invalidates the approval unless the edit is purely non-substantive and the user has explicitly allowed that behavior.
5. Before execution, re-check Run Control and relevant CRM state.
6. Do not execute if the relationship state changed materially since approval.
7. Record success/failure and update the relevant contact/task/activity state.
8. Stop execution on LinkedIn security warnings or restrictions.

## Idempotency

Each approved action should have a stable Approval ID and execution guard so a scheduled Work run cannot perform the same action twice.
