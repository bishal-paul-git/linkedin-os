# LinkedIn Official Setup

## Status

The repo contains a first-party LinkedIn adapter and OAuth routes.

This integration is **code-ready but not credential-connected** until a LinkedIn Developer App is configured.

Current self-service target:

- Sign in with LinkedIn using OpenID Connect
- Share on LinkedIn

Requested scopes:

- `openid`
- `profile`
- `email`
- `w_member_social`

The self-service adapter does **not** claim support for:

- LinkedIn DMs
- connection requests
- invitation accept/decline
- arbitrary member feed reading
- arbitrary prospect discovery

Those stay restricted, assisted, or separate-provider capabilities.

## Developer App

Create/use a LinkedIn Developer App associated with the appropriate organization.

Enable products:

1. Sign in with LinkedIn using OpenID Connect
2. Share on LinkedIn

Configure an authorized redirect URL matching:

`https://linkedin-os-delta.vercel.app/auth/linkedin/callback`

For preview/local environments use an explicitly registered redirect URL; LinkedIn redirect URLs must match the Developer App configuration.

## Server environment variables

Required:

- `LINKEDIN_CLIENT_ID`
- `LINKEDIN_CLIENT_SECRET`

Optional override:

- `LINKEDIN_REDIRECT_URI`

Never prefix the client secret with `NEXT_PUBLIC_`.
Never commit either credential.

## OAuth flow

`/auth/linkedin/start`

1. requires an authenticated LinkedIn OS workspace user;
2. creates/finds the tenant's `linkedin-official` integration record;
3. creates a cryptographically random OAuth state;
4. stores state/integration/tenant/redirect values in short-lived HttpOnly cookies;
5. redirects to LinkedIn authorization.

`/auth/linkedin/callback`

1. requires the existing LinkedIn OS session;
2. validates OAuth state;
3. exchanges the authorization code server-side;
4. reads OIDC userinfo;
5. stores the access token in Supabase Vault;
6. stores only the Vault reference and non-secret identity metadata in normal integration records;
7. registers `READ_MEMBER_IDENTITY`.

## Publishing guard

A successful OIDC login does **not** automatically register `PUBLISH_MEMBER_POST`.

LinkedIn OIDC `sub` is treated as an OIDC subject identifier, not assumed to be a LinkedIn Person URN.

Direct personal publishing requires all of:

- a healthy OAuth access token;
- `w_member_social`;
- a verified member author Person URN;
- an explicitly selected publishing transport;
- Approval Queue approval;
- Run Control authorization;
- a healthy adapter.

Until that identity is verified, direct publishing stays disabled and Zernio/assisted publishing can remain available separately.

## Publishing transports in the package

The client supports:

### `ugcPosts`

Matches LinkedIn's current self-service Share on LinkedIn guide.

### `posts`

Supports LinkedIn's current versioned Posts API shape and requires a `Linkedin-Version` value in `YYYYMM` form.

The web product does not choose a publishing transport automatically. Validate the real Developer App's provisioned access before enabling direct execution.

## Community Management

Community Management is a later approval/application layer, not assumed by this integration.

If approved, add organization/Page capabilities as separately registered capabilities. Do not silently expand the self-service adapter.

Potential later capabilities include:

- organization post publishing;
- organization post reading;
- Page comments/reactions;
- Page analytics/followers;
- approved member analytics where granted.

## Security

- OAuth access tokens are encrypted in Supabase Vault.
- LinkedIn client secret stays server-side.
- browser code never receives the client secret.
- OAuth state is checked before token exchange.
- integration access is tenant-scoped.
- token storage is Owner/Admin-only.
- OAuth identity connection never overrides Run Control or Approval Queue.
