import test from "node:test";
import assert from "node:assert/strict";
import { LinkedInOfficialClient } from "./client.ts";
import { LinkedInOfficialAdapter } from "./linkedin-adapter.ts";
import type { ApprovalAction } from "../../core/src/index.ts";

function response(body: unknown, status = 200, id?: string) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
    headers: { get: (name: string) => name.toLowerCase() === "x-restli-id" ? id ?? null : null },
  };
}

const action: ApprovalAction = {
  id: "a1",
  tenantId: "t1",
  actionType: "PUBLISH_POST",
  draftContent: "Approved direct LinkedIn post",
  approvalState: "APPROVED",
  executionState: "READY",
  idempotencyKey: "linkedin:post:1",
  approvalFingerprint: "fp",
  approvedFingerprint: "fp",
};

test("builds self-service OAuth URL with OIDC and member-social scopes", () => {
  const client = new LinkedInOfficialClient();
  const url = new URL(client.buildAuthorizationUrl({
    clientId: "client-1",
    redirectUri: "https://app.example.com/auth/linkedin/callback",
    state: "state-1",
  }));
  assert.equal(url.origin + url.pathname, "https://www.linkedin.com/oauth/v2/authorization");
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.get("client_id"), "client-1");
  assert.equal(url.searchParams.get("redirect_uri"), "https://app.example.com/auth/linkedin/callback");
  assert.equal(url.searchParams.get("state"), "state-1");
  assert.deepEqual(new Set(url.searchParams.get("scope")?.split(" ")), new Set(["openid","profile","email","w_member_social"]));
});

test("exchanges authorization code using urlencoded token request", async () => {
  let url = "", body = "", contentType = "";
  const client = new LinkedInOfficialClient(async (u, init) => {
    url = u; body = init?.body ?? ""; contentType = init?.headers?.["Content-Type"] ?? "";
    return response({ access_token: "token-1", expires_in: 3600 });
  });
  const token = await client.exchangeCode({
    clientId: "client-1",
    clientSecret: "secret-1",
    redirectUri: "https://app.example.com/auth/linkedin/callback",
    code: "code-1",
  });
  assert.equal(url, "https://www.linkedin.com/oauth/v2/accessToken");
  assert.equal(contentType, "application/x-www-form-urlencoded");
  const parsed = new URLSearchParams(body);
  assert.equal(parsed.get("grant_type"), "authorization_code");
  assert.equal(parsed.get("code"), "code-1");
  assert.equal(token.access_token, "token-1");
});

test("reads OIDC userinfo with bearer token", async () => {
  let auth = "";
  const client = new LinkedInOfficialClient(async (_url, init) => {
    auth = init?.headers?.Authorization ?? "";
    return response({ sub: "pairwise-subject", name: "Test Member" });
  });
  const info = await client.getUserInfo("token-1");
  assert.equal(auth, "Bearer token-1");
  assert.equal(info.sub, "pairwise-subject");
});

test("does not advertise publishing without an explicit member author URN", async () => {
  const adapter = new LinkedInOfficialAdapter({
    tenantId: "t1",
    accessToken: "token-1",
    publishTransport: "ugcPosts",
    fetchImpl: async () => response({ sub: "pairwise-subject" }),
  });
  assert.deepEqual(await adapter.listCapabilities(), []);
});

test("publishes an approved personal post through configured self-service transport", async () => {
  let calledUrl = "", payload: any;
  const adapter = new LinkedInOfficialAdapter({
    tenantId: "t1",
    accessToken: "token-1",
    memberAuthorUrn: "urn:li:person:123",
    publishTransport: "ugcPosts",
    fetchImpl: async (url, init) => {
      calledUrl = url;
      payload = JSON.parse(init?.body ?? "{}");
      return response({}, 201, "urn:li:ugcPost:456");
    },
  });
  const result = await adapter.execute(action);
  assert.equal(result.ok, true);
  assert.equal(calledUrl, "https://api.linkedin.com/v2/ugcPosts");
  assert.equal(payload.author, "urn:li:person:123");
  assert.equal(result.externalId, "urn:li:ugcPost:456");
});

test("supports current versioned Posts API when explicitly configured", async () => {
  let version = "", calledUrl = "";
  const client = new LinkedInOfficialClient(async (url, init) => {
    calledUrl = url;
    version = init?.headers?.["Linkedin-Version"] ?? "";
    return response({}, 201, "urn:li:share:789");
  });
  const result = await client.publishTextPost({
    accessToken: "token-1",
    authorUrn: "urn:li:person:123",
    text: "Posts API",
    transport: "posts",
    linkedInVersion: "202610",
  });
  assert.equal(calledUrl, "https://api.linkedin.com/rest/posts");
  assert.equal(version, "202610");
  assert.equal(result.id, "urn:li:share:789");
});

test("hard-blocks DMs and connection actions", async () => {
  const adapter = new LinkedInOfficialAdapter({
    tenantId: "t1",
    accessToken: "token-1",
    memberAuthorUrn: "urn:li:person:123",
    publishTransport: "ugcPosts",
    fetchImpl: async () => response({}),
  });
  for (const actionType of ["SEND_DM","SEND_CONNECTION","ACCEPT_CONNECTION"] as const) {
    const result = await adapter.execute({ ...action, actionType });
    assert.equal(result.ok, false);
    assert.equal(result.blocked, true);
  }
});
