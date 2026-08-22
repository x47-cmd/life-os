-- =========================================================
-- LIFE OS — Version 1 Row Level Security
-- Migration: 002_v1_rls.sql
--
-- Purpose:
-- Lock down every LIFE OS V1 user-owned table.
--
-- Security model:
--   Authenticated Owner
--        +
--   MFA / AAL2
--        +
--   Row Ownership
--        =
--   Authorized Access
--
-- IMPORTANT:
-- - Anonymous access is denied.
-- - Normal runtime does not use service_role.
-- - AI never receives arbitrary database access.
-- =========================================================


-- =========================================================
-- 1. ENABLE AND FORCE ROW LEVEL SECURITY
-- =========================================================

alter table public.profiles
  enable row level security;

alter table public.profiles
  force row level security;


alter table public.income_sources
  enable row level security;

alter table public.income_sources
  force row level security;


alter table public.budget_items
  enable row level security;

alter table public.budget_items
  force row level security;


alter table public.monthly_snapshots
  enable row level security;

alter table public.monthly_snapshots
  force row level security;


alter table public.investment_assets
  enable row level security;

alter table public.investment_assets
  force row level security;


alter table public.investment_transactions
  enable row level security;

alter table public.investment_transactions
  force row level security;


alter table public.goals
  enable row level security;

alter table public.goals
  force row level security;


alter table public.projects
  enable row level security;

alter table public.projects
  force row level security;


alter table public.tasks
  enable row level security;

alter table public.tasks
  force row level security;


alter table public.learning_items
  enable row level security;

alter table public.learning_items
  force row level security;


alter table public.career_items
  enable row level security;

alter table public.career_items
  force row level security;


alter table public.memory_items
  enable row level security;

alter table public.memory_items
  force row level security;


alter table public.ai_recommendations
  enable row level security;

alter table public.ai_recommendations
  force row level security;


alter table public.audit_logs
  enable row level security;

alter table public.audit_logs
  force row level security;


-- =========================================================
-- 2. REMOVE DEFAULT TABLE ACCESS
-- =========================================================

revoke all privileges
on table public.profiles
from public, anon, authenticated;


revoke all privileges
on table public.income_sources
from public, anon, authenticated;


revoke all privileges
on table public.budget_items
from public, anon, authenticated;


revoke all privileges
on table public.monthly_snapshots
from public, anon, authenticated;


revoke all privileges
on table public.investment_assets
from public, anon, authenticated;


revoke all privileges
on table public.investment_transactions
from public, anon, authenticated;


revoke all privileges
on table public.goals
from public, anon, authenticated;


revoke all privileges
on table public.projects
from public, anon, authenticated;


revoke all privileges
on table public.tasks
from public, anon, authenticated;


revoke all privileges
on table public.learning_items
from public, anon, authenticated;


revoke all privileges
on table public.career_items
from public, anon, authenticated;


revoke all privileges
on table public.memory_items
from public, anon, authenticated;


revoke all privileges
on table public.ai_recommendations
from public, anon, authenticated;


revoke all privileges
on table public.audit_logs
from public, anon, authenticated;


-- =========================================================
-- 3. GRANT MINIMUM REQUIRED PRIVILEGES
-- =========================================================

grant
  select,
  insert,
  update,
  delete
on table public.profiles
to authenticated;


grant
  select,
  insert,
  update,
  delete
on table public.income_sources
to authenticated;


grant
  select,
  insert,
  update,
  delete
on table public.budget_items
to authenticated;


grant
  select,
  insert,
  update,
  delete
on table public.monthly_snapshots
to authenticated;


grant
  select,
  insert,
  update,
  delete
on table public.investment_assets
to authenticated;


grant
  select,
  insert,
  update,
  delete
on table public.investment_transactions
to authenticated;


grant
  select,
  insert,
  update,
  delete
on table public.goals
to authenticated;


grant
  select,
  insert,
  update,
  delete
on table public.projects
to authenticated;


