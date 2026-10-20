import {
  hasAlreadySucceeded,
  isExecutableApproval,
  resolveExecution,
  type LinkedInAdapter,
} from "../../core/src/index";
import type { PlatformRepositories } from "./repositories";

export interface AdapterRegistry {
  get(adapterId: string, tenantId: string): Promise<LinkedInAdapter | null>;
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
  }): Promise<{ mode: string; result: string; requiresUserAction?: boolean }> {
    const approval = await this.repos.getApproval(input.tenantId, input.approvalId);
    if (!approval) throw new Error("Approval not found.");

    if (!isExecutableApproval(approval)) {
      throw new Error("Approval is not in an executable state.");
    }

    const alreadySucceeded = await this.repos.hasSucceededIdempotencyKey(
      input.tenantId,
      approval.idempotencyKey,
    );

    if (hasAlreadySucceeded(approval, alreadySucceeded ? new Set([approval.idempotencyKey]) : new Set())) {
      return { mode: "IDEMPOTENT_SKIP", result: "Already succeeded; no duplicate action performed." };
    }

    const runControl = await this.repos.getRunControl(input.tenantId);
    const capabilities = await this.repos.listCapabilities(input.tenantId);
    const decision = resolveExecution({
      action: approval,
      runControl,
      capabilities,
      securityBlocked: input.securityBlocked,
    });

    if (!decision.allowed) {
      await this.repos.updateApproval(input.tenantId, approval.id, {
        executionState: "BLOCKED",
        errorNotes: decision.reason,
      });
      return { mode: decision.mode, result: decision.reason, requiresUserAction: decision.requiresUserAction };
    }

    if (decision.requiresUserAction || decision.mode === "AVAILABLE_ASSISTED") {
      await this.repos.updateApproval(input.tenantId, approval.id, {
        executionState: "READY",
      });
      return {
        mode: decision.mode,
        result: "Prepared for user-completed action.",
        requiresUserAction: true,
      };
    }

    if (!decision.adapter) throw new Error("Executable capability has no adapter.");

    const adapter = await this.adapters.get(decision.adapter, input.tenantId);
    if (!adapter) throw new Error(`Adapter ${decision.adapter} is not registered.`);

    await this.repos.updateApproval(input.tenantId, approval.id, {
      executionState: "RUNNING",
    });

    const result = await adapter.execute(approval);

    await this.repos.updateApproval(input.tenantId, approval.id, {
      executionState: result.ok ? "SUCCEEDED" : result.blocked ? "BLOCKED" : "FAILED",
      result: result.result,
      errorNotes: result.error,
      executedAt: result.ok ? new Date().toISOString() : undefined,
    });

    await this.repos.appendActivity({
      tenantId: input.tenantId,
      agent: "APPROVAL_EXECUTOR",
      action: approval.actionType,
      reason: decision.reason,
      result: result.ok ? "SUCCEEDED" : result.blocked ? "BLOCKED" : "FAILED",
      approvalId: approval.id,
      sourceUrl: approval.targetUrl,
      metadata: result.metadata,
    });

    return {
      mode: decision.mode,
      result: result.result ?? (result.ok ? "Succeeded." : "Failed."),
      requiresUserAction: false,
    };
  }
}
