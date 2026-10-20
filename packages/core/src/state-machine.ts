const connectionTransitions: Record<string, Set<string>> = {
  "NOT CONNECTED": new Set(["DISCOVERED", "DO NOT CONTACT"]),
  DISCOVERED: new Set(["QUALIFIED", "NOT INTERESTED", "DORMANT", "DO NOT CONTACT"]),
  QUALIFIED: new Set(["APPROVED", "CONNECTION PREPARED", "NOT INTERESTED", "DORMANT", "DO NOT CONTACT"]),
  APPROVED: new Set(["CONNECTION PREPARED", "QUALIFIED", "DO NOT CONTACT"]),
  "CONNECTION PREPARED": new Set(["INVITED", "QUALIFIED", "DO NOT CONTACT"]),
  INVITED: new Set(["ACCEPTED", "DORMANT", "DO NOT CONTACT"]),
  ACCEPTED: new Set(["CONVERSATION STARTED", "ACTIVE", "DORMANT", "DO NOT CONTACT"]),
  "CONVERSATION STARTED": new Set(["ACTIVE", "OPPORTUNITY", "DORMANT", "DO NOT CONTACT"]),
  ACTIVE: new Set(["OPPORTUNITY", "DORMANT", "DO NOT CONTACT"]),
  OPPORTUNITY: new Set(["ACTIVE", "DORMANT", "DO NOT CONTACT"]),
  "NOT INTERESTED": new Set(["DORMANT", "DO NOT CONTACT"]),
  DORMANT: new Set(["ACTIVE", "DO NOT CONTACT"]),
  "DO NOT CONTACT": new Set(),
};

export function canTransitionConnection(from: string, to: string): boolean {
  if (from === to) return true;
  return connectionTransitions[from]?.has(to) ?? false;
}