grant
  select,
  insert,
  update,
  delete
on table public.tasks
to authenticated;


grant
  select,
  insert,
  update,
  delete
on table public.learning_items
to authenticated;


grant
  select,
  insert,
  update,
  delete
on table public.career_items
to authenticated;


grant
  select,
  insert,
  update,
  delete
on table public.memory_items
to authenticated;


grant
  select,
  insert,
  update,
  delete
on table public.ai_recommendations
to authenticated;


-- Audit history is append-oriented.
--
-- Authenticated application access receives only:
--
-- SELECT
-- INSERT

grant
  select,
  insert
on table public.audit_logs
to authenticated;


-- =========================================================
-- 4. PROFILES — REQUIRE AAL2
-- =========================================================

create policy "profiles_require_aal2"
on public.profiles
as restrictive
for all
to authenticated
using (
  ((select auth.jwt()) ->> 'aal') = 'aal2'
)
with check (
  ((select auth.jwt()) ->> 'aal') = 'aal2'
);


-- =========================================================
-- 5. PROFILES — OWNERSHIP POLICIES
-- =========================================================

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (
  user_id = (select auth.uid())
);


create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (
  user_id = (select auth.uid())
);


create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (
  user_id = (select auth.uid())
)
with check (
  user_id = (select auth.uid())
);


create policy "profiles_delete_own"
on public.profiles
for delete
to authenticated
using (
  user_id = (select auth.uid())
);


-- =========================================================
-- 6. INCOME SOURCES — REQUIRE AAL2
-- =========================================================

create policy "income_sources_require_aal2"
on public.income_sources
as restrictive
for all
to authenticated
using (
  ((select auth.jwt()) ->> 'aal') = 'aal2'
)
with check (
  ((select auth.jwt()) ->> 'aal') = 'aal2'
);


-- =========================================================
-- 7. INCOME SOURCES — OWNERSHIP POLICIES
-- =========================================================

create policy "income_sources_select_own"
on public.income_sources
for select
to authenticated
using (
  user_id = (select auth.uid())
);


create policy "income_sources_insert_own"
on public.income_sources
for insert
to authenticated
with check (
  user_id = (select auth.uid())
);


create policy "income_sources_update_own"
on public.income_sources
for update
to authenticated
using (
  user_id = (select auth.uid())
)
with check (
  user_id = (select auth.uid())
);


create policy "income_sources_delete_own"
on public.income_sources
for delete
to authenticated
using (
  user_id = (select auth.uid())
);


-- =========================================================
-- 8. BUDGET ITEMS — REQUIRE AAL2
-- =========================================================

create policy "budget_items_require_aal2"
on public.budget_items
as restrictive
for all
to authenticated
using (
  ((select auth.jwt()) ->> 'aal') = 'aal2'
)
with check (
  ((select auth.jwt()) ->> 'aal') = 'aal2'
);


-- =========================================================
-- 9. BUDGET ITEMS — OWNERSHIP POLICIES
-- =========================================================

create policy "budget_items_select_own"
on public.budget_items
for select
to authenticated
using (
  user_id = (select auth.uid())
);


create policy "budget_items_insert_own"
on public.budget_items
for insert
to authenticated
with check (
  user_id = (select auth.uid())
);


create policy "budget_items_update_own"
on public.budget_items
for update
to authenticated
using (
  user_id = (select auth.uid())
)
with check (
  user_id = (select auth.uid())
);


create policy "budget_items_delete_own"
on public.budget_items
for delete
to authenticated
using (
  user_id = (select auth.uid())
);


-- =========================================================
-- 10. MONTHLY SNAPSHOTS — REQUIRE AAL2
-- =========================================================

create policy "monthly_snapshots_require_aal2"
on public.monthly_snapshots
as restrictive
for all
to authenticated
using (
  ((select auth.jwt()) ->> 'aal') = 'aal2'
)
with check (
  ((select auth.jwt()) ->> 'aal') = 'aal2'
);


