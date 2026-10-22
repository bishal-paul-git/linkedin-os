import test from "node:test";
import assert from "node:assert/strict";
import { ZernioLinkedInAdapter } from "./linkedin-adapter.ts";
import type { ApprovalAction } from "../../core/src/index.ts";

function response(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

const action: ApprovalAction = {
  id: "a1",
  tenantId: "t1",
  actionType: "PUBLISH_POST",
  draftContent: "Approved LinkedIn post",
  approvalState: "APPROVED",
  executionState: "READY",
  idempotencyKey: "post:1",
  approvalFingerprint: "fp",
  approvedFingerprint: "fp",
};

test("advertises only configured publishing targets", async () => {
  const adapter = new ZernioLinkedInAdapter({
    tenantId: "t1",
    apiKey: "test-key",
    personalAccountId: "personal-1",
    fetchImpl: async () => response({ accounts: [] }),
  });
  const caps = await adapter.listCapabilities();
  assert.deepEqual(caps.map((c) => c.capability), ["PUBLISH_MEMBER_POST"]);
});

test("publishes personal approved post to the configured personal account", async () => {
  let payload: any;
  const adapter = new ZernioLinkedInAdapter({
    tenantId: "t1",
    apiKey: "test-key",
    personalAccountId: "personal-1",
    fetchImpl: async (_url, init) => {
      payload = JSON.parse(init?.body ?? "{}");
      return response({
        post: {
          id: "zpost-1",
          platforms: [{
            platform: "linkedin",
            platformPostId: "urn:li:share:1",
            platformPostUrl: "https://www.linkedin.com/feed/update/urn:li:share:1",
          }],
        },
      });
    },
  });

  const result = await adapter.execute(action);
  assert.equal(result.ok, true);
  assert.equal(payload.platforms[0].accountId, "personal-1");
  assert.equal(payload.content, "Approved LinkedIn post");
});

test("never treats connection requests as a Zernio publishing capability", async () => {
  const adapter = new ZernioLinkedInAdapter({
    tenantId: "t1",
    apiKey: "test-key",
    personalAccountId: "personal-1",
    fetchImpl: async () => response({}),
  });
  const result = await adapter.execute({ ...action, actionType: "SEND_CONNECTION" });
  assert.equal(result.ok, false);
  assert.equal(result.blocked, true);
});
