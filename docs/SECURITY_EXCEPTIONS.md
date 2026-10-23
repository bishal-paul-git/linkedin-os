# Reviewed security exceptions

## Callable SECURITY DEFINER RPCs

Supabase's advisor reports authenticated-callable `SECURITY DEFINER` functions for several narrow LinkedIn OS operations.

Current reviewed set includes:

- `public.li_bootstrap_workspace`
- `public.li_set_integration_secret`
- `public.li_zernio_sync_accounts`
- `public.li_zernio_sync_external_posts`
- `public.li_zernio_sync_account_analytics`
- `public.li_zernio_sync_page_comments`
- `public.li_create_team_invitation`
- `public.li_preview_team_invitation`
- `public.li_accept_team_invitation`
- `public.li_set_oauth_access_token`

These are intentional. They exist where normal browser RLS cannot safely perform a narrowly privileged operation such as first-workspace bootstrap, Vault secret access, provider-side reads, invite-token lookup or OAuth-token storage.

Common controls:

- `auth.uid()` is required;
- `search_path = ''`;
- PUBLIC and `anon` EXECUTE are revoked where applicable;
- only the minimum authenticated RPC surface is exposed;
- tenant access/role is checked inside the function;
- credentials are never returned decrypted;
- public LinkedIn write capability is never inferred merely because an integration record exists.

## Workspace bootstrap

`li_bootstrap_workspace`:

- does not accept an owner user ID;
- always creates ownership for the authenticated caller;
- exists only to break the first-membership RLS bootstrap cycle;
- normal tenant RLS applies immediately after bootstrap.

QA verification succeeded.

## Zernio integration

Credential/provider-sync operations require tenant Owner/Admin.

Zernio RPCs:

- keep provider credentials in Supabase Vault;
- store only the Vault reference in `li_integrations`;
- perform provider reads/syncs for accounts, owned/external posts, analytics and Page comments;
- do not DM, connect, manage invitations or bypass LinkedIn restrictions.

Verification:

- Vault round trip passed;
- plaintext credential was absent from the integration row;
- normal MEMBER was rejected from credential storage;
- normal MEMBER was rejected from external-post, analytics and Page-comment sync.

## Team invitation RPCs

`li_create_team_invitation`:

- requires tenant Owner/Admin;
- validates role to ADMIN/MEMBER/VIEWER;
- creates a cryptographically random token;
- stores only a SHA-256 token hash;
- revokes older pending invites for the same tenant/email;
- returns the plaintext token only to the creating request.

`li_preview_team_invitation`:

- requires authentication;
- looks up by the token hash;
- returns non-secret workspace/invite metadata only;
- reports whether the signed-in account email matches the invite.

`li_accept_team_invitation`:

- requires authentication;
- verifies token, PENDING status, expiry and signed-in email match;
- creates/reactivates only the invited tenant membership;
- marks the invitation ACCEPTED;
- does not create or elevate ownership.

Rollback verification passed:

- matching-email invite accepted;
- correct VIEWER membership created;
- wrong-email account rejected;
- wrong-email invite remained pending.

## Official LinkedIn OAuth token storage

`li_set_oauth_access_token`:

- requires tenant Owner/Admin;
- operates only on a tenant `linkedin-official` integration;
- stores the OAuth access token in Supabase Vault;
- stores only a Vault UUID reference in the integration row;
- records non-secret OIDC identity metadata/scopes/expiry;
- registers only `READ_MEMBER_IDENTITY`;
- explicitly removes `PUBLISH_MEMBER_POST` for the official adapter until publishing identity is separately verified.

Rollback verification passed:

- normal MEMBER cannot store the OAuth token;
- Owner/Admin token storage uses a Vault reference rather than plaintext;
- identity connection leaves `publishing_ready=false`;
- OIDC connection does not silently register direct publishing.

## Advisor scope

Current Supabase advisor findings outside LinkedIn OS (legacy `gumroad_os`, older `os_*`, `upwork`, campaign views/functions and account-level leaked-password protection) are not changed by this project without explicit authorization.

Unused-index notices on newly created `li_*` tables are informational until real workload exists.

Re-review this document whenever the tenant-role model, secret architecture, exposed schemas or privileged RPC surface changes.
