import type { ApprovalAction } from "./types";

export function isExecutableApproval(action: ApprovalAction): boolean {
  return action.approvalState === "APPROVED"
    && (action.executionState === "NOT_READY" || action.executionState === "READY");
}

export function hasAlreadySucceeded(
  action: ApprovalAction,
  succeededIdempotencyKeys: Set<string>,
): boolean {
  return succeededIdempotencyKeys.has(action.idempotencyKey);
}

export function approvalFingerprint(action: ApprovalAction): string {
  return [
    action.tenantId,
    action.actionType,
    action.targetUrl,
    action.draftContent ?? "",
    action.idempotencyKey,
  ].join("|");
}
