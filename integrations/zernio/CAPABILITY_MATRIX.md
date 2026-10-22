# Zernio ↔ LinkedIn capability matrix

| LinkedIn OS capability | Zernio coverage | LinkedIn OS mode |
|---|---|---|
| Personal profile publishing | Supported | AVAILABLE_OFFICIAL when bound |
| Organization Page publishing | Supported | AVAILABLE_OFFICIAL when bound |
| Scheduling posts | Supported by Zernio | Workflow adapter feature |
| Post analytics | Supported, scope/account dependent | AVAILABLE_OFFICIAL when verified |
| Organization Page comments | Supported by Zernio API for organization accounts | Separate Page-comments capability |
| Direct messages | Not available for LinkedIn through third-party API | UNAVAILABLE / assisted |
| Send connection request | Not available through Zernio | UNAVAILABLE / assisted |
| Accept/decline invitation | Not available through Zernio | UNAVAILABLE / assisted |
| Check relationship with a specific person | Not exposed as an individual relationship lookup | UNAVAILABLE / assisted |
| Prospect discovery / arbitrary people search | Not a Zernio publishing capability | Use another data adapter |
| Read arbitrary LinkedIn feed | Not a general Zernio feed capability | Browser/user-assisted or another authorized source |

## Connector vs API

The installed ChatGPT Zernio connector exposes the tools currently packaged for that connector. The public Zernio REST API may expose additional endpoints.

LinkedIn OS must use the capability actually available in its current runtime, not infer capability from another runtime.

## Current integration rule

Zernio is a **publishing + owned-account analytics/comments provider**, not a substitute for LinkedIn prospecting, connections, invitations or DMs.
