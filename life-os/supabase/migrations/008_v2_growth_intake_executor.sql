-- =========================================================
-- LIFE OS — Version 2
-- Migration: 008_v2_growth_intake_executor.sql
--
-- Transactional executor for approved growth intake.
--
-- Supported actions:
--
-- create_learning_item
--      ↓
-- learning_items
--
-- create_career_item
--      ↓
-- career_items
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
-- 1. EXECUTE GROWTH INTAKE
-- =========================================================

create or replace function public.execute_growth_intake(
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


  -- -------------------------------------------------------
  -- Shared relationship
  -- -------------------------------------------------------

  v_goal_id uuid;

  v_goal_id_text text;

  v_goal_exists boolean;


  -- -------------------------------------------------------
  -- Shared content
  -- -------------------------------------------------------

  v_title text;

  v_status text;

  v_priority text;

  v_notes text;


  -- -------------------------------------------------------
  -- Learning
  -- -------------------------------------------------------

  v_provider text;

  v_item_type text;

  v_progress_percent numeric;

  v_start_date date;

  v_target_date date;

  v_completed_date date;

  v_start_date_text text;

  v_target_date_text text;

  v_completed_date_text text;

  v_url text;

  v_cost numeric;

  v_currency text;


  -- -------------------------------------------------------
  -- Career
  -- -------------------------------------------------------

  v_description text;

  v_rating numeric;

  v_event_date date;

  v_event_date_text text;

  v_evidence_url text;


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
        'learning_item',
        'career_item'
      )
      or v_intake.target_entity_id is null
    then
      raise exception
        'LIFE_OS_GROWTH_TARGET_CONFLICT';
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
  -- 6. GROWTH KIND ONLY
  -- =======================================================

  if
    v_intake.kind <> 'growth'
  then
    raise exception
      'LIFE_OS_UNSUPPORTED_INTAKE_KIND';
  end if;


  -- =======================================================
  -- 7. TARGET MUST BE EMPTY
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

  v_payload :=
    v_intake.proposed_payload;


  if
    v_payload is null
    or jsonb_typeof(
      v_payload
    ) <> 'object'
  then
    raise exception
      'LIFE_OS_GROWTH_PAYLOAD_INVALID';
  end if;


  if
    jsonb_object_length(
      v_payload
    ) <> 4
  then
    raise exception
      'LIFE_OS_GROWTH_PAYLOAD_SHAPE_INVALID';
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
      'LIFE_OS_GROWTH_PAYLOAD_FIELDS_INVALID';
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
      'LIFE_OS_GROWTH_VERSION_INVALID';
  end if;


  if
    (
      v_payload ->> 'version'
    )::numeric <> 1
  then
    raise exception
      'LIFE_OS_GROWTH_VERSION_UNSUPPORTED';
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
      'LIFE_OS_GROWTH_PROPOSAL_KIND_INVALID';
  end if;


  if
    v_payload ->> 'kind' <> 'growth'
  then
    raise exception
      'LIFE_OS_GROWTH_PROPOSAL_KIND_MISMATCH';
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
      'LIFE_OS_GROWTH_ACTION_INVALID';
  end if;


  v_action :=
    v_payload ->> 'action';


  if
    v_action not in (
      'create_learning_item',
      'create_career_item'
    )
  then
    raise exception
      'LIFE_OS_GROWTH_ACTION_UNSUPPORTED';
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
      'LIFE_OS_GROWTH_DATA_INVALID';
  end if;


  -- =======================================================
  -- 13. TITLE
  -- =======================================================

  if
    jsonb_typeof(
      v_data -> 'title'
    ) <> 'string'
  then
    raise exception
      'LIFE_OS_GROWTH_TITLE_INVALID';
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
      'LIFE_OS_GROWTH_TITLE_INVALID';
  end if;


  -- =======================================================
  -- 14. GOAL RELATIONSHIP
  -- =======================================================

  if
    not (
      v_data ? 'goal_id'
    )
  then
    raise exception
      'LIFE_OS_GROWTH_GOAL_ID_FIELD_REQUIRED';
  end if;


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
        'LIFE_OS_GROWTH_GOAL_ID_INVALID';
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
        'LIFE_OS_GROWTH_GOAL_NOT_FOUND';
    end if;

  else

    raise exception
      'LIFE_OS_GROWTH_GOAL_ID_INVALID';

  end if;


  -- =======================================================
  -- 15. STATUS
  -- =======================================================

  if
    jsonb_typeof(
      v_data -> 'status'
    ) <> 'string'
  then
    raise exception
      'LIFE_OS_GROWTH_STATUS_INVALID';
  end if;


  v_status :=
    v_data ->> 'status';


  -- =======================================================
  -- 16. PRIORITY
  -- =======================================================

  if
    jsonb_typeof(
      v_data -> 'priority'
    ) <> 'string'
  then
    raise exception
      'LIFE_OS_GROWTH_PRIORITY_INVALID';
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
      'LIFE_OS_GROWTH_PRIORITY_INVALID';
  end if;


  -- =======================================================
  -- 17. NOTES
  -- =======================================================

  if
    not (
      v_data ? 'notes'
    )
  then
    raise exception
      'LIFE_OS_GROWTH_NOTES_FIELD_REQUIRED';
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
      or length(
        v_notes
      ) > 2000
    then
      raise exception
        'LIFE_OS_GROWTH_NOTES_INVALID';
    end if;

  else

    raise exception
      'LIFE_OS_GROWTH_NOTES_INVALID';

  end if;


  -- =======================================================
  -- 18. ACTION — CREATE LEARNING ITEM
  -- =======================================================

  if
    v_action = 'create_learning_item'
  then

    -- -----------------------------------------------------
    -- Exact shape
    -- -----------------------------------------------------

    if
      jsonb_object_length(
        v_data
      ) <> 14
    then
      raise exception
        'LIFE_OS_GROWTH_LEARNING_SHAPE_INVALID';
    end if;


    if
      not (
        v_data ? 'goal_id'
        and v_data ? 'title'
        and v_data ? 'provider'
        and v_data ? 'item_type'
        and v_data ? 'status'
        and v_data ? 'priority'
        and v_data ? 'progress_percent'
        and v_data ? 'start_date'
        and v_data ? 'target_date'
        and v_data ? 'completed_date'
        and v_data ? 'url'
        and v_data ? 'cost'
        and v_data ? 'currency'
        and v_data ? 'notes'
      )
    then
      raise exception
        'LIFE_OS_GROWTH_LEARNING_FIELDS_INVALID';
    end if;


    -- -----------------------------------------------------
    -- Provider
    -- -----------------------------------------------------

    if
      jsonb_typeof(
        v_data -> 'provider'
      ) = 'null'
    then

      v_provider :=
        null;

    elsif
      jsonb_typeof(
        v_data -> 'provider'
      ) = 'string'
    then

      v_provider :=
        trim(
          v_data ->> 'provider'
        );


      if
        length(
          v_provider
        ) = 0
        or length(
          v_provider
        ) > 120
      then
        raise exception
          'LIFE_OS_GROWTH_PROVIDER_INVALID';
      end if;

    else

      raise exception
        'LIFE_OS_GROWTH_PROVIDER_INVALID';

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
        'LIFE_OS_GROWTH_ITEM_TYPE_INVALID';
    end if;


    v_item_type :=
      v_data ->> 'item_type';


    if
      v_item_type not in (
        'course',
        'certification',
        'learning_path',
        'masters',
        'university_program',
        'other'
      )
    then
      raise exception
        'LIFE_OS_GROWTH_LEARNING_TYPE_INVALID';
    end if;


    -- -----------------------------------------------------
    -- Status
    -- -----------------------------------------------------

    if
      v_status not in (
        'planned',
        'active',
        'completed',
        'paused',
        'dropped'
      )
    then
      raise exception
        'LIFE_OS_GROWTH_LEARNING_STATUS_INVALID';
    end if;


    -- -----------------------------------------------------
    -- Progress
    -- -----------------------------------------------------

    if
      jsonb_typeof(
        v_data -> 'progress_percent'
      ) <> 'number'
    then
      raise exception
        'LIFE_OS_GROWTH_PROGRESS_INVALID';
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
        'LIFE_OS_GROWTH_PROGRESS_INVALID';
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
          'LIFE_OS_GROWTH_START_DATE_INVALID';
      end if;


      begin

        v_start_date :=
          v_start_date_text::date;

      exception
        when others
        then
          raise exception
            'LIFE_OS_GROWTH_START_DATE_INVALID';
      end;

    else

      raise exception
        'LIFE_OS_GROWTH_START_DATE_INVALID';

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
          'LIFE_OS_GROWTH_TARGET_DATE_INVALID';
      end if;


      begin

        v_target_date :=
          v_target_date_text::date;

      exception
        when others
        then
          raise exception
            'LIFE_OS_GROWTH_TARGET_DATE_INVALID';
      end;

    else

      raise exception
        'LIFE_OS_GROWTH_TARGET_DATE_INVALID';

    end if;


    -- -----------------------------------------------------
    -- Completed date
    -- -----------------------------------------------------

    if
      jsonb_typeof(
        v_data -> 'completed_date'
      ) = 'null'
    then

      v_completed_date :=
        null;

    elsif
      jsonb_typeof(
        v_data -> 'completed_date'
      ) = 'string'
    then

      v_completed_date_text :=
        v_data ->> 'completed_date';


      if
        v_completed_date_text
        !~ '^\d{4}-\d{2}-\d{2}$'
      then
        raise exception
          'LIFE_OS_GROWTH_COMPLETED_DATE_INVALID';
      end if;


      begin

        v_completed_date :=
          v_completed_date_text::date;

      exception
        when others
        then
          raise exception
            'LIFE_OS_GROWTH_COMPLETED_DATE_INVALID';
      end;

    else

      raise exception
        'LIFE_OS_GROWTH_COMPLETED_DATE_INVALID';

    end if;


    -- -----------------------------------------------------
    -- Date relationships
    -- -----------------------------------------------------

    if
      v_start_date is not null
      and v_target_date is not null
      and v_target_date < v_start_date
    then
      raise exception
        'LIFE_OS_GROWTH_DATE_RANGE_INVALID';
    end if;


    if
      v_start_date is not null
      and v_completed_date is not null
      and v_completed_date < v_start_date
    then
      raise exception
        'LIFE_OS_GROWTH_COMPLETED_DATE_INVALID';
    end if;


    -- -----------------------------------------------------
    -- URL
    -- -----------------------------------------------------

    if
      jsonb_typeof(
        v_data -> 'url'
      ) = 'null'
    then

      v_url :=
        null;

    elsif
      jsonb_typeof(
        v_data -> 'url'
      ) = 'string'
    then

      v_url :=
        trim(
          v_data ->> 'url'
        );


      if
        length(
          v_url
        ) = 0
        or length(
          v_url
        ) > 2048
        or v_url !~* '^https?://'
      then
        raise exception
          'LIFE_OS_GROWTH_URL_INVALID';
      end if;

    else

      raise exception
        'LIFE_OS_GROWTH_URL_INVALID';

    end if;


    -- -----------------------------------------------------
    -- Cost
    -- -----------------------------------------------------

    if
      jsonb_typeof(
        v_data -> 'cost'
      ) = 'null'
    then

      v_cost :=
        null;

    elsif
      jsonb_typeof(
        v_data -> 'cost'
      ) = 'number'
    then

      v_cost :=
        (
          v_data ->> 'cost'
        )::numeric;


      if
        v_cost < 0
        or v_cost > 999999999999.99
        or v_cost <> round(
          v_cost,
          2
        )
      then
        raise exception
          'LIFE_OS_GROWTH_COST_INVALID';
      end if;

    else

      raise exception
        'LIFE_OS_GROWTH_COST_INVALID';

    end if;


    -- -----------------------------------------------------
    -- Currency
    -- -----------------------------------------------------

    if
      jsonb_typeof(
        v_data -> 'currency'
      ) <> 'string'
    then
      raise exception
        'LIFE_OS_GROWTH_CURRENCY_INVALID';
    end if;


    v_currency :=
      trim(
        v_data ->> 'currency'
      );


    if
      v_currency !~ '^[A-Z]{3}$'
    then
      raise exception
        'LIFE_OS_GROWTH_CURRENCY_INVALID';
    end if;


    -- -----------------------------------------------------
    -- Insert learning item
    -- -----------------------------------------------------

    insert into public.learning_items (
      user_id,
      goal_id,
      title,
      provider,
      item_type,
      status,
      priority,
      progress_percent,
      start_date,
      target_date,
      completed_date,
      url,
      cost,
      currency,
      notes
    )
    values (
      v_user_id,
      v_goal_id,
      v_title,
      v_provider,
      v_item_type,
      v_status,
      v_priority,
      v_progress_percent::smallint,
      v_start_date,
      v_target_date,
      v_completed_date,
      v_url,
      v_cost,
      v_currency,
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
        'LIFE_OS_LEARNING_CREATE_FAILED';
    end if;


    v_target_entity_type :=
      'learning_item';

  end if;


  -- =======================================================
  -- 19. ACTION — CREATE CAREER ITEM
  -- =======================================================

  if
    v_action = 'create_career_item'
  then

    -- -----------------------------------------------------
    -- Exact shape
    -- -----------------------------------------------------

    if
      jsonb_object_length(
        v_data
      ) <> 11
    then
      raise exception
        'LIFE_OS_GROWTH_CAREER_SHAPE_INVALID';
    end if;


    if
      not (
        v_data ? 'goal_id'
        and v_data ? 'item_type'
        and v_data ? 'title'
        and v_data ? 'description'
        and v_data ? 'status'
        and v_data ? 'priority'
        and v_data ? 'rating'
        and v_data ? 'event_date'
        and v_data ? 'target_date'
        and v_data ? 'evidence_url'
        and v_data ? 'notes'
      )
    then
      raise exception
        'LIFE_OS_GROWTH_CAREER_FIELDS_INVALID';
    end if;


    -- -----------------------------------------------------
    -- Career item type
    -- -----------------------------------------------------

    if
      jsonb_typeof(
        v_data -> 'item_type'
      ) <> 'string'
    then
      raise exception
        'LIFE_OS_GROWTH_ITEM_TYPE_INVALID';
    end if;


    v_item_type :=
      v_data ->> 'item_type';


    if
      v_item_type not in (
        'current_role',
        'target_role',
        'skill',
        'achievement',
        'milestone',
        'gap'
      )
    then
      raise exception
        'LIFE_OS_GROWTH_CAREER_TYPE_INVALID';
    end if;


    -- -----------------------------------------------------
    -- Status
    -- -----------------------------------------------------

    if
      v_status not in (
        'active',
        'planned',
        'completed',
        'archived'
      )
    then
      raise exception
        'LIFE_OS_GROWTH_CAREER_STATUS_INVALID';
    end if;


    -- -----------------------------------------------------
    -- Description
    -- -----------------------------------------------------

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
          'LIFE_OS_GROWTH_DESCRIPTION_INVALID';
      end if;

    else

      raise exception
        'LIFE_OS_GROWTH_DESCRIPTION_INVALID';

    end if;


    -- -----------------------------------------------------
    -- Rating
    -- -----------------------------------------------------

    if
      jsonb_typeof(
        v_data -> 'rating'
      ) = 'null'
    then

      v_rating :=
        null;

    elsif
      jsonb_typeof(
        v_data -> 'rating'
      ) = 'number'
    then

      v_rating :=
        (
          v_data ->> 'rating'
        )::numeric;


      if
        v_rating <> trunc(
          v_rating
        )
        or v_rating < 1
        or v_rating > 5
      then
        raise exception
          'LIFE_OS_GROWTH_RATING_INVALID';
      end if;

    else

      raise exception
        'LIFE_OS_GROWTH_RATING_INVALID';

    end if;


    -- -----------------------------------------------------
    -- Event date
    -- -----------------------------------------------------

    if
      jsonb_typeof(
        v_data -> 'event_date'
      ) = 'null'
    then

      v_event_date :=
        null;

    elsif
      jsonb_typeof(
        v_data -> 'event_date'
      ) = 'string'
    then

      v_event_date_text :=
        v_data ->> 'event_date';


      if
        v_event_date_text
        !~ '^\d{4}-\d{2}-\d{2}$'
      then
        raise exception
          'LIFE_OS_GROWTH_EVENT_DATE_INVALID';
      end if;


      begin

        v_event_date :=
          v_event_date_text::date;

      exception
        when others
        then
          raise exception
            'LIFE_OS_GROWTH_EVENT_DATE_INVALID';
      end;

    else

      raise exception
        'LIFE_OS_GROWTH_EVENT_DATE_INVALID';

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
          'LIFE_OS_GROWTH_TARGET_DATE_INVALID';
      end if;


      begin

        v_target_date :=
          v_target_date_text::date;

      exception
        when others
        then
          raise exception
            'LIFE_OS_GROWTH_TARGET_DATE_INVALID';
      end;

    else

      raise exception
        'LIFE_OS_GROWTH_TARGET_DATE_INVALID';

    end if;


    -- -----------------------------------------------------
    -- Career date relationship
    -- -----------------------------------------------------

    if
      v_event_date is not null
      and v_target_date is not null
      and v_target_date < v_event_date
    then
      raise exception
        'LIFE_OS_GROWTH_DATE_RANGE_INVALID';
    end if;


    -- -----------------------------------------------------
    -- Evidence URL
    -- -----------------------------------------------------

    if
      jsonb_typeof(
        v_data -> 'evidence_url'
      ) = 'null'
    then

      v_evidence_url :=
        null;

    elsif
      jsonb_typeof(
        v_data -> 'evidence_url'
      ) = 'string'
    then

      v_evidence_url :=
        trim(
          v_data ->> 'evidence_url'
        );


      if
        length(
          v_evidence_url
        ) = 0
        or length(
          v_evidence_url
        ) > 2048
        or v_evidence_url !~* '^https?://'
      then
        raise exception
          'LIFE_OS_GROWTH_EVIDENCE_URL_INVALID';
      end if;

    else

      raise exception
        'LIFE_OS_GROWTH_EVIDENCE_URL_INVALID';

    end if;


    -- -----------------------------------------------------
    -- Insert career item
    -- -----------------------------------------------------

    insert into public.career_items (
      user_id,
      goal_id,
      item_type,
      title,
      description,
      status,
      priority,
      rating,
      event_date,
      target_date,
      evidence_url,
      notes
    )
    values (
      v_user_id,
      v_goal_id,
      v_item_type,
      v_title,
      v_description,
      v_status,
      v_priority,
      v_rating::smallint,
      v_event_date,
      v_target_date,
      v_evidence_url,
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
        'LIFE_OS_CAREER_CREATE_FAILED';
    end if;


    v_target_entity_type :=
      'career_item';

  end if;


  -- =======================================================
  -- 20. TARGET SAFETY
  -- =======================================================

  if
    v_target_entity_id is null
    or v_target_entity_type is null
  then
    raise exception
      'LIFE_OS_GROWTH_EXECUTION_TARGET_MISSING';
  end if;


  -- =======================================================
  -- 21. MARK INTAKE APPLIED
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
  -- 22. RETURN RESULT
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
-- 23. PRIVILEGES
-- =========================================================

revoke all privileges
on function public.execute_growth_intake(uuid)
from public;


revoke all privileges
on function public.execute_growth_intake(uuid)
from anon;


grant execute
on function public.execute_growth_intake(uuid)
to authenticated;


-- =========================================================
-- 24. COMMENT
-- =========================================================

comment on function public.execute_growth_intake(uuid) is
  'LIFE OS V2 transactional executor for explicitly approved growth intake. Supports create_learning_item and create_career_item only.';


-- =========================================================
-- 25. VERIFY FUNCTION EXISTS
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
    and p.proname = 'execute_growth_intake'
    and pg_get_function_identity_arguments(
      p.oid
    ) = 'p_intake_id uuid';


  if
    function_count <> 1
  then
    raise exception
      'LIFE OS migration 008 failed: execute_growth_intake(uuid) not found.';
  end if;

end;
$$;


-- =========================================================
-- 26. VERIFY SECURITY INVOKER
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
    and p.proname = 'execute_growth_intake'
    and pg_get_function_identity_arguments(
      p.oid
    ) = 'p_intake_id uuid';


  if
    is_security_definer is distinct from false
  then
    raise exception
      'LIFE OS migration 008 failed: execute_growth_intake must remain SECURITY INVOKER.';
  end if;

end;
$$;


-- =========================================================
-- 27. VERIFY ANON CANNOT EXECUTE
-- =========================================================

do $$
begin

  if
    has_function_privilege(
      'anon',
      'public.execute_growth_intake(uuid)',
      'EXECUTE'
    )
  then
    raise exception
      'LIFE OS migration 008 failed: anon can execute growth intake.';
  end if;

end;
$$;


-- =========================================================
-- 28. VERIFY AUTHENTICATED CAN EXECUTE
-- =========================================================

do $$
begin

  if
    not has_function_privilege(
      'authenticated',
      'public.execute_growth_intake(uuid)',
      'EXECUTE'
    )
  then
    raise exception
      'LIFE OS migration 008 failed: authenticated cannot execute growth intake.';
  end if;

end;
$$;


commit;


-- =========================================================
-- LIFE OS V2 — MIGRATION 008 COMPLETE
-- =========================================================
--
-- Supported:
--
-- growth
--
-- create_learning_item
--      ↓
-- learning_items
--
-- create_career_item
--      ↓
-- career_items
--
--
-- Guarantees:
--
-- ✅ authenticated only
-- ✅ SECURITY INVOKER
-- ✅ RLS remains active
-- ✅ explicit user approval required
-- ✅ growth kind only
-- ✅ proposal version 1 only
-- ✅ exact action allowlist
-- ✅ exact payload shape
-- ✅ exact field shape
-- ✅ no arbitrary tables
-- ✅ no arbitrary SQL
-- ✅ no user_id from AI proposal
-- ✅ linked goal ownership verified
-- ✅ course / certification / masters validation
-- ✅ career item type validation
-- ✅ status validation
-- ✅ priority validation
-- ✅ progress 0–100
-- ✅ rating 1–5
-- ✅ URL http/https only
-- ✅ monetary precision validation
-- ✅ currency format validation
-- ✅ dates validated
-- ✅ date relationships validated
-- ✅ row locking
-- ✅ atomic execution
-- ✅ idempotent retries
-- ✅ no duplicate learning/career record
-- ✅ no AI during execution
--
--
-- Execution matrix after app wiring:
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
-- Deterministic Growth Executor
--      ↓
-- Final LIFE OS Learning / Career Fact
-- =========================================================