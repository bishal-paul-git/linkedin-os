# Connector Strategy

LinkedIn OS uses adapters rather than hard-coding one integration.

## Adapter categories

### Identity

Purpose: authenticate the tenant and identify the LinkedIn member.

Preferred path: LinkedIn OAuth / OpenID Connect.

### Social publishing

Purpose: personal posts/comments/reactions and Page content.

Preferred path: official LinkedIn APIs when the application/tenant has the required permission.

### Network / connections

Purpose: list connections, invitations, acceptance state, send/withdraw invitation.

Preferred path: LinkedIn partner APIs where approved.

Fallback: assisted workflow with exact prepared action and user-completed LinkedIn step.

### Messaging

Purpose: read/send LinkedIn messages.

Preferred path: approved LinkedIn communications access where available.

Fallback: CRM-assisted drafting and user-completed send.

### Prospect data

Purpose: discover relevant companies/people without unauthorized scraping.

Use licensed/authorized data providers or user-provided data. Keep providers replaceable.

### CRM / memory

Adapters may include:

- Google Sheets
- Supabase/Postgres
- customer CRM
- internal database

## Adapter contract

Every adapter declares:

- adapter id;
- tenant connection id;
- capabilities;
- read/write permissions;
- auth state;
- expiry/refresh state;
- rate/error state;
- whether user approval is required;
- health status.

The workflow engine asks the Capability Resolver which adapter may perform the requested action.
