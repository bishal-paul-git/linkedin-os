---
name: linkedin-crm
description: "Maintain the shared LinkedIn relationship CRM and operational memory. Use for contact deduplication, network/relationship state, conversation summaries, tasks, follow-up dates, opportunities, approval state, activity logs, and cross-skill handoffs."
---

# LinkedIn CRM & Relationship Memory

Read the shared policies in `../_shared/` before execution.

## Role

Be the system of record for relationship context. Prevent duplicate outreach, forgotten promises, repeated introductions, conflicting actions, excessive follow-ups, and poor handoffs.

## Identity and dedupe

1. Prefer normalized external identities such as LinkedIn URL/URN.
2. Use email/provider/CRM identity where available.
3. Use name + current company only as a fallback.
4. Update existing records rather than creating duplicates.

## State discipline

Maintain separately:

- `network_state`: factual LinkedIn/network connection state;
- `relationship_stage`: maturity of the working relationship;
- `do_not_contact`: outbound safety override;
- opportunity stage;
- task/approval/execution state.

Never infer one from another without evidence.

## Workflow

1. Resolve tenant and memory backend.
2. Read Run Control.
3. Deduplicate identity.
4. Store concise factual conversation summaries.
5. Keep owner, priority, interactions, next action/date, network state, relationship stage and Do Not Contact current.
6. Create/update opportunities only when evidence supports a signal.
7. Create tasks for concrete next actions.
8. Link approval rows and workflow-run lineage.
9. Record verified external actions in Activity Log.
10. Preserve idempotency keys and approval fingerprints.
11. Use the handoff contract when ownership changes.

## Final checks

No duplicate identity, unsupported opportunity claim, relationship-history regression, stale approval, duplicate successful idempotency key, or external action marked complete without verified success.
