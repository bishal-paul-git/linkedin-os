# Changelog

## 1.5.0

Usable product-core release plus integration/completeness hardening.

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
- Workflows, Integrations and Security views;
- manual workflow execution;
- interval schedules and pg_cron workflow processor;
- assisted/manual completion reconciliation;
- Zernio provider package;
- Zernio personal + organization LinkedIn account model;
- encrypted provider credentials through Supabase Vault;
- read-only Zernio account sync;
- Zernio publishing/analytics capability registration;
- GitHub CI covering TypeScript, 14 unit tests and the production web build.

Verified:

- production Vercel builds READY;
- protected anonymous routes resolve to login;
- RLS role/isolation tests pass;
- approval/idempotency database tests pass;
- Vault reference storage passes rollback-only testing;
- normal tenant MEMBER cannot store provider credentials;
- 14/14 unit tests pass;
- web production build compiles successfully.

No LinkedIn post, DM or connection request was sent during the Zernio integration review/build.

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
