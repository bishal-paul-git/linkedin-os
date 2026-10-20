# State Model

LinkedIn OS keeps **network state** separate from **relationship stage**. This prevents technical connection state from being confused with sales/networking maturity.

## Network state

`UNKNOWN → NOT_CONNECTED → INVITED → CONNECTED`

Other observed outcomes:

`DECLINED | WITHDRAWN`

Rules:

- only a verified sent invitation moves `NOT_CONNECTED → INVITED`;
- only positive connection evidence moves to `CONNECTED`;
- reconciliation may observe an already-connected person without recreating the invitation history;
- network state does not imply commercial interest.

## Relationship stage

`DISCOVERED → QUALIFIED → APPROVED → PREPARED → ENGAGED → ACTIVE → OPPORTUNITY`

Side states:

`NOT_INTERESTED | DORMANT`

Rules:

- qualification does not mean connected;
- `PREPARED` means an external relationship action is ready/queued, not performed;
- `ENGAGED` means a real relationship interaction exists;
- `OPPORTUNITY` requires evidence, not optimism;
- later stages must not be silently regressed.

## Do Not Contact

`Do Not Contact` is a separate boolean safety/control flag. It is not a network state or relationship stage.

When true, it overrides outbound recommendations and execution.

## Approval lifecycle

`PENDING → APPROVED | REJECTED | EXPIRED`

Approval content is fingerprinted. A substantive edit after approval invalidates the decision and returns the item to `PENDING / NOT_READY`.

## Execution lifecycle

`NOT_READY → READY → RUNNING → SUCCEEDED | FAILED | BLOCKED`

A worker must atomically claim an action before entering `RUNNING`.

## Opportunity lifecycle

`SIGNAL → DISCOVERY → CONVERSATION → MEETING → QUALIFIED → PROPOSAL → NEGOTIATION → WON | LOST | DORMANT`

## Task lifecycle

`TODO → IN PROGRESS → WAITING | BLOCKED → DONE | CANCELLED`

## Core invariants

- preparation does not imply execution;
- approval does not imply execution;
- execution without verified success does not imply success;
- one successful idempotency key must never execute twice;
- security state can block execution regardless of approval;
- network state and relationship stage are independent but related observations.
