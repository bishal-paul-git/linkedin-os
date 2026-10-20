# LinkedIn OS — System Definition

LinkedIn OS is a reusable, multi-tenant relationship operating system for LinkedIn work.

It is not one bot and it is not tied to one person's LinkedIn account. The same shared system can serve many users while each user keeps isolated configuration, memory, integrations, approvals, and credentials.

## System layers

1. Tenant
2. Agents
3. Skills
4. Memory
5. Instructions
6. Workflows
7. Capability Resolver
8. Approval Queue
9. Run Control
10. Adapters
11. Tests

## Source-of-truth order

1. current explicit user instruction
2. tenant identity and isolation boundary
3. live Run Control
4. live Approval Queue state
5. Do Not Contact / relationship safety state
6. current tenant capability state
7. master system instructions
8. agent definition
9. skill/workflow instructions
10. defaults

No lower layer may silently override a higher layer.

## Core agents

- LinkedIn Manager
- LinkedIn Inbox
- LinkedIn Network
- LinkedIn Content
- LinkedIn CRM
- Approval Executor

## Multi-tenant rule

Every runtime operation resolves one tenant before reading or writing memory.

Each tenant owns private memory, configuration, connected adapters, OAuth/session credentials, approvals, Run Control, schedules, and audit logs.

No cross-tenant relationship data or credentials may be mixed.

## Memory

The tenant memory backend is the operational source of truth. The repository defines the memory contract, not private relationship data.

Memory stores identity, relationship state, conversation summaries, commitments, opportunities, tasks, approval state, engagement state, execution history, integration/capability state, run state, and blockers.

## Capability-aware execution

Before an external action, the Capability Resolver selects one of:

- official API execution
- assisted/manual final action
- read-only
- unavailable/restricted

The system must never claim automation where the tenant lacks an authorized execution path.

## External-action boundary

Research, classification, qualification, drafting, memory updates, and approval preparation can run autonomously when Run Control permits.

Visible LinkedIn actions are approval-gated by default and must also pass capability checks.

No action is complete until success is reconciled and persisted.
