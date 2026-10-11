---
name: linkedin-prospecting
description: "Find and qualify relevant LinkedIn people for sales, partnerships, recruiting, or networking. Use for target-account research, decision-maker discovery, partner discovery, shortlist creation, connection-request strategy, and post-acceptance handoff."
---

# LinkedIn Prospecting & Network

Read the shared policies in `../_shared/` before execution, including `approval-queue.md`.

## Scope

Own new-person discovery, qualification, connection strategy, approval-queue preparation, and handoff after acceptance. Do not own ongoing DM conversations once a relationship becomes active.

## Intake

Use explicit:

- target industry
- company list or company type
- ICP/persona
- role/seniority
- geography
- named person
- partner type
- problem/use case
- result limit

Do not silently broaden hard filters.

## Workflow

1. Read user configuration and Run Control.
2. Search LinkedIn or available people sources.
3. Evaluate current role, company, seniority, functional relevance, industry, location, company fit, reason the relationship matters, and evidence.
4. Check CRM/LinkedIn state for existing connection, past conversation, client/partner status, exclusions, do-not-contact, current owner, prior invitation, or an existing queue row.
5. Reject duplicates and weak fits.
6. Group candidates as Strong Fit, Good Fit, Possible, or Rejected.
7. For a new person, record `DISCOVERED`; for a real outreach fit, record `QUALIFIED`.
8. State a genuine reason to connect and next action.
9. Prepare a connection note only when it adds material context. Blank is acceptable.
10. For Strong Fit / Good Fit candidates, create a `SEND_CONNECTION` Approval Queue row with `PENDING` approval and a stable idempotency key.
11. Do not send during prospect review.
12. Only after a real approved send succeeds, set the contact to `INVITED`.
13. Hand accepted connections to Inbox/CRM with the original targeting context.

## Connection states

`NOT CONNECTED | DISCOVERED | QUALIFIED | APPROVED | CONNECTION PREPARED | INVITED | ACCEPTED | CONVERSATION STARTED | ACTIVE | OPPORTUNITY | NOT INTERESTED | DORMANT | DO NOT CONTACT`

Never reset an existing relationship to a new-prospect state.

## Queue requirements

For `SEND_CONNECTION` rows include:

- Contact ID
- Person
- Company
- Target LinkedIn URL
- optional connection note
- specific reason
- Requested By Agent = `CONNECTION REVIEW`
- Approval State = `PENDING`
- Execution State = `NOT_READY`
- stable Idempotency Key

Do not create duplicate queue rows for the same person/action.

## Output

For recommended people include:

- Name
- Role
- Company
- Location when useful
- Why Fit
- Relationship/Opportunity Rationale
- Connection Status
- CRM History
- Recommended Action
- Profile URL/source
- Approval Queue status

Keep rejected and uncertain candidates separate.
