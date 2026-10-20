import test from "node:test";
import assert from "node:assert/strict";
import {
  canReconcileObservedNetworkState,
  canTransitionNetworkState,
  canTransitionRelationshipStage,
} from "./state-machine.ts";

test("normal network flow does not skip invitation", () => {
  assert.equal(canTransitionNetworkState("NOT_CONNECTED", "CONNECTED"), false);
  assert.equal(canTransitionNetworkState("NOT_CONNECTED", "INVITED"), true);
});

test("reconciliation may observe an existing connection directly", () => {
  assert.equal(canReconcileObservedNetworkState("NOT_CONNECTED", "CONNECTED"), true);
});

test("relationship stage and network state are independent", () => {
  assert.equal(canTransitionRelationshipStage("QUALIFIED", "PREPARED"), true);
  assert.equal(canTransitionRelationshipStage("QUALIFIED", "OPPORTUNITY"), false);
});
