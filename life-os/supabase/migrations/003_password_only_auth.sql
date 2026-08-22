-- ============================================================
-- LIFE OS
-- Migration 003
-- Password-only authentication
-- ============================================================
--
-- Purpose:
--
-- LIFE OS V1 now uses:
--
-- Email + Password
--      ↓
-- Verified Supabase JWT
--      ↓
-- Server authorization
--      ↓
-- PostgreSQL FORCE RLS
--      ↓
-- auth.uid() row ownership
--
--
-- This migration removes ONLY the mandatory AAL2 / MFA
-- restrictive policies created by migration 002.
--
-- It does NOT remove:
--
-- - Row Level Security
-- - FORCE ROW LEVEL SECURITY
-- - authenticated-role restrictions
-- - user_id ownership policies
-- - audit immutability protections
-- - privilege restrictions
--
-- ============================================================


begin;


/* =========================================================
 * 1. REMOVE MANDATORY AAL2 POLICIES
 * ======================================================= */

drop policy if exists
  "profiles_require_aal2"
on public.profiles;


drop policy if exists
  "income_sources_require_aal2"
on public.income_sources;


drop policy if exists
  "budget_items_require_aal2"
on public.budget_items;


drop policy if exists
  "monthly_snapshots_require_aal2"
on public.monthly_snapshots;


drop policy if exists
  "investment_assets_require_aal2"
on public.investment_assets;


drop policy if exists
  "investment_transactions_require_aal2"
on public.investment_transactions;


drop policy if exists
  "goals_require_aal2"
on public.goals;


drop policy if exists
  "projects_require_aal2"
on public.projects;


drop policy if exists
  "tasks_require_aal2"
on public.tasks;


drop policy if exists
  "learning_items_require_aal2"
on public.learning_items;


drop policy if exists
  "career_items_require_aal2"
on public.career_items;


drop policy if exists
  "memory_items_require_aal2"
on public.memory_items;


drop policy if exists
  "ai_recommendations_require_aal2"
on public.ai_recommendations;


drop policy if exists
  "audit_logs_require_aal2"
on public.audit_logs;


/* =========================================================
 * 2. VERIFY AAL2 POLICIES ARE GONE
 * ======================================================= */

do $$
declare
  remaining_aal2_policies integer;
begin
  select
    count(*)
  into
    remaining_aal2_policies
  from
    pg_policies
  where
    schemaname = 'public'
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

  if
    remaining_aal2_policies <> 0
  then
    raise exception
      'LIFE OS migration 003 failed: % mandatory AAL2 policies remain.',
      remaining_aal2_policies;
  end if;
end;
$$;


/* =========================================================
 * 3. VERIFY RLS REMAINS ENABLED AND FORCED
 * ======================================================= */

do $$
declare
  protected_table_count integer;
begin
  select
    count(*)
  into
    protected_table_count
  from
    pg_class as c
  inner join
    pg_namespace as n
      on n.oid = c.relnamespace
  where
    n.nspname = 'public'
    and c.relname in (
      'profiles',
      'income_sources',
      'budget_items',
      'monthly_snapshots',
      'investment_assets',
      'investment_transactions',
      'goals',
      'projects',
      'tasks',
      'learning_items',
      'career_items',
      'memory_items',
      'ai_recommendations',
      'audit_logs'
    )
    and c.relrowsecurity = true
    and c.relforcerowsecurity = true;

  if
    protected_table_count <> 14
  then
    raise exception
      'LIFE OS migration 003 failed: only % of 14 tables retain ENABLE + FORCE RLS.',
      protected_table_count;
  end if;
end;
$$;


/* =========================================================
 * 4. VERIFY OWNERSHIP POLICIES REMAIN
 * ======================================================= */

do $$
declare
  ownership_policy_count integer;
begin
  select
    count(*)
  into
    ownership_policy_count
  from
    pg_policies
  where
    schemaname = 'public'
    and policyname in (
      'profiles_select_own',
      'profiles_insert_own',
      'profiles_update_own',
      'profiles_delete_own',

      'income_sources_select_own',
      'income_sources_insert_own',
      'income_sources_update_own',
      'income_sources_delete_own',

      'budget_items_select_own',
      'budget_items_insert_own',
      'budget_items_update_own',
      'budget_items_delete_own',

      'monthly_snapshots_select_own',
      'monthly_snapshots_insert_own',
      'monthly_snapshots_update_own',
      'monthly_snapshots_delete_own',

      'investment_assets_select_own',
      'investment_assets_insert_own',
      'investment_assets_update_own',
      'investment_assets_delete_own',

      'investment_transactions_select_own',
      'investment_transactions_insert_own',
      'investment_transactions_update_own',
      'investment_transactions_delete_own',

      'goals_select_own',
      'goals_insert_own',
      'goals_update_own',
      'goals_delete_own',

      'projects_select_own',
      'projects_insert_own',
      'projects_update_own',
      'projects_delete_own',

      'tasks_select_own',
      'tasks_insert_own',
      'tasks_update_own',
      'tasks_delete_own',

      'learning_items_select_own',
      'learning_items_insert_own',
      'learning_items_update_own',
      'learning_items_delete_own',

      'career_items_select_own',
      'career_items_insert_own',
      'career_items_update_own',
      'career_items_delete_own',

      'memory_items_select_own',
      'memory_items_insert_own',
      'memory_items_update_own',
      'memory_items_delete_own',

      'ai_recommendations_select_own',
      'ai_recommendations_insert_own',
      'ai_recommendations_update_own',
      'ai_recommendations_delete_own',

      'audit_logs_select_own',
      'audit_logs_insert_own'
    );

  if
    ownership_policy_count <> 54
  then
    raise exception
      'LIFE OS migration 003 failed: expected 54 ownership policies, found %.',
      ownership_policy_count;
  end if;
end;
$$;


/* =========================================================
 * 5. VERIFY AUDIT LOGS REMAIN IMMUTABLE
 * ======================================================= */

do $$
declare
  audit_mutation_policy_count integer;
begin
  select
    count(*)
  into
    audit_mutation_policy_count
  from
    pg_policies
  where
    schemaname = 'public'
    and tablename = 'audit_logs'
    and cmd in (
      'UPDATE',
      'DELETE'
    );

  if
    audit_mutation_policy_count <> 0
  then
    raise exception
      'LIFE OS migration 003 failed: audit_logs gained UPDATE or DELETE access.';
  end if;
end;
$$;


/* =========================================================
 * 6. FINAL AUTHENTICATION MODEL
 * ======================================================= */

-- LIFE OS V1:
--
-- Email
-- +
-- Password
--      ↓
-- Supabase authenticated JWT
--      ↓
-- Server-side verified identity
--      ↓
-- auth.uid()
--      ↓
-- FORCE RLS
--      ↓
-- user-owned rows only
--
--
-- MFA / TOTP / QR enrollment:
--
-- NOT REQUIRED
--
--
-- Public registration:
--
-- DISABLED
--
--
-- service_role in normal runtime:
--
-- NOT USED


commit;


/* =========================================================
 * 7. FINAL MIGRATION RULE
 * ======================================================= */

-- Simple outside.
-- Protected underneath.
--
-- Password-only authentication changes the login experience.
--
-- It does not remove the database authorization boundary.