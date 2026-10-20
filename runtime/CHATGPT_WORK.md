# ChatGPT Work Runtime Adapter

ChatGPT Work is the current browser/runtime surface for account-specific LinkedIn reading and approved execution.

## Use

- load the system instructions;
- connect/read the private CRM;
- use the authorized LinkedIn session;
- run workflow prompts from `work/`;
- persist state to CRM.

## Boundaries

Authentication, 2FA, identity verification, or security checkpoints remain user-controlled.

The runtime must not claim an action succeeded until visible success is verified.
