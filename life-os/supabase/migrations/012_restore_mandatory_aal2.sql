-- =========================================================
-- LIFE OS
-- Migration 012
-- Restore Mandatory AAL2 / MFA Protection
-- =========================================================
--
-- Security contract:
--
-- verified authenticated session
-- +
-- enrolled TOTP factor
-- +
-- AAL2 challenge completed
-- +
-- row ownership
-- +
-- PostgreSQL RLS
--
--
-- This migration restores the mandatory MFA boundary removed
-- by migration 003.
--
-- It protects:
--
-- - V1 private tables
-- - V2 intake and travel tables
-- - V3 investment intelligence tables
-- - private document storage
--
-- Existing ownership policies remain unchanged.
-- =========================================================


begin;


/* =========================================================
 * 1. APPLICATION TABLE REGISTRY
 * ======================================================= */

do $$
declare
  table_name text;

  protected_tables constant text[] := array[
    'profiles',

    'income_sources',
    'budget_items',
    'monthly_snapshots',

    'investment_assets',
    'investment_transactions',

    'investment_ai_analyses',
    'investment_ai_evidence',
    'investment_ai_forecasts',
    'investment_ai_forecast_outcomes',

    'goals',
    'projects',
    'tasks',

    'learning_items',
    'career_items',

    'memory_items',
    'ai_recommendations',

    'intake_items',

    'trips',
    'documents',

    'audit_logs'
  ];
begin
  foreach table_name in array protected_tables
  loop
    if to_regclass(
      format(
        'public.%I',
        table_name
      )
    ) is null
    then
      raise exception
        'LIFE_OS_AAL2_REQUIRED_TABLE_MISSING: public.%',
        table_name;
    end if;
  end loop;
end;
$$;


/* =========================================================
 * 2. RESTORE RESTRICTIVE AAL2 POLICIES
 * ======================================================= */

do $$
declare
  table_name text;

  policy_name text;

  protected_tables constant text[] := array[
    'profiles',

    'income_sources',
    'budget_items',
    'monthly_snapshots',

    'investment_assets',
    'investment_transactions',

    'investment_ai_analyses',
    'investment_ai_evidence',
    'investment_ai_forecasts',
    'investment_ai_forecast_outcomes',

    'goals',
    'projects',
    'tasks',

    'learning_items',
    'career_items',

    'memory_items',
    'ai_recommendations',

    'intake_items',

    'trips',
    'documents',

    'audit_logs'
  ];
begin
  foreach table_name in array protected_tables
  loop
    policy_name :=
      table_name ||
      '_require_aal2';


    execute format(
      'drop policy if exists %I on public.%I',
      policy_name,
      table_name
    );


    execute format(
      $policy$
        create policy %I
        on public.%I
        as restrictive
        for all
        to authenticated
        using (
          (
            (select auth.jwt())
            ->> 'aal'
          ) = 'aal2'
        )
        with check (
          (
            (select auth.jwt())
            ->> 'aal'
          ) = 'aal2'
        )
      $policy$,
      policy_name,
      table_name
    );
  end loop;
end;
$$;


/* =========================================================
 * 3. PRIVATE DOCUMENT STORAGE AAL2
 * ======================================================= */

drop policy if exists
  "life_os_private_documents_require_aal2"
on storage.objects;


create policy
  "life_os_private_documents_require_aal2"
on storage.objects
as restrictive
for all
to authenticated
using (
  bucket_id <>
    'life-os-private-documents'

  or (
    (
      (select auth.jwt())
      ->> 'aal'
    ) = 'aal2'
  )
)
with check (
  bucket_id <>
    'life-os-private-documents'

  or (
    (
      (select auth.jwt())
      ->> 'aal'
    ) = 'aal2'
  )
);


/* =========================================================
 * 4. VERIFY TABLE POLICIES
 * ======================================================= */

do $$
declare
  expected_policy_count constant integer :=
    21;

  actual_policy_count integer;
begin
  select
    count(*)
  into
    actual_policy_count
  from
    pg_policies
  where
    schemaname =
      'public'

    and policyname = any (
      array[
        'profiles_require_aal2',

        'income_sources_require_aal2',
        'budget_items_require_aal2',
        'monthly_snapshots_require_aal2',

        'investment_assets_require_aal2',
        'investment_transactions_require_aal2',

        'investment_ai_analyses_require_aal2',
        'investment_ai_evidence_require_aal2',
        'investment_ai_forecasts_require_aal2',
        'investment_ai_forecast_outcomes_require_aal2',

        'goals_require_aal2',
        'projects_require_aal2',
        'tasks_require_aal2',

        'learning_items_require_aal2',
        'career_items_require_aal2',

        'memory_items_require_aal2',
        'ai_recommendations_require_aal2',

        'intake_items_require_aal2',

        'trips_require_aal2',
        'documents_require_aal2',

        'audit_logs_require_aal2'
      ]
    );


  if
    actual_policy_count <>
      expected_policy_count
  then
    raise exception
      'LIFE_OS_AAL2_POLICY_COUNT_INVALID: expected %, found %',
      expected_policy_count,
      actual_policy_count;
  end if;
end;
$$;


/* =========================================================
 * 5. VERIFY STORAGE POLICY
 * ======================================================= */

do $$
declare
  storage_policy_count integer;
begin
  select
    count(*)
  into
    storage_policy_count
  from
    pg_policies
  where
    schemaname =
      'storage'

    and tablename =
      'objects'

    and policyname =
      'life_os_private_documents_require_aal2';


  if
    storage_policy_count <>
      1
  then
    raise exception
      'LIFE_OS_STORAGE_AAL2_POLICY_MISSING';
  end if;
end;
$$;


/* =========================================================
 * 6. FINAL AUTHENTICATION CONTRACT
 * ======================================================= */

-- Signed out
--      ↓
-- no private access
--
--
-- Password authenticated at AAL1
--      ↓
-- MFA verification required
--      ↓
-- no private data access yet
--
--
-- Password + verified TOTP at AAL2
--      ↓
-- authenticated identity
--      ↓
-- ownership policies
--      ↓
-- private LIFE OS access
--
--
-- AI cannot bypass this boundary.
-- Application code cannot bypass this boundary.
-- A publishable Supabase client cannot bypass this boundary.


commit;


/* =========================================================
 * FINAL RULE
 * ======================================================= */

-- Private by default.
-- MFA required.
-- Ownership enforced.
-- No privileged application runtime.