import type {
  ActionType,
  ApprovalAction,
  Capability,
  ExecutionDecision,
  RunControl,
} from "./types.ts";

const ACTION_CAPABILITY: Record<ActionType, string> = {
  SEND_DM: "SEND_MESSAGE",
  REPLY_DM: "SEND_MESSAGE",
  SEND_CONNECTION: "SEND_CONNECTION",
  ACCEPT_CONNECTION: "MANAGE_INVITATIONS",
  DECLINE_CONNECTION: "MANAGE_INVITATIONS",
  COMMENT: "WRITE_COMMENT",
  REACT: "WRITE_REACTION",
  PUBLISH_POST: "PUBLISH_MEMBER_POST",
  PUBLISH_PAGE_POST: "PUBLISH_PAGE_POST",
};

export function requiredCapabilityForAction(action: ActionType): string {
  return ACTION_CAPABILITY[action];
}

export function isActionAllowedByRunControl(action: ActionType, rc: RunControl): boolean {
  if (rc.externalActions === "BLOCKED" || rc.approvedActionExecutor === "BLOCKED") return false;

  if (action === "SEND_CONNECTION" || action === "ACCEPT_CONNECTION" || action === "DECLINE_CONNECTION") {
    return rc.connectionRequests !== "BLOCKED";
  }
  if (action === "SEND_DM" || action === "REPLY_DM") return rc.dmReplySending !== "BLOCKED";
  if (action === "COMMENT" || action === "REACT") return rc.commentsReactions !== "BLOCKED";
  return rc.postsPagePosts !== "BLOCKED";
}

export function resolveExecution(input: {
  action: ApprovalAction;
  capabilities: Capability[];
  runControl: RunControl;
  securityBlocked?: boolean;
}): ExecutionDecision {
  const { action, capabilities, runControl, securityBlocked = false } = input;

  if (securityBlocked && runControl.stopOnSecurityWarning) {
    return {
      allowed: false,
      mode: "BLOCKED_BY_POLICY",
      requiresUserAction: false,
      reason: "Security state blocks execution.",
      reasonCode: "SECURITY_BLOCK",
    };
  }

  if (runControl.approvalQueue !== "ACTIVE") {
    return {
      allowed: false,
      mode: "BLOCKED_BY_POLICY",
      requiresUserAction: false,
      reason: "Approval Queue is paused.",
      reasonCode: "QUEUE_PAUSED",
    };
  }

  if (action.approvalState !== "APPROVED") {
    return {
      allowed: false,
      mode: "BLOCKED_BY_POLICY",
      requiresUserAction: false,
      reason: "Action is not approved.",
      reasonCode: "NOT_APPROVED",
    };
  }

  if (!isActionAllowedByRunControl(action.actionType, runControl)) {
    return {
      allowed: false,
      mode: "BLOCKED_BY_POLICY",
      requiresUserAction: false,
      reason: "Run Control blocks this action type.",
      reasonCode: "RUN_CONTROL_BLOCK",
    };
  }

  const required = requiredCapabilityForAction(action.actionType);
  const candidates = capabilities.filter((c) => c.capability === required);

  const official = candidates
    .filter((c) => c.mode === "AVAILABLE_OFFICIAL" && c.canExecute && c.health === "HEALTHY")
    .sort((a, b) => (a.adapter ?? "").localeCompare(b.adapter ?? ""))[0];

  if (official) {
    return {
      allowed: true,
      mode: "AVAILABLE_OFFICIAL",
      adapter: official.adapter,
      requiresUserAction: false,
      reason: "Healthy authorized official adapter available.",
      reasonCode: "OFFICIAL_ADAPTER",
    };
  }

  const assisted = candidates
    .filter((c) => c.mode === "AVAILABLE_ASSISTED" && c.health !== "UNAVAILABLE")
    .sort((a, b) => (a.adapter ?? "").localeCompare(b.adapter ?? ""))[0];

  if (assisted) {
    return {
      allowed: true,
      mode: "AVAILABLE_ASSISTED",
      adapter: assisted.adapter,
      requiresUserAction: true,
      reason: assisted.reason ?? "Final action requires the user.",
      reasonCode: "ASSISTED_ACTION",
    };
  }

  const restricted = candidates.find((c) => c.mode === "RESTRICTED_PARTNER");
  if (restricted) {
    return {
      allowed: false,
      mode: "RESTRICTED_PARTNER",
      adapter: restricted.adapter,
      requiresUserAction: true,
      reason: restricted.reason ?? "Capability requires approved partner access.",
      reasonCode: "PARTNER_RESTRICTED",
    };
  }

  return {
    allowed: false,
    mode: "UNAVAILABLE",
    requiresUserAction: true,
    reason: "No healthy supported tenant capability is configured for this action.",
    reasonCode: "CAPABILITY_UNAVAILABLE",
  };
}
