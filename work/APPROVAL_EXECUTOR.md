# Approval Executor

Use the Shared CRM `Approval Queue` as the only source of approved external actions.

## Current safety rule

If Run Control says `Approved Action Executor = BLOCKED`, do not execute anything. Report approved rows that are waiting.

## Execution workflow

For each candidate row:

1. Require `Approval State = APPROVED`.
2. Require `Execution State` to be `NOT_READY` or `READY`.
3. Read Run Control and confirm the exact action class is permitted.
4. Re-read the relevant CRM contact/conversation/task context.
5. Re-check the LinkedIn target and current relationship state.
6. Verify the exact draft/content has not changed since approval.
7. Search the queue/activity history for the Idempotency Key.
8. If an earlier successful execution exists, do not repeat it.
9. Mark the row `RUNNING`.
10. Perform only the exact approved action.
11. On success:
    - mark `SUCCEEDED`;
    - record execution time/result;
    - update contact/conversation/task/content state as relevant;
    - write Activity Log.
12. On an ordinary execution failure, mark `FAILED` with the factual error.
13. On security/restriction/verification issues, mark `BLOCKED`, stop that workflow, and report it.

## Never

- expand one approval into a different action;
- rewrite the approved content at execution time;
- treat a batch approval as standing permission unless explicitly defined;
- retry security-blocked actions;
- bypass CAPTCHA, verification, restrictions, or access controls.
