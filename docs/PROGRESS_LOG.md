# Progress Log

Canonical implementation history for LinkedIn OS. Update this file whenever a material feature, migration, production fix, integration change, security decision, or blocker changes.

## 2026-10-23 — product control + preview + operations pass

Built:

- safe anonymous dashboard preview using sample data only;
- contact relationship timeline;
- evidence-first opportunity pipeline;
- Zernio read-only account/post/analytics/Page-comment layer;
- workflow mode/limit editor and schedule controls;
- per-user notification preferences;
- backup/recovery + audit-retention documentation.

Earlier verified implementation checkpoint:

- `28df44fcf7d01b68c6bcde7c2bcce8a8bb8f3031`
- GitHub CI: SUCCESS
- Vercel: READY

## 2026-10-23 — v1.6 team, notification, Network and official-adapter pass

### Team workspaces

Migrations:

- `018_team_invitations.sql`
- `019_fix_team_invitation_acceptance.sql`

Built:

- secure invite-link creation;
- hashed invite tokens;
- ADMIN/MEMBER/VIEWER roles;
- expiry/revoke;
- matching-email acceptance;
- invite-aware login/signup/auth callback;
- workspace selection/switcher.

A real acceptance SQL ambiguity was discovered by the rollback test and fixed before release.

Rollback tests passed:

- matching email accepted;
- membership created with intended role;
- wrong email rejected;
- wrong-email invite unchanged.

### In-app notifications

Migration:

- `020_in_app_notifications.sql`

Built:

- tenant/user-scoped in-app notifications;
- approval/workflow/security/opportunity fan-out;
- unread count;
- notification centre;
- read/dismiss/mark-all-read.

Rollback test passed:

- tenant member received synthetic opportunity notification;
- unrelated authenticated identity saw zero tenant notifications.

### Network / prospecting

Migration:

- `021_prospect_candidate_staging.sql`

Built:

- Network workspace;
- up to 100-row manual/batch import;
- SHA-256 dedupe;
- fit review + score + evidence;
- Strong/Good-only qualification/promotion;
- CRM promotion without LinkedIn external action;
- typed `ProspectDataAdapter`;
- `@linkedin-os/prospecting` registry with health checks, normalization, URL cleanup, dedupe and bounded results.

No LinkedIn scraping is used.

### LinkedIn official self-service

Migration:

- `022_linkedin_official_oauth.sql`

Package:

- `@linkedin-os/linkedin-official`

Built:

- OAuth authorization URL;
- authorization-code exchange;
- OIDC userinfo;
- OAuth start/callback routes;
- CSRF state cookies;
- Vault access-token storage;
- identity-only capability registration;
- explicit personal publishing clients for `ugcPosts` and versioned `posts`;
- unsupported DM/connection/invitation actions hard-blocked.

Security rollback test passed:

- non-admin OAuth token storage denied;
- admin token stored by Vault reference;
- identity connected with `publishing_ready=false`;
- official direct publishing capability not registered after identity-only OAuth.

Current blocker:

- LinkedIn Developer App credentials are not configured/proven in Vercel;
- member author Person URN/real publishing transport are not verified;
- therefore direct official publishing is intentionally not live.

### Prospect-provider foundation

Built:

- provider-neutral typed search contract;
- candidate normalization;
- LinkedIn profile URL normalization;
- candidate dedupe;
- provider health check;
- search limit clamp to 100.

A real licensed B2B provider is still to be connected.

### Verification

Verified combined implementation head:

- `677ca665ad19cd4fbc4d5c0a7e8aba617a2d673a`

Results:

- TypeScript: PASS
- unit tests: **30/30 PASS**
- Next.js production build: PASS
- GitHub CI: SUCCESS

Supabase advisor review:

- no new LinkedIn OS RLS/FK defect found;
- callable invite/OAuth `SECURITY DEFINER` RPCs are intentional and documented;
- unrelated legacy project warnings were not modified.

### Safety boundary

No LinkedIn post, DM, connection request, invitation action, reaction or comment was sent during this build pass.

Unsupported/restricted LinkedIn actions remain approval-gated assisted/unavailable rather than simulated.

## Logging rule

For every future material build:

1. commit code/migrations/docs to GitHub;
2. update `database/ORDER.md` for schema changes;
3. run CI;
4. verify Vercel for web changes;
5. run RLS/security tests for auth/data changes;
6. update CURRENT_STATUS, ROADMAP, PROGRESS_LOG and CONTINUATION_HANDOVER;
7. never commit credentials, private relationship data, connector sessions or secrets.
