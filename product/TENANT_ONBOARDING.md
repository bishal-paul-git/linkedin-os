# Tenant Onboarding

Goal: any new user can connect their own environment without changing LinkedIn OS source code.

## Step 1 — Create tenant

Generate a stable `tenant_id`.

Collect:

- user/team name;
- organization;
- timezone;
- goals;
- target audiences;
- writing style;
- exclusions;
- default approval policy.

## Step 2 — Choose memory backend

Options:

- Google Sheets for simple/single-user deployments;
- Supabase/Postgres for product/multi-user deployments;
- supported CRM integration.

Initialize tenant-scoped tables.

## Step 3 — Connect LinkedIn identity

Use official OAuth where possible.

Store tokens securely outside the repository.

Detect granted permissions and populate the capability registry.

## Step 4 — Connect optional adapters

Examples:

- prospect-data provider;
- CRM;
- calendar;
- email;
- analytics;
- company Page API.

## Step 5 — Generate Run Control

Start conservatively:

- external actions blocked or approval-required;
- memory writes enabled;
- security stop enabled.

## Step 6 — Bootstrap memory

Import only relevant, authorized data.

Deduplicate identities.

## Step 7 — Capability test

Run read-only tests for each connected adapter.

## Step 8 — Enable workflows

Enable only workflows whose dependencies pass.

A tenant may use the OS successfully even when some LinkedIn actions remain assisted/manual.
