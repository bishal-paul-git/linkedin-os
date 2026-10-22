# Zernio setup

LinkedIn OS supports Zernio in two different runtimes.

## ChatGPT connector

A user may connect Zernio directly to ChatGPT. That connector session can be used by the assistant only through the Zernio tools exposed in the current ChatGPT runtime.

The connector credential is not exported to LinkedIn OS and must never be copied into the public repository.

## Standalone web product

The deployed LinkedIn OS app uses a dedicated Zernio REST API key.

Setup:

1. Create/sign in to a LinkedIn OS workspace.
2. Open **Integrations**.
3. Create a dedicated Zernio API key in Zernio.
4. Paste it into the password-only Zernio field.
5. LinkedIn OS stores the key in Supabase Vault.
6. The product performs a read-only `GET /v1/accounts` sync.
7. Connected LinkedIn personal and organization accounts are normalized into `li_integration_accounts`.
8. Verified capabilities are registered in `li_capabilities`.

Saving the key does not mark the provider healthy. The integration remains `DISCONNECTED` until the read-only account sync succeeds.

## Supported role

Zernio is used as an owned-account publishing/analytics provider.

LinkedIn OS may register, when verified:

- personal profile publishing;
- organization Page publishing;
- post analytics;
- owned-post/account discovery;
- organization Page comment capabilities where the active Zernio runtime exposes them.

## Not supplied by Zernio

Do not map these to the Zernio publishing adapter:

- LinkedIn direct messages;
- connection-request sending;
- invitation accept/decline;
- exact person-to-person connection-state lookup;
- arbitrary people/prospect discovery;
- arbitrary LinkedIn feed reading.

Those remain assisted/browser-based or require another authorized provider.

## Action safety

A Zernio publishing capability never bypasses:

- Run Control;
- Approval Queue;
- approval fingerprint checks;
- security blockers;
- atomic execution claim;
- idempotency.

The integration setup/sync flow itself is read-only against Zernio and does not publish.
