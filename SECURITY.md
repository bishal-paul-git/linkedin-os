# Security and Account-Safety Policy

LinkedIn OS is designed around approval-gated actions and explicit account-protection boundaries.

## Never commit

Do not store any of the following in this public repository:

- LinkedIn passwords, session cookies, access tokens, or 2FA data
- private CRM links containing sensitive access parameters
- client or prospect data
- private message history
- personal email/phone datasets
- API keys or browser-session exports

## LinkedIn safety

Protect account integrity above throughput.

Never implement or use this project to:

- bypass CAPTCHA, identity verification, rate limits, or access controls;
- imitate human timing for the purpose of avoiding detection;
- rotate accounts, proxies, devices, identities, or sessions to evade restrictions;
- mass-send identical or near-identical DMs, invitations, comments, or reactions;
- repeatedly retry after LinkedIn displays a warning or restriction.

If LinkedIn shows a CAPTCHA, identity verification, unusual-activity warning, invitation restriction, messaging restriction, temporary limitation, or other security checkpoint, stop the affected workflow and require human review.

## Approval boundary

External visible LinkedIn actions require explicit approval by default:

- DMs and replies
- connection requests and invitation decisions
- comments and reactions
- posts and Page posts
- profile/Page changes

Research, classification, drafting, and CRM preparation may run without approval.

## Reporting

If you discover a security issue in the project, do not publish secrets or exploit details in a public issue. Contact the repository owner privately first.
