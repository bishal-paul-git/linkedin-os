import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  parseSwarmhitWebhookEvent,
  verifyAndParseWebhook,
  verifySwarmhitSignature,
} from "./webhooks.ts";

const SECRET = "whsec_test-secret";
const payload = {
  event: "connection.accepted",
  data: {
    accountId: "acc-1",
    leadId: "lead-1",
    providerId: "provider-123",
    profileUrl: "https://www.linkedin.com/in/jane-doe",
  },
};
const rawBody = JSON.stringify(payload);
const signature = createHmac("sha256", SECRET).update(rawBody).digest("hex");

test("verifies a correct HMAC-SHA256 signature and rejects a wrong one", () => {
  assert.equal(verifySwarmhitSignature({ rawBody, signature, secret: SECRET }), true);
  assert.equal(verifySwarmhitSignature({ rawBody, signature: "00" + signature.slice(2), secret: SECRET }), false);
  assert.equal(verifySwarmhitSignature({ rawBody: rawBody + " ", signature, secret: SECRET }), false);
  assert.equal(verifySwarmhitSignature({ rawBody, signature, secret: "whsec_wrong" }), false);
  assert.equal(verifySwarmhitSignature({ rawBody, signature: null, secret: SECRET }), false);
});

test("parses connection.accepted into a typed event", () => {
  const event = parseSwarmhitWebhookEvent(payload, "del-1");
  assert.equal(event.type, "connection.accepted");
  assert.equal(event.deliveryId, "del-1");
  assert.equal(event.accountId, "acc-1");
  assert.equal(event.leadId, "lead-1");
  assert.equal(event.providerId, "provider-123");
  assert.equal(event.profileUrl, "https://www.linkedin.com/in/jane-doe");
});

test("parses message.received and account.checkpoint_required", () => {
  const received = parseSwarmhitWebhookEvent({
    event: "message.received",
    data: { accountId: "acc-1", chatId: "chat-1", leadId: "lead-2" },
  });
  assert.equal(received.type, "message.received");
  assert.equal(received.chatId, "chat-1");

  const checkpoint = parseSwarmhitWebhookEvent({
    event: "account.checkpoint_required",
    data: { accountId: "acc-1" },
  });
  assert.equal(checkpoint.type, "account.checkpoint_required");
  assert.equal(checkpoint.accountId, "acc-1");
});

test("unknown event types pass through instead of being dropped", () => {
  const event = parseSwarmhitWebhookEvent({ event: "campaign.finished", data: { campaignId: "camp-1" } });
  assert.equal(event.type, "campaign.finished");
  assert.equal(event.campaignId, "camp-1");
});

test("a payload without an event type throws", () => {
  assert.throws(() => parseSwarmhitWebhookEvent({ data: {} }), /no event type/);
});

test("verifyAndParseWebhook returns ok:false on a bad signature, ok:true on a good one", () => {
  const bad = verifyAndParseWebhook({ rawBody, signature: "deadbeef", secret: SECRET });
  assert.equal(bad.ok, false);
  assert.match(bad.error ?? "", /signature/);

  const good = verifyAndParseWebhook({
    rawBody,
    signature,
    secret: SECRET,
    deliveryId: "del-1",
    eventHeader: "connection.accepted",
  });
  assert.equal(good.ok, true);
  assert.equal(good.event?.type, "connection.accepted");

  const mismatch = verifyAndParseWebhook({ rawBody, signature, secret: SECRET, eventHeader: "message.received" });
  assert.equal(mismatch.ok, false);
});
