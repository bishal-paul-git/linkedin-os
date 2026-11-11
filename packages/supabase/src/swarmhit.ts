import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Resolved SwarmHit config for one tenant, or null when SwarmHit is
 * not usable for that tenant.
 *
 * Opt-in rule (all three must hold, checked here and nowhere else):
 *   1. li_run_control.swarmhit_enabled is true for the tenant.
 *      If the column does not exist yet (migrations 025–027 not
 *      applied) the select errors and this returns null — it never
 *      throws, and it never treats a missing column as opted in.
 *   2. A CONNECTED row exists in li_swarmhit_senders (most recent).
 *   3. li_integrations has a provider='swarmhit' row whose token_ref
 *      resolves to a Vault secret.
 *
 * The API key is decrypted the same way the Zernio sync functions do
 * in database/009 (vault.decrypted_secrets, keyed by token_ref).
 * This must only ever run with a server-side service-role client:
 * the anon/publishable key must never be able to read Vault secrets.
 *
 * Column names per migrations 025–027 (database/025–027): the sender
 * account id is swarmhit_account_id and premium is
 * linkedin_type = 'PAID' (not is_premium / plan_type). The fallbacks
 * below only cover a differently-named future revision; the
 * 025 columns are tried first.
 */
export interface SwarmhitConfig {
  apiKey: string;
  accountId: string;
  isPremium: boolean;
}

type Row = Record<string, unknown>;

function text(row: Row, key: string): string | null {
  const value = row[key];
  return typeof value === "string" && value ? value : null;
}

function readSender(row: Row): { accountId: string; isPremium: boolean } | null {
  const accountId =
    text(row, "swarmhit_account_id") ??
    text(row, "external_account_id") ??
    text(row, "account_id");
  if (!accountId) return null;
  const metadata = (row["metadata"] ?? {}) as Row;
  const isPremium =
    row["linkedin_type"] === "PAID" ||
    row["is_premium"] === true ||
    metadata["is_premium"] === true;
  return { accountId, isPremium };
}

export async function resolveSwarmhitConfig(
  client: SupabaseClient,
  tenantId: string,
): Promise<SwarmhitConfig | null> {
  try {
    // 1. Explicit tenant opt-in. Missing column (migration not applied)
    //    or a false value both mean "not opted in".
    const optIn = await client
      .from("li_run_control")
      .select("swarmhit_enabled")
      .eq("tenant_id", tenantId)
      .single();
    if (optIn.error || (optIn.data as Row | null)?.["swarmhit_enabled"] !== true) {
      return null;
    }

    // 2. Stored API key reference.
    const integration = await client
      .from("li_integrations")
      .select("token_ref")
      .eq("tenant_id", tenantId)
      .eq("provider", "swarmhit")
      .maybeSingle();
    const tokenRef = integration.error
      ? null
      : text((integration.data ?? {}) as Row, "token_ref");
    if (!tokenRef) return null;

    // 3. Most recent CONNECTED sender. A missing table (migration not
    //    applied) errors here and means "not connected".
    const sender = await client
      .from("li_swarmhit_senders")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("status", "CONNECTED")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (sender.error || !sender.data) return null;
    const parsed = readSender(sender.data as Row);
    if (!parsed) return null;

    // 4. Decrypt the Vault secret (same pattern as database/009).
    const secret = await client
      .schema("vault")
      .from("decrypted_secrets")
      .select("decrypted_secret")
      .eq("id", tokenRef)
      .maybeSingle();
    const apiKey = secret.error
      ? null
      : text((secret.data ?? {}) as Row, "decrypted_secret");
    if (!apiKey) return null;

    return { apiKey, accountId: parsed.accountId, isPremium: parsed.isPremium };
  } catch {
    // Never throw: an unresolvable config is "not configured".
    return null;
  }
}
