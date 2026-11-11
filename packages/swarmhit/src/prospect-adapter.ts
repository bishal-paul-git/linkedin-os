import type {
  ProspectCandidate,
  ProspectDataAdapter,
  ProspectSearchInput,
  ProspectSearchResult,
} from "../../core/src/index.ts";
import { normalizeProspectCandidate, prospectIdentityKey } from "../../prospecting/src/normalizer.ts";
import { SwarmhitClient, type SwarmhitFetch } from "./client.ts";
import type { SwarmhitDbPerson, SwarmhitLeadImportInput } from "./types.ts";

export interface SwarmhitProspectAdapterOptions {
  tenantId: string;
  apiKey: string;
  /** Required only for lead imports (the sender account the search runs through). */
  accountId?: string | null;
  fetchImpl?: SwarmhitFetch;
  baseUrl?: string;
  workspaceId?: string | null;
}

function mapDbPerson(person: SwarmhitDbPerson): ProspectCandidate {
  const name = person.name?.trim()
    || [person.firstName, person.lastName].filter(Boolean).join(" ").trim();
  return {
    externalId: person.id === undefined || person.id === null ? null : String(person.id),
    name: name || "Unknown",
    roleTitle: person.title ?? person.company?.title ?? null,
    company: person.company?.name ?? null,
    location: person.location ?? person.country ?? null,
    linkedInUrl: person.linkedinUrl ?? null,
    reason: person.headline ?? null,
    evidence: {
      headline: person.headline ?? null,
      country: person.country ?? null,
      hasBusinessEmail: person.contact?.hasBusinessEmail ?? null,
      hasPersonalEmail: person.contact?.hasPersonalEmail ?? null,
      hasPhone: person.contact?.hasPhone ?? null,
      saved: person.saved ?? null,
      companyDomain: person.company?.domain ?? null,
      companyHeadcount: person.company?.headcount ?? null,
    },
    rawData: person as unknown as Record<string, unknown>,
  };
}

export class SwarmhitProspectAdapter implements ProspectDataAdapter {
  readonly id = "swarmhit";
  readonly tenantId: string;
  private readonly client: SwarmhitClient;
  private readonly accountId?: string | null;

  constructor(options: SwarmhitProspectAdapterOptions) {
    this.tenantId = options.tenantId;
    this.accountId = options.accountId ?? null;
    this.client = new SwarmhitClient({
      apiKey: options.apiKey,
      fetchImpl: options.fetchImpl,
      baseUrl: options.baseUrl,
      workspaceId: options.workspaceId ?? null,
    });
  }

  async healthCheck(): Promise<{ ok: boolean; reason?: string }> {
    try {
      await this.client.getApiInfo();
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        reason: error instanceof Error ? error.message : "SwarmHit health check failed.",
      };
    }
  }

  async search(input: ProspectSearchInput): Promise<ProspectSearchResult> {
    const limit = Math.max(1, Math.min(100, input.limit ?? 25));
    const titles = [...(input.roles ?? [])];
    const keywords = [...(input.keywords ?? [])];
    if (input.query?.trim()) keywords.push(input.query.trim());
    const filters: Record<string, unknown> = {
      ...(titles.length ? { titles } : {}),
      ...(keywords.length ? { keywords } : {}),
      ...(input.industries?.length ? { industries: input.industries } : {}),
      ...(input.locations?.length ? { locations: input.locations } : {}),
      ...(input.companyNames?.length ? { companyNames: input.companyNames } : {}),
      ...(input.companySizes?.length ? { headcountRanges: input.companySizes } : {}),
    };
    if (!Object.keys(filters).length) {
      throw new Error("At least one prospect filter is required (title, company, location, industry or keyword).");
    }
    const result = await this.client.searchPeopleDatabase({ filters, limit, cursor: input.cursor ?? undefined });
    const seen = new Set<string>();
    const candidates: ProspectCandidate[] = [];
    for (const person of result.items) {
      const candidate = normalizeProspectCandidate(mapDbPerson(person));
      const key = prospectIdentityKey(candidate);
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push(candidate);
      if (candidates.length >= limit) break;
    }
    return {
      source: "swarmhit",
      candidates,
      nextCursor: typeof result.paging?.["nextCursor"] === "string"
        ? (result.paging["nextCursor"] as string)
        : null,
      metadata: { creditsPerResult: 2 },
    };
  }

  /**
   * Start a LinkedIn / Sales Navigator search import through the
   * configured sender account. maxLeads is clamped to 1–2500 by the client.
   */
  async importFromSearch(input: Omit<SwarmhitLeadImportInput, "accountId"> & { accountId?: string }): Promise<Record<string, unknown>> {
    const accountId = input.accountId ?? this.accountId;
    if (!accountId) throw new Error("A SwarmHit sender accountId is required for lead import.");
    const result = await this.client.createLeadImport({ ...input, accountId });
    return result as unknown as Record<string, unknown>;
  }

  /** Enrich one person from their LinkedIn URL, mapped to a candidate. */
  async enrichPerson(linkedinUrl: string, includeEmail = false): Promise<ProspectCandidate> {
    const person = await this.client.enrichPerson({ linkedinUrl, includeEmail });
    const candidate = normalizeProspectCandidate(mapDbPerson(person));
    if (includeEmail && person.businessEmails?.length) {
      candidate.evidence = { ...(candidate.evidence ?? {}), businessEmails: person.businessEmails };
    }
    return candidate;
  }
}
