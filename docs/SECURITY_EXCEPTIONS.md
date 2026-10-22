# Reviewed security exceptions

## Zernio Vault / account-sync RPCs

Supabase's advisor reports callable `SECURITY DEFINER` functions for:

- `public.li_set_integration_secret`
- `public.li_zernio_sync_accounts`
- `public.li_zernio_sync_external_posts`

This is intentional because browser roles must not receive direct Vault-secret access or unrestricted HTTP-extension privileges.

Controls applied:

- `search_path = ''`;
- `auth.uid()` is required;
- tenant-scoped authorization is checked inside each function;
- credential-changing operations require tenant admin; read-only external-post sync requires tenant write access;
- integration ownership is checked by tenant ID;
- EXECUTE is revoked from PUBLIC and `anon`;
- only `authenticated` receives EXECUTE;
- plaintext credentials are never stored in `li_integrations`;
- the public integration row stores only a Vault secret UUID reference;
- account sync is a read-only Zernio GET request;
- external-post sync calls Zernio's read/import endpoint and does not publish, edit or delete LinkedIn content;
- publishing is not performed by any credential/setup/sync RPC.

Verification completed:

- owner/admin Vault round-trip succeeded with rollback-only synthetic data;
- plaintext was absent from the integration row;
- a normal MEMBER was rejected from the credential setter.

Re-review this exception if the secret architecture or exposed Supabase schemas change.