-- =========================================================
-- 11. MONTHLY SNAPSHOTS — OWNERSHIP POLICIES
-- =========================================================

create policy "monthly_snapshots_select_own"
on public.monthly_snapshots
for select
to authenticated
using (
  user_id = (select auth.uid())
);


create policy "monthly_snapshots_insert_own"
on public.monthly_snapshots
for insert
to authenticated
with check (
  user_id = (select auth.uid())
);


create policy "monthly_snapshots_update_own"
on public.monthly_snapshots
for update
to authenticated
using (
  user_id = (select auth.uid())
)
with check (
  user_id = (select auth.uid())
);


create policy "monthly_snapshots_delete_own"
on public.monthly_snapshots
for delete
to authenticated
using (
  user_id = (select auth.uid())
);


-- =========================================================
-- 12. INVESTMENT ASSETS — REQUIRE AAL2
-- =========================================================

create policy "investment_assets_require_aal2"
on public.investment_assets
as restrictive
for all
to authenticated
using (
  ((select auth.jwt()) ->> 'aal') = 'aal2'
)
with check (
  ((select auth.jwt()) ->> 'aal') = 'aal2'
);


-- =========================================================
-- 13. INVESTMENT ASSETS — OWNERSHIP POLICIES
-- =========================================================

create policy "investment_assets_select_own"
on public.investment_assets
for select
to authenticated
using (
  user_id = (select auth.uid())
);


create policy "investment_assets_insert_own"
on public.investment_assets
for insert
to authenticated
with check (
  user_id = (select auth.uid())
);


create policy "investment_assets_update_own"
on public.investment_assets
for update
to authenticated
using (
  user_id = (select auth.uid())
)
with check (
  user_id = (select auth.uid())
);


create policy "investment_assets_delete_own"
on public.investment_assets
for delete
to authenticated
using (
  user_id = (select auth.uid())
);


-- =========================================================
-- 14. INVESTMENT TRANSACTIONS — REQUIRE AAL2
-- =========================================================

create policy "investment_transactions_require_aal2"
on public.investment_transactions
as restrictive
for all
to authenticated
using (
  ((select auth.jwt()) ->> 'aal') = 'aal2'
)
with check (
  ((select auth.jwt()) ->> 'aal') = 'aal2'
);


-- =========================================================
-- 15. INVESTMENT TRANSACTIONS — OWNERSHIP POLICIES
-- =========================================================

create policy "investment_transactions_select_own"
on public.investment_transactions
for select
to authenticated
using (
  user_id = (select auth.uid())
);


create policy "investment_transactions_insert_own"
on public.investment_transactions
for insert
to authenticated
with check (
  user_id = (select auth.uid())
);


create policy "investment_transactions_update_own"
on public.investment_transactions
for update
to authenticated
using (
  user_id = (select auth.uid())
)
with check (
  user_id = (select auth.uid())
);


create policy "investment_transactions_delete_own"
on public.investment_transactions
for delete
to authenticated
using (
  user_id = (select auth.uid())
);


-- =========================================================
-- 16. GOALS — REQUIRE AAL2
-- =========================================================

create policy "goals_require_aal2"
on public.goals
as restrictive
for all
to authenticated
using (
  ((select auth.jwt()) ->> 'aal') = 'aal2'
)
with check (
  ((select auth.jwt()) ->> 'aal') = 'aal2'
);


-- =========================================================
-- 17. GOALS — OWNERSHIP POLICIES
-- =========================================================

create policy "goals_select_own"
on public.goals
for select
to authenticated
using (
  user_id = (select auth.uid())
);


create policy "goals_insert_own"
on public.goals
for insert
to authenticated
with check (
  user_id = (select auth.uid())
);


create policy "goals_update_own"
on public.goals
for update
to authenticated
using (
  user_id = (select auth.uid())
)
with check (
  user_id = (select auth.uid())
);


create policy "goals_delete_own"
on public.goals
for delete
to authenticated
using (
  user_id = (select auth.uid())
);


