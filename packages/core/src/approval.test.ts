import test from "node:test";
import assert from "node:assert/strict";
import {
  approvalContentMatchesDecision,
  isExecutableApproval,
} from "./approval.ts";
import type { ApprovalAction } from "./types.ts";

const base: ApprovalAction = {
  id: "a1",
  tenantId: "t1",
  actionType: "COMMENT",
  targetUrl: "https://www.linkedin.com/feed/update/1",
  draftContent: "Useful comment",
  approvalState: "APPROVED",
  executionState: "READY",
  idempotencyKey: "comment:1",
  approvalFingerprint: "fp",
  approvedFingerprint: "fp",
};

test("approved content must still match", () => {
  assert.equal(approvalContentMatchesDecision(base), true);
  assert.equal(
    approvalContentMatchesDecision({ ...base, approvalFingerprint: "changed" }),
    false,
  );
});

test("stale approval is not executable", () => {
  assert.equal(isExecutableApproval({ ...base, approvedFingerprint: null }), false);
});
