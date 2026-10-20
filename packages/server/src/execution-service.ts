import {
  isExecutableApproval,
  resolveExecution,
  type LinkedInAdapter,
} from "../../core/src/index.ts";
import type { PlatformRepositories } from "./repositories.ts";

export interface AdapterRegistry {
  get(adapterId: string, tenantId: string): Promise<LinkedInAdapter | null>;
}

export interface ExecutionServiceResult {
  mode: string;
  result: string;
  requiresUserAction?: boolean;
}

export class ExecutionService {
  constructor(
    private readonly repos: PlatformRepositories,
    private readonly adapters: AdapterRegistry,
  ) {}

  async execute(input: {
    tenantId: string;
    approvalId: string;
    securityBlocked?: boolean;
  }): Promise<ExecutionServiceResult> {
    const approval = await this.repos.getApproval(input.tenantId, input.approvalId);
    if (!approval) throw new Error("Approval not found.");

    if (await this.repos.hasSucceededIdempotencyKey(input.tenantId, approval.idempotencyKey)) {
      return {
        mode: "IDEMPOTENT_SKIP",
        result: "This idempotency key already succeeded; no duplicate action was performed.",
      };
    }

    if (!isExecutableApproval(approval)) {
      throw new Error("Approval is not executable or its approved content no longer matches.");
    }

    const runControl = await this.repos.getRunControl(input.tenantId);
    const capabilities = await this.repos.listCapabilities(input.tenantId);
    const securityBlocked = input.securityBlocked
      ?? await this.repos.hasBlockingSecurityEvent(input.tenantId);

    const decision = resolveExecution({
      action: approval,
      runControl,
      capabilities,
      securityBlocked,
    });

    if (!decision.allowed) {
      await this.repos.updateApproval(input.tenantId, approval.id, {
        executionState: decision.reasonCode === "SECURITY_BLOCK" ? "BLOCKED" : "NOT_READY",
        errorNotes: decision.reason,
      });

      return {
        mode: decision.mode,
        result: decision.reason,
        requiresUserAction: decision.requiresUserAction,
      };
    }

    if (decision.requiresUserAction || decision.mode === "AVAILABLE_ASSISTED") {
      await this.repos.updateApproval(input.tenantId, approval.id, {
        executionState: "READY",
        errorNotes: null,
      });

      return {
        mode: decision.mode,
        result: "Prepared for a user-completed action.",
        requiresUserAction: true,
      };
    }

    if (!decision.adapter) {
      throw new Error("Executable capability has no adapter.");
    }

    const adapter = await this.adapters.get(decision.adapter, input.tenantId);
    if (!adapter) {
      throw new Error(`Adapter ${decision.adapter} is not registered.`);
    }

    const health = await adapter.healthCheck();
    if (!health.ok) {
      await this.repos.updateApproval(input.tenantId, approval.id, {
        executionState: "NOT_READY",
        errorNotes: health.reason ?? "Adapter health check failed.",
      });

      return {
        mode: "ADAPTER_UNHEALTHY",
        result: health.reason ?? "Adapter health check failed.",
      };
    }

    const claimed = await this.repos.claimApprovalForExecution(
      input.tenantId,
      approval.id,
    );

    if (!claimed) {
      return {
        mode: "CONCURRENT_SKIP",
        result: "The approval was already claimed, invalidated, blocked or completed.",
      };
    }

    try {
      const result = await adapter.execute(claimed);
      const executionState = result.ok
        ? "SUCCEEDED"
        : result.blocked
          ? "BLOCKED"
          : "FAILED";

      await this.repos.updateApproval(input.tenantId, claimed.id, {
        executionState,
        result: result.result,
        errorNotes: result.error ?? null,
        executedAt: result.ok ? new Date().toISOString() : null,
      });

      await this.repos.appendActivity({
        tenantId: input.tenantId,
        agent: "APPROVAL_EXECUTOR",
        action: claimed.actionType,
        reason: decision.reason,
        result: executionState,
        approvalId: claimed.id,
        workflowRunId: claimed.workflowRunId ?? undefined,
        sourceUrl: claimed.targetUrl ?? claimed.targetRef ?? undefined,
        metadata: result.metadata,
      });

      return {
        mode: decision.mode,
        result: result.result ?? (result.ok ? "Succeeded." : "Failed."),
        requiresUserAction: false,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown adapter error.";

      await this.repos.updateApproval(input.tenantId, claimed.id, {
        executionState: "FAILED",
        errorNotes: message,
      });

      await this.repos.appendActivity({
        tenantId: input.tenantId,
        agent: "APPROVAL_EXECUTOR",
        action: claimed.actionType,
        reason: decision.reason,
        result: "FAILED",
        approvalId: claimed.id,
        workflowRunId: claimed.workflowRunId ?? undefined,
        sourceUrl: claimed.targetUrl ?? claimed.targetRef ?? undefined,
        metadata: { error: message },
      });

      return {
        mode: decision.mode,
        result: message,
        requiresUserAction: false,
      };
    }
  }
}
