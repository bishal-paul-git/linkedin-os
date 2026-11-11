import test from "node:test";
import assert from "node:assert/strict";
import { SwarmhitLinkedInAdapter } from "./linkedin-adapter.ts";
import type { ApprovalAction } from "../../core/src/index.ts";

function response(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

const baseAction: ApprovalAction = {
  id: "a1",
  tenantId: "t1",
  actionType: "SEND_CONNECTION",
  targetUrl: "https://www.linkedin.com/in/jane-doe",
  draftContent: "Hi Jane, great to connect.",
  approvalState: "APPROVED",
  executionState: "READY",
  idempotencyKey: "t1:invite:1",
  approvalFingerprint: "fp",
  approvedFingerprint: "fp",
};

function adapter(options: { isPremium?: boolean; fetchImpl: Parameters<typeof SwarmhitLinkedInAdapter>[0]["fetchImpl"] }) {
  return new SwarmhitLinkedInAdapter({
    tenantId: "t1",
    apiKey: "swh_live_test-key",
    accountId: "acc-1",
    isPremium: options.isPremium ?? false,
    fetchImpl: options.fetchImpl,
  });
}

test("listCapabilities advertises AVAILABLE_PROVIDER, never AVAILABLE_OFFICIAL", async () => {
  const a = adapter({ fetchImpl: async () => response({}) });
  const caps = await a.listCapabilities();
  assert.ok(caps.length > 0);
  assert.ok(caps.every((c) => c.mode === "AVAILABLE_PROVIDER"));
  assert.ok(caps.every((c) => c.adapter === "swarmhit"));
  assert.ok(caps.map((c) => c.capability).includes("SEND_CONNECTION"));
  assert.ok(!caps.map((c) => c.capability).includes("PUBLISH_MEMBER_POST"));
});

test("free sender sends an invite without the note", async () => {
  let payload: Record<string, unknown> = {};
  const a = adapter({
    fetchImpl: async (_url, init) => {
      payload = JSON.parse(init?.body ?? "{}");
      return response({ data: { id: "act-1", note: null } });
    },
  });
  const result = await a.execute(baseAction);
  assert.equal(result.ok, true);
  assert.equal(payload["profileUrl"], "https://www.linkedin.com/in/jane-doe");
  assert.equal("note" in payload, false);
  assert.equal(result.metadata?.["noteDroppedFreeSender"], true);
});

test("premium sender sends the invite note (≤300 chars)", async () => {
  let payload: Record<string, unknown> = {};
  const a = adapter({
    isPremium: true,
    fetchImpl: async (_url, init) => {
      payload = JSON.parse(init?.body ?? "{}");
      return response({ data: { id: "act-1" } });
    },
  });
  const result = await a.execute(baseAction);
  assert.equal(result.ok, true);
  assert.equal(payload["note"], "Hi Jane, great to connect.");
});

test("unapproved actions are blocked and make no API call", async () => {
  let called = false;
  const a = adapter({
    fetchImpl: async () => {
      called = true;
      return response({ data: {} });
    },
  });
  const result = await a.execute({ ...baseAction, approvalState: "PENDING" });
  assert.equal(result.ok, false);
  assert.equal(result.blocked, true);
  assert.equal(called, false);
});

test("SEND_DM sends text to a 1st-degree connection", async () => {
  let payload: Record<string, unknown> = {};
  const a = adapter({
    fetchImpl: async (_url, init) => {
      payload = JSON.parse(init?.body ?? "{}");
      return response({ data: { id: "act-2" } });
    },
  });
  const result = await a.execute({ ...baseAction, actionType: "SEND_DM", draftContent: "Thanks for connecting!" });
  assert.equal(result.ok, true);
  assert.equal(payload["text"], "Thanks for connecting!");
});

test("REPLY_DM replies inside the inbox chat named by targetRef", async () => {
  let url = "";
  const a = adapter({
    fetchImpl: async (u) => {
      url = u;
      return response({ data: { ok: true, messageId: "m-1" } });
    },
  });
  const result = await a.execute({
    ...baseAction,
    actionType: "REPLY_DM",
    targetRef: "chat-9",
    draftContent: "Happy to chat.",
  });
  assert.equal(result.ok, true);
  assert.equal(url, "https://app.swarmhit.com/api/v1/inbox/chats/chat-9/messages");
  assert.equal(result.externalId, "m-1");
});

test("COMMENT uses postUrl for a post link and profileUrl otherwise", async () => {
  const urls: string[] = [];
  const payloads: Record<string, unknown>[] = [];
  const a = adapter({
    fetchImpl: async (u, init) => {
      urls.push(u);
      payloads.push(JSON.parse(init?.body ?? "{}"));
      return response({ data: { id: "act-3" } });
    },
  });
  await a.execute({
    ...baseAction,
    actionType: "COMMENT",
    targetUrl: "https://www.linkedin.com/posts/jane-doe_hiring-activity-1",
    draftContent: "Congrats!",
  });
  await a.execute({
    ...baseAction,
    actionType: "COMMENT",
    targetUrl: "https://www.linkedin.com/in/jane-doe",
    draftContent: "Great point.",
    idempotencyKey: "t1:comment:2",
  });
  assert.equal((payloads[0] as Record<string, unknown>)["postUrl"] !== undefined, true);
  assert.equal((payloads[1] as Record<string, unknown>)["profileUrl"], "https://www.linkedin.com/in/jane-doe");
  assert.equal(urls.every((u) => u.endsWith("/accounts/acc-1/post-comments")), true);
});

test("REACT defaults to like and never claims publishing", async () => {
  let payload: Record<string, unknown> = {};
  const a = adapter({
    fetchImpl: async (_url, init) => {
      payload = JSON.parse(init?.body ?? "{}");
      return response({ data: { id: "act-4" } });
    },
  });
  const react = await a.execute({ ...baseAction, actionType: "REACT", draftContent: null });
  assert.equal(react.ok, true);
  assert.equal(payload["reactionType"], "like");
  const publish = await a.execute({ ...baseAction, actionType: "PUBLISH_POST" });
  assert.equal(publish.ok, false);
  assert.equal(publish.blocked, true);
});

test("a server 429 blocks the action and records the reset time", async () => {
  let calls = 0;
  const a = adapter({
    fetchImpl: async () => {
      calls += 1;
      return response({
        error: {
          status: 429,
          message: "Daily limit reached (25/25).",
          details: { limit: 25, used: 25, scope: "day", resetAt: "2027-06-19T00:00:00.000Z" },
        },
      }, 429);
    },
  });
  const result = await a.execute(baseAction);
  assert.equal(result.ok, false);
  assert.equal(result.blocked, true);
  assert.deepEqual(result.metadata?.["rateLimit"], {
    limit: 25,
    used: 25,
    scope: "day",
    resetAt: "2027-06-19T00:00:00.000Z",
    balance: null,
  });
  // Second attempt is blocked locally, without another API call.
  const again = await a.execute({ ...baseAction, idempotencyKey: "t1:invite:2" });
  assert.equal(again.ok, false);
  assert.equal(again.blocked, true);
  assert.equal(calls, 1);
});
