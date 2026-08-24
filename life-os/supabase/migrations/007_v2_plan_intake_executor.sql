-- =========================================================
-- LIFE OS — Version 2
-- Migration: 007_v2_plan_intake_executor.sql
--
-- Transactional executor for approved plan intake.
--
-- Supported actions:
--
-- create_goal
--      ↓
-- goals
--
-- create_project
--      ↓
-- projects
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
-- deterministic executor validates again
--      ↓
-- atomic domain write
-- =========================================================


begin;


-- =========================================================
-- 1. EXECUTE PLAN INTAKE
-- =========================================================

create or replace function public.execute_plan_intake(
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

  v_goal_id uuid;

  v_goal_id_text text;

  v_title text;

  v_description text;

  v_category text;

  v_status text;

  v_priority text;

  v_next_action text;

  v_unit text;

  v_target_value numeric;

  v_current_value numeric;

  v_progress_percent numeric;

  v_sort_order numeric;

  v_start_date date;

  v_target_date date;

  v_start_date_text text;

  v_target_date_text text;

  v_updated_count integer;

  v_goal_exists boolean;

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

  if
    v_intake.status = 'applied'
  then

    if
      v_intake.target_entity_type not in (
        'goal',
        'project'
      )
      or v_intake.target_entity_id is null
    then
      raise exception
        'LIFE_OS_PLAN_TARGET_CONFLICT';
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
  -- 5. APPROVAL REQUIRED
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
  -- 6. PLAN KIND ONLY
  -- =======================================================

  if
    v_intake.kind <> 'plan'
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
  -- 8. PAYLOAD ROOT
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
      'LIFE_OS_PLAN_PAYLOAD_INVALID';
  end if;


  if
    jsonb_object_length(
      v_payload
    ) <> 4
  then
    raise exception
      'LIFE_OS_PLAN_PAYLOAD_SHAPE_INVALID';
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
      'LIFE_OS_PLAN_PAYLOAD_FIELDS_INVALID';
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
      'LIFE_OS_PLAN_VERSION_INVALID';
  end if;


  if
    (
      v_payload ->> 'version'
    )::numeric <> 1
  then
    raise exception
      'LIFE_OS_PLAN_VERSION_UNSUPPORTED';
  end if;


  -- =======================================================
  -- 10. KIND
  -- =======================================================

  if
    jsonb_typeof(
      v_payload -> 'kind'
    ) <> 'string'
  then
    raise exception
      'LIFE_OS_PLAN_PROPOSAL_KIND_INVALID';
  end if;


  if
    v_payload ->> 'kind' <> 'plan'
  then
    raise exception
      'LIFE_OS_PLAN_PROPOSAL_KIND_MISMATCH';
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
      'LIFE_OS_PLAN_ACTION_INVALID';
  end if;


  v_action :=
    v_payload ->> 'action';


  if
    v_action not in (
      'create_goal',
      'create_project'
    )
  then
    raise exception
      'LIFE_OS_PLAN_ACTION_UNSUPPORTED';
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
      'LIFE_OS_PLAN_DATA_INVALID';
  end if;


  -- =======================================================
  -- 13. SHARED TITLE
  -- =======================================================

  if
    jsonb_typeof(
      v_data -> 'title'
    ) <> 'string'
  then
    raise exception
      'LIFE_OS_PLAN_TITLE_INVALID';
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
      'LIFE_OS_PLAN_TITLE_INVALID';
  end if;


  -- =======================================================
  -- 14. SHARED DESCRIPTION
  -- =======================================================

  if
    not (
      v_data ? 'description'
    )
  then
    raise exception
      'LIFE_OS_PLAN_DESCRIPTION_FIELD_REQUIRED';
  end if;


  if
    jsonb_typeof(
      v_data -> 'description'
    ) = 'null'
  then

    v_description :=
      null;

  elsif
    jsonb_typeof(
      v_data -> 'description'
    ) = 'string'
  then

    v_description :=
      trim(
        v_data ->> 'description'
      );


    if
      length(
        v_description
      ) = 0
      or length(
        v_description
      ) > 500
    then
      raise exception
        'LIFE_OS_PLAN_DESCRIPTION_INVALID';
    end if;

  else

    raise exception
      'LIFE_OS_PLAN_DESCRIPTION_INVALID';

  end if;


  -- =======================================================
  -- 15. SHARED CATEGORY
  -- =======================================================

  if
    jsonb_typeof(
      v_data -> 'category'
    ) <> 'string'
  then
    raise exception
      'LIFE_OS_PLAN_CATEGORY_INVALID';
  end if;


  v_category :=
    v_data ->> 'category';


  -- =======================================================
  -- 16. SHARED STATUS
  -- =======================================================

  if
    jsonb_typeof(
      v_data -> 'status'
    ) <> 'string'
  then
    raise exception
      'LIFE_OS_PLAN_STATUS_INVALID';
  end if;


  v_status :=
    v_data ->> 'status';


  -- =======================================================
  -- 17. SHARED PRIORITY
  -- =======================================================

  if
    jsonb_typeof(
      v_data -> 'priority'
    ) <> 'string'
  then
    raise exception
      'LIFE_OS_PLAN_PRIORITY_INVALID';
  end if;


  v_priority :=
    v_data ->> 'priority';


  if
    v_priority not in (
      'low',
      'medium',
      'high'
    )
  then
    raise exception
      'LIFE_OS_PLAN_PRIORITY_INVALID';
  end if;


  -- =======================================================
  -- 18. SHARED PROGRESS
  -- =======================================================

  if
    jsonb_typeof(
      v_data -> 'progress_percent'
    ) <> 'number'
  then
    raise exception
      'LIFE_OS_PLAN_PROGRESS_INVALID';
  end if;


  v_progress_percent :=
    (
      v_data ->> 'progress_percent'
    )::numeric;


  if
    v_progress_percent <> trunc(
      v_progress_percent
    )
    or v_progress_percent < 0
    or v_progress_percent > 100
  then
    raise exception
      'LIFE_OS_PLAN_PROGRESS_INVALID';
  end if;


  -- =======================================================
  -- 19. SHARED NEXT ACTION
  -- =======================================================

  if
    not (
      v_data ? 'next_action'
    )
  then
    raise exception
      'LIFE_OS_PLAN_NEXT_ACTION_FIELD_REQUIRED';
  end if;


  if
    jsonb_typeof(
      v_data -> 'next_action'
    ) = 'null'
  then

    v_next_action :=
      null;

  elsif
    jsonb_typeof(
      v_data -> 'next_action'
    ) = 'string'
  then

    v_next_action :=
      trim(
        v_data ->> 'next_action'
      );


    if
      length(
        v_next_action
      ) = 0
      or length(
        v_next_action
      ) > 500
    then
      raise exception
        'LIFE_OS_PLAN_NEXT_ACTION_INVALID';
    end if;

  else

    raise exception
      'LIFE_OS_PLAN_NEXT_ACTION_INVALID';

  end if;


  -- =======================================================
  -- 20. ACTION — CREATE GOAL
  -- =======================================================

  if
    v_action = 'create_goal'
  then

    -- -----------------------------------------------------
    -- Exact shape
    -- -----------------------------------------------------

    if
      jsonb_object_length(
        v_data
      ) <> 12
    then
      raise exception
        'LIFE_OS_PLAN_GOAL_SHAPE_INVALID';
    end if;


    if
      not (
        v_data ? 'title'
        and v_data ? 'category'
        and v_data ? 'description'
        and v_data ? 'target_value'
        and v_data ? 'current_value'
        and v_data ? 'unit'
        and v_data ? 'progress_percent'
        and v_data ? 'target_date'
        and v_data ? 'priority'
        and v_data ? 'status'
        and v_data ? 'next_action'
        and v_data ? 'sort_order'
      )
    then
      raise exception
        'LIFE_OS_PLAN_GOAL_FIELDS_INVALID';
    end if;


    -- -----------------------------------------------------
    -- Category
    -- -----------------------------------------------------

    if
      v_category not in (
        'finance',
        'investments',
        'career',
        'learning',
        'education',
        'business',
        'travel',
        'fitness',
        'personal',
        'other'
      )
    then
      raise exception
        'LIFE_OS_PLAN_GOAL_CATEGORY_INVALID';
    end if;


    -- -----------------------------------------------------
    -- Status
    -- -----------------------------------------------------

    if
      v_status not in (
        'planned',
        'active',
        'paused',
        'completed',
        'cancelled'
      )
    then
      raise exception
        'LIFE_OS_PLAN_GOAL_STATUS_INVALID';
    end if;


    -- -----------------------------------------------------
    -- Target value
    -- -----------------------------------------------------

    if
      jsonb_typeof(
        v_data -> 'target_value'
      ) = 'null'
    then

      v_target_value :=
        null;

    elsif
      jsonb_typeof(
        v_data -> 'target_value'
      ) = 'number'
    then

      v_target_value :=
        (
          v_data ->> 'target_value'
        )::numeric;


      if
        abs(
          v_target_value
        ) > 99999999999999.9999
        or v_target_value <> round(
          v_target_value,
          4
        )
      then
        raise exception
          'LIFE_OS_PLAN_TARGET_VALUE_INVALID';
      end if;

    else

      raise exception
        'LIFE_OS_PLAN_TARGET_VALUE_INVALID';

    end if;


    -- -----------------------------------------------------
    -- Current value
    -- -----------------------------------------------------

    if
      jsonb_typeof(
        v_data -> 'current_value'
      ) = 'null'
    then

      v_current_value :=
        null;

    elsif
      jsonb_typeof(
        v_data -> 'current_value'
      ) = 'number'
    then

      v_current_value :=
        (
          v_data ->> 'current_value'
        )::numeric;


      if
        abs(
          v_current_value
        ) > 99999999999999.9999
        or v_current_value <> round(
          v_current_value,
          4
        )
      then
        raise exception
          'LIFE_OS_PLAN_CURRENT_VALUE_INVALID';
      end if;

    else

      raise exception
        'LIFE_OS_PLAN_CURRENT_VALUE_INVALID';

    end if;


    -- -----------------------------------------------------
    -- Unit
    -- -----------------------------------------------------

    if
      jsonb_typeof(
        v_data -> 'unit'
      ) = 'null'
    then

      v_unit :=
        null;

    elsif
      jsonb_typeof(
        v_data -> 'unit'
      ) = 'string'
    then

      v_unit :=
        trim(
          v_data ->> 'unit'
        );


      if
        length(
          v_unit
        ) = 0
        or length(
          v_unit
        ) > 30
      then
        raise exception
          'LIFE_OS_PLAN_UNIT_INVALID';
      end if;

    else

      raise exception
        'LIFE_OS_PLAN_UNIT_INVALID';

    end if;


    -- -----------------------------------------------------
    -- Target date
    -- -----------------------------------------------------

    if
      jsonb_typeof(
        v_data -> 'target_date'
      ) = 'null'
    then

      v_target_date :=
        null;

    elsif
      jsonb_typeof(
        v_data -> 'target_date'
      ) = 'string'
    then

      v_target_date_text :=
        v_data ->> 'target_date';


      if
        v_target_date_text
        !~ '^\d{4}-\d{2}-\d{2}$'
      then
        raise exception
          'LIFE_OS_PLAN_TARGET_DATE_INVALID';
      end if;


      begin

        v_target_date :=
          v_target_date_text::date;

      exception
        when others
        then
          raise exception
            'LIFE_OS_PLAN_TARGET_DATE_INVALID';
      end;

    else

      raise exception
        'LIFE_OS_PLAN_TARGET_DATE_INVALID';

    end if;


    -- -----------------------------------------------------
    -- Sort order
    -- -----------------------------------------------------

    if
      jsonb_typeof(
        v_data -> 'sort_order'
      ) <> 'number'
    then
      raise exception
        'LIFE_OS_PLAN_SORT_ORDER_INVALID';
    end if;


    v_sort_order :=
      (
        v_data ->> 'sort_order'
      )::numeric;


    if
      v_sort_order <> trunc(
        v_sort_order
      )
      or v_sort_order < 0
      or v_sort_order > 2147483647
    then
      raise exception
        'LIFE_OS_PLAN_SORT_ORDER_INVALID';
    end if;


    -- -----------------------------------------------------
    -- Insert goal
    -- -----------------------------------------------------

    insert into public.goals (
      user_id,
      title,
      category,
      description,
      target_value,
      current_value,
      unit,
      progress_percent,
      target_date,
      priority,
      status,
      next_action,
      sort_order
    )
    values (
      v_user_id,
      v_title,
      v_category,
      v_description,
      v_target_value,
      v_current_value,
      v_unit,
      v_progress_percent::smallint,
      v_target_date,
      v_priority,
      v_status,
      v_next_action,
      v_sort_order::integer
    )
    returning
      id
    into
      v_target_entity_id;


    if
      v_target_entity_id is null
    then
      raise exception
        'LIFE_OS_GOAL_CREATE_FAILED';
    end if;


    v_target_entity_type :=
      'goal';

  end if;


  -- =======================================================
  -- 21. ACTION — CREATE PROJECT
  -- =======================================================

  if
    v_action = 'create_project'
  then

    -- -----------------------------------------------------
    -- Exact shape
    -- -----------------------------------------------------

    if
      jsonb_object_length(
        v_data
      ) <> 10
    then
      raise exception
        'LIFE_OS_PLAN_PROJECT_SHAPE_INVALID';
    end if;


    if
      not (
        v_data ? 'goal_id'
        and v_data ? 'title'
        and v_data ? 'description'
        and v_data ? 'category'
        and v_data ? 'status'
        and v_data ? 'progress_percent'
        and v_data ? 'priority'
        and v_data ? 'start_date'
        and v_data ? 'target_date'
        and v_data ? 'next_action'
      )
    then
      raise exception
        'LIFE_OS_PLAN_PROJECT_FIELDS_INVALID';
    end if;


    -- -----------------------------------------------------
    -- Category
    -- -----------------------------------------------------

    if
      v_category not in (
        'ai',
        'career',
        'education',
        'finance',
        'investments',
        'business',
        'travel',
        'fitness',
        'personal',
        'other'
      )
    then
      raise exception
        'LIFE_OS_PLAN_PROJECT_CATEGORY_INVALID';
    end if;


    -- -----------------------------------------------------
    -- Status
    -- -----------------------------------------------------

    if
      v_status not in (
        'planned',
        'active',
        'blocked',
        'paused',
        'completed',
        'cancelled'
      )
    then
      raise exception
        'LIFE_OS_PLAN_PROJECT_STATUS_INVALID';
    end if;


    -- -----------------------------------------------------
    -- Goal relationship
    -- -----------------------------------------------------

    if
      jsonb_typeof(
        v_data -> 'goal_id'
      ) = 'null'
    then

      v_goal_id :=
        null;

    elsif
      jsonb_typeof(
        v_data -> 'goal_id'
      ) = 'string'
    then

      v_goal_id_text :=
        v_data ->> 'goal_id';


      if
        v_goal_id_text
        !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then
        raise exception
          'LIFE_OS_PLAN_GOAL_ID_INVALID';
      end if;


      v_goal_id :=
        v_goal_id_text::uuid;


      select
        exists (
          select
            1
          from
            public.goals
          where
            id =
              v_goal_id

            and user_id =
              v_user_id
        )
      into
        v_goal_exists;


      if
        v_goal_exists is distinct from true
      then
        raise exception
          'LIFE_OS_PLAN_GOAL_NOT_FOUND';
      end if;

    else

      raise exception
        'LIFE_OS_PLAN_GOAL_ID_INVALID';

    end if;


    -- -----------------------------------------------------
    -- Start date
    -- -----------------------------------------------------

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
          'LIFE_OS_PLAN_START_DATE_INVALID';
      end if;


      begin

        v_start_date :=
          v_start_date_text::date;

      exception
        when others
        then
          raise exception
            'LIFE_OS_PLAN_START_DATE_INVALID';
      end;

    else

      raise exception
        'LIFE_OS_PLAN_START_DATE_INVALID';

    end if;


    -- -----------------------------------------------------
    -- Target date
    -- -----------------------------------------------------

    if
      jsonb_typeof(
        v_data -> 'target_date'
      ) = 'null'
    then

      v_target_date :=
        null;

    elsif
      jsonb_typeof(
        v_data -> 'target_date'
      ) = 'string'
    then

      v_target_date_text :=
        v_data ->> 'target_date';


      if
        v_target_date_text
        !~ '^\d{4}-\d{2}-\d{2}$'
      then
        raise exception
          'LIFE_OS_PLAN_TARGET_DATE_INVALID';
      end if;


      begin

        v_target_date :=
          v_target_date_text::date;

      exception
        when others
        then
          raise exception
            'LIFE_OS_PLAN_TARGET_DATE_INVALID';
      end;

    else

      raise exception
        'LIFE_OS_PLAN_TARGET_DATE_INVALID';

    end if;


    -- -----------------------------------------------------
    -- Date range
    -- -----------------------------------------------------

    if
      v_start_date is not null
      and v_target_date is not null
      and v_target_date < v_start_date
    then
      raise exception
        'LIFE_OS_PLAN_DATE_RANGE_INVALID';
    end if;


    -- -----------------------------------------------------
    -- Insert project
    -- -----------------------------------------------------

    insert into public.projects (
      user_id,
      goal_id,
      title,
      description,
      category,
      status,
      progress_percent,
      priority,
      start_date,
      target_date,
      next_action
    )
    values (
      v_user_id,
      v_goal_id,
      v_title,
      v_description,
      v_category,
      v_status,
      v_progress_percent::smallint,
      v_priority,
      v_start_date,
      v_target_date,
      v_next_action
    )
    returning
      id
    into
      v_target_entity_id;


    if
      v_target_entity_id is null
    then
      raise exception
        'LIFE_OS_PROJECT_CREATE_FAILED';
    end if;


    v_target_entity_type :=
      'project';

  end if;


  -- =======================================================
  -- 22. TARGET SAFETY
  -- =======================================================

  if
    v_target_entity_id is null
    or v_target_entity_type is null
  then
    raise exception
      'LIFE_OS_PLAN_EXECUTION_TARGET_MISSING';
  end if;


  -- =======================================================
  -- 23. MARK INTAKE APPLIED
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
  -- 24. RETURN
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
-- 25. FUNCTION PRIVILEGES
-- =========================================================

revoke all privileges
on function public.execute_plan_intake(uuid)
from public;


revoke all privileges
on function public.execute_plan_intake(uuid)
from anon;


grant execute
on function public.execute_plan_intake(uuid)
to authenticated;


-- =========================================================
-- 26. COMMENT
-- =========================================================

comment on function public.execute_plan_intake(uuid) is
  'LIFE OS V2 transactional executor for explicitly approved structured plan intake. Supports create_goal and create_project only.';


-- =========================================================
-- 27. VERIFY FUNCTION EXISTS
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
    and p.proname = 'execute_plan_intake'
    and pg_get_function_identity_arguments(
      p.oid
    ) = 'p_intake_id uuid';


  if
    function_count <> 1
  then
    raise exception
      'LIFE OS migration 007 failed: execute_plan_intake(uuid) not found.';
  end if;

end;
$$;


-- =========================================================
-- 28. VERIFY SECURITY INVOKER
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
    and p.proname = 'execute_plan_intake'
    and pg_get_function_identity_arguments(
      p.oid
    ) = 'p_intake_id uuid';


  if
    is_security_definer is distinct from false
  then
    raise exception
      'LIFE OS migration 007 failed: execute_plan_intake must remain SECURITY INVOKER.';
  end if;

end;
$$;


-- =========================================================
-- 29. VERIFY ANON CANNOT EXECUTE
-- =========================================================

do $$
begin

  if
    has_function_privilege(
      'anon',
      'public.execute_plan_intake(uuid)',
      'EXECUTE'
    )
  then
    raise exception
      'LIFE OS migration 007 failed: anon can execute plan intake.';
  end if;

end;
$$;


-- =========================================================
-- 30. VERIFY AUTHENTICATED CAN EXECUTE
-- =========================================================

do $$
begin

  if
    not has_function_privilege(
      'authenticated',
      'public.execute_plan_intake(uuid)',
      'EXECUTE'
    )
  then
    raise exception
      'LIFE OS migration 007 failed: authenticated role cannot execute plan intake.';
  end if;

end;
$$;


commit;


-- =========================================================
-- LIFE OS V2 — MIGRATION 007 COMPLETE
-- =========================================================
--
-- Supported:
--
-- approved plan intake
--      ↓
-- exact structured proposal
--      ↓
-- create_goal OR create_project
--      ↓
-- goals OR projects
--      ↓
-- intake_items = applied
--
--
-- Guarantees:
--
-- ✅ authenticated user only
-- ✅ SECURITY INVOKER
-- ✅ RLS remains active
-- ✅ explicit user approval required
-- ✅ plan kind only
-- ✅ proposal version locked to 1
-- ✅ exact action allowlist
-- ✅ exact JSON shape
-- ✅ no arbitrary table selection
-- ✅ no arbitrary SQL
-- ✅ no user_id accepted from proposal
-- ✅ title validation
-- ✅ category allowlists
-- ✅ status allowlists
-- ✅ priority allowlist
-- ✅ progress 0–100
-- ✅ numeric precision protection
-- ✅ dates validated
-- ✅ project date range validated
-- ✅ linked goal must belong to same user
-- ✅ row locking
-- ✅ atomic execution
-- ✅ idempotent retry
-- ✅ no duplicate goal/project
-- ✅ no AI generation during execution
--
--
-- Current execution matrix after app wiring:
--
-- note
--      → memory_item
--
-- finance
--      → income_source / budget_item
--
-- plan
--      → goal / project
--
-- growth
--      → pending
--
-- travel
--      → pending
--
-- document
--      → pending
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
-- Deterministic Plan Executor
--      ↓
-- Final LIFE OS Goal / Project
-- =========================================================