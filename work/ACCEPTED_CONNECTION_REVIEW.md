# Accepted Connection Review

Use LinkedIn OS, the Shared CRM, and the current Run Control state.

## Goal

Find contacts whose CRM state is `INVITED`, determine whether the LinkedIn connection has been accepted, and prepare the appropriate next step.

## Workflow

1. Read Config, Run Control, and Approval Queue.
2. Find relevant CRM contacts with connection status `INVITED`.
3. For each contact, check current LinkedIn connection status using the authorized browser.
4. If not accepted, leave the relationship state unchanged.
5. If accepted:
   - update CRM status to `ACCEPTED`;
   - recover the original reason for targeting them;
   - read relevant relationship/profile context;
   - decide whether the best next step is:
     - no message yet;
     - engage with content first;
     - simple introduction;
     - continue an earlier conversation;
     - contextual question;
     - partnership discussion;
     - business discussion.
6. If a DM is appropriate, draft a short, natural message.
7. Create one Approval Queue row:
   - Action Type: `SEND_DM`
   - Approval State: `PENDING`
   - Execution State: `NOT_READY`
   - include exact draft, target URL, reason, Contact ID, and stable idempotency key.
8. Do not send the message unless Run Control and an exact approval later permit it.

## Safety

Do not automatically pitch every accepted connection. Stop on LinkedIn verification, restriction, CAPTCHA, or security warning.

## Output

Return:

- newly accepted connections;
- no-action accepted connections;
- DMs queued for approval;
- any browser/account blockers.
