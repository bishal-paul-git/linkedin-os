import test from "node:test";
import assert from "node:assert/strict";
import { resolveExecution } from "./capability-resolver.ts";
import type { ApprovalAction, Capability, RunControl } from "./types.ts";

const action: ApprovalAction = {
  id: "a1",
  tenantId: "t1",
  actionType: "SEND_CONNECTION",
  targetUrl: "https://www.linkedin.com/in/example",
  approvalState: "APPROVED",
  executionState: "READY",
  idempotencyKey: "t1:send-connection:1",
  approvalFingerprint: "same",
  approvedFingerprint: "same",
};

const rc: RunControl = {
  externalActions: "APPROVAL REQUIRED",
  connectionRequests: "APPROVAL REQUIRED",
  dmReplySending: "APPROVAL REQUIRED",
  commentsReactions: "APPROVAL REQUIRED",
  postsPagePosts: "APPROVAL REQUIRED",
  approvalQueue: "ACTIVE",
  approvedActionExecutor: "APPROVAL REQUIRED",
  stopOnSecurityWarning: true,
};

test("prefers a healthy official adapter", () => {
  const capabilities: Capability[] = [
    {
      tenantId: "t1",
      capability: "SEND_CONNECTION",
      mode: "AVAILABLE_ASSISTED",
      adapter: "manual",
      canExecute: false,
      requiresUserAction: true,
      health: "HEALTHY",
    },
    {
      tenantId: "t1",
      capability: "SEND_CONNECTION",
      mode: "AVAILABLE_OFFICIAL",
      adapter: "official",
      canExecute: true,
      requiresUserAction: false,
      health: "HEALTHY",
    },
  ];

  const result = resolveExecution({ action, capabilities, runControl: rc });
  assert.equal(result.mode, "AVAILABLE_OFFICIAL");
  assert.equal(result.adapter, "official");
  assert.equal(result.reasonCode, "OFFICIAL_ADAPTER");
});

test("falls back to assisted when official adapter is degraded", () => {
  const capabilities: Capability[] = [
    {
      tenantId: "t1",
      capability: "SEND_CONNECTION",
      mode: "AVAILABLE_OFFICIAL",
      adapter: "official",
      canExecute: true,
      requiresUserAction: false,
      health: "DEGRADED",
    },
    {
      tenantId: "t1",
      capability: "SEND_CONNECTION",
      mode: "AVAILABLE_ASSISTED",
      adapter: "manual",
      canExecute: false,
      requiresUserAction: true,
      health: "HEALTHY",
    },
  ];

  const result = resolveExecution({ action, capabilities, runControl: rc });
  assert.equal(result.mode, "AVAILABLE_ASSISTED");
  assert.equal(result.requiresUserAction, true);
});

test("security state overrides approval", () => {
  const result = resolveExecution({
    action,
    capabilities: [],
    runControl: rc,
    securityBlocked: true,
  });
  assert.equal(result.allowed, false);
  assert.equal(result.reasonCode, "SECURITY_BLOCK");
});

test("run control blocks the action before capability selection", () => {
  const result = resolveExecution({
    action,
    capabilities: [],
    runControl: { ...rc, connectionRequests: "BLOCKED" },
  });
  assert.equal(result.reasonCode, "RUN_CONTROL_BLOCK");
});
