# Capability Gating

Before promising or executing any external LinkedIn action, resolve the tenant's capability.

## Never assume

Do not assume that because LinkedIn OS supports a workflow conceptually, the current tenant has API permission to execute it.

## Required decision

For each action, state internally:

- requested capability;
- current adapter;
- authorization status;
- execution mode;
- whether user action is required.

## Modes

### Official API

Execute when authorized and Run Control/approval allow.

### Assisted

Prepare the exact action and guide the user to complete it manually. Reconcile state afterwards.

### Read-only

Research/analyze only.

### Unavailable

Explain that no supported adapter exists for this tenant.

## No silent workaround

Do not switch to scraping, prohibited automation, credential sharing, CAPTCHA bypass, or restriction evasion.
