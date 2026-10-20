import type { NetworkState, RelationshipStage } from "./types.ts";

const NETWORK_TRANSITIONS: Record<NetworkState, ReadonlySet<NetworkState>> = {
  UNKNOWN: new Set(["NOT_CONNECTED", "INVITED", "CONNECTED"]),
  NOT_CONNECTED: new Set(["INVITED"]),
  INVITED: new Set(["CONNECTED", "DECLINED", "WITHDRAWN"]),
  CONNECTED: new Set(),
  DECLINED: new Set(["NOT_CONNECTED"]),
  WITHDRAWN: new Set(["NOT_CONNECTED"]),
};

const RELATIONSHIP_TRANSITIONS: Record<RelationshipStage, ReadonlySet<RelationshipStage>> = {
  DISCOVERED: new Set(["QUALIFIED", "NOT_INTERESTED", "DORMANT"]),
  QUALIFIED: new Set(["APPROVED", "PREPARED", "NOT_INTERESTED", "DORMANT"]),
  APPROVED: new Set(["PREPARED", "QUALIFIED"]),
  PREPARED: new Set(["ENGAGED", "QUALIFIED", "DORMANT"]),
  ENGAGED: new Set(["ACTIVE", "OPPORTUNITY", "DORMANT"]),
  ACTIVE: new Set(["OPPORTUNITY", "DORMANT"]),
  OPPORTUNITY: new Set(["ACTIVE", "DORMANT"]),
  NOT_INTERESTED: new Set(["DORMANT"]),
  DORMANT: new Set(["ACTIVE"]),
};

export function canTransitionNetworkState(from: NetworkState, to: NetworkState): boolean {
  if (from === to) return true;
  return NETWORK_TRANSITIONS[from].has(to);
}

export function canReconcileObservedNetworkState(from: NetworkState, observed: NetworkState): boolean {
  if (from === observed) return true;
  if (observed === "CONNECTED") {
    return from === "UNKNOWN" || from === "NOT_CONNECTED" || from === "INVITED";
  }
  return canTransitionNetworkState(from, observed);
}

export function canTransitionRelationshipStage(
  from: RelationshipStage,
  to: RelationshipStage,
): boolean {
  if (from === to) return true;
  return RELATIONSHIP_TRANSITIONS[from].has(to);
}
