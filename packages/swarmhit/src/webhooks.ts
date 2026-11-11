import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * SwarmHit webhook verification + parsing.
 *
 * Every delivery carries:
 * - X-Swarmhit-Event — the event type
 * - X-Swarmhit-Delivery — a unique delivery id (at-least-once: dedupe on it)
 * - X-Swarmhit-Signature — HMAC-SHA256 hex digest of the raw request
 *   body, keyed by the endpoint's signing secret (the full whsec_… secret)
 *
 * This module only verifies and parses. It writes nothing — the server
 * layer (Supabase, later) decides what to persist.
 */

export type SwarmhitWebhookEventType =
  | "connection.accepted"
  | "message.received"
  | "message.sent"
  | "lead.status_changed"
  | "account.connected"
  | "account.checkpoint_required"
  | "account.connection_failed"
  | "account.archived"
  | "account.deleted"
  | "campaign.finished"
  | "lead.imported"
  | "email.sent"
  | "email.received"
  | "email.bounced"
  | string;

export interface SwarmhitWebhookEvent {
  type: SwarmhitWebhookEventType;
  deliveryId?: string | null;
  accountId?: string | null;
  senderId?: string | null;
  leadId?: string | null;
  campaignId?: string | null;
  campaignLeadId?: string | null;
  chatId?: string | null;
  providerId?: string | null;
  profileUrl?: string | null;
  /** The full parsed payload, for fields this mapper does not name. */
  data: Record<string, unknown>;
  raw: Record<string, unknown>;
}

export function verifySwarmhitSignature(input: {
  rawBody: string;
  signature: string | null | undefined;
  secret: string;
}): boolean {
  if (!input.signature || !input.secret) return false;
  const expected = createHmac("sha256", input.secret).update(input.rawBody).digest("hex");
  const received = Buffer.from(input.signature);
  const expectedBuffer = Buffer.from(expected);
  if (received.length !== expectedBuffer.length) return false;
  return timingSafeEqual(received, expectedBuffer);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

/** Parse a verified webhook payload into a typed event. Throws on bad shape. */
export function parseSwarmhitWebhookEvent(payload: unknown, deliveryId?: string | null): SwarmhitWebhookEvent {
  const raw = asRecord(payload);
  const event = text(raw["event"]);
  if (!event) throw new Error("SwarmHit webhook payload has no event type.");
  const data = asRecord(raw["data"]);
  const pick = (...keys: string[]): string | null => {
    for (const key of keys) {
      const value = text(data[key] ?? raw[key]);
      if (value) return value;
    }
    return null;
  };
  return {
    type: event,
    deliveryId: deliveryId ?? text(raw["deliveryId"]),
    accountId: pick("accountId"),
    senderId: pick("senderId"),
    leadId: pick("leadId"),
    campaignId: pick("campaignId"),
    campaignLeadId: pick("campaignLeadId"),
    chatId: pick("chatId"),
    providerId: pick("providerId"),
    profileUrl: pick("profileUrl", "linkedinUrl"),
    data,
    raw,
  };
}

export interface VerifyWebhookResult {
  ok: boolean;
  event?: SwarmhitWebhookEvent;
  error?: string;
}

/**
 * Verify the HMAC signature, then parse. Returns { ok: false } instead
 * of throwing for a bad signature or a malformed payload, so an HTTP
 * handler can answer 401/400 without crashing.
 */
export function verifyAndParseWebhook(input: {
  rawBody: string;
  signature: string | null | undefined;
  secret: string;
  deliveryId?: string | null;
  eventHeader?: string | null;
}): VerifyWebhookResult {
  if (!verifySwarmhitSignature({ rawBody: input.rawBody, signature: input.signature, secret: input.secret })) {
    return { ok: false, error: "Invalid SwarmHit webhook signature." };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(input.rawBody);
  } catch {
    return { ok: false, error: "Webhook body is not valid JSON." };
  }
  try {
    const event = parseSwarmhitWebhookEvent(parsed, input.deliveryId);
    if (input.eventHeader && event.type !== input.eventHeader) {
      return { ok: false, error: "Webhook event header does not match the payload event." };
    }
    return { ok: true, event };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Webhook payload could not be parsed." };
  }
}
