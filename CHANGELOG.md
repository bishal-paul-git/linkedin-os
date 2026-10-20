# Changelog

## 1.4.0

Backend-core implementation.

Added:

- live multi-tenant Supabase/Postgres data model;
- tenant memberships, integration and capability registries;
- persistent contacts, conversations, opportunities, tasks and memory facts;
- Approval Queue, Run Control and agent settings;
- workflow templates/settings/runs and schedules;
- append-only activity history and security events;
- seeded default LinkedIn OS workflow templates;
- provider-independent TypeScript core package;
- capability resolver and relationship state machine;
- approval/idempotency helpers;
- server orchestration package for tenant bootstrap, approvals, workflows and execution;
- internal API contract;
- reproducible database SQL and performance indexes;
- prepared tenant-scoped RLS policy set;
- successful schema round-trip validation.

Security note: client grants on the new tables are revoked until the prepared RLS policies are explicitly enabled.

## 1.3.0

Multi-tenant/capability-aware architecture:

- tenant isolation;
- onboarding model;
- connector strategy;
- capability matrix;
- capability resolver;
- tenant/integration/capability schemas.

## 1.2.0

System-completeness pass:

- canonical system definition;
- explicit agent definitions;
- persistent memory model and state transitions;
- master instructions and runtime controls;
- canonical workflow contracts;
- machine-readable schemas;
- runtime adapter documentation;
- test plan and edge-case scenarios.

## 1.1.0

Controlled-automation foundation:

- five LinkedIn skills;
- shared policies;
- CRM schema;
- Run Control;
- Approval Queue;
- Work launch instructions;
- Connection Review;
- Accepted Connection Review;
- Approval Executor.