-- =========================================================
-- 18. PROJECTS — REQUIRE AAL2
-- =========================================================

create policy "projects_require_aal2"
on public.projects
as restrictive
for all
to authenticated
using (
  ((select auth.jwt()) ->> 'aal') = 'aal2'
)
with check (
  ((select auth.jwt()) ->> 'aal') = 'aal2'
);


-- =========================================================
-- 19. PROJECTS — OWNERSHIP POLICIES
-- =========================================================

create policy "projects_select_own"
on public.projects
for select
to authenticated
using (
  user_id = (select auth.uid())
);


create policy "projects_insert_own"
on public.projects
for insert
to authenticated
with check (
  user_id = (select auth.uid())
);


create policy "projects_update_own"
on public.projects
for update
to authenticated
using (
  user_id = (select auth.uid())
)
with check (
  user_id = (select auth.uid())
);


create policy "projects_delete_own"
on public.projects
for delete
to authenticated
using (
  user_id = (select auth.uid())
);


-- =========================================================
-- 20. TASKS — REQUIRE AAL2
-- =========================================================

create policy "tasks_require_aal2"
on public.tasks
as restrictive
for all
to authenticated
using (
  ((select auth.jwt()) ->> 'aal') = 'aal2'
)
with check (
  ((select auth.jwt()) ->> 'aal') = 'aal2'
);


-- =========================================================
-- 21. TASKS — OWNERSHIP POLICIES
-- =========================================================

create policy "tasks_select_own"
on public.tasks
for select
to authenticated
using (
  user_id = (select auth.uid())
);


create policy "tasks_insert_own"
on public.tasks
for insert
to authenticated
with check (
  user_id = (select auth.uid())
);


create policy "tasks_update_own"
on public.tasks
for update
to authenticated
using (
  user_id = (select auth.uid())
)
with check (
  user_id = (select auth.uid())
);


create policy "tasks_delete_own"
on public.tasks
for delete
to authenticated
using (
  user_id = (select auth.uid())
);


-- =========================================================
-- 22. LEARNING ITEMS — REQUIRE AAL2
-- =========================================================

create policy "learning_items_require_aal2"
on public.learning_items
as restrictive
for all
to authenticated
using (
  ((select auth.jwt()) ->> 'aal') = 'aal2'
)
with check (
  ((select auth.jwt()) ->> 'aal') = 'aal2'
);


-- =========================================================
-- 23. LEARNING ITEMS — OWNERSHIP POLICIES
-- =========================================================

create policy "learning_items_select_own"
on public.learning_items
for select
to authenticated
using (
  user_id = (select auth.uid())
);


create policy "learning_items_insert_own"
on public.learning_items
for insert
to authenticated
with check (
  user_id = (select auth.uid())
);


create policy "learning_items_update_own"
on public.learning_items
for update
to authenticated
using (
  user_id = (select auth.uid())
)
with check (
  user_id = (select auth.uid())
);


create policy "learning_items_delete_own"
on public.learning_items
for delete
to authenticated
using (
  user_id = (select auth.uid())
);


-- =========================================================
-- 24. CAREER ITEMS — REQUIRE AAL2
-- =========================================================

create policy "career_items_require_aal2"
on public.career_items
as restrictive
for all
to authenticated
using (
  ((select auth.jwt()) ->> 'aal') = 'aal2'
)
with check (
  ((select auth.jwt()) ->> 'aal') = 'aal2'
);


-- =========================================================
-- 25. CAREER ITEMS — OWNERSHIP POLICIES
-- =========================================================

create policy "career_items_select_own"
on public.career_items
for select
to authenticated
using (
  user_id = (select auth.uid())
);


create policy "career_items_insert_own"
on public.career_items
for insert
to authenticated
with check (
  user_id = (select auth.uid())
);


create policy "career_items_update_own"
on public.career_items
for update
to authenticated
using (
  user_id = (select auth.uid())
)
with check (
  user_id = (select auth.uid())
);


