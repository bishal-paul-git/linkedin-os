# Shared CRM Contract

Read the configured CRM before material LinkedIn actions and write meaningful state changes after approved actions or material discoveries.

Canonical schema: see [../../docs/CRM_SCHEMA.md](../../docs/CRM_SCHEMA.md).

Core rules:

- deduplicate primarily by LinkedIn URL, then name + current company;
- never reset an existing relationship to a new-prospect state;
- keep facts separate from inference;
- `Do Not Contact` overrides prospecting/follow-up;
- designate one active owner for each material relationship/task;
- never record an external LinkedIn action as completed unless it actually occurred.
