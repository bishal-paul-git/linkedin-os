export type TenantId = string;

export type CapabilityMode =
  | "AVAILABLE_OFFICIAL"
  | "AVAILABLE_ASSISTED"
  | "AVAILABLE_BROWSER_READ"
  | "RESTRICTED_PARTNER"
  | "UNAVAILABLE"
  | "BLOCKED_BY_POLICY";

export type CapabilityHealth = "HEALTHY" | "DEGRADED" | "UNAVAILABLE" | "UNKNOWN";

export type ActionType =
  | "SEND_DM"
  | "REPLY_DM"
  | "SEND_CONNECTION"
  | "ACCEPT_CONNECTION"
  | "DECLINE_CONNECTION"
  | "COMMENT"
  | "REACT"
  | "PUBLISH_POST"
  | "PUBLISH_PAGE_POST";

export type ApprovalState = "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";
export type ExecutionState = "NOT_READY" | "READY" | "RUNNING" | "SUCCEEDED" | "FAILED" | "BLOCKED";

export type NetworkState =
  | "UNKNOWN"
  | "NOT_CONNECTED"
  | "INVITED"
  | "CONNECTED"
  | "DECLINED"
  | "WITHDRAWN";

export type RelationshipStage =
  | "DISCOVERED"
  | "QUALIFIED"
  | "APPROVED"
  | "PREPARED"
  | "ENGAGED"
  | "ACTIVE"
  | "OPPORTUNITY"
  | "NOT_INTERESTED"
  | "DORMANT";

export interface Capability {
  tenantId: TenantId;
  capability: string;
  mode: CapabilityMode;
  adapter?: string | null;
  canExecute: boolean;
  requiresUserAction: boolean;
  health: CapabilityHealth;
  reason?: string | null;
}

export interface RunControl {
  externalActions: "BLOCKED" | "APPROVAL REQUIRED" | "NARROWLY AUTHORIZED";
  connectionRequests: "BLOCKED" | "APPROVAL REQUIRED";
  dmReplySending: "BLOCKED" | "APPROVAL REQUIRED";
  commentsReactions: "BLOCKED" | "APPROVAL REQUIRED";
  postsPagePosts: "BLOCKED" | "APPROVAL REQUIRED";
  approvalQueue: "ACTIVE" | "PAUSED";
  approvedActionExecutor: "BLOCKED" | "APPROVAL REQUIRED";
  stopOnSecurityWarning: boolean;
}

export interface ApprovalAction {
  id: string;
  tenantId: TenantId;
  actionType: ActionType;
  targetUrl?: string | null;
  targetRef?: string | null;
  draftContent?: string | null;
  approvalState: ApprovalState;
  executionState: ExecutionState;
  idempotencyKey: string;
  approvalFingerprint?: string | null;
  approvedFingerprint?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  workflowRunId?: string | null;
}

export type ExecutionReasonCode =
  | "SECURITY_BLOCK"
  | "QUEUE_PAUSED"
  | "NOT_APPROVED"
  | "RUN_CONTROL_BLOCK"
  | "OFFICIAL_ADAPTER"
  | "ASSISTED_ACTION"
  | "PARTNER_RESTRICTED"
  | "CAPABILITY_UNAVAILABLE";

export interface ExecutionDecision {
  allowed: boolean;
  mode: CapabilityMode;
  adapter?: string | null;
  requiresUserAction: boolean;
  reason: string;
  reasonCode: ExecutionReasonCode;
}