create policy "career_items_delete_own"
on public.career_items
for delete
to authenticated
using (
  user_id = (select auth.uid())
);


-- =========================================================
-- 26. MEMORY ITEMS — REQUIRE AAL2
-- =========================================================

create policy "memory_items_require_aal2"
on public.memory_items
as restrictive
for all
to authenticated
using (
  ((select auth.jwt()) ->> 'aal') = 'aal2'
)
with check (
  ((select auth.jwt()) ->> 'aal') = 'aal2'
);


-- =========================================================
-- 27. MEMORY ITEMS — OWNERSHIP POLICIES
-- =========================================================

create policy "memory_items_select_own"
on public.memory_items
for select
to authenticated
using (
  user_id = (select auth.uid())
);


create policy "memory_items_insert_own"
on public.memory_items
for insert
to authenticated
with check (
  user_id = (select auth.uid())
);


create policy "memory_items_update_own"
on public.memory_items
for update
to authenticated
using (
  user_id = (select auth.uid())
)
with check (
  user_id = (select auth.uid())
);


create policy "memory_items_delete_own"
on public.memory_items
for delete
to authenticated
using (
  user_id = (select auth.uid())
);


-- =========================================================
-- 28. AI RECOMMENDATIONS — REQUIRE AAL2
-- =========================================================

create policy "ai_recommendations_require_aal2"
on public.ai_recommendations
as restrictive
for all
to authenticated
using (
  ((select auth.jwt()) ->> 'aal') = 'aal2'
)
with check (
  ((select auth.jwt()) ->> 'aal') = 'aal2'
);


-- =========================================================
-- 29. AI RECOMMENDATIONS — OWNERSHIP POLICIES
-- =========================================================

create policy "ai_recommendations_select_own"
on public.ai_recommendations
for select
to authenticated
using (
  user_id = (select auth.uid())
);


create policy "ai_recommendations_insert_own"
on public.ai_recommendations
for insert
to authenticated
with check (
  user_id = (select auth.uid())
);


create policy "ai_recommendations_update_own"
on public.ai_recommendations
for update
to authenticated
using (
  user_id = (select auth.uid())
)
with check (
  user_id = (select auth.uid())
);


create policy "ai_recommendations_delete_own"
on public.ai_recommendations
for delete
to authenticated
using (
  user_id = (select auth.uid())
);


-- =========================================================
-- 30. AUDIT LOGS — REQUIRE AAL2
-- =========================================================

create policy "audit_logs_require_aal2"
on public.audit_logs
as restrictive
for all
to authenticated
using (
  ((select auth.jwt()) ->> 'aal') = 'aal2'
)
with check (
  ((select auth.jwt()) ->> 'aal') = 'aal2'
);


-- =========================================================
-- 31. AUDIT LOGS — OWNERSHIP POLICIES
-- =========================================================

create policy "audit_logs_select_own"
on public.audit_logs
for select
to authenticated
using (
  user_id = (select auth.uid())
);


create policy "audit_logs_insert_own"
on public.audit_logs
for insert
to authenticated
with check (
  user_id = (select auth.uid())
);


-- =========================================================
-- 32. SECURITY VERIFICATION — RLS
-- =========================================================

do $$
declare
  missing_rls integer;
begin

  select count(*)
  into missing_rls
  from (
    values
      ('profiles'),
      ('income_sources'),
      ('budget_items'),
      ('monthly_snapshots'),
      ('investment_assets'),
      ('investment_transactions'),
      ('goals'),
      ('projects'),
      ('tasks'),
      ('learning_items'),
      ('career_items'),
      ('memory_items'),
      ('ai_recommendations'),
      ('audit_logs')
  ) as expected(table_name)
  left join pg_class c
    on c.relname = expected.table_name
  left join pg_namespace n
    on n.oid = c.relnamespace
   and n.nspname = 'public'
  where
    c.oid is null
    or c.relrowsecurity is not true
    or c.relforcerowsecurity is not true;

  if missing_rls <> 0 then
    raise exception
      'LIFE OS security verification failed: % table(s) missing required RLS.',
      missing_rls;
  end if;

