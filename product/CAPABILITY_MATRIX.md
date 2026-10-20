# Capability Matrix

The system must decide what is possible for the current tenant before choosing an execution path.

## Capability states

- `AVAILABLE_OFFICIAL` — supported through an authorized official API/integration.
- `AVAILABLE_ASSISTED` — system can research/draft/queue, but user performs the final LinkedIn action.
- `AVAILABLE_BROWSER_READ` — browser may be used for supported reading/navigation where permitted.
- `RESTRICTED_PARTNER` — possible only for approved LinkedIn partner/API programs.
- `UNAVAILABLE` — no supported path configured.
- `BLOCKED_BY_POLICY` — intentionally not used.

## LinkedIn capability table

| Capability | Default product path | Notes |
| --- | --- | --- |
| Sign in / identify user | Official OAuth | OpenID Connect profile/email |
| Create personal post | Official API where permission exists | `w_member_social` |
| Comment / like as member | Official API where permission exists | write permission available; reading broad member feed may be restricted |
| Company Page posting | Community Management API | vetted access / role dependent |
| Company Page comments/reactions | Community Management API | vetted access |
| Read 1st-degree connections | Restricted partner API | not generally open |
| Send connection invitation | Restricted partner API | Invitations API is partner-restricted |
| Detect invitation acceptance | Restricted partner API or assisted reconciliation | partner API can expose invitation state |
| Send LinkedIn message | Restricted communications API | not generally open |
| Read LinkedIn inbox | Restricted / no general open consumer API | use supported partner access if available |
| Prospect discovery | External licensed data/search adapters | do not rely on scraping LinkedIn |
| CRM / approvals / memory | Fully supported by LinkedIn OS | storage-provider agnostic |

## Product rule

Never label a feature “automated” unless the active adapter actually supports it.

The UI and agent should expose the current execution mode:

- Automatic via official API
- Assisted/manual final action
- Read-only
- Not available
