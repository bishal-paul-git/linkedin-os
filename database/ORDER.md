# Database application order

For a fresh environment apply:

1. `001_tenancy_and_control.sql`
2. `002_relationships_and_workflows.sql`
3. `003_relationship_model_v2.sql`
4. `004_invariants_and_worker_state.sql`
5. `005_indexes.sql`
6. `seed-workflows.sql`
7. `006_app_rpcs_and_scheduler.sql`
8. `007_execution_rpcs.sql`
9. `008_internal_workflow_processor.sql`
10. `009_zernio_integration.sql`
11. `rls.sql`

Then run:

- `database/tests/001_invariants.sql`
- `database/tests/002_rls_isolation.sql`

RLS is intentionally applied after schema/functions are present. Do not expose a frontend until RLS and its isolation tests pass.
