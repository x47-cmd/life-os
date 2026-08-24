-- =========================================================
-- LIFE OS — Version 2
-- Migration: 004_v2_intake_items.sql
--
-- Universal Intake proposal layer.
--
-- Flow:
--
-- User input
--      ↓
-- AI preview
--      ↓
-- User confirmation
--      ↓
-- intake_items
--      ↓
-- Safe domain write
--
-- This table stores structured intake proposals.
--
-- It does NOT store PDF binary files.
-- =========================================================


begin;


-- =========================================================
-- 1. INTAKE ITEMS
-- =========================================================

create table public.intake_items (

  id uuid primary key
    default gen_random_uuid(),


  user_id uuid not null
    references auth.users(id)
    on delete cascade,


  -- -------------------------------------------------------
  -- Classification
  -- -------------------------------------------------------

  kind text not null,


  -- -------------------------------------------------------
  -- Original user input
  -- -------------------------------------------------------

  source_text text,

  source_file_name text,

  source_file_mime text,

  source_file_size_bytes bigint,


  -- -------------------------------------------------------
  -- AI preview
  -- -------------------------------------------------------

  title text not null,

  summary text not null,

  confidence numeric(5,4) not null,

  next_action text not null,


  -- -------------------------------------------------------
  -- Structured proposal
  -- -------------------------------------------------------

  proposed_payload jsonb
    not null
    default '{}'::jsonb,


  -- -------------------------------------------------------
  -- Lifecycle
  -- -------------------------------------------------------

  status text not null
    default 'previewed',

  approved_at timestamptz,

  applied_at timestamptz,


  -- -------------------------------------------------------
  -- Resulting LIFE OS entity
  -- -------------------------------------------------------

  target_entity_type text,

  target_entity_id uuid,


  -- -------------------------------------------------------
  -- Safe failure state
  -- -------------------------------------------------------

  error_code text,


  -- -------------------------------------------------------
  -- Timestamps
  -- -------------------------------------------------------

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now(),


  -- =======================================================
  -- CONSTRAINTS
  -- =======================================================


  constraint intake_items_kind_check
    check (
      kind in (
        'finance',
        'plan',
        'travel',
        'growth',
        'document',
        'note'
      )
    ),


  constraint intake_items_source_required_check
    check (
      (
        source_text is not null
        and length(trim(source_text)) > 0
      )
      or
      (
        source_file_name is not null
        and length(trim(source_file_name)) > 0
      )
    ),


  constraint intake_items_source_text_length_check
    check (
      source_text is null
      or length(source_text) <= 4000
    ),


  constraint intake_items_source_file_name_check
    check (
      source_file_name is null
      or (
        length(trim(source_file_name)) > 0
        and length(source_file_name) <= 255
      )
    ),


  constraint intake_items_source_file_mime_check
    check (
      source_file_mime is null
      or source_file_mime = 'application/pdf'
    ),


  constraint intake_items_source_file_size_check
    check (
      source_file_size_bytes is null
      or (
        source_file_size_bytes > 0
        and source_file_size_bytes <= 15728640
      )
    ),


  constraint intake_items_file_metadata_check
    check (
      (
        source_file_name is null
        and source_file_mime is null
        and source_file_size_bytes is null
      )
      or
      (
        source_file_name is not null
        and source_file_mime is not null
        and source_file_size_bytes is not null
      )
    ),


  constraint intake_items_title_check
    check (
      length(trim(title)) > 0
      and length(title) <= 160
    ),


  constraint intake_items_summary_check
    check (
      length(trim(summary)) > 0
      and length(summary) <= 700
    ),


  constraint intake_items_confidence_check
    check (
      confidence >= 0
      and confidence <= 1
    ),


  constraint intake_items_next_action_check
    check (
      length(trim(next_action)) > 0
      and length(next_action) <= 500
    ),


  constraint intake_items_payload_object_check
    check (
      jsonb_typeof(proposed_payload) = 'object'
    ),


  constraint intake_items_status_check
    check (
      status in (
        'previewed',
        'approved',
        'applied',
        'failed',
        'cancelled'
      )
    ),


  constraint intake_items_approved_at_check
    check (
      status = 'previewed'
      or status = 'cancelled'
      or approved_at is not null
    ),


  constraint intake_items_applied_at_check
    check (
      status <> 'applied'
      or applied_at is not null
    ),


  constraint intake_items_target_pair_check
    check (
      (
        target_entity_type is null
        and target_entity_id is null
      )
      or
      (
        target_entity_type is not null
        and target_entity_id is not null
      )
    ),


  constraint intake_items_target_entity_type_check
    check (
      target_entity_type is null
      or target_entity_type in (
        'income_source',
        'budget_item',
        'investment_asset',
        'investment_transaction',
        'goal',
        'project',
        'task',
        'learning_item',
        'career_item',
        'memory_item',
        'trip',
        'document'
      )
    ),


  constraint intake_items_error_code_check
    check (
      error_code is null
      or (
        length(trim(error_code)) > 0
        and length(error_code) <= 100
      )
    )
);


