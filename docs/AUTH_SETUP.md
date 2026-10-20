# Auth Setup

LinkedIn OS uses Supabase email/password Auth and cookie-based SSR sessions.

## Already built

- sign in
- sign up
- auth callback
- protected routes
- workspace onboarding
- tenant bootstrap
- RLS-backed tenant isolation

Production app:

https://linkedin-os-delta.vercel.app

## Supabase dashboard URL setting

The connected Supabase management tool does not expose Auth URL Configuration.

If email confirmation is enabled, set the Supabase Auth Site URL / allowed redirect URL to the production app, including:

`https://linkedin-os-delta.vercel.app/auth/callback`

The app sends signup confirmation back to:

`<current-origin>/auth/callback?next=/onboarding`

Existing confirmed users can sign in immediately.

## Security rule

Never place a service-role key in the browser or in a `NEXT_PUBLIC_*` variable.

The Vercel app uses only the Supabase project URL and publishable key; RLS authorizes tenant data.
