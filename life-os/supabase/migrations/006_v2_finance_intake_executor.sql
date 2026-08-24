-- =========================================================
-- LIFE OS — Version 2
-- Migration: 006_v2_finance_intake_executor.sql
--
-- Transactional executor for approved finance intake.
--
-- Supported actions:
--
-- create_income_source
--      ↓
-- income_sources
--
-- create_budget_item
--      ↓
-- budget_items
--
--
-- Permanent rule:
--
-- AI proposes
--      ↓
-- user reviews exact values
--      ↓
-- user approves
--      ↓
-- this deterministic executor validates again
--      ↓
-- atomic domain write
-- =========================================================


begin;


-- =========================================================
-- 1. EXECUTE FINANCE INTAKE
-- =========================================================

create or replace function public.execute_finance_intake(
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

  v_user_id uuid;

  v_intake public.intake_items%rowtype;

  v_payload jsonb;

  v_data jsonb;

  v_action text;

  v_target_entity_type text;

  v_target_entity_id uuid;

  v_profile_currency text;

  v_name text;

  v_currency text;

  v_frequency text;

  v_notes text;

  v_category text;

  v_item_type text;

  v_amount numeric;

  v_due_day numeric;

  v_next_expected_date date;

  v_next_expected_date_text text;

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
  -- 3. LOAD ACCOUNT CURRENCY
  -- =======================================================
  --
  -- V1 income_sources and budget_items do not contain their
  -- own currency column.
  --
  -- Therefore finance execution may only use the user's
  -- LIFE OS default currency.
  --
  -- We NEVER silently discard a conflicting currency.
  -- =======================================================

  select
    default_currency
  into
    v_profile_currency
  from
    public.profiles
  where
    user_id =
      v_user_id;


  if
    not found
  then
    raise exception
      'LIFE_OS_PROFILE_REQUIRED';
  end if;


  if
    v_profile_currency is null
    or v_profile_currency !~ '^[A-Z]{3}$'
  then
    raise exception
      'LIFE_OS_PROFILE_CURRENCY_INVALID';
  end if;


  -- =======================================================
  -- 4. LOCK OWNED INTAKE
  -- =======================================================
  --
  -- FOR UPDATE prevents concurrent double execution.
  --
  -- SECURITY INVOKER keeps PostgreSQL RLS active.
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
  -- 5. IDEMPOTENT SUCCESS
  -- =======================================================
  --
  -- Already executed finance intake returns the existing
  -- target instead of creating another record.
  -- =======================================================

  if
    v_intake.status = 'applied'
  then

    if
      v_intake.target_entity_type not in (
        'income_source',
        'budget_item'
      )
      or v_intake.target_entity_id is null
    then
      raise exception
        'LIFE_OS_FINANCE_TARGET_CONFLICT';
    end if;


    return query
    select
      v_intake.id,
      v_intake.target_entity_type,
      v_intake.target_entity_id,
      v_intake.status;


    return;

  end if;


  -- =======================================================
  -- 6. APPROVAL REQUIRED
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
  -- 7. FINANCE KIND ONLY
  -- =======================================================

  if
    v_intake.kind <> 'finance'
  then
    raise exception
      'LIFE_OS_UNSUPPORTED_INTAKE_KIND';
  end if;


  -- =======================================================
  -- 8. TARGET MUST STILL BE EMPTY
  -- =======================================================

  if
    v_intake.target_entity_type is not null
    or v_intake.target_entity_id is not null
  then
    raise exception
      'LIFE_OS_INTAKE_TARGET_CONFLICT';
  end if;


  -- =======================================================
  -- 9. PAYLOAD ROOT
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
      'LIFE_OS_FINANCE_PAYLOAD_INVALID';
  end if;


  -- Exact top-level shape:
  --
  -- version
  -- kind
  -- action
  -- data

  if
    jsonb_object_length(
      v_payload
    ) <> 4
  then
    raise exception
      'LIFE_OS_FINANCE_PAYLOAD_SHAPE_INVALID';
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
      'LIFE_OS_FINANCE_PAYLOAD_FIELDS_INVALID';
  end if;


  -- =======================================================
  -- 10. VERSION
  -- =======================================================

  if
    jsonb_typeof(
      v_payload -> 'version'
    ) <> 'number'
  then
    raise exception
      'LIFE_OS_FINANCE_VERSION_INVALID';
  end if;


  if
    (
      v_payload ->> 'version'
    )::numeric <> 1
  then
    raise exception
      'LIFE_OS_FINANCE_VERSION_UNSUPPORTED';
  end if;


  -- =======================================================
  -- 11. PROPOSAL KIND
  -- =======================================================

  if
    jsonb_typeof(
      v_payload -> 'kind'
    ) <> 'string'
  then
    raise exception
      'LIFE_OS_FINANCE_PROPOSAL_KIND_INVALID';
  end if;


  if
    v_payload ->> 'kind' <> 'finance'
  then
    raise exception
      'LIFE_OS_FINANCE_PROPOSAL_KIND_MISMATCH';
  end if;


  -- =======================================================
  -- 12. ACTION
  -- =======================================================

  if
    jsonb_typeof(
      v_payload -> 'action'
    ) <> 'string'
  then
    raise exception
      'LIFE_OS_FINANCE_ACTION_INVALID';
  end if;


  v_action :=
    v_payload ->> 'action';


  if
    v_action not in (
      'create_income_source',
      'create_budget_item'
    )
  then
    raise exception
      'LIFE_OS_FINANCE_ACTION_UNSUPPORTED';
  end if;


  -- =======================================================
  -- 13. DATA OBJECT
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
      'LIFE_OS_FINANCE_DATA_INVALID';
  end if;


  -- =======================================================
  -- 14. SHARED NAME
  -- =======================================================

  if
    jsonb_typeof(
      v_data -> 'name'
    ) <> 'string'
  then
    raise exception
      'LIFE_OS_FINANCE_NAME_INVALID';
  end if;


  v_name :=
    trim(
      v_data ->> 'name'
    );


  if
    v_name is null
    or length(
      v_name
    ) = 0
    or length(
      v_name
    ) > 160
  then
    raise exception
      'LIFE_OS_FINANCE_NAME_INVALID';
  end if;


  -- =======================================================
  -- 15. SHARED AMOUNT
  -- =======================================================

  if
    jsonb_typeof(
      v_data -> 'amount'
    ) <> 'number'
  then
    raise exception
      'LIFE_OS_FINANCE_AMOUNT_INVALID';
  end if;


  v_amount :=
    (
      v_data ->> 'amount'
    )::numeric;


  if
    v_amount <= 0
    or v_amount > 999999999999.99
  then
    raise exception
      'LIFE_OS_FINANCE_AMOUNT_INVALID';
  end if;


  -- Prevent PostgreSQL numeric(14,2) from silently rounding
  -- an AI proposal with more than two meaningful decimals.

  if
    v_amount <> round(
      v_amount,
      2
    )
  then
    raise exception
      'LIFE_OS_FINANCE_AMOUNT_PRECISION_INVALID';
  end if;


  -- =======================================================
  -- 16. SHARED CURRENCY
  -- =======================================================

  if
    jsonb_typeof(
      v_data -> 'currency'
    ) <> 'string'
  then
    raise exception
      'LIFE_OS_FINANCE_CURRENCY_INVALID';
  end if;


  v_currency :=
    trim(
      v_data ->> 'currency'
    );


  if
    v_currency !~ '^[A-Z]{3}$'
  then
    raise exception
      'LIFE_OS_FINANCE_CURRENCY_INVALID';
  end if;


  -- Critical V1 compatibility rule.
  --
  -- income_sources and budget_items have no currency column.
  --
  -- Never silently interpret USD as AED.

  if
    v_currency <> v_profile_currency
  then
    raise exception
      'LIFE_OS_FINANCE_CURRENCY_MISMATCH';
  end if;


  -- =======================================================
  -- 17. SHARED FREQUENCY
  -- =======================================================

  if
    jsonb_typeof(
      v_data -> 'frequency'
    ) <> 'string'
  then
    raise exception
      'LIFE_OS_FINANCE_FREQUENCY_INVALID';
  end if;


  v_frequency :=
    v_data ->> 'frequency';


  if
    v_frequency not in (
      'monthly',
      'annual',
      'one_time',
      'other'
    )
  then
    raise exception
      'LIFE_OS_FINANCE_FREQUENCY_INVALID';
  end if;


  -- =======================================================
  -- 18. SHARED NOTES
  -- =======================================================

  if
    not (
      v_data ? 'notes'
    )
  then
    raise exception
      'LIFE_OS_FINANCE_NOTES_FIELD_REQUIRED';
  end if;


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
      length(
        v_notes
      ) = 0
    then
      raise exception
        'LIFE_OS_FINANCE_NOTES_INVALID';
    end if;


    if
      length(
        v_notes
      ) > 4000
    then
      raise exception
        'LIFE_OS_FINANCE_NOTES_TOO_LONG';
    end if;

  else

    raise exception
      'LIFE_OS_FINANCE_NOTES_INVALID';

  end if;


  -- =======================================================
  -- 19. ACTION — CREATE INCOME SOURCE
  -- =======================================================

  if
    v_action = 'create_income_source'
  then

    -- -----------------------------------------------------
    -- Exact data shape
    -- -----------------------------------------------------
    --
    -- name
    -- amount
    -- currency
    -- frequency
    -- next_expected_date
    -- notes
    -- -----------------------------------------------------

    if
      jsonb_object_length(
        v_data
      ) <> 6
    then
      raise exception
        'LIFE_OS_FINANCE_INCOME_SHAPE_INVALID';
    end if;


    if
      not (
        v_data ? 'name'
        and v_data ? 'amount'
        and v_data ? 'currency'
        and v_data ? 'frequency'
        and v_data ? 'next_expected_date'
        and v_data ? 'notes'
      )
    then
      raise exception
        'LIFE_OS_FINANCE_INCOME_FIELDS_INVALID';
    end if;


    -- -----------------------------------------------------
    -- Next expected date
    -- -----------------------------------------------------

    if
      jsonb_typeof(
        v_data -> 'next_expected_date'
      ) = 'null'
    then

      v_next_expected_date :=
        null;

    elsif
      jsonb_typeof(
        v_data -> 'next_expected_date'
      ) = 'string'
    then

      v_next_expected_date_text :=
        v_data ->> 'next_expected_date';


      if
        v_next_expected_date_text
        !~ '^\d{4}-\d{2}-\d{2}$'
      then
        raise exception
          'LIFE_OS_FINANCE_DATE_INVALID';
      end if;


      begin

        v_next_expected_date :=
          v_next_expected_date_text::date;

      exception
        when others
        then
          raise exception
            'LIFE_OS_FINANCE_DATE_INVALID';
      end;

    else

      raise exception
        'LIFE_OS_FINANCE_DATE_INVALID';

    end if;


    -- -----------------------------------------------------
    -- Insert exact approved values
    -- -----------------------------------------------------

    insert into public.income_sources (
      user_id,
      name,
      amount,
      frequency,
      is_active,
      next_expected_date,
      notes
    )
    values (
      v_user_id,
      v_name,
      v_amount,
      v_frequency,
      true,
      v_next_expected_date,
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
        'LIFE_OS_INCOME_CREATE_FAILED';
    end if;


    v_target_entity_type :=
      'income_source';

  end if;


  -- =======================================================
  -- 20. ACTION — CREATE BUDGET ITEM
  -- =======================================================

  if
    v_action = 'create_budget_item'
  then

    -- -----------------------------------------------------
    -- Exact data shape
    -- -----------------------------------------------------
    --
    -- name
    -- category
    -- item_type
    -- amount
    -- currency
    -- frequency
    -- due_day
    -- notes
    -- -----------------------------------------------------

    if
      jsonb_object_length(
        v_data
      ) <> 8
    then
      raise exception
        'LIFE_OS_FINANCE_BUDGET_SHAPE_INVALID';
    end if;


    if
      not (
        v_data ? 'name'
        and v_data ? 'category'
        and v_data ? 'item_type'
        and v_data ? 'amount'
        and v_data ? 'currency'
        and v_data ? 'frequency'
        and v_data ? 'due_day'
        and v_data ? 'notes'
      )
    then
      raise exception
        'LIFE_OS_FINANCE_BUDGET_FIELDS_INVALID';
    end if;


    -- -----------------------------------------------------
    -- Category
    -- -----------------------------------------------------

    if
      jsonb_typeof(
        v_data -> 'category'
      ) <> 'string'
    then
      raise exception
        'LIFE_OS_FINANCE_CATEGORY_INVALID';
    end if;


    v_category :=
      v_data ->> 'category';


    if
      v_category not in (
        'family',
        'housing',
        'debt',
        'transport',
        'personal',
        'travel',
        'emergency',
        'investments',
        'education',
        'business',
        'other'
      )
    then
      raise exception
        'LIFE_OS_FINANCE_CATEGORY_INVALID';
    end if;


    -- -----------------------------------------------------
    -- Item type
    -- -----------------------------------------------------

    if
      jsonb_typeof(
        v_data -> 'item_type'
      ) <> 'string'
    then
      raise exception
        'LIFE_OS_FINANCE_ITEM_TYPE_INVALID';
    end if;


    v_item_type :=
      v_data ->> 'item_type';


    if
      v_item_type not in (
        'expense',
        'saving',
        'investment',
        'debt'
      )
    then
      raise exception
        'LIFE_OS_FINANCE_ITEM_TYPE_INVALID';
    end if;


    -- -----------------------------------------------------
    -- Due day
    -- -----------------------------------------------------

    if
      jsonb_typeof(
        v_data -> 'due_day'
      ) = 'null'
    then

      v_due_day :=
        null;

    elsif
      jsonb_typeof(
        v_data -> 'due_day'
      ) = 'number'
    then

      v_due_day :=
        (
          v_data ->> 'due_day'
        )::numeric;


      if
        v_due_day <> trunc(
          v_due_day
        )
        or v_due_day < 1
        or v_due_day > 31
      then
        raise exception
          'LIFE_OS_FINANCE_DUE_DAY_INVALID';
      end if;

    else

      raise exception
        'LIFE_OS_FINANCE_DUE_DAY_INVALID';

    end if;


    -- -----------------------------------------------------
    -- Insert exact approved values
    -- -----------------------------------------------------

    insert into public.budget_items (
      user_id,
      name,
      category,
      item_type,
      amount,
      frequency,
      due_day,
      is_active,
      notes
    )
    values (
      v_user_id,
      v_name,
      v_category,
      v_item_type,
      v_amount,
      v_frequency,
      v_due_day::smallint,
      true,
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
        'LIFE_OS_BUDGET_CREATE_FAILED';
    end if;


    v_target_entity_type :=
      'budget_item';

  end if;


  -- =======================================================
  -- 21. TARGET SAFETY
  -- =======================================================

  if
    v_target_entity_id is null
    or v_target_entity_type is null
  then
    raise exception
      'LIFE_OS_FINANCE_EXECUTION_TARGET_MISSING';
  end if;


  -- =======================================================
  -- 22. MARK INTAKE APPLIED
  -- =======================================================
  --
  -- The domain insert and lifecycle update are inside the
  -- same PostgreSQL transaction.
  --
  -- If this update fails, the new finance record rolls back.
  -- =======================================================

  update public.intake_items
  set
    status =
      'applied',

    applied_at =
      now(),

    target_entity_type =
      v_target_entity_type,

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
  -- 23. RETURN RESULT
  -- =======================================================

  return query
  select
    v_intake.id,
    v_target_entity_type,
    v_target_entity_id,
    'applied'::text;

end;
$$;


-- =========================================================
-- 24. FUNCTION PRIVILEGES
-- =========================================================

revoke all privileges
on function public.execute_finance_intake(uuid)
from public;


revoke all privileges
on function public.execute_finance_intake(uuid)
from anon;


grant execute
on function public.execute_finance_intake(uuid)
to authenticated;


-- =========================================================
-- 25. COMMENT
-- =========================================================

comment on function public.execute_finance_intake(uuid) is
  'LIFE OS V2 transactional executor for explicitly approved structured finance intake. Supports create_income_source and create_budget_item only.';


-- =========================================================
-- 26. VERIFY FUNCTION EXISTS
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
    and p.proname = 'execute_finance_intake'
    and pg_get_function_identity_arguments(
      p.oid
    ) = 'p_intake_id uuid';


  if
    function_count <> 1
  then
    raise exception
      'LIFE OS migration 006 failed: execute_finance_intake(uuid) not found.';
  end if;

end;
$$;


-- =========================================================
-- 27. VERIFY SECURITY INVOKER
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
    and p.proname = 'execute_finance_intake'
    and pg_get_function_identity_arguments(
      p.oid
    ) = 'p_intake_id uuid';


  if
    is_security_definer is distinct from false
  then
    raise exception
      'LIFE OS migration 006 failed: execute_finance_intake must remain SECURITY INVOKER.';
  end if;

end;
$$;


-- =========================================================
-- 28. VERIFY ANON CANNOT EXECUTE
-- =========================================================

do $$
begin

  if
    has_function_privilege(
      'anon',
      'public.execute_finance_intake(uuid)',
      'EXECUTE'
    )
  then
    raise exception
      'LIFE OS migration 006 failed: anon can execute finance intake.';
  end if;

end;
$$;


-- =========================================================
-- 29. VERIFY AUTHENTICATED CAN EXECUTE
-- =========================================================

do $$
begin

  if
    not has_function_privilege(
      'authenticated',
      'public.execute_finance_intake(uuid)',
      'EXECUTE'
    )
  then
    raise exception
      'LIFE OS migration 006 failed: authenticated role cannot execute finance intake.';
  end if;

end;
$$;


commit;


-- =========================================================
-- LIFE OS V2 — MIGRATION 006 COMPLETE
-- =========================================================
--
-- Supported:
--
-- approved finance intake
--      ↓
-- exact approved structured proposal
--      ↓
-- execute_finance_intake(uuid)
--      ↓
-- income_sources OR budget_items
--      ↓
-- intake_items = applied
--
--
-- Guarantees:
--
-- ✅ authenticated user only
-- ✅ SECURITY INVOKER
-- ✅ PostgreSQL RLS remains active
-- ✅ explicit approval required
-- ✅ finance kind only
-- ✅ structured proposal required
-- ✅ proposal version locked to 1
-- ✅ exact action allowlist
-- ✅ exact payload shape
-- ✅ exact data-field shape
-- ✅ no arbitrary table selection
-- ✅ no arbitrary SQL
-- ✅ no user_id from proposal
-- ✅ positive amounts only
-- ✅ no silent money rounding
-- ✅ currency validated
-- ✅ currency must match profile currency
-- ✅ no silent USD → AED interpretation
-- ✅ safe category allowlist
-- ✅ safe item-type allowlist
-- ✅ safe frequency allowlist
-- ✅ due day validated
-- ✅ date validated
-- ✅ row locking
-- ✅ atomic execution
-- ✅ idempotent retry
-- ✅ no duplicate finance record
-- ✅ no AI generation during execution
--
--
-- Not supported by this executor:
--
-- investment_asset
-- investment_transaction
-- goal
-- project
-- learning_item
-- career_item
-- travel
-- document
--
--
-- AI Suggests
--      ↓
-- Exact Values
--      ↓
-- User Reviews
--      ↓
-- User Approves
--      ↓
-- Deterministic Finance Executor
--      ↓
-- Final LIFE OS Financial Fact
-- =========================================================