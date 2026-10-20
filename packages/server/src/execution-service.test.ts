import test from "node:test";
import assert from "node:assert/strict";
import { ExecutionService } from "./execution-service.ts";
import type { ApprovalAction, Capability, RunControl } from "../../core/src/index.ts";

const approval: ApprovalAction = {
  id: "a1",
  tenantId: "t1",
  actionType: "SEND_CONNECTION",
  targetUrl: "https://www.linkedin.com/in/example",
  approvalState: "APPROVED",
  executionState: "READY",
  idempotencyKey: "connection:1",
  approvalFingerprint: "fp",
  approvedFingerprint: "fp",
};

const runControl: RunControl = {
  externalActions: "APPROVAL REQUIRED",
  connectionRequests: "APPROVAL REQUIRED",
  dmReplySending: "APPROVAL REQUIRED",
  commentsReactions: "APPROVAL REQUIRED",
  postsPagePosts: "APPROVAL REQUIRED",
  approvalQueue: "ACTIVE",
  approvedActionExecutor: "APPROVAL REQUIRED",
  stopOnSecurityWarning: true,
};

const officialCapability: Capability = {
  tenantId: "t1",
  capability: "SEND_CONNECTION",
  mode: "AVAILABLE_OFFICIAL",
  adapter: "test-adapter",
  canExecute: true,
  requiresUserAction: false,
  health: "HEALTHY",
};

function makeRepos(overrides: Record<string, unknown> = {}) {
  const updates: Array<Record<string, unknown>> = [];
  return {
    updates,
    transaction: async (fn: () => Promise<unknown>) => fn(),
    createTenant: async () => { throw new Error("unused"); },
    createOwnerMembership: async () => {},
    createRunControl: async () => {},
    createDefaultConfig: async () => {},
    createDefaultCapabilities: async () => {},
    createDefaultAgentSettings: async () => {},
    createDefaultWorkflowSettings: async () => {},
    getRunControl: async () => runControl,
    listCapabilities: async () => [officialCapability],
    hasBlockingSecurityEvent: async () => false,
    getApproval: async () => approval,
    updateApproval: async (_tenantId: string, _approvalId: string, patch: Record<string, unknown>) => {
      updates.push(patch);
    },
    hasSucceededIdempotencyKey: async () => false,
    claimApprovalForExecution: async () => ({ ...approval, executionState: "RUNNING" }),
    createWorkflowRun: async () => { throw new Error("unused"); },
    finishWorkflowRun: async () => {},
    appendActivity: async () => {},
    ...overrides,
  };
}

test("atomic claim prevents a second worker from executing", async () => {
  const repos = makeRepos({ claimApprovalForExecution: async () => null });
  const adapters = {
    get: async () => ({
      id: "test-adapter",
      tenantId: "t1",
      listCapabilities: async () => [officialCapability],
      healthCheck: async () => ({ ok: true }),
      execute: async () => ({ ok: true, result: "sent" }),
    }),
  };

  const service = new ExecutionService(repos as never, adapters);
  const result = await service.execute({ tenantId: "t1", approvalId: "a1" });
  assert.equal(result.mode, "CONCURRENT_SKIP");
});

test("adapter exceptions become FAILED instead of leaving RUNNING", async () => {
  const repos = makeRepos();
  const adapters = {
    get: async () => ({
      id: "test-adapter",
      tenantId: "t1",
      listCapabilities: async () => [officialCapability],
      healthCheck: async () => ({ ok: true }),
      execute: async () => { throw new Error("provider failure"); },
    }),
  };

  const service = new ExecutionService(repos as never, adapters);
  const result = await service.execute({ tenantId: "t1", approvalId: "a1" });

  assert.equal(result.result, "provider failure");
  assert.equal(
    repos.updates.some((u) => u.executionState === "FAILED"),
    true,
  );
});