end;
$$;


-- =========================================================
-- 33. SECURITY VERIFICATION — AAL2 POLICIES
-- =========================================================

do $$
declare
  aal2_policy_count integer;
begin

  select count(*)
  into aal2_policy_count
  from pg_policies
  where schemaname = 'public'
    and policyname in (
      'profiles_require_aal2',
      'income_sources_require_aal2',
      'budget_items_require_aal2',
      'monthly_snapshots_require_aal2',
      'investment_assets_require_aal2',
      'investment_transactions_require_aal2',
      'goals_require_aal2',
      'projects_require_aal2',
      'tasks_require_aal2',
      'learning_items_require_aal2',
      'career_items_require_aal2',
      'memory_items_require_aal2',
      'ai_recommendations_require_aal2',
      'audit_logs_require_aal2'
    );

  if aal2_policy_count <> 14 then
    raise exception
      'LIFE OS security verification failed: expected 14 AAL2 policies, found %.',
      aal2_policy_count;
  end if;

end;
$$;


-- =========================================================
-- 34. SECURITY VERIFICATION — ANONYMOUS ACCESS
-- =========================================================

do $$
declare
  unsafe_table_count integer;
begin

  select count(*)
  into unsafe_table_count
  from (
    values
      ('profiles'),
      ('income_sources'),
      ('budget_items'),
      ('monthly_snapshots'),
      ('investment_assets'),
      ('investment_transactions'),
      ('goals'),
      ('projects'),
      ('tasks'),
      ('learning_items'),
      ('career_items'),
      ('memory_items'),
      ('ai_recommendations'),
      ('audit_logs')
  ) as expected(table_name)
  where
    has_table_privilege(
      'anon',
      format('public.%I', expected.table_name),
      'SELECT'
    )
    or
    has_table_privilege(
      'anon',
      format('public.%I', expected.table_name),
      'INSERT'
    )
    or
    has_table_privilege(
      'anon',
      format('public.%I', expected.table_name),
      'UPDATE'
    )
    or
    has_table_privilege(
      'anon',
      format('public.%I', expected.table_name),
      'DELETE'
    )
    or
    has_table_privilege(
      'anon',
      format('public.%I', expected.table_name),
      'TRUNCATE'
    )
    or
    has_table_privilege(
      'anon',
      format('public.%I', expected.table_name),
      'REFERENCES'
    )
    or
    has_table_privilege(
      'anon',
      format('public.%I', expected.table_name),
      'TRIGGER'
    );

  if unsafe_table_count <> 0 then
    raise exception
      'LIFE OS security verification failed: anon retains access to % table(s).',
      unsafe_table_count;
  end if;

end;
$$;


-- =========================================================
-- 35. SECURITY VERIFICATION — AUTHENTICATED EXCESS ACCESS
-- =========================================================
--
-- Authenticated application users need DML only.
--
-- They must never retain infrastructure-level table
-- privileges such as TRUNCATE, REFERENCES or TRIGGER.
-- =========================================================

do $$
declare
  unsafe_table_count integer;
begin

  select count(*)
  into unsafe_table_count
  from (
    values
      ('profiles'),
      ('income_sources'),
      ('budget_items'),
      ('monthly_snapshots'),
      ('investment_assets'),
      ('investment_transactions'),
      ('goals'),
      ('projects'),
      ('tasks'),
      ('learning_items'),
      ('career_items'),
      ('memory_items'),
      ('ai_recommendations'),
      ('audit_logs')
  ) as expected(table_name)
  where
    has_table_privilege(
      'authenticated',
      format('public.%I', expected.table_name),
      'TRUNCATE'
    )
    or
    has_table_privilege(
      'authenticated',
      format('public.%I', expected.table_name),
      'REFERENCES'
    )
    or
    has_table_privilege(
      'authenticated',
      format('public.%I', expected.table_name),
      'TRIGGER'
    );

  if unsafe_table_count <> 0 then
    raise exception
      'LIFE OS security verification failed: authenticated retains excess privileges on % table(s).',
      unsafe_table_count;
  end if;

