import type { ApprovalAction } from "./types.ts";

export function approvalFingerprint(action: ApprovalAction): string {
  return [
    action.tenantId,
    action.actionType,
    action.targetUrl ?? "",
    action.targetRef ?? "",
    action.draftContent ?? "",
    action.idempotencyKey,
  ].join("|");
}

export function approvalContentMatchesDecision(action: ApprovalAction): boolean {
  if (action.approvalState !== "APPROVED") return false;
  if (!action.approvalFingerprint || !action.approvedFingerprint) return false;
  return action.approvalFingerprint === action.approvedFingerprint;
}

export function isExecutableApproval(action: ApprovalAction): boolean {
  return approvalContentMatchesDecision(action)
    && (action.executionState === "NOT_READY" || action.executionState === "READY");
}
