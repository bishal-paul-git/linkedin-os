# Audit & Retention Policy

## Purpose

Define default retention behavior for LinkedIn OS operational/audit data. This is an application policy; provider-specific legal/compliance requirements may require stricter values.

## Default recommendations

Retain:

- security events: 180 days minimum;
- approval/audit history: 180 days minimum;
- workflow run summaries: 90 days;
- activity log: 180 days;
- analytics snapshots: 180 days;
- raw provider-sync snapshots: 90 days unless needed longer;
- transient test/QA data: remove when no longer needed;
- credentials: no historical plaintext retention; only current encrypted Vault secret.

Relationship CRM records, tasks and opportunities are business records and should not be automatically purged solely by age while the tenant still needs them.

## Deletion principles

- respect tenant deletion requests;
- preserve referential integrity;
- never remove audit evidence needed to explain a still-active approval/execution record;
- never use analytics retention rules to delete core CRM relationship memory;
- do not retain provider secrets in logs.

## Future implementation

Still to build:

- tenant-configurable retention windows;
- scheduled retention worker;
- dry-run report before destructive deletion;
- legal hold / retention override;
- export-before-delete path.

Until the automated worker exists, this file defines policy only and does not claim data is being automatically purged.
