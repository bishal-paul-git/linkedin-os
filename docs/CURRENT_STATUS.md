# Current Status

## v1.5.0 — live product core + Zernio adapter foundation

LinkedIn OS is a usable multi-user web product with tenant-isolated memory, agents, approvals, workflows and capability-aware integrations.

### Live

- Web app: https://linkedin-os-delta.vercel.app
- Source: https://github.com/bishal-paul-git/linkedin-os
- Supabase/Postgres backend: live
- Vercel production deployment: READY

### Product UI

Built:

- Action Centre
- Inbox & Conversations
- Contacts & Memory
- Tasks
- Opportunities
- Approval Queue
- Content & Engagement
- Workflows and schedules
- Integrations & Capabilities
- Security & Run Control
- Workspace Settings / Config

### Zernio

Built:

- reusable `@linkedin-os/zernio` provider package;
- personal vs organization account binding;
- `li_integration_accounts` with tenant RLS;
- Supabase Vault credential storage;
- read-only Zernio account sync;
- provider health promotion only after successful account sync;
- personal LinkedIn publishing capability mapping;
- organization Page publishing capability mapping;
- analytics capability registration;
- Integrations UI for encrypted key setup and account sync;
- mocked adapter tests proving unsupported connection actions are blocked.

The ChatGPT Zernio connector and the deployed web app are separate credential contexts. A ChatGPT connector session is not reused by Vercel.

No Zernio publishing action was performed during this integration build/review.

### Current production binding blocker

The product integration code is complete, but the production Supabase environment currently has no onboarded LinkedIn OS tenant/workspace to bind provider credentials to.

The first live standalone Zernio binding therefore requires:

1. create/sign in to a LinkedIn OS workspace;
2. create a dedicated Zernio REST API key;
3. enter it through the Integrations screen;
4. run the read-only account sync;
5. verify the expected personal/Page bindings.

### Zernio does not replace

- LinkedIn DMs;
- connection requests;
- invitation management;
- person-to-person relationship lookup;
- prospect discovery;
- arbitrary LinkedIn feed access.

Those capabilities remain assisted/browser-based or require another authorized provider.

### Security verification

Passed:

- tenant RLS isolation;
- Owner/Admin/Member/Viewer access rules;
- approval invalidation and idempotency;
- Vault credential round-trip using rollback-only synthetic data;
- plaintext credential absent from integration records;
- MEMBER denied access to credential storage;
- Zernio integration-account RLS enabled with four policies.

Supabase advisor notes two intentional callable SECURITY DEFINER RPCs for Vault/account sync. Their reviewed controls are documented in `docs/SECURITY_EXCEPTIONS.md`.

### Build verification

- strict TypeScript check: pass
- unit tests: **14/14 pass**
- Zernio mocked adapter tests: pass
- Next.js production build: pass
- GitHub CI: pass
- Vercel product build: READY

### Remaining next work

- onboard the first real workspace;
- bind a dedicated Zernio REST key and perform read-only account sync;
- add a prospect-data adapter for Network discovery;
- add CRM/email/calendar adapters as useful;
- decide whether Page-comment support should be surfaced through Zernio REST;
- keep unsupported LinkedIn network/message actions approval-gated and assisted.