-- =========================================================
-- 2. IMMEDIATE PRIVILEGE LOCKDOWN
-- =========================================================

revoke all privileges
on table public.intake_items
from public, anon, authenticated;


-- =========================================================
-- 3. ROW LEVEL SECURITY
-- =========================================================

alter table public.intake_items
  enable row level security;


alter table public.intake_items
  force row level security;


-- =========================================================
-- 4. MINIMUM AUTHENTICATED PRIVILEGES
-- =========================================================
--
-- DELETE is deliberately NOT granted.
--
-- Intake history is lifecycle-managed using:
--
-- cancelled
--
-- rather than hard deletion.
-- =========================================================

grant
  select,
  insert,
  update
on table public.intake_items
to authenticated;


-- =========================================================
-- 5. SELECT OWN
-- =========================================================

create policy
  "intake_items_select_own"
on public.intake_items
for select
to authenticated
using (
  auth.uid() = user_id
);


-- =========================================================
-- 6. INSERT OWN
-- =========================================================

create policy
  "intake_items_insert_own"
on public.intake_items
for insert
to authenticated
with check (
  auth.uid() = user_id
);


-- =========================================================
-- 7. UPDATE OWN
-- =========================================================

create policy
  "intake_items_update_own"
on public.intake_items
for update
to authenticated
using (
  auth.uid() = user_id
)
with check (
  auth.uid() = user_id
);


-- =========================================================
-- 8. INDEXES
-- =========================================================

create index
  intake_items_user_status_created_idx
on public.intake_items (
  user_id,
  status,
  created_at desc
);


create index
  intake_items_user_kind_created_idx
on public.intake_items (
  user_id,
  kind,
  created_at desc
);


create index
  intake_items_user_target_idx
on public.intake_items (
  user_id,
  target_entity_type,
  target_entity_id
)
where
  target_entity_id is not null;


-- =========================================================
-- 9. UPDATED_AT
-- =========================================================

create trigger
  intake_items_set_updated_at
before update
on public.intake_items
for each row
execute function public.set_updated_at();


-- =========================================================
-- 10. COMMENTS
-- =========================================================

comment on table public.intake_items is
  'LIFE OS V2 Universal Intake proposals reviewed by the user before safe domain execution.';


comment on column public.intake_items.proposed_payload is
  'Structured proposal data produced from the intake preview. It is not authoritative until user approval and successful domain execution.';


comment on column public.intake_items.target_entity_id is
  'Identifier of the LIFE OS domain record produced after successful confirmed execution.';


comment on column public.intake_items.error_code is
  'Safe internal failure code only. Never store secrets, provider responses, prompts or stack traces here.';


-- =========================================================
-- 11. SECURITY VERIFICATION
-- =========================================================

do $$
declare
  rls_enabled boolean;
  rls_forced boolean;
begin

  select
    c.relrowsecurity,
    c.relforcerowsecurity
  into
    rls_enabled,
    rls_forced
  from
    pg_class as c
  inner join
    pg_namespace as n
      on n.oid = c.relnamespace
  where
    n.nspname = 'public'
    and c.relname = 'intake_items';


  if
    rls_enabled is distinct from true
    or rls_forced is distinct from true
  then
    raise exception
      'LIFE OS migration 004 failed: intake_items must have ENABLE + FORCE RLS.';
  end if;

end;
$$;


-- =========================================================
-- 12. OWNERSHIP POLICY VERIFICATION
-- =========================================================

do $$
declare
  policy_count integer;
begin

  select
    count(*)
  into
    policy_count
  from
    pg_policies
  where
    schemaname = 'public'
    and tablename = 'intake_items'
    and policyname in (
      'intake_items_select_own',
      'intake_items_insert_own',
      'intake_items_update_own'
    );


  if
    policy_count <> 3
  then
    raise exception
      'LIFE OS migration 004 failed: expected 3 intake ownership policies, found %.',
      policy_count;
  end if;

end;
$$;


-- =========================================================
-- 13. ANONYMOUS ACCESS VERIFICATION
-- =========================================================

do $$
declare
  anon_privilege_count integer;
begin

  select
    count(*)
  into
    anon_privilege_count
  from
    information_schema.role_table_grants
  where
    table_schema = 'public'
    and table_name = 'intake_items'
    and grantee = 'anon';


  if
    anon_privilege_count <> 0
  then
    raise exception
      'LIFE OS migration 004 failed: anonymous privileges detected.';
  end if;

end;
$$;


commit;


-- =========================================================
-- LIFE OS V2 — MIGRATION 004 COMPLETE
-- =========================================================
--
-- intake_items
--      ✅ user-owned
--      ✅ FORCE RLS
--      ✅ authenticated only
--      ✅ no anonymous access
--      ✅ no hard-delete privilege
--      ✅ AI proposal lifecycle
--      ✅ user confirmation lifecycle
--      ✅ target entity tracking
--      ✅ safe failure tracking
--
-- PDF binary files are NOT stored here.
--
-- Private documents will receive their own:
--
-- documents table
-- +
-- Supabase Storage bucket
--
-- in a later migration.
-- =========================================================