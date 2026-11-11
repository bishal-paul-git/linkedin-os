# @linkedin-os/swarmhit

SwarmHit adapter for LinkedIn OS — connection invites, direct messages,
InMail, warm-up touches, campaigns, lead import, the B2B database,
inbox replies and webhooks — behind LinkedIn OS's approval gate.

> **SwarmHit is NOT LinkedIn's official API.** SwarmHit is not affiliated
> with or endorsed by LinkedIn. It sends through LinkedIn accounts the
> customer owns and connects, behind its own safeguards. No LinkedIn
> automation is ever zero-risk: an account can still be restricted.
> This package therefore never registers as `AVAILABLE_OFFICIAL`.
> It registers as `AVAILABLE_PROVIDER`, only after a tenant explicitly
> opts in (see below).

## What is built

- `SwarmhitClient` (`src/client.ts`) — every SwarmHit endpoint below,
  base URL `https://app.swarmhit.com/api/v1`, Bearer `swh_live_…` key.
  Injectable `fetchImpl`, like the Zernio client, so tests use a fake.
  Errors are `SwarmhitApiError` with the stable `code`; a 429 parses
  `{ limit, used, scope, resetAt }` into `error.rateLimit`.
- `SwarmhitLinkedInAdapter` (`src/linkedin-adapter.ts`) — implements
  `LinkedInAdapter` (id `swarmhit`): `SEND_CONNECTION`, `SEND_DM`,
  `REPLY_DM`, `COMMENT`, `REACT`. It never claims `PUBLISH_POST`.
  It only executes `APPROVED` actions, sends the approval's
  `idempotencyKey` as the `Idempotency-Key` header, and never sets a
  contact's `network_state` — reconciliation stays with the server layer.
- `SwarmhitProspectAdapter` (`src/prospect-adapter.ts`) — implements
  `ProspectDataAdapter` on the SwarmHit database, reusing the
  prospecting normalizer (dedupe by LinkedIn URL, limit clamped 1–100),
  plus `importFromSearch` and `enrichPerson`.
- `RateBudget` (`src/limits.ts`) — in-memory only. No Supabase yet.
- Webhooks (`src/webhooks.ts`) — HMAC-SHA256 verification
  (`X-Swarmhit-Signature`, timing-safe) and parsing. Writes nothing.

## Endpoints covered

| Area | Endpoints |
| --- | --- |
| General | `GET /`, `GET /health`, `GET /stats` |
| Accounts | `GET /accounts`, `GET /accounts/{id}`, `GET /accounts/{id}/stats`, `GET /accounts/{id}/limits`, `POST /accounts/hosted-link`, `GET /accounts/hosted-link/{id}` |
| Direct actions | `POST /accounts/{id}/connections`, `GET /accounts/{id}/connections/{identifier}`, `DELETE` same, `POST /accounts/{id}/messages`, `POST /accounts/{id}/inmails`, `POST /accounts/{id}/profile-views`, `POST /accounts/{id}/follows`, `POST /accounts/{id}/post-likes`, `POST /accounts/{id}/post-comments`, `GET /accounts/{id}/post-comments`, `GET /accounts/{id}/profiles/{identifier}`, `GET /accounts/{id}/actions` |
| Campaigns | `POST /campaigns`, `GET /campaigns`, `GET /campaigns/{id}`, `PATCH /campaigns/{id}` |
| Leads / imports | `GET /leads`, `POST /lead-imports`, `GET /lead-imports`, `GET /lead-imports/{id}`, `POST /lead-imports/{id}/cancel`, `POST /lead-imports/{id}/resume` |
| Database | `POST /database/people/search`, `POST /database/companies/search`, `POST /database/people/enrich`, `POST /database/people/find-email` |
| Inbox | `GET /inbox/chats`, `GET /inbox/chats/{id}`, `GET /inbox/chats/{id}/messages`, `POST /inbox/chats/{id}/messages`, `POST /inbox/chats/{id}/read`, `POST /inbox/sync` |
| Approvals | `GET /pending-comments`, `GET /pending-comments/{id}`, `PATCH /pending-comments/{id}`, `POST /pending-comments/{id}/approve`, `POST /pending-comments/{id}/reject`, `POST /pending-comments/{id}/regenerate` |
| Webhooks | `GET /webhooks`, `POST /webhooks` |

Deliberately **not** implemented: `POST /accounts` with a LinkedIn
username/password. Connecting a sender must go through the hosted
connect link (`POST /accounts/hosted-link`), so linkedin-os never
handles a LinkedIn password. Direct password sign-in is out of scope
by design, not a missing endpoint.

## Setup (tenant, 1 sender)

1. Create a SwarmHit account and verify the email.
2. In the SwarmHit dashboard, connect **one** LinkedIn sender
   (Accounts → LinkedIn → Connect account). Note the account id.
   Starting the 7-day trial asks for a card for a temporary
   $16.90 verification hold (released within 7 days); do not start
   it until the tenant is ready to test.
3. In SwarmHit, Access tokens → create an API key. The full value
   (`swh_live_…`) is shown only once — store it in Supabase Vault
   (later; see "Supabase plug-in" below). **Never commit it, never
   log it, never put it in frontend code.**
4. Opt the tenant in: register the rows from
   `swarmhitProviderCapabilities(tenantId, accountId)` in
   `li_capabilities` with mode `AVAILABLE_PROVIDER`. Until then the
   defaults stay `AVAILABLE_ASSISTED` and nothing sends.
