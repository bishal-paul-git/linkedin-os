# Run Control Instructions

Run Control is the runtime permission layer.

It answers what the system may do now, independent of what an agent or workflow knows how to do.

## Required controls

- System Stage
- LinkedIn External Actions
- CRM Writes
- Browser Mode
- Connection Requests
- DM / Reply Sending
- Comments / Reactions
- Posts / Page Posts
- Stop On Security Warning
- Approval Queue
- Approved Action Executor
- workflow-specific controls such as Connection Review Workflow

## Rules

- Read Run Control before browser execution.
- Never make a BLOCKED action more permissive autonomously.
- Approval does not override Run Control.
- CRM writes may remain enabled while LinkedIn writes are blocked.
- A workflow may prepare a blocked action but must label it blocked/pending.
- Security stop always wins.
