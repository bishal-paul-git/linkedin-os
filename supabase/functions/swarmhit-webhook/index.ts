// SwarmHit webhook receiver (Supabase Edge Function, Deno).
//
// Verifies the HMAC signature with verifyAndParseWebhook from
// @linkedin-os/swarmhit, dedupes on the delivery id, then writes only
// verified events into LinkedIn OS tables. Nothing is written from an
// unverified payload.
//
// This file imports no crypto itself: verification lives in
// packages/swarmhit/src/webhooks.ts (node:crypto there, supported by
// the Deno edge runtime).
//
// Required env (set with `supabase secrets set`, never hardcoded):
//   SWARMHIT_WEBHOOK_SECRET  — the whsec_… signing secret, stored in
//     Vault like the API key (see README.md in this folder).
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — the edge function's own
//     Supabase project credentials. Service role is required: the
//     webhook carries no user session, so RLS would reject the writes.
//
// Depends on migrations 025–027:
//   li_swarmhit_senders (swarmhit_account_id, linkedin_type FREE/PAID,
//   status, paused), li_swarmhit_webhook_deliveries +
//   li_swarmhit_record_webhook RPC (026), li_run_control.swarmhit_enabled
//   (027). Until they are applied the tenant lookup finds no sender and
//   verified events are acknowledged (200, status "unknown_sender")
//   without writes — the function never 500s on missing SwarmHit
//   tables, so SwarmHit does not retry-storm a not-yet-migrated
//   deployment.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAndParseWebhook } from "../../../packages/swarmhit/src/webhooks.ts";

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

type Row = Record<string, unknown>;

