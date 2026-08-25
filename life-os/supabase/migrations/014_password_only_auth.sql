-- =========================================================
-- LIFE OS
-- Migration 014
-- Restore password-only authentication
-- =========================================================
--
-- Authentication contract:
--
-- Email + password
--      ↓
-- verified Supabase JWT
--      ↓
-- authenticated role
--      ↓
-- PostgreSQL RLS
--      ↓
-- auth.uid() row ownership
--
-- This migration removes only the restrictive AAL2 policies
-- introduced by migration 012. RLS, ownership policies,
-- audit immutability, and private storage path isolation stay
-- enabled.
-- =========================================================

begin;


/* =========================================================
 * 1. REMOVE TABLE AAL2 POLICIES
 * ======================================================= */

do $$
declare
  protected_table text;
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
  foreach protected_table in array protected_tables
  loop
    if to_regclass(format('public.%I', protected_table)) is null then
      raise exception
        'LIFE_OS_PASSWORD_AUTH_TABLE_MISSING: public.%',
        protected_table;
    end if;

    execute format(
      'drop policy if exists %I on public.%I',
      protected_table || '_require_aal2',
      protected_table
    );
  end loop;
end;
$$;


/* =========================================================
 * 2. REMOVE PRIVATE STORAGE AAL2 POLICY
 * ======================================================= */

drop policy if exists
  "life_os_private_documents_require_aal2"
on storage.objects;


/* =========================================================
 * 3. VERIFY AAL2 POLICIES ARE GONE
 * ======================================================= */

do $$
declare
  remaining_aal2_policies integer;
begin
  select count(*)
  into remaining_aal2_policies
  from pg_policies
  where (
      schemaname = 'public'
      and policyname like '%\_require\_aal2' escape '\'
    )
    or (
      schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'life_os_private_documents_require_aal2'
    );

  if remaining_aal2_policies <> 0 then
    raise exception
      'LIFE_OS_PASSWORD_AUTH_AAL2_POLICIES_REMAIN: %',
      remaining_aal2_policies;
  end if;
end;
$$;


/* =========================================================
 * 4. VERIFY RLS AND OWNERSHIP REMAIN
 * ======================================================= */

do $$
declare
  protected_table_count integer;
  ownership_table_count integer;
begin
  select count(*)
  into protected_table_count
  from pg_class as c
  join pg_namespace as n
    on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = any (
      array[
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
      ]
    )
    and c.relrowsecurity = true;

  if protected_table_count <> 21 then
    raise exception
      'LIFE_OS_PASSWORD_AUTH_RLS_INVALID: expected 21, found %',
      protected_table_count;
  end if;

  select count(distinct tablename)
  into ownership_table_count
  from pg_policies
  where schemaname = 'public'
    and tablename = any (
      array[
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
      ]
    )
    and policyname like '%\_own' escape '\'
    and roles @> array['authenticated']::name[];

  if ownership_table_count <> 21 then
    raise exception
      'LIFE_OS_PASSWORD_AUTH_OWNERSHIP_INVALID: expected 21, found %',
      ownership_table_count;
  end if;
end;
$$;


/* =========================================================
 * 5. VERIFY PRIVATE STORAGE OWNERSHIP REMAINS
 * ======================================================= */

do $$
declare
  storage_ownership_policy_count integer;
begin
  select count(*)
  into storage_ownership_policy_count
  from pg_policies
  where schemaname = 'storage'
    and tablename = 'objects'
    and policyname in (
      'life_os_private_documents_select_own',
      'life_os_private_documents_insert_own',
      'life_os_private_documents_update_own',
      'life_os_private_documents_delete_own'
    );

  if storage_ownership_policy_count <> 4 then
    raise exception
      'LIFE_OS_PASSWORD_AUTH_STORAGE_OWNERSHIP_INVALID: expected 4, found %',
      storage_ownership_policy_count;
  end if;
end;
$$;


commit;


-- Final rule:
-- Email + password is sufficient for private access.
-- RLS and auth.uid() ownership remain mandatory.

