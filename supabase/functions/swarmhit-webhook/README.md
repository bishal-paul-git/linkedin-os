# SwarmHit webhook receiver

Supabase Edge Function that receives SwarmHit webhooks, verifies the
HMAC signature, dedupes on delivery id, and writes verified events
into LinkedIn OS. It writes nothing from an unverified payload.

## What it does

| Event | Effect |
| --- | --- |
| `connection.accepted` | Contact matched by `linkedin_url` → `connection_status` `ACCEPTED`, `network_state` `CONNECTED`; row in `li_activity_log`. |
| `message.received` | Row in `li_conversations`, direction `INBOUND`, `reply_status` `NEEDS DRAFT`. |
| `message.sent` | Row in `li_conversations`, direction `OUTBOUND`, `reply_status` `SENT`. |
| `account.checkpoint_required` | Sender row paused (`status` `NEEDS_RECONNECTION`, `paused` true) + `li_security_events` row with `blocked_workflow` true (pauses the approval executor) + best-effort `li_notifications` rows for active tenant members. |
| anything else | Audit row in `li_activity_log` only, no state change. |

Responses: `200 {ok:true,status}` on a verified event
(`duplicate`, `unknown_sender`, `dedupe_unavailable`,
`no_delivery_id`, `logged` are all 200 — SwarmHit must not retry
them), `401` bad signature, `400` bad payload, `405` non-POST,
`500` only when the server itself is misconfigured (secret missing).
Dedupe runs after the tenant is known: the RPC needs the tenant id,
so an event from an unknown sender is acknowledged as
`unknown_sender` without being recorded.

## Deploy

```bash
supabase functions deploy swarmhit-webhook
```

The function imports `verifyAndParseWebhook` by relative path from
`packages/swarmhit/src/webhooks.ts`; `supabase functions deploy`
bundles it (that module imports `node:crypto`, which the Deno edge
runtime supports — this file itself imports no crypto).

## Env / secrets

```bash
supabase secrets set SWARMHIT_WEBHOOK_SECRET=whsec_…
```

- `SWARMHIT_WEBHOOK_SECRET` — the webhook signing secret from the
  SwarmHit dashboard. Store it in Vault like the API key (same
  pattern as `li_set_integration_secret` in `database/009`): one
  Vault secret named for the tenant/integration, holding the full
  `whsec_…` value. It is read here from the function's env, never
  hardcoded and never committed.
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — set automatically
  by the Supabase CLI for deployed functions. Service role is
  required because the webhook carries no user session.

## Prerequisites (migrations 025–027 — not applied yet)

The function is defensive until they land: if
`li_swarmhit_senders` has no row for the event's SwarmHit account,
verified events are acknowledged with status `unknown_sender` and
nothing is written; if the `li_swarmhit_record_webhook` dedupe RPC
is missing, events are still processed once and the response says
`dedupe_unavailable`. Apply migrations 025–027 (senders table,
webhook delivery log + `li_swarmhit_record_webhook` RPC, and the
`swarmhit_enabled` run-control column) before expecting writes.
The RPC should accept
`p_tenant_id, p_delivery_id, p_event, p_payload` and return
`'RECEIVED'` on first sight, `'DUPLICATE'` when the same
`(tenant_id, delivery_id)` was already recorded — exactly what
`database/026_swarmhit_webhooks.sql` defines. Only the six event
types listed in 026 are recordable; other verified types are
audit-logged only and answered with status `not_recorded`.