function text(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

/** Message text, whatever field SwarmHit put it in. */
function messageText(data: Row): string | null {
  for (const key of ["text", "message", "body", "content", "summary"]) {
    const value = text(data[key]);
    if (value) return value;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed." }, 405);

  const secret = Deno.env.get("SWARMHIT_WEBHOOK_SECRET");
  if (!secret) return json({ ok: false, error: "Webhook secret is not configured." }, 500);

  const rawBody = await req.text();
  const verified = verifyAndParseWebhook({
    rawBody,
    signature: req.headers.get("X-Swarmhit-Signature"),
    secret,
    deliveryId: req.headers.get("X-Swarmhit-Delivery"),
    eventHeader: req.headers.get("X-Swarmhit-Event"),
  });
  if (!verified.ok) {
    const badSignature = (verified.error ?? "").toLowerCase().includes("signature");
    return json(
      { ok: false, error: verified.error ?? "Invalid webhook." },
      badSignature ? 401 : 400,
    );
  }
  const event = verified.event!;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Map the SwarmHit sender account to a tenant. The senders table is
  // small (one sender per tenant), so all CONNECTED rows are read and
  // matched on swarmhit_account_id (the 025 column name).
  const accountId = event.accountId ?? event.senderId;
  let tenantId: string | null = null;
  let senderRow: Row | null = null;
  if (accountId) {
    const { data, error } = await supabase
      .from("li_swarmhit_senders")
      .select("id,tenant_id,swarmhit_account_id")
      .eq("status", "CONNECTED");
    if (!error) {
      senderRow = ((data ?? []) as Row[]).find((row) =>
        row["swarmhit_account_id"] === accountId,
      ) ?? null;
      tenantId = text(senderRow?.["tenant_id"] ?? null);
    }
  }
  if (!tenantId) return json({ ok: true, status: "unknown_sender" });

  // Dedupe on delivery id (at-least-once delivery). The RPC
  // li_swarmhit_record_webhook (026) takes
  // (p_tenant_id, p_delivery_id, p_event, p_payload) and returns
  // 'RECEIVED' on first sight, 'DUPLICATE' when the same
  // (tenant_id, delivery_id) was already recorded — so it must run
  // after the tenant is known. Only the six event types in 026 are
  // recordable; anything else is rejected by the RPC, so those skip
  // dedupe and are only audit-logged below. If the RPC errors (e.g.
  // migration not applied yet), keep going: dropping a verified event
  // would lose it, and the response flags the gap.
  const RECORDABLE = new Set([
    "connection.accepted",
    "message.received",
    "message.sent",
    "lead.status_changed",
    "account.connected",
    "account.checkpoint_required",
  ]);
  let status = "processed";
  if (!event.deliveryId) {
    status = "no_delivery_id";
  } else if (!RECORDABLE.has(event.type)) {
    status = "not_recorded";
  } else {
    const { data, error } = await supabase.rpc("li_swarmhit_record_webhook", {
      p_tenant_id: tenantId,
      p_delivery_id: event.deliveryId,
      p_event: event.type,
      p_payload: event.raw,
    });
    if (error) {
      console.error("li_swarmhit_record_webhook failed:", error.message);
      status = "dedupe_unavailable";
    } else if (data === "DUPLICATE") {
      return json({ ok: true, status: "duplicate" });
    }
  }

  const now = new Date().toISOString();
  const metadata = {
    provider: "swarmhit",
    delivery_id: event.deliveryId ?? null,
    chat_id: event.chatId ?? null,
    provider_id: event.providerId ?? null,
    event_type: event.type,
  };

  async function findContactId(): Promise<string | null> {
    if (!event.profileUrl) return null;
    const { data } = await supabase
      .from("li_contacts")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("linkedin_url", event.profileUrl)
      .maybeSingle();
    return text((data ?? {}) as Row, "id");
  }

  async function logActivity(action: string, contactId: string | null, result = "SUCCEEDED") {
    await supabase.from("li_activity_log").insert({
      tenant_id: tenantId,
      agent: "SWARMHIT_WEBHOOK",
      action,
      reason: `SwarmHit webhook ${event.type}`,
      result,
      contact_id: contactId,
      source_url: event.profileUrl,
      metadata,
    });
  }

  switch (event.type) {
    case "connection.accepted": {
      const contactId = await findContactId();
      if (contactId) {
        await supabase
          .from("li_contacts")
          .update({
            connection_status: "ACCEPTED",
            network_state: "CONNECTED",
            last_interaction_at: now,
          })
          .eq("tenant_id", tenantId)
          .eq("id", contactId);
      }
      await logActivity("CONNECTION_ACCEPTED", contactId);
      break;
    }
    case "message.received":
    case "message.sent": {
      const inbound = event.type === "message.received";
      const contactId = await findContactId();
      await supabase.from("li_conversations").insert({
        tenant_id: tenantId,
        contact_id: contactId,
        occurred_at: now,
        direction: inbound ? "INBOUND" : "OUTBOUND",
        category: "DM",
        priority: "P2",
        summary: messageText(event.data) ?? "(no message text in payload)",
        requires_reply: inbound,
        reply_status: inbound ? "NEEDS DRAFT" : "SENT",
        owner_agent: "INBOX",
        source_url: event.profileUrl,
        metadata,
      });
      await logActivity(inbound ? "DM_RECEIVED" : "DM_SENT", contactId);
      break;
    }
    case "account.checkpoint_required": {
      if (senderRow) {
        await supabase
          .from("li_swarmhit_senders")
          .update({ status: "NEEDS_RECONNECTION", paused: true })
          .eq("id", senderRow["id"]);
      }
      await supabase.from("li_security_events").insert({
        tenant_id: tenantId,
        event_type: "SWARMHIT_CHECKPOINT_REQUIRED",
        severity: "HIGH",
        source: "swarmhit",
        summary: "SwarmHit sender needs reconnection (checkpoint). Sending is paused.",
        blocked_workflow: true,
        metadata,
      });
      // Best-effort in-app notification: li_notifications needs one
      // row per tenant member (user_id is not null), and the table may
      // not exist in every deployment — never fail the webhook over it.
      try {
        const { data: members } = await supabase
          .from("li_tenant_members")
          .select("user_id")
          .eq("tenant_id", tenantId)
          .eq("status", "ACTIVE");
        const rows = ((members ?? []) as Row[])
          .map((m) => text(m, "user_id"))
          .filter((id): id is string => Boolean(id))
          .map((userId) => ({
            tenant_id: tenantId,
            user_id: userId,
            event_type: "SWARMHIT_CHECKPOINT_REQUIRED",
            title: "SwarmHit sender needs reconnection",
            body: "LinkedIn sending via SwarmHit is paused until the sender is reconnected.",
            severity: "CRITICAL",
            status: "UNREAD",
            source_type: "SWARMHIT_SENDER",
            metadata,
          }));
        if (rows.length) await supabase.from("li_notifications").insert(rows);
      } catch (error) {
        console.error("SwarmHit notification fan-out failed:", error);
      }
      await logActivity("SWARMHIT_CHECKPOINT", null);
      break;
    }
    default: {
      // Logged for audit, no state change for event types this receiver
      // does not act on (lead.status_changed, campaign.finished, …).
      await logActivity("SWARMHIT_WEBHOOK_EVENT", await findContactId());
      status = "logged";
      break;
    }
  }

  return json({ ok: true, status });
});
