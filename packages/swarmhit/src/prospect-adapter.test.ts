import test from "node:test";
import assert from "node:assert/strict";
import { SwarmhitProspectAdapter } from "./prospect-adapter.ts";

function response(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

const people = [
  {
    id: 1,
    firstName: "Jane",
    lastName: "Doe",
    title: "CTO",
    headline: "CTO at Acme",
    location: "London",
    linkedinUrl: "https://www.linkedin.com/in/jane-doe",
    company: { name: "Acme", domain: "acme.com", industries: ["Software Development"] },
    contact: { hasBusinessEmail: true, hasPersonalEmail: false, hasPhone: false },
  },
  {
    id: 2,
    firstName: "Jane",
    lastName: "Doe",
    title: "CTO",
    headline: "CTO at Acme",
    location: "London",
    linkedinUrl: "https://www.linkedin.com/in/jane-doe/",
    company: { name: "Acme", domain: "acme.com", industries: ["Software Development"] },
  },
  {
    id: 3,
    firstName: "Omar",
    lastName: "Khan",
    title: "Founder",
    location: "Dhaka",
    linkedinUrl: "https://www.linkedin.com/in/omar-khan",
    company: { name: "Beta", domain: "beta.dev", industries: ["Software Development"] },
  },
];

test("search maps database people to candidates and dedupes by LinkedIn URL", async () => {
  let payload: Record<string, unknown> = {};
  const adapter = new SwarmhitProspectAdapter({
    tenantId: "t1",
    apiKey: "swh_live_test-key",
    fetchImpl: async (_url, init) => {
      payload = JSON.parse(init?.body ?? "{}");
      return response({ data: people, paging: {} });
    },
  });
  const result = await adapter.search({ roles: ["CTO"], locations: ["London"], limit: 10 });
  assert.deepEqual((payload["filters"] as Record<string, unknown>)["titles"], ["CTO"]);
  assert.equal(result.source, "swarmhit");
  assert.equal(result.candidates.length, 2); // Jane deduped, Omar kept
  assert.equal(result.candidates[0]?.name, "Jane Doe");
  assert.equal(result.candidates[0]?.company, "Acme");
  assert.equal(result.candidates[0]?.linkedInUrl, "https://www.linkedin.com/in/jane-doe");
});

test("search requires a filter and clamps limit to 1–100", async () => {
  const adapter = new SwarmhitProspectAdapter({
    tenantId: "t1",
    apiKey: "swh_live_test-key",
    fetchImpl: async () => response({ data: [], paging: {} }),
  });
  await assert.rejects(() => adapter.search({}), /At least one prospect filter/);
  const result = await adapter.search({ keywords: ["AI"], limit: 500 });
  assert.equal(result.candidates.length, 0);
});

test("importFromSearch needs a sender account and clamps maxLeads", async () => {
  let payload: Record<string, unknown> = {};
  const adapter = new SwarmhitProspectAdapter({
    tenantId: "t1",
    apiKey: "swh_live_test-key",
    accountId: "acc-1",
    fetchImpl: async (_url, init) => {
      payload = JSON.parse(init?.body ?? "{}");
      return response({ data: { id: "imp-1", status: "running" } });
    },
  });
  const result = await adapter.importFromSearch({
    url: "https://www.linkedin.com/search/results/people/",
    maxLeads: 9999,
  });
  assert.equal(payload["accountId"], "acc-1");
  assert.equal(payload["maxLeads"], 2500);
  assert.equal(result["id"], "imp-1");

  const noSender = new SwarmhitProspectAdapter({
    tenantId: "t1",
    apiKey: "swh_live_test-key",
    fetchImpl: async () => response({ data: {} }),
  });
  await assert.rejects(
    () => noSender.importFromSearch({ url: "https://www.linkedin.com/search/results/people/" }),
    /sender accountId is required/,
  );
});

test("enrichPerson maps a full database profile", async () => {
  const adapter = new SwarmhitProspectAdapter({
    tenantId: "t1",
    apiKey: "swh_live_test-key",
    fetchImpl: async () => response({
      data: { ...people[0], businessEmails: ["jane@acme.com"], skills: ["Go", "Leadership"] },
    }),
  });
  const candidate = await adapter.enrichPerson("https://www.linkedin.com/in/jane-doe", true);
  assert.equal(candidate.name, "Jane Doe");
  assert.deepEqual((candidate.evidence as Record<string, unknown>)["businessEmails"], ["jane@acme.com"]);
});