5. Pass the key + account id to the adapter:
   `new SwarmhitLinkedInAdapter({ tenantId, apiKey, accountId, isPremium })`.
   `isPremium` matters: only a premium LinkedIn sender can send an
   invite note (≤300 chars) or an InMail. A free sender's invite is
   sent without the note; the adapter drops it and records
   `noteDroppedFreeSender: true` in the result metadata.

## Limits (hard-coded, verified)

- Invites: **130/week** (rolling 7 days) for a free LinkedIn sender,
  **150/week** for a paid sender; pending-invitation backlog 500.
  Local safe ceiling: **~20/day**.
- DM: SwarmHit publishes no exact daily number. Local safe ceiling:
  **30–40/day** (the adapter blocks at 40). Server 429s still win.
- Lead import: **2,500/day** from Sales Navigator search,
  **1,000/day** from standard LinkedIn search; `maxLeads` 1–2500.
- Database search: 2 credits/result; person enrichment 65,
  company enrichment 130 (credits, not a code limit).

On a 429 the adapter returns `{ ok: false, blocked: true }` with the
`rateLimit` in metadata, and the `RateBudget` blocks that kind until
`resetAt`. It never retries the same day.

## Webhooks

Register an endpoint with `client.createWebhook({ url, events })`
and store the returned `secret` (whsec_…) in Vault. Verify every
delivery before trusting it:

```ts
import { verifyAndParseWebhook } from "@linkedin-os/swarmhit";

const result = verifyAndParseWebhook({
  rawBody, // the raw request body, unparsed
  signature: headers["x-swarmhit-signature"],
  secret: webhookSecret,
  deliveryId: headers["x-swarmhit-delivery"],
  eventHeader: headers["x-swarmhit-event"],
});
if (!result.ok) return new Response("bad signature", { status: 401 });
// result.event.type: connection.accepted | message.received |
//   message.sent | lead.status_changed | account.connected |
//   account.checkpoint_required | …
```

Deliveries are at-least-once: deduplicate on `deliveryId`.
`account.checkpoint_required` means the sender needs attention —
pause sending from it until it is cleared.

## Supabase plug-in (built, not yet applied — migrations 025–027, server + web wiring)

- **Tables:** `li_swarmhit_senders`, `li_swarmhit_usage`, `li_swarmhit_webhook_deliveries`, `li_run_control.swarmhit_enabled` — see `database/025_swarmhit_integration.sql`, `026_swarmhit_webhooks.sql`, `027_swarmhit_run_control.sql` (+ `database/tests/003_swarmhit.sql`).
- **Vault:** the `swh_live_…` key and the webhook `whsec_…` secret via the existing `li_set_integration_secret` pattern; reuse `li_integration_accounts` with `provider = 'swarmhit'`.
- **Server:** `packages/server/src/swarmhit-registry.ts` (`SwarmhitAdapterRegistry`, prospect registration) and `packages/supabase/src/swarmhit.ts` (`resolveSwarmhitConfig` — returns null, never throws, when migrations are unapplied or the tenant has not opted in; `recordSwarmhitUsage` — best-effort `li_swarmhit_record_usage` call after a successful send, wired through `ExecutionService` via the optional `PlatformRepositories.recordSwarmhitUsage`). `RunControl.swarmhitEnabled` is mapped from `li_run_control.swarmhit_enabled` in `packages/supabase/src/repository.ts`.
- **Webhook receiver:** `supabase/functions/swarmhit-webhook/` — verifies, dedupes on delivery id, writes conversations / activity / contact state, auto-pauses on `account.checkpoint_required`. Deploy it with `SWARMHIT_WEBHOOK_SECRET` set via `supabase secrets set`; the Deno bundling of its relative import of this package is untested — verify on first deploy.
- **Web app:** Integrations page SwarmHit card + `connectSwarmhitAction` / `syncSwarmhitAction` / `toggleSwarmhitAction` in `apps/web/app/actions.ts`. The card is defensive: when migrations 025–027 are not applied it says so instead of crashing.
- **Still needs the user's access:** apply the migrations, start the trial, connect the sender, save the key, deploy the webhook, run the 1-invite + 1-DM test.

Original design notes (superseded in detail by the built files above):

- **Tables (migration 025–027, per the system design):**
  `li_swarmhit_senders` (tenant, SwarmHit account id, LinkedIn URL,
  free/paid, SSI, status/paused), `li_swarmhit_usage` (daily/weekly
  invite + DM counts, 429 resetAt — replaces the in-memory
  `RateBudget`), webhook delivery log.
- **Vault:** the `swh_live_…` key and the webhook `whsec_…` secret,
  via the existing `li_set_integration_secret` pattern; reuse
  `li_integration_accounts` with `provider = 'swarmhit'`.
- **Edge Function:** a webhook receiver that calls
  `verifyAndParseWebhook`, dedupes on delivery id, and writes
  `li_conversations` / `li_activity_log` / contact state — only after
  a verified event, never from an unverified payload.
- **Run Control:** a tenant toggle for the provider (e.g.
  `swarmhit_enabled`) that the server checks before resolving
  `AVAILABLE_PROVIDER`; the resolver already blocks when Run Control
  blocks the action type.
- **Execution service:** no change needed — `ExecutionService`
  resolves `AVAILABLE_PROVIDER` like an official adapter once the
  capability record exists, and the adapter's `healthCheck` runs
  before claiming an approval.

## Tests

```bash
npm test   # includes packages/swarmhit/src/*.test.ts
```
