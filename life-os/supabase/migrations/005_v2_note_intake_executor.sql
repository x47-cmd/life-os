-- =========================================================
-- LIFE OS — Version 2
-- Migration: 005_v2_note_intake_executor.sql
--
-- First transactional Universal Intake domain executor.
--
-- Supported flow:
--
-- approved intake
--      ↓
-- kind = note
--      ↓
-- memory_items
--      ↓
-- intake status = applied
--
-- IMPORTANT:
--
-- The memory insert and intake lifecycle update happen
-- inside ONE PostgreSQL transaction.
--
-- This prevents:
--
-- - duplicate writes
-- - half-completed execution
-- - memory created but intake not updated
-- =========================================================


begin;


-- =========================================================
-- 1. EXECUTE NOTE INTAKE
-- =========================================================

create or replace function public.execute_note_intake(
  p_intake_id uuid
)
returns table (
  intake_id uuid,
  memory_item_id uuid,
  intake_status text
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare

  v_user_id uuid;

  v_intake public.intake_items%rowtype;

  v_memory_item_id uuid;

  v_content text;

  v_updated_count integer;

begin

  -- =======================================================
  -- AUTHENTICATED IDENTITY
  -- =======================================================

  v_user_id :=
    auth.uid();


  if
    v_user_id is null
  then
    raise exception
      'LIFE_OS_AUTH_REQUIRED';
  end if;


  if
    p_intake_id is null
  then
    raise exception
      'LIFE_OS_INTAKE_ID_REQUIRED';
  end if;


  -- =======================================================
  -- LOCK OWNED INTAKE
  -- =======================================================
  --
  -- FOR UPDATE prevents two concurrent executions from
  -- creating two memory items from the same intake.
  --
  -- RLS still applies because this function is
  -- SECURITY INVOKER.
  -- =======================================================

  select
    *
  into
    v_intake
  from
    public.intake_items
  where
    id = p_intake_id
    and user_id = v_user_id
  for update;


  if
    not found
  then
    raise exception
      'LIFE_OS_INTAKE_NOT_FOUND';
  end if;


  -- =======================================================
  -- IDEMPOTENT SUCCESS
  -- =======================================================
  --
  -- If the exact note was already executed successfully,
  -- return its existing memory id.
  --
  -- Never create a duplicate.
  -- =======================================================

  if
    v_intake.status = 'applied'
    and v_intake.target_entity_type = 'memory_item'
    and v_intake.target_entity_id is not null
  then

    return query
    select
      v_intake.id,
      v_intake.target_entity_id,
      v_intake.status;


    return;

  end if;


  -- =======================================================
  -- ONLY APPROVED INTAKE MAY EXECUTE
  -- =======================================================

  if
    v_intake.status <> 'approved'
  then
    raise exception
      'LIFE_OS_INTAKE_NOT_APPROVED';
  end if;


  if
    v_intake.approved_at is null
  then
    raise exception
      'LIFE_OS_INTAKE_APPROVAL_MISSING';
  end if;


  -- =======================================================
  -- FIRST EXECUTOR SUPPORTS NOTE ONLY
  -- =======================================================

  if
    v_intake.kind <> 'note'
  then
    raise exception
      'LIFE_OS_UNSUPPORTED_INTAKE_KIND';
  end if;


  -- =======================================================
  -- TARGET MUST STILL BE EMPTY
  -- =======================================================

  if
    v_intake.target_entity_type is not null
    or v_intake.target_entity_id is not null
  then
    raise exception
      'LIFE_OS_INTAKE_TARGET_CONFLICT';
  end if;


  -- =======================================================
  -- CONTENT
  -- =======================================================
  --
  -- Prefer the user's original text.
  --
  -- For an intake without source text, use only the summary
  -- that the user explicitly reviewed and approved.
  --
  -- No new AI generation occurs here.
  -- =======================================================

  v_content :=
    nullif(
      trim(
        coalesce(
          v_intake.source_text,
          ''
        )
      ),
      ''
    );


  if
    v_content is null
  then

    v_content :=
      nullif(
        trim(
          v_intake.summary
        ),
        ''
      );

  end if;


  if
    v_content is null
  then
    raise exception
      'LIFE_OS_NOTE_CONTENT_MISSING';
  end if;


  -- =======================================================
  -- CREATE MEMORY ITEM
  -- =======================================================
  --
  -- Safe deterministic defaults:
  --
  -- category   = other
  -- importance = medium
  -- is_active  = true
  --
  -- No AI decision is made during execution.
  -- =======================================================

  insert into public.memory_items (
    user_id,
    category,
    title,
    content,
    importance,
    is_active
  )
  values (
    v_user_id,
    'other',
    trim(
      v_intake.title
    ),
    v_content,
    'medium',
    true
  )
  returning
    id
  into
    v_memory_item_id;


  if
    v_memory_item_id is null
  then
    raise exception
      'LIFE_OS_MEMORY_CREATE_FAILED';
  end if;


  -- =======================================================
  -- MARK INTAKE APPLIED
  -- =======================================================
  --
  -- If this update fails, PostgreSQL rolls back the memory
  -- insert above automatically.
  --
  -- Therefore this operation is atomic.
  -- =======================================================

  update public.intake_items
  set
    status =
      'applied',

    applied_at =
      now(),

    target_entity_type =
      'memory_item',

    target_entity_id =
      v_memory_item_id,

    error_code =
      null

  where
    id =
      v_intake.id

    and user_id =
      v_user_id

    and status =
      'approved';


  get diagnostics
    v_updated_count =
      row_count;


  if
    v_updated_count <> 1
  then
    raise exception
      'LIFE_OS_INTAKE_APPLY_CONFLICT';
  end if;


  -- =======================================================
  -- RETURN RESULT
  -- =======================================================

  return query
  select
    v_intake.id,
    v_memory_item_id,
    'applied'::text;

end;
$$;


-- =========================================================
-- 2. FUNCTION PRIVILEGES
-- =========================================================
--
-- PostgreSQL functions normally receive EXECUTE permission
-- for PUBLIC when created.
--
-- LIFE OS removes that immediately.
-- =========================================================

revoke all privileges
on function public.execute_note_intake(uuid)
from public;


revoke all privileges
on function public.execute_note_intake(uuid)
from anon;


grant execute
on function public.execute_note_intake(uuid)
to authenticated;


-- =========================================================
-- 3. FUNCTION COMMENT
-- =========================================================

comment on function public.execute_note_intake(uuid) is
  'LIFE OS V2 transactional executor for explicitly approved note intake. Creates one memory_item and atomically marks the intake applied.';


-- =========================================================
-- 4. VERIFY FUNCTION EXISTS
-- =========================================================

do $$
declare

  function_count integer;

begin

  select
    count(*)
  into
    function_count
  from
    pg_proc as p
  inner join
    pg_namespace as n
      on n.oid = p.pronamespace
  where
    n.nspname = 'public'
    and p.proname = 'execute_note_intake'
    and pg_get_function_identity_arguments(
      p.oid
    ) = 'p_intake_id uuid';


  if
    function_count <> 1
  then
    raise exception
      'LIFE OS migration 005 failed: execute_note_intake(uuid) not found.';
  end if;

end;
$$;


-- =========================================================
-- 5. VERIFY SECURITY INVOKER
-- =========================================================

do $$
declare

  is_security_definer boolean;

begin

  select
    p.prosecdef
  into
    is_security_definer
  from
    pg_proc as p
  inner join
    pg_namespace as n
      on n.oid = p.pronamespace
  where
    n.nspname = 'public'
    and p.proname = 'execute_note_intake'
    and pg_get_function_identity_arguments(
      p.oid
    ) = 'p_intake_id uuid';


  if
    is_security_definer is distinct from false
  then
    raise exception
      'LIFE OS migration 005 failed: execute_note_intake must remain SECURITY INVOKER.';
  end if;

end;
$$;


-- =========================================================
-- 6. VERIFY ANON CANNOT EXECUTE
-- =========================================================

do $$
begin

  if
    has_function_privilege(
      'anon',
      'public.execute_note_intake(uuid)',
      'EXECUTE'
    )
  then
    raise exception
      'LIFE OS migration 005 failed: anon can execute note intake.';
  end if;

end;
$$;


-- =========================================================
-- 7. VERIFY AUTHENTICATED CAN EXECUTE
-- =========================================================

do $$
begin

  if
    not has_function_privilege(
      'authenticated',
      'public.execute_note_intake(uuid)',
      'EXECUTE'
    )
  then
    raise exception
      'LIFE OS migration 005 failed: authenticated role cannot execute note intake.';
  end if;

end;
$$;


commit;


-- =========================================================
-- LIFE OS V2 — MIGRATION 005 COMPLETE
-- =========================================================
--
-- First real domain execution:
--
-- approved note
--      ↓
-- transactional PostgreSQL function
--      ↓
-- memory_items
--      ↓
-- intake_items = applied
--
--
-- Guarantees:
--
-- ✅ authenticated user only
-- ✅ RLS remains active
-- ✅ SECURITY INVOKER
-- ✅ explicit approval required
-- ✅ note kind only
-- ✅ row locking
-- ✅ atomic execution
-- ✅ idempotent retry
-- ✅ no duplicate memory item
-- ✅ no AI generation during execution
-- ✅ no arbitrary SQL
--
--
-- Unsupported kinds remain approved:
--
-- finance
-- plan
-- travel
-- growth
-- document
--
-- until their dedicated safe executors exist.
--
--
-- AI Suggests
--      ↓
-- User Reviews
--      ↓
-- User Approves
--      ↓
-- Deterministic Executor
-- =========================================================