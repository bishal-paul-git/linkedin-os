# Multi-Tenant Architecture

LinkedIn OS should support many independent users/teams without mixing their data, credentials, approvals, or relationship state.

## Core model

```text
Shared LinkedIn OS code
        |
        +------------------------------+
        |                              |
   Tenant A                         Tenant B
   Config                           Config
   CRM / Memory                     CRM / Memory
   Connections                      Connections
   Run Control                      Run Control
   Approval Queue                   Approval Queue
   Browser/API auth                 Browser/API auth
        |                              |
        v                              v
 Capability Resolver              Capability Resolver
        |                              |
   Allowed adapters                  Allowed adapters
```

The repository is shared. Runtime state is tenant-specific.

## Tenant boundary

Every runtime record must carry or inherit a stable `tenant_id`.

A tenant owns:

- identity / account profile;
- target configuration;
- private CRM/memory;
- connected services;
- LinkedIn OAuth/session state;
- approval policy;
- Run Control;
- agent registry overrides;
- activity logs;
- scheduled tasks;
- secrets/credentials.

No agent may read or write across tenants.

## Shared vs private

### Shared repository

- system instructions;
- agents;
- skills;
- schemas;
- workflow contracts;
- adapter contracts;
- tests;
- product documentation.

### Private runtime

- access tokens;
- session cookies;
- profile/account IDs;
- CRM records;
- prospect/contact lists;
- messages;
- approvals;
- task history;
- schedules;
- private business configuration.

## Runtime lookup

At the start of every run:

1. resolve `tenant_id`;
2. load tenant config;
3. load tenant integrations/capabilities;
4. load Run Control;
5. load relevant tenant memory;
6. execute only through capabilities enabled for that tenant.

## Product principle

The same workflow should degrade gracefully.

Example:

`SEND_CONNECTION`

- if approved Invitations API access exists: API executor;
- otherwise if only assistive mode exists: prepare + deep link + manual user action;
- never silently switch to unauthorized browser automation.

This makes the system reusable even when LinkedIn permissions differ by user.
