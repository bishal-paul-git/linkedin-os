import test from "node:test";
import assert from "node:assert/strict";
import { SwarmhitClient, SwarmhitApiError } from "./client.ts";

function response(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

const client = (fetchImpl: Parameters<typeof SwarmhitClient>[0]["fetchImpl"]) =>
  new SwarmhitClient({ apiKey: "swh_live_test-key", fetchImpl });

test("getApiInfo sends a Bearer key and unwraps data", async () => {
  let auth = "";
  const c = client(async (_url, init) => {
    auth = init?.headers?.["Authorization"] ?? "";
    return response({ data: { name: "Swarmhit API", version: "v1" } });
  });
  const info = await c.getApiInfo();
  assert.equal(auth, "Bearer swh_live_test-key");
  assert.equal(info.name, "Swarmhit API");
});

test("sendConnection posts profileUrl + note with an Idempotency-Key", async () => {
  let url = "";
  let headers: Record<string, string> = {};
  let payload: Record<string, unknown> = {};
  const c = client(async (u, init) => {
    url = u;
    headers = init?.headers ?? {};
    payload = JSON.parse(init?.body ?? "{}");
    return response({ data: { id: "act-1", type: "invitation", profileUrl: payload["profileUrl"] } });
  });
  const result = await c.sendConnection("acc-1", { profileUrl: "https://www.linkedin.com/in/jane-doe", note: "Hi Jane" }, "key-1");
  assert.equal(url, "https://app.swarmhit.com/api/v1/accounts/acc-1/connections");
  assert.equal(headers["Idempotency-Key"], "key-1");
  assert.equal(payload["note"], "Hi Jane");
  assert.equal(result.id, "act-1");
});

test("sendConnection rejects a note over 300 characters before any call", async () => {
  let called = false;
  const c = client(async () => {
    called = true;
    return response({ data: {} });
  });
  await assert.rejects(
    () => c.sendConnection("acc-1", { profileUrl: "https://www.linkedin.com/in/jane-doe", note: "x".repeat(301) }),
    /at most 300/,
  );
  assert.equal(called, false);
});

test("a 429 parses limit/used/scope/resetAt into rateLimit", async () => {
  const c = client(async () => response({
    error: {
      status: 429,
      code: "rate-limited",
      message: "Daily limit reached for this action on this account (25/25).",
      details: { limit: 25, used: 25, scope: "day", resetAt: "2026-06-19T00:00:00.000Z" },
    },
  }, 429));
  try {
    await c.sendDirectMessage("acc-1", { profileUrl: "https://www.linkedin.com/in/jane-doe", text: "Hi" });
    assert.fail("should have thrown");
  } catch (error) {
    assert.ok(error instanceof SwarmhitApiError);
    assert.equal(error.status, 429);
    assert.deepEqual(error.rateLimit, { limit: 25, used: 25, scope: "day", resetAt: "2026-06-19T00:00:00.000Z", balance: null });
  }
});

test("a 401 surfaces the stable error code", async () => {
  const c = client(async () => response({ error: { status: 401, code: "unauthorized", message: "Invalid API key." } }, 401));
  await assert.rejects(() => c.getApiInfo(), (error: unknown) => {
    assert.ok(error instanceof SwarmhitApiError);
    assert.equal((error as SwarmhitApiError).code, "unauthorized");
    return true;
  });
});

test("searchPeopleDatabase requires a filter and clamps limit to 100", async () => {
  let payload: Record<string, unknown> = {};
  const c = client(async (_url, init) => {
    payload = JSON.parse(init?.body ?? "{}");
    return response({ data: [], paging: {} });
  });
  await assert.rejects(() => c.searchPeopleDatabase({ filters: {} }), /At least one database filter/);
  await c.searchPeopleDatabase({ filters: { titles: ["CTO"] }, limit: 500 });
  assert.equal(payload["limit"], 100);
});

test("createLeadImport clamps maxLeads to 2500", async () => {
  let payload: Record<string, unknown> = {};
  const c = client(async (_url, init) => {
    payload = JSON.parse(init?.body ?? "{}");
    return response({ data: { id: "imp-1", status: "running" } });
  });
  const result = await c.createLeadImport({ accountId: "acc-1", url: "https://www.linkedin.com/search/results/people/", maxLeads: 9999 });
  assert.equal(payload["maxLeads"], 2500);
  assert.equal(result.id, "imp-1");
});

test("sendChatMessage accepts attachments and voice notes", async () => {
  let payload: Record<string, unknown> = {};
  const c = client(async (_url, init) => {
    payload = JSON.parse(init?.body ?? "{}");
    return response({ data: { ok: true, messageId: "m-1" } });
  });
  const result = await c.sendChatMessage("chat-1", {
    text: "Thanks!",
    attachments: [{ url: "https://example.com/file.pdf", name: "file.pdf" }],
    voiceMessage: { url: "https://example.com/voice.mp3", durationMs: 30000 },
  });
  assert.equal(result.ok, true);
  assert.equal((payload["attachments"] as unknown[]).length, 1);
  assert.equal(payload["voiceMessage"] !== undefined, true);
});

test("approve / reject / regenerate pending comments hit the right paths", async () => {
  const urls: string[] = [];
  const c = client(async (url) => {
    urls.push(url);
    return response({ data: { id: "pc-1", status: "approved" } });
  });
  await c.approvePendingComment("pc-1", "Edited text");
  await c.rejectPendingComment("pc-1");
  await c.regeneratePendingComment("pc-1", "Make it shorter");
  assert.deepEqual(urls, [
    "https://app.swarmhit.com/api/v1/pending-comments/pc-1/approve",
    "https://app.swarmhit.com/api/v1/pending-comments/pc-1/reject",
    "https://app.swarmhit.com/api/v1/pending-comments/pc-1/regenerate",
  ]);
});
