# Changelog

## 1.4.1

Backend refinement and consistency pass.

Added/refined:

- separate network state and relationship stage;
- normalized contact identities;
- approval fingerprints and automatic stale-approval invalidation;
- workflow run lineage;
- worker dedupe keys, leases, attempts and heartbeat fields;
- automatic updated-at triggers;
- atomic approval-claim repository contract;
- concurrency-safe execution flow;
- adapter health checks and exception recovery;
- default assisted-mode tenant capabilities;
- non-recursive private-schema RLS helper design;
- stricter approval permissions in pending RLS;
- TypeScript workspace configuration;
- core and execution-service tests;
- updated agents, skills, workflows and CRM documentation.

Live database validation passed for approval invalidation and workflow dedupe behavior.

## 1.4.0

Backend-core implementation.

Added:

- live multi-tenant Supabase/Postgres data model;
- tenant memberships, integration and capability registries;
- persistent contacts, conversations, opportunities, tasks and memory facts;
- Approval Queue, Run Control and agent settings;
- workflow templates/settings/runs and schedules;
- activity history and security events;
- provider-independent core/server packages;
- internal API contract;
- reproducible database SQL;
- prepared tenant-scoped RLS policy set;
- schema round-trip validation.

## 1.3.0

Multi-tenant/capability-aware architecture.

## 1.2.0

System-completeness pass.

## 1.1.0

Controlled-automation foundation.
