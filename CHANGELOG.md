# Changelog

## 1.5.0

Usable product-core release plus product-completeness pass.

Added:

- live Next.js 16 web app;
- Supabase Auth and workspace onboarding;
- enabled and tested tenant RLS;
- concrete Supabase repository adapter;
- Action Centre;
- Inbox & Conversations;
- Contacts / Memory;
- Tasks;
- Opportunities;
- Approval Queue;
- Content & Engagement;
- Workspace Settings / tenant Config;
- workspace-member visibility;
- Workflows, Integrations and Security views;
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

- current production build READY;
- login route returns HTTP 200;
- protected anonymous routes resolve to the login surface;
- fresh production runtime error window is clean;
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
