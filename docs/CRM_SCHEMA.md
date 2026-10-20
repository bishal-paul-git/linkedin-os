# CRM / Memory Schema

LinkedIn OS now has two runtime profiles:

- **Legacy V1:** Google Sheets for the original single-user workflow.
- **Product core:** tenant-scoped Supabase/Postgres `li_*` tables.

For new product development, the Supabase model is authoritative.

## Contact identity

A contact can have multiple normalized identities in `li_contact_identities`:

`LINKEDIN_URL | LINKEDIN_URN | EMAIL | CRM_ID | PROVIDER_ID`

Use normalized identities before name/company fuzzy matching.

## Contact state

Keep these separate:

### Network state

`UNKNOWN | NOT_CONNECTED | INVITED | CONNECTED | DECLINED | WITHDRAWN`

### Relationship stage

`DISCOVERED | QUALIFIED | APPROVED | PREPARED | ENGAGED | ACTIVE | OPPORTUNITY | NOT_INTERESTED | DORMANT`

### Do Not Contact

Boolean safety override. It is not a network state.

The older Google Sheet `Connection Status` field is maintained only for V1 compatibility.

## Conversations

Store concise summaries, direction, category, priority, what each side wants, unanswered question, commitment, reply requirement/status, next action, opportunity signal, owner, source and metadata.

## Opportunities

Stages:

`SIGNAL | DISCOVERY | CONVERSATION | MEETING | QUALIFIED | PROPOSAL | NEGOTIATION | WON | LOST | DORMANT`

## Tasks

`TODO | IN PROGRESS | BLOCKED | WAITING | DONE | CANCELLED`

## Approval Queue

Each action stores:

- tenant/contact/task/opportunity linkage
- workflow run lineage
- action type
- target URL or target reference
- exact draft/content
- reason
- requesting agent/workflow
- approval state
- execution state
- idempotency key
- current approval fingerprint
- approved fingerprint
- result/error

Approval:

`PENDING | APPROVED | REJECTED | EXPIRED`

Execution:

`NOT_READY | READY | RUNNING | SUCCEEDED | FAILED | BLOCKED`

A substantive edit after approval invalidates the approval.

## Workflow runs

Runs store trigger type, status, input/output summaries, cursor, stats, dedupe key, attempt, lease owner/expiry, heartbeat, timestamps and errors.

This supports idempotent scheduled workers later.

## State rules

1. Tenant scope is mandatory.
2. Prefer normalized identity dedupe.
3. Keep network state, relationship stage and opportunity stage distinct.
4. Keep facts separate from inference.
5. Do Not Contact overrides outbound recommendations.
6. One active owner per material task/relationship.
7. Approval does not override Run Control.
8. Capability availability does not override Run Control.
9. Never repeat a successful external action with the same idempotency key.
10. Never execute content whose approval fingerprint changed.
