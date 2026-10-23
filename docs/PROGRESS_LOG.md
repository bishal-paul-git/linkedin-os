# Progress Log

Canonical implementation history for LinkedIn OS. Update this file whenever a material feature, migration, production fix, integration change, security decision, or blocker changes.

## 2026-10-23 — product control + preview + operations pass

### Public preview

Built a safe anonymous preview at:

- https://linkedin-os-delta.vercel.app/dashboard

Rules:

- anonymous users see demo/sample data only;
- no tenant CRM, Supabase rows, LinkedIn data, Zernio data or secrets are exposed;
- private routes remain authenticated;
- signed-in users continue to see their real workspace data.

Key commit:

- `07874c73f343df730e41f786b90c88f65ef59db1` — safe public dashboard preview.

### Relationship product refinements

Built:

- contact-level relationship timeline;
- linked identities;
- conversations/tasks/opportunities/approvals/content/audit history on one contact page;
- evidence-first opportunity pipeline board;
- safe stage updates.

### Zernio read-only layer

Built and verified:

- provider account discovery;
- encrypted key storage through Supabase Vault;
- personal + organization LinkedIn account bindings;
- external LinkedIn post discovery/import;
- owned-post store;
- account/post analytics snapshots;
- best-time and posting-frequency snapshots;
- read-only organization Page comment monitoring;
- Owner/Admin-only provider sync operations.

No LinkedIn post, comment, reaction, DM, connection request, invitation action or other public LinkedIn write was performed during these build/review passes.

### Workflow controls

Built:

- workflow mode editor;
- enabled/disabled control;
- max-items-per-run configuration;
- operator notes;
- manual run button;
- editable interval schedules;
- pause/enable;
- delete schedule.

Allowed workflow modes remain:

- READ_ONLY
- PREPARE_ONLY
- APPROVAL_GATED
- DISABLED

Workflow settings do not bypass Run Control, Approval Queue, capability resolution or security blockers.

### Notification preferences

Migration:

- `database/017_notification_preferences.sql`

Built:

- per-user notification preferences;
- approval alerts;
- workflow-failure alerts;
- security alerts;
- opportunity alerts;
- daily-summary preference;
- quiet-hour preference;
- preferred future channels: IN_APP / EMAIL / DISCORD.

Important:

- IN_APP is the baseline stored preference;
- Email and Discord are preferences only until delivery adapters are connected;
- the UI does not claim delivery is active.

RLS verification:

- QA owner can create/update and read own preference row;
- unrelated authenticated identity sees zero preference rows.

### External capability blockers

Still not solved by Zernio/public LinkedIn APIs:

- personal LinkedIn DMs;
- connection request sending;
- invitation accept/decline;
- exact person relationship-state lookup;
- arbitrary LinkedIn feed reading;
- arbitrary prospect discovery.

Safe alternatives remain:

- official LinkedIn APIs where approved;
- licensed B2B prospect-data provider;
- authenticated browser / ChatGPT Work for narrow assisted operations;
- manual completion + reconciliation.

## Logging rule

For every future material build:

1. commit code/migration/docs to GitHub;
2. record migration order when schema changes;
3. run CI;
4. verify Vercel production for web changes;
5. run RLS/security tests for auth/data changes;
6. update CURRENT_STATUS, ROADMAP and this progress log;
7. never put credentials, private relationship data, connector sessions or user secrets in this public repository.
