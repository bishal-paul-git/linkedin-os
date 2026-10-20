# Current Status

## v1.4 backend core — implemented

LinkedIn OS is now more than an architecture repository. The reusable product backend core exists in both source control and a live Supabase/Postgres development runtime.

### Live database core

Implemented tenant-scoped tables for:

- profiles
- tenants/workspaces
- tenant memberships
- integrations
- capabilities
- tenant configuration
- Run Control
- agent settings
- contacts
- conversations
- opportunities
- tasks
- content/engagement
- Approval Queue
- long-term memory facts
- activity log
- workflow templates
- workflow settings
- workflow runs
- schedules
- security events

Six default workflow templates are seeded.

A full schema round-trip test passed across tenant, run-control, agent, workflow, contact, approval and activity records with cascade cleanup.

### Code core

Implemented provider-independent TypeScript packages:

- `@linkedin-os/core`
  - capability resolver
  - state machine
  - approval/idempotency helpers
  - adapter contracts
  - memory-store contract

- `@linkedin-os/server`
  - tenant bootstrap service
  - approval decision service
  - workflow run service
  - capability-aware execution service
  - repository interfaces
  - adapter registry contract

### Reproducible database source

The repository now includes database build scripts, indexes, workflow seeds and the prepared RLS policy set.

### Security state

The new LinkedIn OS tables have direct `anon` and `authenticated` grants revoked, so they are not exposed through client APIs while tenant RLS is pending.

The complete tenant-scoped RLS policy set is prepared in `database/rls.sql`.

Per Supabase's security guard, enabling RLS is being held as an explicit approval step rather than being silently applied.

### What is intentionally not connected yet

External adapters are not required for the core to exist.

Still to connect later:

- LinkedIn OAuth/API
- partner APIs where available
- prospect-data providers
- Google Sheets import/export
- email/calendar/CRM adapters
- scheduling worker provider

### Next build layer

After RLS is explicitly enabled, the next product layer is:

- authentication/workspace onboarding
- web dashboard
- contacts/CRM UI
- Approval Queue UI
- workflows/run history
- integrations/capability page
- schedules/settings
- health/security view
