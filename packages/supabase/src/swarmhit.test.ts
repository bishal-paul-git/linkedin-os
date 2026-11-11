import test from "node:test";
import assert from "node:assert/strict";
import {
  recordSwarmhitUsage,
  resolveSwarmhitConfig,
  swarmhitUsageKindForAction,
} from "./swarmhit.ts";

/**
 * Fake Supabase client: each table maps to one canned { data, error }
 * result, returned by single()/maybeSingle() whatever the filters are.
 * Cast to the real client type at the call site — the resolver only
 * uses from()/schema()/select()/eq()/order()/limit()/single()/
 * maybeSingle(), all of which the fake implements.
 */
type TableResult = { data: unknown; error: unknown };
type Tables = Record<string, TableResult>;

function query(table: string, tables: Tables) {
  const result = tables[table] ?? { data: null, error: null };
  const builder = {
    select: () => builder,
    eq: () => builder,
    order: () => builder,
    limit: () => builder,
    single: async () => result,
    maybeSingle: async () => result,
  };
  return builder;
}

function fakeClient(tables: Tables) {
  return {
    from: (table: string) => query(table, tables),
    schema: (_name: string) => ({
      from: (table: string) => query("vault." + table, tables),
    }),
  };
}

const ok = (data: unknown): TableResult => ({ data, error: null });
const err = (message: string): TableResult => ({ data: null, error: { message } });

function configuredTables(overrides: Tables = {}): Tables {
  return {
    li_run_control: ok({ swarmhit_enabled: true }),
    li_integrations: ok({ token_ref: "00000000-0000-0000-0000-000000000001" }),
    li_swarmhit_senders: ok({
      swarmhit_account_id: "acct-1",
      linkedin_type: "FREE",
      status: "CONNECTED",
    }),
    "vault.decrypted_secrets": ok({ decrypted_secret: "swh_live_test" }),
    ...overrides,
  };
}

test("returns config when opted in, sender connected and key decrypts", async () => {
  const config = await resolveSwarmhitConfig(
    fakeClient(configuredTables()) as never,
    "t1",
  );
  assert.deepEqual(config, {
    apiKey: "swh_live_test",
    accountId: "acct-1",
    isPremium: false,
  });
});

test("returns null when swarmhit_enabled is false", async () => {
  const config = await resolveSwarmhitConfig(
    fakeClient(configuredTables({ li_run_control: ok({ swarmhit_enabled: false }) })) as never,
    "t1",
  );
  assert.equal(config, null);
});

test("returns null when the swarmhit_enabled column does not exist yet (migration not applied)", async () => {
  const config = await resolveSwarmhitConfig(
    fakeClient(configuredTables({ li_run_control: err('column "swarmhit_enabled" does not exist') })) as never,
    "t1",
  );
  assert.equal(config, null);
});

test("returns null when no CONNECTED sender exists", async () => {
  const config = await resolveSwarmhitConfig(
    fakeClient(configuredTables({ li_swarmhit_senders: ok(null) })) as never,
    "t1",
  );
  assert.equal(config, null);
});

test("returns null when no SwarmHit integration / token_ref is stored", async () => {
  const config = await resolveSwarmhitConfig(
    fakeClient(configuredTables({ li_integrations: ok(null) })) as never,
    "t1",
  );
  assert.equal(config, null);
});

test("reads a paid sender from linkedin_type", async () => {
  const config = await resolveSwarmhitConfig(
    fakeClient(configuredTables({
      li_swarmhit_senders: ok({
        swarmhit_account_id: "acct-2",
        linkedin_type: "PAID",
        status: "CONNECTED",
      }),
    })) as never,
    "t1",
  );
  assert.deepEqual(config, {
    apiKey: "swh_live_test",
    accountId: "acct-2",
    isPremium: true,
  });
});

test("maps approval actions to usage kinds", () => {
  assert.equal(swarmhitUsageKindForAction("SEND_CONNECTION"), "invite");
  assert.equal(swarmhitUsageKindForAction("SEND_DM"), "message");
  assert.equal(swarmhitUsageKindForAction("REPLY_DM"), "message");
  assert.equal(swarmhitUsageKindForAction("COMMENT"), "post_comment");
  assert.equal(swarmhitUsageKindForAction("REACT"), "post_like");
  assert.equal(swarmhitUsageKindForAction("PUBLISH_POST"), null);
});

test("recordSwarmhitUsage looks up the sender row and calls the RPC", async () => {
  const rpcCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const client = {
    ...fakeClient({
      li_swarmhit_senders: ok({ id: "sender-uuid-1" }),
    }),
    rpc: async (name: string, args: Record<string, unknown>) => {
      rpcCalls.push({ name, args });
      return { data: { invites_sent: 1 }, error: null };
    },
  };
  const row = await recordSwarmhitUsage(
    client as never,
    "t1",
    "acct-1",
    "invite",
    "2026-11-12T00:00:00Z",
  );
  assert.deepEqual(row, { invites_sent: 1 });
  assert.deepEqual(rpcCalls, [
    {
      name: "li_swarmhit_record_usage",
      args: {
        p_tenant_id: "t1",
        p_sender_id: "sender-uuid-1",
        p_kind: "invite",
        p_reset_at: "2026-11-12T00:00:00Z",
      },
    },
  ]);
});

test("recordSwarmhitUsage returns null when no sender row matches", async () => {
  const rpcCalls: Array<unknown> = [];
  const client = {
    ...fakeClient({ li_swarmhit_senders: ok(null) }),
    rpc: async (_name: string, _args: Record<string, unknown>) => {
      rpcCalls.push(1);
      return { data: null, error: null };
    },
  };
  const row = await recordSwarmhitUsage(client as never, "t1", "acct-9", "message");
  assert.equal(row, null);
  assert.deepEqual(rpcCalls, []);
});

test("recordSwarmhitUsage returns null when the RPC errors", async () => {
  const client = {
    ...fakeClient({
      li_swarmhit_senders: ok({ id: "sender-uuid-1" }),
    }),
    rpc: async () => ({ data: null, error: { message: "sender not found" } }),
  };
  const row = await recordSwarmhitUsage(client as never, "t1", "acct-1", "message");
  assert.equal(row, null);
});
