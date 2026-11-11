import test from "node:test";
import assert from "node:assert/strict";
import { resolveSwarmhitConfig } from "./swarmhit.ts";

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
