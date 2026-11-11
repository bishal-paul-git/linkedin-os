import {
  isExecutableApproval,
  resolveExecution,
  type LinkedInAdapter,
} from "../../core/src/index.ts";
import type { PlatformRepositories } from "./repositories.ts";

/** Maps an approval action to the SwarmHit usage kind in migration 027. */
function swarmhitUsageKind(
  actionType: string,
): "invite" | "message" | "post_comment" | "post_like" | null {
  switch (actionType) {
    case "SEND_CONNECTION":
      return "invite";
    case "SEND_DM":
    case "REPLY_DM":
      return "message";
    case "COMMENT":
      return "post_comment";
    case "REACT":
      return "post_like";
    default:
      return null;
  }
}

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

      // Best-effort usage recording for SwarmHit sends only, on
      // success only: today's li_swarmhit_usage row (migration 027).
      // Never fails the execution — the send already succeeded.
      if (result.ok && decision.adapter === "swarmhit") {
        const kind = swarmhitUsageKind(claimed.actionType);
        const accountId =
          result.metadata && typeof result.metadata["accountId"] === "string"
            ? (result.metadata["accountId"] as string)
            : null;
        const rateLimit = result.metadata?.["rateLimit"] as
          | { resetAt?: unknown }
          | undefined;
        if (kind && accountId) {
          try {
            await this.repos.recordSwarmhitUsage?.({
              tenantId: input.tenantId,
              accountId,
              kind,
              resetAt:
                typeof rateLimit?.resetAt === "string" ? rateLimit.resetAt : null,
            });
          } catch {
            // Usage recording is best-effort; ignore failures.
          }
        }
      }

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
