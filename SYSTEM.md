# LinkedIn OS — System Definition

LinkedIn OS is a relationship operating system for LinkedIn work.

It is not one bot. It is a coordinated set of specialist agents, shared memory, workflow instructions, approval controls, and browser-execution rules.

## System layers

1. **Agents** — decide who owns each kind of work.
2. **Skills** — reusable execution playbooks for each agent.
3. **Memory** — persistent relationship and workflow state.
4. **Instructions** — global operating rules that every agent follows.
5. **Workflows** — event-driven operating procedures.
6. **Approval Queue** — control boundary for visible LinkedIn actions.
7. **Run Control** — runtime permissions and stage gates.
8. **Tests** — prove each workflow before broader automation.

## Source-of-truth order

When instructions conflict, use this precedence:

1. current explicit user instruction;
2. live Run Control;
3. live Approval Queue state;
4. Do Not Contact / relationship safety state;
5. master system instructions;
6. agent definition;
7. skill/workflow instructions;
8. defaults.

No lower layer may silently override a higher layer.

## Core agents

- LinkedIn Manager
- LinkedIn Inbox
- LinkedIn Network
- LinkedIn Content
- LinkedIn CRM
- Approval Executor

## Memory

The live CRM is the operational memory. The repository defines the memory contract, not private relationship data.

Memory stores:

- identity and profile URL;
- relationship type and status;
- conversation summaries;
- commitments;
- opportunities;
- next actions;
- task ownership;
- approval state;
- content engagement;
- execution history;
- run state and safety blockers.

## External-action boundary

Research, reading, classification, qualification, drafting, and CRM writes can be autonomous when Run Control permits.

Visible LinkedIn actions are approval-gated by default.

No action is considered complete until visible success is verified.

## Product principle

The system should be able to answer, at any time:

- Who is this person?
- Why are they relevant?
- What is our relationship?
- What happened last?
- What have we promised?
- What should happen next?
- Who owns the next action?
- Does it need approval?
- Has this exact action already happened?
- Is LinkedIn currently safe to operate?
