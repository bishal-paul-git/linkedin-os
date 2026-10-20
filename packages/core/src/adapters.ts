import type { ApprovalAction, Capability, TenantId } from "./types";

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

export interface ProspectDataAdapter {
  id: string;
  tenantId: TenantId;
  search(input: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
}

export interface MemoryStore {
  tenantId: TenantId;
  getContact(id: string): Promise<Record<string, unknown> | null>;
  findContactByLinkedInUrl(url: string): Promise<Record<string, unknown> | null>;
  createApproval(input: Record<string, unknown>): Promise<Record<string, unknown>>;
  appendActivity(input: Record<string, unknown>): Promise<void>;
}
