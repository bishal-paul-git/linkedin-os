# Memory

LinkedIn OS memory is persistent operational state, not chat recollection.

The live CRM is the current V1 memory backend. A future database may replace the storage layer without changing the memory contract.

## Memory layers

- **Identity memory** — contact/profile/company identity.
- **Relationship memory** — type, owner, connection state, first/last interaction.
- **Conversation memory** — concise thread summaries, asks, promises, unanswered questions.
- **Opportunity memory** — evidence, need, stage, next commercial step.
- **Task memory** — owner, due state, approval requirement.
- **Engagement memory** — posts/comments/reactions prepared or performed.
- **Approval memory** — exact proposed external action and decision.
- **Execution memory** — what actually happened and idempotency guard.
- **System memory** — Config, Run Control, Agent Registry.

See STATE_MODEL.md and MEMORY_POLICY.md.
