-- =========================================================
-- LIFE OS — Version 2
-- Migration: 010_v2_travel_intake_executor.sql
--
-- Transactional executor for explicitly approved Travel
-- intake.
--
-- Supported action:
--
-- create_trip
--      ↓
-- trips
--
--
-- Permanent LIFE OS rule:
--
-- AI proposes
--      ↓
-- user reviews exact values
--      ↓
-- user explicitly approves
--      ↓
-- deterministic executor validates again
--      ↓
-- atomic RLS-protected domain write
--
--
-- This function does NOT:
--
-- - call AI
-- - infer missing values
-- - choose user_id from proposal data
-- - accept arbitrary tables
-- - accept arbitrary SQL
-- - upload documents
-- - create public files
-- =========================================================


begin;


-- =========================================================
-- 1. EXECUTE TRAVEL INTAKE
-- =========================================================

create or replace function public.execute_travel_intake(
  p_intake_id uuid
)
returns table (
  intake_id uuid,
  target_entity_type text,
  target_entity_id uuid,
  intake_status text
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare

  -- -------------------------------------------------------
  -- Authenticated identity
  -- -------------------------------------------------------

  v_user_id uuid;


  -- -------------------------------------------------------
  -- Intake
  -- -------------------------------------------------------

  v_intake public.intake_items%rowtype;

  v_payload jsonb;

  v_data jsonb;


  -- -------------------------------------------------------
  -- Proposal identity
  -- -------------------------------------------------------

  v_action text;


  -- -------------------------------------------------------
  -- Trip values
  -- -------------------------------------------------------

  v_title text;

  v_destination text;

  v_start_date date;

  v_end_date date;

  v_start_date_text text;

  v_end_date_text text;

  v_status text;

  v_budget_total numeric;

  v_currency text;

  v_readiness_percent numeric;

  v_notes text;


  -- -------------------------------------------------------
  -- Execution target
  -- -------------------------------------------------------

  v_target_entity_id uuid;

  v_target_exists boolean;


  -- -------------------------------------------------------
  -- Lifecycle
  -- -------------------------------------------------------

  v_updated_count integer;

begin

  -- =======================================================
  -- 2. AUTHENTICATED IDENTITY
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
  -- 3. LOCK OWNED INTAKE
  -- =======================================================
  --
  -- Locking prevents two concurrent confirmations/retries
  -- from producing duplicate trips.
  -- =======================================================

  select
    *
  into
    v_intake
  from
    public.intake_items
  where
    id =
      p_intake_id

    and user_id =
      v_user_id
  for update;


  if
    not found
  then
    raise exception
      'LIFE_OS_INTAKE_NOT_FOUND';
  end if;


  -- =======================================================
  -- 4. IDEMPOTENT SUCCESS
  -- =======================================================
  --
  -- If this exact intake was already applied successfully,
  -- return the existing trip instead of creating another.
  -- =======================================================

  if
    v_intake.status = 'applied'
  then

    if
      v_intake.target_entity_type <> 'trip'
      or v_intake.target_entity_id is null
    then
      raise exception
        'LIFE_OS_TRAVEL_TARGET_CONFLICT';
    end if;


    select
      exists (
        select
          1
        from
          public.trips
        where
          id =
            v_intake.target_entity_id

          and user_id =
            v_user_id
      )
    into
      v_target_exists;


    if
      v_target_exists is distinct from true
    then
      raise exception
        'LIFE_OS_TRAVEL_TARGET_CONFLICT';
    end if;


    return query
    select
      v_intake.id,
      'trip'::text,
      v_intake.target_entity_id,
      'applied'::text;


    return;

  end if;


  -- =======================================================
  -- 5. EXPLICIT APPROVAL REQUIRED
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
  -- 6. TRAVEL KIND ONLY
  -- =======================================================

  if
    v_intake.kind <> 'travel'
  then
    raise exception
      'LIFE_OS_UNSUPPORTED_INTAKE_KIND';
  end if;


  -- =======================================================
  -- 7. TARGET MUST STILL BE EMPTY
  -- =======================================================

  if
    v_intake.target_entity_type is not null
    or v_intake.target_entity_id is not null
  then
    raise exception
      'LIFE_OS_INTAKE_TARGET_CONFLICT';
  end if;


  -- =======================================================
  -- 8. ROOT PAYLOAD
  -- =======================================================
  --
  -- Exact required shape:
  --
  -- {
  --   "version": 1,
  --   "kind": "travel",
  --   "action": "create_trip",
  --   "data": { ... }
  -- }
  --
  -- No extra root fields are accepted.
  -- =======================================================

  v_payload :=
    v_intake.proposed_payload;


  if
    v_payload is null
    or jsonb_typeof(
      v_payload
    ) <> 'object'
  then
    raise exception
      'LIFE_OS_TRAVEL_PAYLOAD_INVALID';
  end if;


  if
    jsonb_object_length(
      v_payload
    ) <> 4
  then
    raise exception
      'LIFE_OS_TRAVEL_PAYLOAD_SHAPE_INVALID';
  end if;


  if
    not (
      v_payload ? 'version'
      and v_payload ? 'kind'
      and v_payload ? 'action'
      and v_payload ? 'data'
    )
  then
    raise exception
      'LIFE_OS_TRAVEL_PAYLOAD_FIELDS_INVALID';
  end if;


  -- =======================================================
  -- 9. VERSION
  -- =======================================================

  if
    jsonb_typeof(
      v_payload -> 'version'
    ) <> 'number'
  then
    raise exception
      'LIFE_OS_TRAVEL_VERSION_INVALID';
  end if;


  if
    (
      v_payload ->> 'version'
    )::numeric <> 1
  then
    raise exception
      'LIFE_OS_TRAVEL_VERSION_UNSUPPORTED';
  end if;


  -- =======================================================
  -- 10. PROPOSAL KIND
  -- =======================================================

  if
    jsonb_typeof(
      v_payload -> 'kind'
    ) <> 'string'
  then
    raise exception
      'LIFE_OS_TRAVEL_PROPOSAL_KIND_INVALID';
  end if;


  if
    v_payload ->> 'kind' <> 'travel'
  then
    raise exception
      'LIFE_OS_TRAVEL_PROPOSAL_KIND_MISMATCH';
  end if;


  -- =======================================================
  -- 11. ACTION
  -- =======================================================

  if
    jsonb_typeof(
      v_payload -> 'action'
    ) <> 'string'
  then
    raise exception
      'LIFE_OS_TRAVEL_ACTION_INVALID';
  end if;


  v_action :=
    v_payload ->> 'action';


  if
    v_action <> 'create_trip'
  then
    raise exception
      'LIFE_OS_TRAVEL_ACTION_UNSUPPORTED';
  end if;


  -- =======================================================
  -- 12. DATA OBJECT
  -- =======================================================

  v_data :=
    v_payload -> 'data';


  if
    v_data is null
    or jsonb_typeof(
      v_data
    ) <> 'object'
  then
    raise exception
      'LIFE_OS_TRAVEL_DATA_INVALID';
  end if;


  -- =======================================================
  -- 13. EXACT TRIP DATA SHAPE
  -- =======================================================
  --
  -- Exactly nine fields:
  --
  -- title
  -- destination
  -- start_date
  -- end_date
  -- status
  -- budget_total
  -- currency
  -- readiness_percent
  -- notes
  --
  -- No hidden / extra execution fields.
  -- =======================================================

  if
    jsonb_object_length(
      v_data
    ) <> 9
  then
    raise exception
      'LIFE_OS_TRAVEL_DATA_SHAPE_INVALID';
  end if;


  if
    not (
      v_data ? 'title'
      and v_data ? 'destination'
      and v_data ? 'start_date'
      and v_data ? 'end_date'
      and v_data ? 'status'
      and v_data ? 'budget_total'
      and v_data ? 'currency'
      and v_data ? 'readiness_percent'
      and v_data ? 'notes'
    )
  then
    raise exception
      'LIFE_OS_TRAVEL_DATA_FIELDS_INVALID';
  end if;


  -- =======================================================
  -- 14. TITLE
  -- =======================================================

  if
    jsonb_typeof(
      v_data -> 'title'
    ) <> 'string'
  then
    raise exception
      'LIFE_OS_TRAVEL_TITLE_INVALID';
  end if;


  v_title :=
    trim(
      v_data ->> 'title'
    );


  if
    v_title is null
    or length(
      v_title
    ) = 0
    or length(
      v_title
    ) > 120
  then
    raise exception
      'LIFE_OS_TRAVEL_TITLE_INVALID';
  end if;


  -- =======================================================
  -- 15. DESTINATION
  -- =======================================================

  if
    jsonb_typeof(
      v_data -> 'destination'
    ) <> 'string'
  then
    raise exception
      'LIFE_OS_TRAVEL_DESTINATION_INVALID';
  end if;


  v_destination :=
    trim(
      v_data ->> 'destination'
    );


  if
    v_destination is null
    or length(
      v_destination
    ) = 0
    or length(
      v_destination
    ) > 160
  then
    raise exception
      'LIFE_OS_TRAVEL_DESTINATION_INVALID';
  end if;


  -- =======================================================
  -- 16. START DATE
  -- =======================================================

  if
    jsonb_typeof(
      v_data -> 'start_date'
    ) = 'null'
  then

    v_start_date :=
      null;

  elsif
    jsonb_typeof(
      v_data -> 'start_date'
    ) = 'string'
  then

    v_start_date_text :=
      v_data ->> 'start_date';


    if
      v_start_date_text
      !~ '^\d{4}-\d{2}-\d{2}$'
    then
      raise exception
        'LIFE_OS_TRAVEL_START_DATE_INVALID';
    end if;


    begin

      v_start_date :=
        v_start_date_text::date;

    exception
      when others
      then
        raise exception
          'LIFE_OS_TRAVEL_START_DATE_INVALID';
    end;

  else

    raise exception
      'LIFE_OS_TRAVEL_START_DATE_INVALID';

  end if;


  -- =======================================================
  -- 17. END DATE
  -- =======================================================

  if
    jsonb_typeof(
      v_data -> 'end_date'
    ) = 'null'
  then

    v_end_date :=
      null;

  elsif
    jsonb_typeof(
      v_data -> 'end_date'
    ) = 'string'
  then

    v_end_date_text :=
      v_data ->> 'end_date';


    if
      v_end_date_text
      !~ '^\d{4}-\d{2}-\d{2}$'
    then
      raise exception
        'LIFE_OS_TRAVEL_END_DATE_INVALID';
    end if;


    begin

      v_end_date :=
        v_end_date_text::date;

    exception
      when others
      then
        raise exception
          'LIFE_OS_TRAVEL_END_DATE_INVALID';
    end;

  else

    raise exception
      'LIFE_OS_TRAVEL_END_DATE_INVALID';

  end if;


  -- =======================================================
  -- 18. DATE RANGE
  -- =======================================================

  if
    v_start_date is not null
    and v_end_date is not null
    and v_end_date < v_start_date
  then
    raise exception
      'LIFE_OS_TRAVEL_DATE_RANGE_INVALID';
  end if;


  -- =======================================================
  -- 19. STATUS
  -- =======================================================

  if
    jsonb_typeof(
      v_data -> 'status'
    ) <> 'string'
  then
    raise exception
      'LIFE_OS_TRAVEL_STATUS_INVALID';
  end if;


  v_status :=
    v_data ->> 'status';


  if
    v_status not in (
      'planned',
      'booked',
      'active',
      'completed',
      'cancelled'
    )
  then
    raise exception
      'LIFE_OS_TRAVEL_STATUS_INVALID';
  end if;


  -- =======================================================
  -- 20. BUDGET
  -- =======================================================
  --
  -- budget_total may be null if the user did not provide
  -- a known budget.
  --
  -- LIFE OS must never invent one.
  -- =======================================================

  if
    jsonb_typeof(
      v_data -> 'budget_total'
    ) = 'null'
  then

    v_budget_total :=
      null;

  elsif
    jsonb_typeof(
      v_data -> 'budget_total'
    ) = 'number'
  then

    v_budget_total :=
      (
        v_data ->> 'budget_total'
      )::numeric;


    if
      v_budget_total < 0
      or v_budget_total > 999999999999.99
      or v_budget_total <> round(
        v_budget_total,
        2
      )
    then
      raise exception
        'LIFE_OS_TRAVEL_BUDGET_INVALID';
    end if;

  else

    raise exception
      'LIFE_OS_TRAVEL_BUDGET_INVALID';

  end if;


  -- =======================================================
  -- 21. CURRENCY
  -- =======================================================

  if
    jsonb_typeof(
      v_data -> 'currency'
    ) <> 'string'
  then
    raise exception
      'LIFE_OS_TRAVEL_CURRENCY_INVALID';
  end if;


  v_currency :=
    trim(
      v_data ->> 'currency'
    );


  if
    v_currency !~ '^[A-Z]{3}$'
  then
    raise exception
      'LIFE_OS_TRAVEL_CURRENCY_INVALID';
  end if;


  -- =======================================================
  -- 22. READINESS
  -- =======================================================

  if
    jsonb_typeof(
      v_data -> 'readiness_percent'
    ) <> 'number'
  then
    raise exception
      'LIFE_OS_TRAVEL_READINESS_INVALID';
  end if;


  v_readiness_percent :=
    (
      v_data ->> 'readiness_percent'
    )::numeric;


  if
    v_readiness_percent <> trunc(
      v_readiness_percent
    )
    or v_readiness_percent < 0
    or v_readiness_percent > 100
  then
    raise exception
      'LIFE_OS_TRAVEL_READINESS_INVALID';
  end if;


  -- =======================================================
  -- 23. NOTES
  -- =======================================================

  if
    jsonb_typeof(
      v_data -> 'notes'
    ) = 'null'
  then

    v_notes :=
      null;

  elsif
    jsonb_typeof(
      v_data -> 'notes'
    ) = 'string'
  then

    v_notes :=
      trim(
        v_data ->> 'notes'
      );


    if
      v_notes is null
      or length(
        v_notes
      ) = 0
      or length(
        v_notes
      ) > 2000
    then
      raise exception
        'LIFE_OS_TRAVEL_NOTES_INVALID';
    end if;

  else

    raise exception
      'LIFE_OS_TRAVEL_NOTES_INVALID';

  end if;


  -- =======================================================
  -- 24. CREATE TRIP
  -- =======================================================
  --
  -- user_id comes ONLY from auth.uid().
  --
  -- It never comes from:
  --
  -- AI output
  -- browser input
  -- proposed_payload
  -- =======================================================

  insert into public.trips (
    user_id,
    title,
    destination,
    start_date,
    end_date,
    status,
    budget_total,
    currency,
    readiness_percent,
    notes
  )
  values (
    v_user_id,
    v_title,
    v_destination,
    v_start_date,
    v_end_date,
    v_status,
    v_budget_total,
    v_currency,
    v_readiness_percent::smallint,
    v_notes
  )
  returning
    id
  into
    v_target_entity_id;


  if
    v_target_entity_id is null
  then
    raise exception
      'LIFE_OS_TRAVEL_CREATE_FAILED';
  end if;


  -- =======================================================
  -- 25. MARK INTAKE APPLIED
  -- =======================================================
  --
  -- The final trip and intake lifecycle update occur in the
  -- same PostgreSQL transaction.
  --
  -- If this update fails, the trip insert rolls back too.
  -- =======================================================

  update public.intake_items
  set
    status =
      'applied',

    applied_at =
      now(),

    target_entity_type =
      'trip',

    target_entity_id =
      v_target_entity_id,

    error_code =
      null

  where
    id =
      v_intake.id

    and user_id =
      v_user_id

    and status =
      'approved'

    and target_entity_type is null

    and target_entity_id is null;


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
  -- 26. RETURN RESULT
  -- =======================================================

  return query
  select
    v_intake.id,
    'trip'::text,
    v_target_entity_id,
    'applied'::text;

end;
$$;


-- =========================================================
-- 27. FUNCTION PRIVILEGE LOCKDOWN
-- =======================================================

revoke all privileges
on function public.execute_travel_intake(uuid)
from public;


revoke all privileges
on function public.execute_travel_intake(uuid)
from anon;


revoke all privileges
on function public.execute_travel_intake(uuid)
from authenticated;


grant execute
on function public.execute_travel_intake(uuid)
to authenticated;


-- =========================================================
-- 28. COMMENT
-- =========================================================

comment on function public.execute_travel_intake(uuid) is
  'LIFE OS V2 transactional SECURITY INVOKER executor for explicitly approved Travel intake. Supports create_trip only.';


-- =========================================================
-- 29. VERIFY FUNCTION EXISTS
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
      on n.oid =
        p.pronamespace
  where
    n.nspname =
      'public'

    and p.proname =
      'execute_travel_intake'

    and pg_get_function_identity_arguments(
      p.oid
    ) =
      'p_intake_id uuid';


  if
    function_count <> 1
  then
    raise exception
      'LIFE OS migration 010 failed: execute_travel_intake(uuid) not found.';
  end if;

end;
$$;


-- =========================================================
-- 30. VERIFY SECURITY INVOKER
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
      on n.oid =
        p.pronamespace
  where
    n.nspname =
      'public'

    and p.proname =
      'execute_travel_intake'

    and pg_get_function_identity_arguments(
      p.oid
    ) =
      'p_intake_id uuid';


  if
    is_security_definer is distinct from false
  then
    raise exception
      'LIFE OS migration 010 failed: execute_travel_intake must remain SECURITY INVOKER.';
  end if;

end;
$$;


-- =========================================================
-- 31. VERIFY ANON CANNOT EXECUTE
-- =========================================================

do $$
begin

  if
    has_function_privilege(
      'anon',
      'public.execute_travel_intake(uuid)',
      'EXECUTE'
    )
  then
    raise exception
      'LIFE OS migration 010 failed: anon can execute Travel intake.';
  end if;

end;
$$;


-- =========================================================
-- 32. VERIFY AUTHENTICATED CAN EXECUTE
-- =========================================================

do $$
begin

  if
    not has_function_privilege(
      'authenticated',
      'public.execute_travel_intake(uuid)',
      'EXECUTE'
    )
  then
    raise exception
      'LIFE OS migration 010 failed: authenticated cannot execute Travel intake.';
  end if;

end;
$$;


-- =========================================================
-- 33. VERIFY TRIPS RLS
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
      on n.oid =
        c.relnamespace
  where
    n.nspname =
      'public'

    and c.relname =
      'trips';


  if
    rls_enabled is distinct from true
  then
    raise exception
      'LIFE OS migration 010 failed: trips RLS is not enabled.';
  end if;


  if
    rls_forced is distinct from true
  then
    raise exception
      'LIFE OS migration 010 failed: trips RLS is not forced.';
  end if;

end;
$$;


-- =========================================================
-- 34. VERIFY TARGET TYPE EXISTS IN INTAKE CONSTRAINT
-- =========================================================
--
-- Migration 004/009 already allows:
--
-- target_entity_type = 'trip'
--
-- This check confirms the live schema still accepts that
-- architecture before completing the migration.
-- =========================================================

do $$
declare

  constraint_definition text;

begin

  select
    pg_get_constraintdef(
      c.oid
    )
  into
    constraint_definition
  from
    pg_constraint as c
  inner join
    pg_class as t
      on t.oid =
        c.conrelid
  inner join
    pg_namespace as n
      on n.oid =
        t.relnamespace
  where
    n.nspname =
      'public'

    and t.relname =
      'intake_items'

    and c.contype =
      'c'

    and pg_get_constraintdef(
      c.oid
    ) ilike
      '%target_entity_type%'

    and pg_get_constraintdef(
      c.oid
    ) ilike
      '%trip%'
  limit 1;


  if
    constraint_definition is null
  then
    raise exception
      'LIFE OS migration 010 failed: intake_items does not allow trip target_entity_type.';
  end if;

end;
$$;


commit;


-- =========================================================
-- LIFE OS V2 — MIGRATION 010 COMPLETE
-- =========================================================
--
-- Supported:
--
-- travel
--
-- create_trip
--      ↓
-- trips
--
--
-- Guarantees:
--
-- ✅ authenticated identity required
-- ✅ SECURITY INVOKER
-- ✅ RLS remains active
-- ✅ explicit user approval required
-- ✅ Travel intake only
-- ✅ proposal version 1 only
-- ✅ create_trip only
-- ✅ exact root payload shape
-- ✅ exact 9-field trip payload shape
-- ✅ no arbitrary actions
-- ✅ no arbitrary tables
-- ✅ no arbitrary SQL
-- ✅ no user_id from browser
-- ✅ no user_id from AI
-- ✅ title validation
-- ✅ destination validation
-- ✅ valid ISO dates
-- ✅ end date cannot precede start date
-- ✅ exact Travel status allowlist
-- ✅ budget may remain null
-- ✅ budget cannot be negative
-- ✅ budget limited to two decimals
-- ✅ currency must be three uppercase letters
-- ✅ readiness must be integer 0–100
-- ✅ notes validated
-- ✅ row locking
-- ✅ atomic trip + intake update
-- ✅ idempotent retry
-- ✅ duplicate trip prevention
-- ✅ existing applied target verified
-- ✅ anonymous execution denied
-- ✅ no AI during execution
--
--
-- Execution matrix after TypeScript wiring:
--
-- note
--      → memory_item ✅
--
-- finance
--      → income / budget ✅
--
-- plan
--      → goal / project ✅
--
-- growth
--      → learning / career ✅
--
-- travel
--      → trip ✅
--
-- document
--      → private document pipeline pending
--
--
-- AI Suggests
--      ↓
-- Exact Travel Values
--      ↓
-- User Reviews
--      ↓
-- User Approves
--      ↓
-- Deterministic Travel Executor
--      ↓
-- RLS-Protected Trip
--
-- Simple outside.
-- Intelligent underneath.
-- Private by default.
-- =========================================================