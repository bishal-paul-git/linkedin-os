# Reviewed security exceptions

## Callable SECURITY DEFINER RPCs

Supabase's advisor reports authenticated-callable `SECURITY DEFINER` functions for:

- `public.li_bootstrap_workspace`
- `public.li_set_integration_secret`
- `public.li_zernio_sync_accounts`
- `public.li_zernio_sync_external_posts`
- `public.li_zernio_sync_account_analytics`

These are intentional. Browser roles must not receive direct Vault-secret access, unrestricted HTTP-extension privileges, or the ability to bypass the first-workspace RLS bootstrap cycle.

### Workspace bootstrap controls

`li_bootstrap_workspace`:

- requires `auth.uid()`;
- never accepts a user/owner ID as an input parameter;
- always assigns the first OWNER membership to the calling authenticated user;
- uses static SQL;
- creates only one caller-owned tenant/workspace per invocation;
- normal tenant RLS applies immediately after bootstrap.

### Zernio integration controls

All Zernio RPCs:

- use `search_path = ''`;
- require `auth.uid()`;
- verify tenant ownership/access internally;
- revoke EXECUTE from PUBLIC and `anon`;
- grant EXECUTE only to `authenticated`;
- never return a decrypted provider credential;
- store only a Vault UUID reference in `li_integrations`.

Credential and provider-sync operations require **tenant Owner/Admin**.

`li_zernio_sync_accounts`, `li_zernio_sync_external_posts`, and `li_zernio_sync_account_analytics` are provider-read/sync operations. They do not publish, edit, delete, DM, connect, or manage invitations.

The analytics sync may write normalized internal post/metric snapshots after reading Zernio, but does not create public LinkedIn content.

### Verification completed

- owner/admin Vault round-trip succeeded with rollback-only synthetic data;
- plaintext credential was absent from the integration row;
- normal MEMBER was rejected from credential storage;
- normal MEMBER was rejected from external-post sync;
- normal MEMBER was rejected from account-analytics sync;
- QA first-workspace bootstrap succeeded and produced exactly one OWNER membership.

Re-review these exceptions if the secret architecture, exposed Supabase schemas, or tenant-role model changes.
