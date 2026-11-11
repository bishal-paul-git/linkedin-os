import type { LinkedInAdapter } from "../../core/src/index.ts";
import { ProspectAdapterRegistry } from "../../prospecting/src/index.ts";
import {
  SWARMHIT_ADAPTER_ID,
  SwarmhitLinkedInAdapter,
  SwarmhitProspectAdapter,
  type SwarmhitFetch,
} from "../../swarmhit/src/index.ts";
import type { AdapterRegistry } from "./execution-service.ts";

/**
 * What a SwarmHit tenant needs before the adapter may be handed out:
 * the Vault-stored `swh_live_…` API key, the one SwarmHit LinkedIn
 * sender account id, and whether that LinkedIn account is premium
 * (premium senders may attach a connection note; free senders may not).
 *
 * The resolver is responsible for the opt-in check. The Supabase
 * resolver (packages/supabase/src/swarmhit.ts) must verify, before
 * returning a config, that:
 *   1. li_run_control.swarmhit_enabled is true for the tenant, and
 *   2. a CONNECTED row exists in li_swarmhit_senders for the tenant.
 * This registry deliberately makes no database call of its own so it
 * stays injectable (and unit-testable) and so the opt-in rule lives in
 * exactly one place — the resolver.
 */
export interface SwarmhitConfig {
  apiKey: string;
  accountId: string;
  isPremium: boolean;
}

export type SwarmhitConfigResolver = (
  tenantId: string,
) => Promise<SwarmhitConfig | null>;

export class SwarmhitAdapterRegistry implements AdapterRegistry {
  constructor(
    private readonly resolveConfig: SwarmhitConfigResolver,
    private readonly fetchImpl?: SwarmhitFetch,
  ) {}

  async get(adapterId: string, tenantId: string): Promise<LinkedInAdapter | null> {
    if (adapterId !== SWARMHIT_ADAPTER_ID) return null;
    const config = await this.resolveConfig(tenantId);
    if (!config) return null;
    return new SwarmhitLinkedInAdapter({
      tenantId,
      apiKey: config.apiKey,
      accountId: config.accountId,
      isPremium: config.isPremium,
      fetchImpl: this.fetchImpl,
    });
  }
}

/** Build a SwarmHit prospect adapter without registering it. */
export function createSwarmhitProspectAdapter(
  tenantId: string,
  apiKey: string,
  fetchImpl?: SwarmhitFetch,
): SwarmhitProspectAdapter {
  return new SwarmhitProspectAdapter({ tenantId, apiKey, fetchImpl });
}

/**
 * Build a SwarmHit prospect adapter and register it in the given
 * ProspectAdapterRegistry. Throws if "swarmhit" is already registered
 * (ProspectAdapterRegistry.register rejects duplicates).
 */
export function registerSwarmhitProspectAdapter(
  registry: ProspectAdapterRegistry,
  tenantId: string,
  apiKey: string,
  fetchImpl?: SwarmhitFetch,
): SwarmhitProspectAdapter {
  const adapter = createSwarmhitProspectAdapter(tenantId, apiKey, fetchImpl);
  registry.register(adapter);
  return adapter;
}
