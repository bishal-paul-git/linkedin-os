# Architecture

## Design principle

LinkedIn OS is a set of small specialist workflows sharing one persistent relationship state. The Manager coordinates the system; the CRM prevents each workflow from starting from zero.

```text
                         +-------------------+
                         |       User        |
                         +---------+---------+
                                   |
                                   v
                         +-------------------+
                         | LinkedIn Manager  |
                         +---+---+---+---+---+
                             |   |   |   |
              +--------------+   |   |   +--------------+
              |                  |   |                  |
              v                  v   v                  v
       LinkedIn Inbox      Prospecting Content      LinkedIn CRM
              |                  |   |                  |
              +------------------+---+------------------+
                                   |
                                   v
                           Shared CRM / State
                                   |
                                   v
                        Authorized browser session
                                   |
                                   v
                                LinkedIn
```

## Components

### Manager
Routes requests, reads Run Control, checks approvals, resolves duplicate/conflicting recommendations, and produces one prioritized action queue.

### Inbox
Owns existing conversations, thread context, accepted connections, replies, follow-ups, and relationship signals.

### Prospecting
Owns new-person discovery, qualification, connection strategy, and handoff after acceptance.

### Content
Owns posts, comments, public replies, Page content, and relationship-aware engagement.

### CRM
Owns contact identity, deduplication, relationship state, conversation summaries, opportunities, tasks, approvals, and activity history.

## Shared state

The CRM is the source of truth for:

- personalization/configuration;
- current run permissions;
- contact and relationship history;
- conversation summaries;
- opportunity stages;
- next actions;
- approval state;
- activity history.

## Run Control

Run Control is authoritative. A skill may never become more permissive than the current Run Control state.

Recommended stages:

1. **Stage 1 — Read only**: LinkedIn reads + CRM writes.
2. **Stage 2 — Approved sends**: narrowly approved DMs/replies.
3. **Stage 3 — Network actions**: narrowly approved connection actions.
4. **Stage 4 — Content actions**: narrowly approved comments/reactions/posts.

## Failure behavior

Stop the affected LinkedIn workflow on security checkpoints or restrictions. Preserve enough state to resume later without repeating completed work.
