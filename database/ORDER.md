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
10. `rls.sql`
11. `009_zernio_integration.sql`
12. `010_zernio_hardening.sql`
13. `011_fix_workspace_bootstrap.sql`
14. `012_social_posts_and_zernio_external_sync.sql`
15. `013_social_post_fk_indexes.sql`
16. `014_zernio_account_analytics.sql`
17. `015_zernio_read_sync_admin_only.sql`
18. `016_zernio_page_comment_monitoring.sql`

Then run:

- `database/tests/001_invariants.sql`
- `database/tests/002_rls_isolation.sql`

Why RLS precedes the Zernio migration: `009_zernio_integration.sql` creates policies that call the private tenant-access helpers defined by `rls.sql`.

Do not expose a frontend until RLS and its isolation tests pass.
