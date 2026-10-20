# State Model

## Connection lifecycle

`NOT CONNECTED → DISCOVERED → QUALIFIED → APPROVED → CONNECTION PREPARED → INVITED → ACCEPTED → CONVERSATION STARTED → ACTIVE → OPPORTUNITY`

Side states:

`NOT INTERESTED | DORMANT | DO NOT CONTACT`

Not every relationship must pass every state.

## Approval lifecycle

`PENDING → APPROVED | REJECTED | EXPIRED`

Execution lifecycle:

`NOT_READY → READY → RUNNING → SUCCEEDED | FAILED | BLOCKED`

## Opportunity lifecycle

`SIGNAL → DISCOVERY → CONVERSATION → MEETING → QUALIFIED → PROPOSAL → NEGOTIATION → WON | LOST | DORMANT`

## Task lifecycle

`TODO → IN PROGRESS → WAITING | BLOCKED → DONE | CANCELLED`

## Transition rules

- preparation does not imply execution;
- approval does not imply execution;
- execution without verified visible success does not imply success;
- later relationship states must not be regressed by routine reviews;
- DO NOT CONTACT overrides outbound transitions;
- a security blocker may move execution to BLOCKED regardless of approval.
