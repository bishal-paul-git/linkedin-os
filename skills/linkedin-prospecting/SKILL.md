---
name: linkedin-prospecting
description: "Find and qualify relevant LinkedIn people for sales, partnerships, recruiting, or networking. Use for target-account research, decision-maker discovery, partner discovery, shortlist creation, connection-request strategy, and post-acceptance handoff."
---

# LinkedIn Prospecting & Network

Read the shared policies in `../_shared/` before execution, including `approval-queue.md`.

## Scope

Own new-person discovery, qualification, connection strategy, approval-queue preparation, and handoff after acceptance. Do not own ongoing DM conversations once a relationship becomes active.

## Intake

Use explicit target industry, company/company type, ICP/persona, role/seniority, geography, partner type, problem/use case, named accounts/people, and result limit.

Do not silently broaden hard filters.

## Workflow

1. Read tenant Config and Run Control.
2. Resolve discovery capability/provider.
3. Search authorized sources.
4. Evaluate role, company, seniority, function, industry, location, company fit, and specific relationship reason.
5. Check normalized identities and CRM history before treating the person as new.
6. Check `network_state`, relationship stage, active owner, Do Not Contact, exclusions, prior invitation/conversation, and existing approval rows.
7. Group candidates as Strong Fit, Good Fit, Possible, or Rejected.
8. New relevant person: set `relationship_stage=DISCOVERED`.
9. Real outreach fit: set `relationship_stage=QUALIFIED`.
10. Keep `network_state` factual; do not change it because the person qualified.
11. Prepare a connection note only when specific context adds value.
12. Strong Fit / Good Fit: create one `SEND_CONNECTION` Approval Queue row with `PENDING / NOT_READY` and stable idempotency key.
13. When the action is ready, `relationship_stage` may become `PREPARED`.
14. Only verified invitation success sets `network_state=INVITED`.
15. Hand verified connected relationships to Inbox/CRM with original targeting context.

## Network states

`UNKNOWN | NOT_CONNECTED | INVITED | CONNECTED | DECLINED | WITHDRAWN`

## Relationship stages

`DISCOVERED | QUALIFIED | APPROVED | PREPARED | ENGAGED | ACTIVE | OPPORTUNITY | NOT_INTERESTED | DORMANT`

## Queue requirements

For `SEND_CONNECTION` rows include Contact ID, exact target/profile reference, optional specific note, concrete reason, requesting workflow, `PENDING` approval, `NOT_READY` execution state, stable Idempotency Key, and Workflow Run ID when available.

Never create duplicate queue rows for the same exact action.

## Output

For recommended people include Name, Role, Company, Location when useful, Fit, Why Relevant, Network State, Relationship Stage, CRM History, Recommended Action, source/profile identity, and Approval Queue status.
