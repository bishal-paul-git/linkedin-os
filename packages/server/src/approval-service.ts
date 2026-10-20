import type { PlatformRepositories } from "./repositories.ts";

export class ApprovalService {
  constructor(private readonly repos: PlatformRepositories) {}

  async decide(input: {
    tenantId: string;
    approvalId: string;
    decision: "APPROVED" | "REJECTED";
    userId: string;
  }): Promise<void> {
    const approval = await this.repos.getApproval(input.tenantId, input.approvalId);
    if (!approval) throw new Error("Approval not found.");

    if (approval.approvalState !== "PENDING") {
      throw new Error(`Approval cannot be decided from state ${approval.approvalState}.`);
    }

    await this.repos.updateApproval(input.tenantId, input.approvalId, {
      approvalState: input.decision,
      executionState: input.decision === "APPROVED" ? "READY" : "NOT_READY",
      approvedBy: input.decision === "APPROVED" ? input.userId : null,
      approvedAt: input.decision === "APPROVED" ? new Date().toISOString() : null,
      approvedFingerprint: input.decision === "APPROVED"
        ? approval.approvalFingerprint ?? null
        : null,
    });

    await this.repos.appendActivity({
      tenantId: input.tenantId,
      agent: "APPROVAL",
      action: "APPROVAL_DECISION",
      reason: input.decision,
      result: "SUCCEEDED",
      approvalId: input.approvalId,
    });
  }
}
