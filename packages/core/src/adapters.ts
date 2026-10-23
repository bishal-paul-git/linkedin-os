import type { ApprovalAction, Capability, TenantId } from "./types.ts";

export interface ExecutionResult {
  ok: boolean;
  externalId?: string;
  result?: string;
  blocked?: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface LinkedInAdapter {
  id: string;
  tenantId: TenantId;
  listCapabilities(): Promise<Capability[]>;
  execute(action: ApprovalAction): Promise<ExecutionResult>;
  healthCheck(): Promise<{ ok: boolean; reason?: string }>;
}

export interface ProspectSearchInput {
  query?: string;
  roles?: string[];
  industries?: string[];
  locations?: string[];
  companyNames?: string[];
  companySizes?: string[];
  keywords?: string[];
  limit?: number;
  cursor?: string | null;
}

export interface ProspectCandidate {
  externalId?: string | null;
  name: string;
  roleTitle?: string | null;
  company?: string | null;
  location?: string | null;
  linkedInUrl?: string | null;
  reason?: string | null;
  evidence?: Record<string, unknown>;
  rawData?: Record<string, unknown>;
}

export interface ProspectSearchResult {
  source: string;
  candidates: ProspectCandidate[];
  nextCursor?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ProspectDataAdapter {
  id: string;
  tenantId: TenantId;
  search(input: ProspectSearchInput): Promise<ProspectSearchResult>;
  healthCheck(): Promise<{ ok: boolean; reason?: string }>;
}

export interface MemoryStore {
  tenantId: TenantId;
  getContact(id: string): Promise<Record<string, unknown> | null>;
  findContactByLinkedInUrl(url: string): Promise<Record<string, unknown> | null>;
  createApproval(input: Record<string, unknown>): Promise<Record<string, unknown>>;
  appendActivity(input: Record<string, unknown>): Promise<void>;
}
