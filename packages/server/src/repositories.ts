import type {
  ApprovalAction,
  Capability,
  RunControl,
  TenantId,
} from "../../core/src/index.ts";

export interface TenantRecord {
  id: TenantId;
  slug: string;
  name: string;
  status: "ACTIVE" | "PAUSED" | "SUSPENDED" | "ONBOARDING";
}

export interface WorkflowRunRecord {
  id: string;
  tenantId: TenantId;
  workflowCode: string;
  status: string;
}

export interface PlatformRepositories {
  transaction<T>(fn: () => Promise<T>): Promise<T>;

  createTenant(input: {
    slug: string;
    name: string;
    organization?: string | null;
    createdBy?: string | null;
  }): Promise<TenantRecord>;

  createOwnerMembership(tenantId: TenantId, userId: string): Promise<void>;
  createRunControl(tenantId: TenantId): Promise<void>;
  createDefaultConfig(tenantId: TenantId): Promise<void>;
  createDefaultCapabilities(tenantId: TenantId): Promise<void>;
  createDefaultAgentSettings(tenantId: TenantId): Promise<void>;
  createDefaultWorkflowSettings(tenantId: TenantId): Promise<void>;

  getRunControl(tenantId: TenantId): Promise<RunControl>;
  listCapabilities(tenantId: TenantId): Promise<Capability[]>;
  hasBlockingSecurityEvent(tenantId: TenantId): Promise<boolean>;

  getApproval(tenantId: TenantId, approvalId: string): Promise<ApprovalAction | null>;
  updateApproval(
    tenantId: TenantId,
    approvalId: string,
    patch: Partial<ApprovalAction> & Record<string, unknown>,
  ): Promise<void>;

  hasSucceededIdempotencyKey(tenantId: TenantId, key: string): Promise<boolean>;

  /**
   * Atomically transitions one APPROVED + executable approval into RUNNING.
   * Returns null if it was already claimed, invalidated, blocked or completed.
   */
  claimApprovalForExecution(
    tenantId: TenantId,
    approvalId: string,
  ): Promise<ApprovalAction | null>;

  createWorkflowRun(input: {
    tenantId: TenantId;
    workflowCode: string;
    triggerType: "MANUAL" | "SCHEDULED" | "EVENT" | "SYSTEM";
    inputSummary?: string;
    dedupeKey?: string;
  }): Promise<WorkflowRunRecord>;

  finishWorkflowRun(input: {
    tenantId: TenantId;
    runId: string;
    status: "SUCCEEDED" | "PARTIAL" | "FAILED" | "BLOCKED" | "CANCELLED";
    outputSummary?: string;
    error?: string;
    stats?: Record<string, unknown>;
  }): Promise<void>;

  appendActivity(input: {
    tenantId: TenantId;
    agent: string;
    action: string;
    reason?: string;
    result: string;
    approvalId?: string;
    contactId?: string;
    workflowRunId?: string;
    sourceUrl?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
}
