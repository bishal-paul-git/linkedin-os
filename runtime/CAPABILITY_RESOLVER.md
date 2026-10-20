# Capability Resolver

The Capability Resolver chooses a legal/authorized execution path for the current tenant.

## Input

- tenant id;
- requested action;
- Run Control;
- approval state;
- connected adapters;
- adapter health;
- granted permissions.

## Output

```text
capability
mode
adapter
can_execute
requires_user_action
reason
```

## Resolution order

1. Run Control permits the action.
2. Security state is healthy.
3. Exact approval exists when required.
4. Official authorized API adapter supports the action.
5. Otherwise select assisted/manual mode if available.
6. Otherwise return unavailable.

## Critical rule

Do not fall back from an unavailable official API to browser automation merely to make an action “work.”

Browser use is a separate explicitly configured capability and must remain consistent with platform rules and product policy.
