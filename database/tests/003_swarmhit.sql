-- SwarmHit smoke check (025-027). Static checks only.
--
-- NOT run against live Supabase. Safe to run by hand after applying
-- 025, 026 and 027: the queries below only read information_schema and
-- pg_constraint, and write nothing.
--
-- Checklist (verify by eye against the migration files):
--   1. li_capabilities mode check includes AVAILABLE_PROVIDER.
--   2. Tables exist: li_swarmhit_senders, li_swarmhit_usage,
--      li_swarmhit_webhook_deliveries.
--   3. li_run_control has the swarmhit_enabled column (default false).
--   4. Functions exist: li_swarmhit_sync_accounts,
--      li_swarmhit_record_webhook, li_swarmhit_opt_in,
--      li_swarmhit_record_usage. li_set_integration_secret (009) is
--      reused for the API key — no separate SwarmHit secret function.
--   5. li_swarmhit_senders has unique(tenant_id, swarmhit_account_id);
--      li_swarmhit_usage has unique(tenant_id, sender_id, usage_date);
--      li_swarmhit_webhook_deliveries has unique(tenant_id, delivery_id).
--   6. RLS is enabled on all three new tables.
--   7. No live SwarmHit call is made by any of these checks.

-- 1. Mode list (expect one row whose definition contains AVAILABLE_PROVIDER).
select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.li_capabilities'::regclass
  and contype = 'c';

-- 2. New tables (expect 3 rows).
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('li_swarmhit_senders', 'li_swarmhit_usage', 'li_swarmhit_webhook_deliveries')
order by table_name;

-- 3. Opt-in column (expect 1 row, default false).
select column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'li_run_control'
  and column_name = 'swarmhit_enabled';

-- 4. New functions (expect 4 rows).
select proname
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in ('li_swarmhit_sync_accounts', 'li_swarmhit_record_webhook', 'li_swarmhit_opt_in', 'li_swarmhit_record_usage')
order by proname;

-- 5. Uniqueness (expect 3 rows).
select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in ('li_swarmhit_senders', 'li_swarmhit_usage', 'li_swarmhit_webhook_deliveries')
  and indexdef ilike '%unique%'
order by tablename, indexname;

-- 6. RLS enabled (expect 3 rows, all true).
select relname as table_name, relrowsecurity as rls_enabled
from pg_class
where relnamespace = 'public'::regnamespace
  and relname in ('li_swarmhit_senders', 'li_swarmhit_usage', 'li_swarmhit_webhook_deliveries')
order by relname;
