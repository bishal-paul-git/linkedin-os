import test from "node:test";
import assert from "node:assert/strict";
import { ProspectAdapterRegistry } from "../../prospecting/src/index.ts";
import {
  SwarmhitAdapterRegistry,
  createSwarmhitProspectAdapter,
  registerSwarmhitProspectAdapter,
  type SwarmhitConfig,
} from "./swarmhit-registry.ts";

const config: SwarmhitConfig = {
  apiKey: "swh_live_test",
  accountId: "acct-1",
  isPremium: false,
};

test("returns a SwarmHit adapter when the resolver returns config", async () => {
  const registry = new SwarmhitAdapterRegistry(async () => config);
  const adapter = await registry.get("swarmhit", "t1");
  assert.ok(adapter);
  assert.equal(adapter.id, "swarmhit");
  assert.equal(adapter.tenantId, "t1");
});

test("returns null when the resolver returns null (not opted in / not connected)", async () => {
  const registry = new SwarmhitAdapterRegistry(async () => null);
  assert.equal(await registry.get("swarmhit", "t1"), null);
});

test("returns null for any other adapter id", async () => {
  const registry = new SwarmhitAdapterRegistry(async () => config);
  assert.equal(await registry.get("linkedin-official", "t1"), null);
  assert.equal(await registry.get("zernio", "t1"), null);
});

test("passes the resolved config through to the adapter", async () => {
  const seen: string[] = [];
  const registry = new SwarmhitAdapterRegistry(async (tenantId) => {
    seen.push(tenantId);
    return config;
  });
  const adapter = await registry.get("swarmhit", "tenant-9");
  assert.ok(adapter);
  assert.deepEqual(seen, ["tenant-9"]);
});

test("creates a SwarmHit prospect adapter", () => {
  const adapter = createSwarmhitProspectAdapter("t1", "swh_live_test");
  assert.equal(adapter.id, "swarmhit");
  assert.equal(adapter.tenantId, "t1");
});

test("registers the prospect adapter and rejects a duplicate registration", () => {
  const registry = new ProspectAdapterRegistry();
  const adapter = registerSwarmhitProspectAdapter(registry, "t1", "swh_live_test");
  assert.equal(adapter.id, "swarmhit");
  assert.deepEqual(registry.list(), ["swarmhit"]);
  assert.equal(registry.get("swarmhit"), adapter);
  assert.throws(
    () => registerSwarmhitProspectAdapter(registry, "t1", "swh_live_test"),
    /already registered/,
  );
});
