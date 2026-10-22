# Zernio integration

LinkedIn OS supports Zernio through two distinct runtime paths.

## 1. ChatGPT / MCP connector

When the user connects Zernio to ChatGPT, the assistant can use the authenticated Zernio MCP tools available in that conversation.

This credential/session belongs to the ChatGPT connector. It is **not automatically available to the deployed LinkedIn OS web app**.

Do not copy connector tokens into the repository.

## 2. Standalone Zernio REST adapter

For the deployed product, use a dedicated Zernio API key. Store it encrypted in Supabase Vault and keep only its Vault reference in `li_integrations.token_ref`.

The direct adapter uses:

- `GET /v1/accounts` for read-only account discovery/health;
- `POST /v1/posts` only for an exact approved publishing action.

The adapter never advertises connection requests, invitation management or DMs.

## Multi-account binding

Connected provider accounts are normalized into `li_integration_accounts`.

This allows one tenant to bind both:

- a LinkedIn personal profile;
- one or more LinkedIn organization Pages.

Account-specific capability metadata is separate from the tenant-level capability registry.

## Safety

Publishing remains subject to:

1. exact Approval Queue approval;
2. unchanged approval fingerprint;
3. Run Control;
4. a healthy Zernio capability;
5. atomic execution claim;
6. idempotency.

No connector or API capability overrides Run Control.