end;
$$;


-- =========================================================
-- 36. SECURITY VERIFICATION — AUDIT IMMUTABILITY
-- =========================================================

do $$
begin

  if has_table_privilege(
    'authenticated',
    'public.audit_logs',
    'UPDATE'
  ) then
    raise exception
      'LIFE OS security verification failed: authenticated role must not UPDATE audit_logs.';
  end if;


  if has_table_privilege(
    'authenticated',
    'public.audit_logs',
    'DELETE'
  ) then
    raise exception
      'LIFE OS security verification failed: authenticated role must not DELETE audit_logs.';
  end if;

end;
$$;


-- =========================================================
-- 37. SECURITY COMMENTS
-- =========================================================

comment on table public.profiles is
  'LIFE OS private owner profile. Protected by RLS, owner isolation and AAL2.';


comment on table public.income_sources is
  'LIFE OS private income data. Protected by RLS, owner isolation and AAL2.';


comment on table public.budget_items is
  'LIFE OS private budget data. Protected by RLS, owner isolation and AAL2.';


comment on table public.monthly_snapshots is
  'LIFE OS private monthly financial history. Protected by RLS, owner isolation and AAL2.';


comment on table public.investment_assets is
  'LIFE OS private investment positions. Protected by RLS, owner isolation and AAL2.';


comment on table public.investment_transactions is
  'LIFE OS private investment history. Protected by RLS, owner isolation and AAL2.';


comment on table public.goals is
  'LIFE OS private goals. Protected by RLS, owner isolation and AAL2.';


comment on table public.projects is
  'LIFE OS private projects. Protected by RLS, owner isolation and AAL2.';


comment on table public.tasks is
  'LIFE OS private tasks. Protected by RLS, owner isolation and AAL2.';


comment on table public.learning_items is
  'LIFE OS private education and learning data. Protected by RLS, owner isolation and AAL2.';


comment on table public.career_items is
  'LIFE OS private career data. Protected by RLS, owner isolation and AAL2.';


comment on table public.memory_items is
  'LIFE OS private structured personal memory. Protected by RLS, owner isolation and AAL2.';


comment on table public.ai_recommendations is
  'LIFE OS private saved AI recommendations. Protected by RLS, owner isolation and AAL2.';


comment on table public.audit_logs is
  'LIFE OS append-oriented private audit history. SELECT and INSERT only for authenticated owner under AAL2.';


-- =========================================================
-- 38. FINAL SECURITY MODEL
-- =========================================================
--
-- Anonymous user:
--
--   NO LIFE OS TABLE PRIVILEGES
--
--
-- Authenticated AAL1 user:
--
--   MINIMUM TABLE DML PRIVILEGES EXIST
--   BUT RESTRICTIVE RLS BLOCKS ROW ACCESS
--
--
-- Authenticated AAL2 owner:
--
--   OWN ROWS ONLY
--
--
-- Authenticated role does NOT receive:
--
--   TRUNCATE
--   REFERENCES
--   TRIGGER
--
--
-- Audit log:
--
--   SELECT + INSERT
--   NO UPDATE
--   NO DELETE
--
--
-- Security layers:
--
--   Authentication
--        ↓
--   MFA / AAL2
--        ↓
--   Minimum Table Privileges
--        ↓
--   Row Level Security
--        ↓
--   Ownership
--        ↓
--   Database Constraints
--
--
-- Normal LIFE OS application runtime:
--
--   DOES NOT REQUIRE SERVICE_ROLE
--
-- =========================================================


-- =========================================================
-- END OF LIFE OS V1 RLS SECURITY MIGRATION
-- =========================================================