# Database application order

For a fresh environment apply:

1. `001_tenancy_and_control.sql`
2. `002_relationships_and_workflows.sql`
3. `003_relationship_model_v2.sql`
4. `004_invariants_and_worker_state.sql`
5. `005_indexes.sql`
6. `seed-workflows.sql`
7. `rls.sql` only after the tenant access policy is reviewed/approved

The RLS file is intentionally last because enabling RLS without matching policies can lock clients out, while enabling client grants without RLS can expose tenant data.
