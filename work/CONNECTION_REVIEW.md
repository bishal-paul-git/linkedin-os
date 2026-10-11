# Connection Review

Use LinkedIn OS, the Shared CRM, and the current Run Control state.

## Goal

Find genuinely relevant people on LinkedIn, qualify them against Config and CRM history, and create `SEND_CONNECTION` rows in the Approval Queue for strong/good fits.

This workflow prepares and queues actions only. It does not send connection requests unless a separate approved-action execution flow is later permitted.

## Source of truth

Before searching LinkedIn:

1. Read `Config`.
2. Read `Run Control`.
3. Read `Agent Registry`.
4. Read the existing `Contacts` and `Approval Queue` state relevant to the candidate.

Do not silently broaden hard filters from Config or the current user request.

## Qualification

Evaluate:

- current role and seniority;
- current company;
- industry/company-type fit;
- location fit;
- decision-making or partnership relevance;
- whether the user's services/products plausibly matter to them;
- whether there is a specific professional reason to connect;
- existing relationship/history;
- current owner/workflow;
- exclusion / Do Not Contact state.

Classify candidates:

- `STRONG FIT`
- `GOOD FIT`
- `POSSIBLE`
- `REJECTED`

Only Strong Fit and Good Fit candidates may be auto-queued for approval.

## Dedupe and relationship checks

Before queueing, reject or route elsewhere when:

- the LinkedIn URL already exists in Contacts;
- name + company already identifies the same person;
- the person is already connected;
- a connection request is already pending/sent;
- there is an active DM conversation;
- the person is a client/partner with an existing relationship that should not be treated as cold;
- Do Not Contact is true;
- another workflow already owns an active relationship/task;
- an existing Approval Queue row already covers the same connection action.

Never reset an existing relationship to a cold prospect.

## CRM state

For a new relevant person:

1. Create/update a Contact record.
2. Set `Connection Status = DISCOVERED` during initial evaluation.
3. If qualified for outreach, set `Connection Status = QUALIFIED`.
4. Set Relationship Type to `Prospect` or `Potential Partner` as appropriate.
5. Set Relationship Owner to `NETWORK`.
6. Set a reasoned priority.
7. Record the source/profile URL and concise factual notes.
8. Set `Next Action = Review connection request`.

Do not set `INVITED` until LinkedIn actually confirms a sent invitation.

## Approval Queue row

For every Strong Fit / Good Fit candidate being recommended:

- Action Type: `SEND_CONNECTION`
- Target URL: exact LinkedIn profile URL
- Draft / Content: optional connection note, or blank when no note is better
- Reason: short specific reason this relationship matters
- Requested By Agent: `CONNECTION REVIEW`
- Approval State: `PENDING`
- Execution State: `NOT_READY`
- Idempotency Key: stable key for the exact contact + SEND_CONNECTION action

A connection note is optional. Create one only when specific context adds real value. Do not write generic pitch notes.

## Output

Return:

### QUEUED FOR APPROVAL
Strong/good fits added to Approval Queue.

### POSSIBLE
Relevant but not strong enough to queue automatically.

### REJECTED
Duplicates, weak matches, excluded people, or existing relationships handled elsewhere.

### BLOCKERS
Browser, LinkedIn, CRM, verification, or security issues.

## Safety

Stop on CAPTCHA, verification, unusual activity, restriction, or security warnings.

Do not send a connection request during this workflow.
