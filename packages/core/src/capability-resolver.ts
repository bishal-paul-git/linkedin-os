import type {
  ActionType,
  ApprovalAction,
  Capability,
  ExecutionDecision,
  RunControl,
} from "./types";

const actionCapability: Record<ActionType, string> = {
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

function actionAllowedByRunControl(action: ActionType, rc: RunControl): boolean {
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
    return { allowed: false, mode: "BLOCKED_BY_POLICY", requiresUserAction: false, reason: "Security state blocks execution." };
  }

  if (runControl.approvalQueue !== "ACTIVE") {
    return { allowed: false, mode: "BLOCKED_BY_POLICY", requiresUserAction: false, reason: "Approval Queue is paused." };
  }

  if (action.approvalState !== "APPROVED") {
    return { allowed: false, mode: "BLOCKED_BY_POLICY", requiresUserAction: false, reason: "Action is not approved." };
  }

  if (!actionAllowedByRunControl(action.actionType, runControl)) {
    return { allowed: false, mode: "BLOCKED_BY_POLICY", requiresUserAction: false, reason: "Run Control blocks this action type." };
  }

  const required = actionCapability[action.actionType];
  const candidates = capabilities
    .filter((c) => c.capability === required && c.health !== "UNAVAILABLE")
    .sort((a, b) => Number(b.canExecute) - Number(a.canExecute));

  const official = candidates.find((c) => c.mode === "AVAILABLE_OFFICIAL" && c.canExecute);
  if (official) {
    return {
      allowed: true,
      mode: official.mode,
      adapter: official.adapter,
      requiresUserAction: false,
      reason: "Authorized official adapter available.",
    };
  }

  const assisted = candidates.find((c) => c.mode === "AVAILABLE_ASSISTED");
  if (assisted) {
    return {
      allowed: true,
      mode: assisted.mode,
      adapter: assisted.adapter,
      requiresUserAction: true,
      reason: assisted.reason ?? "Final action requires the user.",
    };
  }

  const restricted = candidates.find((c) => c.mode === "RESTRICTED_PARTNER");
  if (restricted) {
    return {
      allowed: false,
      mode: restricted.mode,
      adapter: restricted.adapter,
      requiresUserAction: true,
      reason: restricted.reason ?? "Capability requires approved partner access.",
    };
  }

  return {
    allowed: false,
    mode: "UNAVAILABLE",
    requiresUserAction: true,
    reason: "No supported tenant capability is configured for this action.",
  };
}
