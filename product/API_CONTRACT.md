# Internal API Contract

The product UI and future external adapters should call a small stable backend API.

## Workspace

- `POST /tenants` — create and bootstrap tenant
- `GET /tenants/:tenantId` — workspace details
- `GET /tenants/:tenantId/health` — integration/capability/workflow health

## Memory

- `GET /tenants/:tenantId/contacts`
- `GET /tenants/:tenantId/contacts/:contactId`
- `GET /tenants/:tenantId/opportunities`
- `GET /tenants/:tenantId/tasks`
- `GET /tenants/:tenantId/activity`

## Approvals

- `GET /tenants/:tenantId/approvals`
- `POST /tenants/:tenantId/approvals/:approvalId/decision`
- `POST /tenants/:tenantId/approvals/:approvalId/execute`

## Workflows

- `GET /tenants/:tenantId/workflows`
- `POST /tenants/:tenantId/workflows/:code/run`
- `GET /tenants/:tenantId/workflow-runs`
- `GET /tenants/:tenantId/schedules`
- `PUT /tenants/:tenantId/schedules/:id`

## Integrations

- `GET /tenants/:tenantId/integrations`
- `GET /tenants/:tenantId/capabilities`
- `POST /tenants/:tenantId/integrations/:provider/connect`
- `POST /tenants/:tenantId/integrations/:provider/recheck`

All endpoints are tenant-scoped and authenticated. The backend derives tenant access from membership; clients never gain cross-tenant access by supplying another tenant ID.
