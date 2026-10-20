# Changelog

## 1.5.0

Usable product-core release.

Added:

- live Next.js 16 web app;
- Supabase Auth and workspace onboarding;
- enabled and tested tenant RLS;
- concrete Supabase repository adapter;
- Action Centre;
- Contacts/Memory, Opportunities, Approvals, Workflows, Integrations and Security views;
- manual workflow execution;
- interval schedules;
- pg_cron scheduler tick;
- internal queued-workflow processor;
- workspace bootstrap RPC;
- approval decision RPC;
- atomic approval claim RPC;
- assisted/manual completion reconciliation;
- production Vercel deployment;
- reproducible RLS isolation tests;
- scheduler/processor smoke verification.

Verified:

- production build READY;
- protected anonymous routes redirect to login;
- fresh runtime error window is clean;
- RLS role/isolation tests pass;
- scheduler/processor smoke test passes.

External LinkedIn and other provider adapters remain intentionally deferred to the adapter phase.

## 1.4.1

Backend refinement and consistency pass.

## 1.4.0

Backend-core implementation.

## 1.3.0

Multi-tenant/capability-aware architecture.

## 1.2.0

System-completeness pass.

## 1.1.0

Controlled-automation foundation.
