# LinkedIn API Access Plan

## Phase 1 — self-service

Build/test:

- OpenID Connect member authentication
- Share on LinkedIn member publishing
- exact capability registration based on proven access

Status: implementation scaffold built; Developer App credentials still required.

## Phase 2 — Community Management Development Tier

Apply only after the product demo and policies are ready.

Demonstrate:

- tenant onboarding
- LinkedIn account connection
- exact approvals
- safe personal/Page content workflow
- analytics surfaces
- audit trail
- Run Control
- revocation/re-auth behavior

Do not claim approval until LinkedIn grants it.

## Phase 3 — production/standard access

If LinkedIn approves the requested Community Management features, register them as explicit adapter capabilities. Keep Zernio as a multi-social/provider fallback where useful.

## Restricted capabilities

Keep these outside the normal self-service adapter unless LinkedIn explicitly grants access under the required agreement/program:

- messaging
- invitations
- connection management
- restricted member/feed reads

## Prospect discovery

Do not build prospecting around LinkedIn scraping.

Use the provider-neutral `li_prospect_candidates` staging model and connect a licensed B2B data adapter. The Network agent remains responsible for dedupe, evidence-based qualification and CRM promotion.

## Decision rule

A capability is executable only when all are true:

1. provider/API permission exists;
2. tenant integration is healthy;
3. capability is registered as executable;
4. Run Control allows the action;
5. exact Approval Queue action is approved;
6. no blocking security event exists.
