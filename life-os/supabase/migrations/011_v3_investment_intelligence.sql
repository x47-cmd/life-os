-- =========================================================
-- LIFE OS — Investment Intelligence
-- Migration: 011_v3_investment_intelligence.sql
--
-- Foundation for:
--
-- LIFE Invest AI
--
-- Current V1 scope:
--   market assets / stocks / ETFs / funds / sukuk
--
-- Architecture is deliberately extensible for:
--   real estate
--   business
--
--
-- Core principles:
--
-- 1. AI analysis is advisory only.
-- 2. AI never buys or sells.
-- 3. Every prediction is stored permanently.
-- 4. Historical predictions cannot be edited by the app.
-- 5. Forecast outcomes are calculated deterministically.
-- 6. Every row belongs to auth.uid().
-- 7. Evidence is stored separately from conclusions.
-- 8. Missing evidence must remain missing.
-- 9. AI must never invent live prices or market facts.
--
--
-- Track Record:
--
-- forecast
--      ↓
-- target date
--      ↓
-- observed actual price
--      ↓
-- deterministic evaluation
--      ↓
-- direction accuracy
-- range accuracy
-- forecast error
-- Brier score
--
-- =========================================================


begin;


-- =========================================================
-- 1. INVESTMENT AI ANALYSES
-- =========================================================

create table public.investment_ai_analyses (

  id uuid primary key
    default gen_random_uuid(),


  user_id uuid not null
    references auth.users(id)
    on delete cascade,


  -- -------------------------------------------------------
  -- Current investment subject
  -- -------------------------------------------------------

  subject_kind text not null
    default 'market_asset',


  asset_id uuid,


  subject_label text not null,


  -- -------------------------------------------------------
  -- Analysis identity
  -- -------------------------------------------------------

  analysis_version text not null
    default '1',


  prompt_version text not null
    default '1',


  model_name text not null,


  model_version text,


  -- -------------------------------------------------------
  -- Data timestamp
  -- -------------------------------------------------------

  as_of timestamptz not null,


  -- -------------------------------------------------------
  -- Market reference
  -- -------------------------------------------------------

  reference_price numeric(20,6),


  currency text not null
    default 'AED',


  -- -------------------------------------------------------
  -- Evidence quality
  -- -------------------------------------------------------

  data_status text not null
    default 'partial',


  data_quality_score smallint,


  -- -------------------------------------------------------
  -- Component scores
  --
  -- 0 = weakest
  -- 100 = strongest
  --
  -- risk_score is different:
  -- 0 = lower observed risk
  -- 100 = higher observed risk
  -- -------------------------------------------------------

  fundamental_score smallint,

  technical_score smallint,

  sentiment_score smallint,

  macro_score smallint,

  portfolio_fit_score smallint,

  risk_score smallint,

  overall_score smallint,


  -- -------------------------------------------------------
  -- Investment view
  -- -------------------------------------------------------

  stance text not null
    default 'neutral',


  recommendation text not null
    default 'watch',


  confidence smallint not null
    default 0,


  -- -------------------------------------------------------
  -- Human-readable output
  -- -------------------------------------------------------

  summary text not null,

  thesis text,


  key_catalysts jsonb not null
    default '[]'::jsonb,


  key_risks jsonb not null
    default '[]'::jsonb,


  -- -------------------------------------------------------
  -- Reproducibility
  -- -------------------------------------------------------

  input_fingerprint text not null,


  -- -------------------------------------------------------
  -- Timestamp
  -- -------------------------------------------------------

  created_at timestamptz not null
    default now(),


  -- =======================================================
  -- CONSTRAINTS
  -- =======================================================

  constraint investment_ai_analyses_owner_id_unique
    unique (
      user_id,
      id
    ),


  constraint investment_ai_analyses_asset_owner_fk
    foreign key (
      user_id,
      asset_id
    )
    references public.investment_assets(
      user_id,
      id
    )
    on delete restrict,


  constraint investment_ai_analyses_subject_kind_check
    check (
      subject_kind in (
        'market_asset',
        'real_estate',
        'business'
      )
    ),


  -- Current implementation requires an existing market asset.
  --
  -- Future Real Estate / Business modules can use
  -- subject_label without changing the prediction architecture.

  constraint investment_ai_analyses_subject_relationship_check
    check (
      (
        subject_kind = 'market_asset'
        and asset_id is not null
      )
      or
      (
        subject_kind in (
          'real_estate',
          'business'
        )
        and asset_id is null
      )
    ),


  constraint investment_ai_analyses_subject_label_check
    check (
      length(
        trim(
          subject_label
        )
      ) between 1 and 160
    ),


  constraint investment_ai_analyses_analysis_version_check
    check (
      length(
        trim(
          analysis_version
        )
      ) between 1 and 50
    ),


  constraint investment_ai_analyses_prompt_version_check
    check (
      length(
        trim(
          prompt_version
        )
      ) between 1 and 50
    ),


  constraint investment_ai_analyses_model_name_check
    check (
      length(
        trim(
          model_name
        )
      ) between 1 and 120
    ),


  constraint investment_ai_analyses_model_version_check
    check (
      model_version is null
      or length(
        trim(
          model_version
        )
      ) between 1 and 120
    ),


  constraint investment_ai_analyses_reference_price_check
    check (
      reference_price is null
      or reference_price > 0
    ),


  constraint investment_ai_analyses_currency_check
    check (
      currency ~ '^[A-Z]{3}$'
    ),


  constraint investment_ai_analyses_data_status_check
    check (
      data_status in (
        'sufficient',
        'partial',
        'insufficient'
      )
    ),


  constraint investment_ai_analyses_data_quality_score_check
    check (
      data_quality_score is null
      or data_quality_score between 0 and 100
    ),


  constraint investment_ai_analyses_fundamental_score_check
    check (
      fundamental_score is null
      or fundamental_score between 0 and 100
    ),


  constraint investment_ai_analyses_technical_score_check
    check (
      technical_score is null
      or technical_score between 0 and 100
    ),


  constraint investment_ai_analyses_sentiment_score_check
    check (
      sentiment_score is null
      or sentiment_score between 0 and 100
    ),


  constraint investment_ai_analyses_macro_score_check
    check (
      macro_score is null
      or macro_score between 0 and 100
    ),


  constraint investment_ai_analyses_portfolio_fit_score_check
    check (
      portfolio_fit_score is null
      or portfolio_fit_score between 0 and 100
    ),


  constraint investment_ai_analyses_risk_score_check
    check (
      risk_score is null
      or risk_score between 0 and 100
    ),


  constraint investment_ai_analyses_overall_score_check
    check (
      overall_score is null
      or overall_score between 0 and 100
    ),


  constraint investment_ai_analyses_stance_check
    check (
      stance in (
        'strong_bullish',
        'bullish',
        'neutral',
        'bearish',
        'strong_bearish',
        'insufficient'
      )
    ),


  -- No automated SELL instruction exists in this contract.
  --
  -- LIFE Invest AI can:
  --
  -- accumulate
  -- hold
  -- watch
  -- avoid
  --
  -- Execution remains fully human-controlled.

  constraint investment_ai_analyses_recommendation_check
    check (
      recommendation in (
        'accumulate',
        'hold',
        'watch',
        'avoid',
        'insufficient'
      )
    ),


  constraint investment_ai_analyses_confidence_check
    check (
      confidence between 0 and 100
    ),


  constraint investment_ai_analyses_summary_check
    check (
      length(
        trim(
          summary
        )
      ) between 1 and 4000
    ),


  constraint investment_ai_analyses_thesis_check
    check (
      thesis is null
      or length(
        trim(
          thesis
        )
      ) between 1 and 6000
    ),


  constraint investment_ai_analyses_catalysts_json_check
    check (
      jsonb_typeof(
        key_catalysts
      ) = 'array'
    ),


  constraint investment_ai_analyses_risks_json_check
    check (
      jsonb_typeof(
        key_risks
      ) = 'array'
    ),


  -- SHA-256 hex fingerprint.
  --
  -- Used to identify the exact normalized input package that
  -- produced an analysis.

  constraint investment_ai_analyses_fingerprint_check
    check (
      input_fingerprint
        ~ '^[0-9a-f]{64}$'
    ),


  -- A fully sufficient analysis must have an overall score.
  --
  -- Partial / insufficient analysis is allowed to remain
  -- incomplete rather than inventing a score.

  constraint investment_ai_analyses_sufficient_score_check
    check (
      data_status <> 'sufficient'
      or overall_score is not null
    )
);


-- =========================================================
-- 2. INVESTMENT AI EVIDENCE
-- =========================================================
--
-- Conclusions and evidence are intentionally separate.
--
-- An analysis may say:
--
-- "earnings growth improved"
--
-- but the factual evidence row stores:
--
-- source
-- URL
-- publication timestamp
-- observation timestamp
-- factual statement
--
-- This makes later auditing possible.
-- =========================================================

create table public.investment_ai_evidence (

  id uuid primary key
    default gen_random_uuid(),


  user_id uuid not null
    references auth.users(id)
    on delete cascade,


  analysis_id uuid not null,


  source_type text not null,


  source_name text not null,


  title text not null,


  source_url text,


  published_at timestamptz,


  observed_at timestamptz not null,


  fact text not null,


  value_json jsonb,


  created_at timestamptz not null
    default now(),


  -- =======================================================
  -- CONSTRAINTS
  -- =======================================================

  constraint investment_ai_evidence_owner_id_unique
    unique (
      user_id,
      id
    ),


  constraint investment_ai_evidence_analysis_owner_fk
    foreign key (
      user_id,
      analysis_id
    )
    references public.investment_ai_analyses(
      user_id,
      id
    )
    on delete restrict,


  constraint investment_ai_evidence_source_type_check
    check (
      source_type in (
        'market_data',
        'financials',
        'filing',
        'news',
        'technical',
        'macro',
        'portfolio',
        'company',
        'other'
      )
    ),


  constraint investment_ai_evidence_source_name_check
    check (
      length(
        trim(
          source_name
        )
      ) between 1 and 160
    ),


  constraint investment_ai_evidence_title_check
    check (
      length(
        trim(
          title
        )
      ) between 1 and 500
    ),


  constraint investment_ai_evidence_url_check
    check (
      source_url is null
      or source_url ~ '^https://'
    ),


  constraint investment_ai_evidence_fact_check
    check (
      length(
        trim(
          fact
        )
      ) between 1 and 4000
    )
);


-- =========================================================
-- 3. INVESTMENT AI FORECASTS
-- =========================================================
--
-- Forecasts are APPEND-ONLY.
--
-- Once a prediction is stored:
--
-- it cannot be edited
-- it cannot be rewritten after the market moves
--
-- This is the foundation of the honest Track Record.
-- =========================================================

create table public.investment_ai_forecasts (

  id uuid primary key
    default gen_random_uuid(),


  user_id uuid not null
    references auth.users(id)
    on delete cascade,


  analysis_id uuid not null,


  asset_id uuid not null,


  -- -------------------------------------------------------
  -- Forecast window
  -- -------------------------------------------------------

  horizon_days smallint not null,


  target_date date not null,


  -- -------------------------------------------------------
  -- Reference point
  -- -------------------------------------------------------

  reference_price numeric(20,6) not null,


  currency text not null
    default 'AED',


  -- -------------------------------------------------------
  -- Direction probabilities
  --
  -- Must total exactly 100.
  -- -------------------------------------------------------

  up_probability numeric(5,2) not null,


  flat_probability numeric(5,2) not null,


  down_probability numeric(5,2) not null,


  -- -------------------------------------------------------
  -- Primary directional call
  -- -------------------------------------------------------

  direction text not null,


  -- -------------------------------------------------------
  -- Flat direction tolerance
  --
  -- Example:
  --
  -- reference = 10.00
  -- threshold = 1%
  --
  -- 10.05 => flat
  -- 10.20 => up
  --  9.80 => down
  -- -------------------------------------------------------

  flat_threshold_percent numeric(5,2) not null
    default 1.00,


  -- -------------------------------------------------------
  -- Scenario ranges
  -- -------------------------------------------------------

  bull_low numeric(20,6) not null,

  bull_high numeric(20,6) not null,


  base_low numeric(20,6) not null,

  base_high numeric(20,6) not null,


  bear_low numeric(20,6) not null,

  bear_high numeric(20,6) not null,


  -- -------------------------------------------------------
  -- Deterministic base midpoint
  -- -------------------------------------------------------

  base_midpoint numeric(20,6)
    generated always as (
      (
        base_low +
        base_high
      ) / 2
    ) stored,


  -- -------------------------------------------------------
  -- Deterministic expected return from base midpoint
  -- -------------------------------------------------------

  expected_return_mid_percent numeric(12,4)
    generated always as (
      (
        (
          (
            base_low +
            base_high
          ) / 2
        ) -
        reference_price
      )
      /
      reference_price
      *
      100
    ) stored,


  -- -------------------------------------------------------
  -- Risk / invalidation
  -- -------------------------------------------------------

  invalidation_price numeric(20,6),


  confidence smallint not null,


  thesis text not null,


  created_at timestamptz not null
    default now(),


  -- =======================================================
  -- CONSTRAINTS
  -- =======================================================

  constraint investment_ai_forecasts_owner_id_unique
    unique (
      user_id,
      id
    ),


  constraint investment_ai_forecasts_analysis_owner_fk
    foreign key (
      user_id,
      analysis_id
    )
    references public.investment_ai_analyses(
      user_id,
      id
    )
    on delete restrict,


  constraint investment_ai_forecasts_asset_owner_fk
    foreign key (
      user_id,
      asset_id
    )
    references public.investment_assets(
      user_id,
      id
    )
    on delete restrict,


  constraint investment_ai_forecasts_analysis_horizon_unique
    unique (
      user_id,
      analysis_id,
      horizon_days
    ),


  constraint investment_ai_forecasts_horizon_check
    check (
      horizon_days between 1 and 3650
    ),


  constraint investment_ai_forecasts_reference_price_check
    check (
      reference_price > 0
    ),


  constraint investment_ai_forecasts_currency_check
    check (
      currency ~ '^[A-Z]{3}$'
    ),


  constraint investment_ai_forecasts_up_probability_check
    check (
      up_probability between 0 and 100
    ),


  constraint investment_ai_forecasts_flat_probability_check
    check (
      flat_probability between 0 and 100
    ),


  constraint investment_ai_forecasts_down_probability_check
    check (
      down_probability between 0 and 100
    ),


  constraint investment_ai_forecasts_probability_total_check
    check (
      up_probability
      +
      flat_probability
      +
      down_probability
      =
      100
    ),


  constraint investment_ai_forecasts_direction_check
    check (
      direction in (
        'up',
        'flat',
        'down'
      )
    ),


  -- Direction must be one of the highest-probability outcomes.
  --
  -- Ties are allowed.

  constraint investment_ai_forecasts_direction_probability_check
    check (
      (
        direction = 'up'
        and up_probability >= flat_probability
        and up_probability >= down_probability
      )
      or
      (
        direction = 'flat'
        and flat_probability >= up_probability
        and flat_probability >= down_probability
      )
      or
      (
        direction = 'down'
        and down_probability >= up_probability
        and down_probability >= flat_probability
      )
    ),


  constraint investment_ai_forecasts_flat_threshold_check
    check (
      flat_threshold_percent
      between 0 and 10
    ),


  constraint investment_ai_forecasts_bull_range_check
    check (
      bull_low > 0
      and bull_high >= bull_low
    ),


  constraint investment_ai_forecasts_base_range_check
    check (
      base_low > 0
      and base_high >= base_low
    ),


  constraint investment_ai_forecasts_bear_range_check
    check (
      bear_low > 0
      and bear_high >= bear_low
    ),


  constraint investment_ai_forecasts_scenario_order_check
    check (
      bear_high <= base_high
      and base_low <= bull_low
    ),


  constraint investment_ai_forecasts_invalidation_check
    check (
      invalidation_price is null
      or invalidation_price > 0
    ),


  constraint investment_ai_forecasts_confidence_check
    check (
      confidence between 0 and 100
    ),


  constraint investment_ai_forecasts_thesis_check
    check (
      length(
        trim(
          thesis
        )
      ) between 1 and 4000
    )
);


-- =========================================================
-- 4. INVESTMENT AI FORECAST OUTCOMES
-- =========================================================
--
-- Outcome rows contain observed facts.
--
-- Accuracy metrics are NOT supplied by the AI.
--
-- They are calculated deterministically by PostgreSQL.
-- =========================================================

create table public.investment_ai_forecast_outcomes (

  id uuid primary key
    default gen_random_uuid(),


  user_id uuid not null
    references auth.users(id)
    on delete cascade,


  forecast_id uuid not null,


  -- -------------------------------------------------------
  -- Actual observed result
  -- -------------------------------------------------------

  evaluation_date date not null,


  actual_price numeric(20,6) not null,


  currency text not null,


  actual_source_name text not null,


  actual_source_url text,


  actual_observed_at timestamptz not null,


  -- -------------------------------------------------------
  -- Deterministically calculated result
  -- -------------------------------------------------------

  actual_change_percent numeric(12,4),


  actual_direction text,


  direction_correct boolean,


  base_range_hit boolean,


  absolute_error_percent numeric(12,4),


  -- Multiclass Brier score.
  --
  -- Lower = better calibrated probability forecast.
  --
  -- Perfect = 0
  -- Worst theoretical = 2
  -- -------------------------------------------------------

  brier_score numeric(10,8),


  created_at timestamptz not null
    default now(),


  -- =======================================================
  -- CONSTRAINTS
  -- =======================================================

  constraint investment_ai_forecast_outcomes_owner_id_unique
    unique (
      user_id,
      id
    ),


  constraint investment_ai_forecast_outcomes_forecast_unique
    unique (
      user_id,
      forecast_id
    ),


  constraint investment_ai_forecast_outcomes_forecast_owner_fk
    foreign key (
      user_id,
      forecast_id
    )
    references public.investment_ai_forecasts(
      user_id,
      id
    )
    on delete restrict,


  constraint investment_ai_forecast_outcomes_actual_price_check
    check (
      actual_price > 0
    ),


  constraint investment_ai_forecast_outcomes_currency_check
    check (
      currency ~ '^[A-Z]{3}$'
    ),


  constraint investment_ai_forecast_outcomes_source_name_check
    check (
      length(
        trim(
          actual_source_name
        )
      ) between 1 and 160
    ),


  constraint investment_ai_forecast_outcomes_source_url_check
    check (
      actual_source_url is null
      or actual_source_url ~ '^https://'
    ),


  constraint investment_ai_forecast_outcomes_actual_direction_check
    check (
      actual_direction is null
      or actual_direction in (
        'up',
        'flat',
        'down'
      )
    ),


  constraint investment_ai_forecast_outcomes_error_check
    check (
      absolute_error_percent is null
      or absolute_error_percent >= 0
    ),


  constraint investment_ai_forecast_outcomes_brier_check
    check (
      brier_score is null
      or brier_score between 0 and 2
    )
);


-- =========================================================
-- 5. OUTCOME CALCULATION FUNCTION
-- =========================================================
--
-- This function is intentionally:
--
-- SECURITY INVOKER
--
-- It does not bypass RLS.
--
-- It calculates objective forecast performance from:
--
-- stored forecast
-- +
-- actual observed price
-- =========================================================

create or replace function public.calculate_investment_ai_forecast_outcome()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$

declare

  v_forecast
    public.investment_ai_forecasts%rowtype;


  v_change_percent
    numeric;


  v_threshold
    numeric;


  v_up_probability
    numeric;


  v_flat_probability
    numeric;


  v_down_probability
    numeric;


begin

  -- -------------------------------------------------------
  -- Fetch the owner's forecast.
  --
  -- RLS remains active because this is SECURITY INVOKER.
  -- -------------------------------------------------------

  select
    *
  into
    v_forecast
  from
    public.investment_ai_forecasts
  where
    user_id = new.user_id
    and id = new.forecast_id;


  if not found then
    raise exception
      'Forecast not found or not accessible.';
  end if;


  -- -------------------------------------------------------
  -- Never grade a forecast before its target date.
  -- -------------------------------------------------------

  if
    new.evaluation_date
    <
    v_forecast.target_date
  then
    raise exception
      'Forecast cannot be evaluated before target date.';
  end if;


  -- -------------------------------------------------------
  -- Currency must match the original forecast.
  -- -------------------------------------------------------

  if
    new.currency
    <>
    v_forecast.currency
  then
    raise exception
      'Outcome currency does not match forecast currency.';
  end if;


  -- -------------------------------------------------------
  -- Percentage move
  -- -------------------------------------------------------

  v_change_percent :=
    (
      (
        new.actual_price
        -
        v_forecast.reference_price
      )
      /
      v_forecast.reference_price
    )
    *
    100;


  new.actual_change_percent :=
    round(
      v_change_percent,
      4
    );


  -- -------------------------------------------------------
  -- Actual direction
  -- -------------------------------------------------------

  v_threshold :=
    v_forecast.flat_threshold_percent;


  if
    v_change_percent
    >
    v_threshold
  then

    new.actual_direction :=
      'up';

  elsif
    v_change_percent
    <
    (
      v_threshold
      *
      -1
    )
  then

    new.actual_direction :=
      'down';

  else

    new.actual_direction :=
      'flat';

  end if;


  -- -------------------------------------------------------
  -- Direction accuracy
  -- -------------------------------------------------------

  new.direction_correct :=
    (
      new.actual_direction
      =
      v_forecast.direction
    );


  -- -------------------------------------------------------
  -- Base range accuracy
  -- -------------------------------------------------------

  new.base_range_hit :=
    (
      new.actual_price
      between
        v_forecast.base_low
        and
        v_forecast.base_high
    );


  -- -------------------------------------------------------
  -- Absolute forecast error
  --
  -- Compares actual price with deterministic base midpoint.
  -- -------------------------------------------------------

  new.absolute_error_percent :=
    round(
      (
        abs(
          new.actual_price
          -
          v_forecast.base_midpoint
        )
        /
        v_forecast.reference_price
      )
      *
      100,
      4
    );


  -- -------------------------------------------------------
  -- Probability normalization
  -- -------------------------------------------------------

  v_up_probability :=
    v_forecast.up_probability
    /
    100;


  v_flat_probability :=
    v_forecast.flat_probability
    /
    100;


  v_down_probability :=
    v_forecast.down_probability
    /
    100;


  -- -------------------------------------------------------
  -- Multiclass Brier score
  -- -------------------------------------------------------

  if
    new.actual_direction =
    'up'
  then

    new.brier_score :=
      round(
        power(
          v_up_probability - 1,
          2
        )
        +
        power(
          v_flat_probability,
          2
        )
        +
        power(
          v_down_probability,
          2
        ),
        8
      );


  elsif
    new.actual_direction =
    'flat'
  then

    new.brier_score :=
      round(
        power(
          v_up_probability,
          2
        )
        +
        power(
          v_flat_probability - 1,
          2
        )
        +
        power(
          v_down_probability,
          2
        ),
        8
      );


  else

    new.brier_score :=
      round(
        power(
          v_up_probability,
          2
        )
        +
        power(
          v_flat_probability,
          2
        )
        +
        power(
          v_down_probability - 1,
          2
        ),
        8
      );

  end if;


  return new;

end;

$$;


-- Browser-facing roles never invoke the trigger function directly.

revoke all privileges
on function public.calculate_investment_ai_forecast_outcome()
from public, anon, authenticated;


-- =========================================================
-- 6. OUTCOME CALCULATION TRIGGER
-- =========================================================

create trigger investment_ai_forecast_outcomes_calculate
before insert
on public.investment_ai_forecast_outcomes
for each row
execute function public.calculate_investment_ai_forecast_outcome();


-- =========================================================
-- 7. IMMUTABILITY FUNCTION
-- =========================================================
--
-- Forecast history must never be rewritten after market
-- movement becomes known.
-- =========================================================

create or replace function public.prevent_investment_ai_history_mutation()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$

begin

  raise exception
    'Investment AI history is append-only and cannot be modified.';

end;

$$;


revoke all privileges
on function public.prevent_investment_ai_history_mutation()
from public, anon, authenticated;


-- =========================================================
-- 8. IMMUTABILITY TRIGGERS
-- =========================================================

create trigger investment_ai_forecasts_immutable
before update or delete
on public.investment_ai_forecasts
for each row
execute function public.prevent_investment_ai_history_mutation();


create trigger investment_ai_forecast_outcomes_immutable
before update or delete
on public.investment_ai_forecast_outcomes
for each row
execute function public.prevent_investment_ai_history_mutation();


-- =========================================================
-- 9. INDEXES
-- =========================================================

create index investment_ai_analyses_user_created_idx
on public.investment_ai_analyses (
  user_id,
  created_at desc
);


create index investment_ai_analyses_asset_created_idx
on public.investment_ai_analyses (
  user_id,
  asset_id,
  created_at desc
)
where
  asset_id is not null;


create index investment_ai_evidence_analysis_idx
on public.investment_ai_evidence (
  user_id,
  analysis_id,
  observed_at desc
);


create index investment_ai_forecasts_asset_target_idx
on public.investment_ai_forecasts (
  user_id,
  asset_id,
  target_date desc
);


create index investment_ai_forecasts_analysis_idx
on public.investment_ai_forecasts (
  user_id,
  analysis_id,
  horizon_days
);


create index investment_ai_forecast_outcomes_date_idx
on public.investment_ai_forecast_outcomes (
  user_id,
  evaluation_date desc
);


-- =========================================================
-- 10. ENABLE + FORCE RLS
-- =========================================================

alter table public.investment_ai_analyses
enable row level security;


alter table public.investment_ai_analyses
force row level security;


alter table public.investment_ai_evidence
enable row level security;


alter table public.investment_ai_evidence
force row level security;


alter table public.investment_ai_forecasts
enable row level security;


alter table public.investment_ai_forecasts
force row level security;


alter table public.investment_ai_forecast_outcomes
enable row level security;


alter table public.investment_ai_forecast_outcomes
force row level security;


-- =========================================================
-- 11. LOCK DEFAULT PRIVILEGES
-- =========================================================

revoke all privileges
on table public.investment_ai_analyses
from public, anon, authenticated;


revoke all privileges
on table public.investment_ai_evidence
from public, anon, authenticated;


revoke all privileges
on table public.investment_ai_forecasts
from public, anon, authenticated;


revoke all privileges
on table public.investment_ai_forecast_outcomes
from public, anon, authenticated;


-- =========================================================
-- 12. AUTHENTICATED APPLICATION PRIVILEGES
-- =========================================================
--
-- APPEND-ONLY intelligence history:
--
-- SELECT
-- INSERT
--
-- No UPDATE.
-- No DELETE.
-- =========================================================

grant
  select,
  insert
on table public.investment_ai_analyses
to authenticated;


grant
  select,
  insert
on table public.investment_ai_evidence
to authenticated;


grant
  select,
  insert
on table public.investment_ai_forecasts
to authenticated;


grant
  select,
  insert
on table public.investment_ai_forecast_outcomes
to authenticated;


-- =========================================================
-- 13. ANALYSES RLS
-- =========================================================

create policy investment_ai_analyses_select_own
on public.investment_ai_analyses
for select
to authenticated
using (
  (
    select auth.uid()
  )
  =
  user_id
);


create policy investment_ai_analyses_insert_own
on public.investment_ai_analyses
for insert
to authenticated
with check (
  (
    select auth.uid()
  )
  =
  user_id
);


-- =========================================================
-- 14. EVIDENCE RLS
-- =========================================================

create policy investment_ai_evidence_select_own
on public.investment_ai_evidence
for select
to authenticated
using (
  (
    select auth.uid()
  )
  =
  user_id
);


create policy investment_ai_evidence_insert_own
on public.investment_ai_evidence
for insert
to authenticated
with check (
  (
    select auth.uid()
  )
  =
  user_id
);


-- =========================================================
-- 15. FORECASTS RLS
-- =========================================================

create policy investment_ai_forecasts_select_own
on public.investment_ai_forecasts
for select
to authenticated
using (
  (
    select auth.uid()
  )
  =
  user_id
);


create policy investment_ai_forecasts_insert_own
on public.investment_ai_forecasts
for insert
to authenticated
with check (
  (
    select auth.uid()
  )
  =
  user_id
);


-- =========================================================
-- 16. OUTCOMES RLS
-- =========================================================

create policy investment_ai_forecast_outcomes_select_own
on public.investment_ai_forecast_outcomes
for select
to authenticated
using (
  (
    select auth.uid()
  )
  =
  user_id
);


create policy investment_ai_forecast_outcomes_insert_own
on public.investment_ai_forecast_outcomes
for insert
to authenticated
with check (
  (
    select auth.uid()
  )
  =
  user_id
);


-- =========================================================
-- 17. TRACK RECORD VIEW
-- =========================================================
--
-- Overall objective performance.
--
-- The view does not ask AI whether it was correct.
--
-- PostgreSQL calculates the statistics from immutable
-- forecast outcomes.
-- =========================================================

create view public.investment_ai_track_record
with (
  security_invoker = true
)
as

select

  user_id,


  count(*)::bigint
    as evaluated_forecasts,


  round(
    avg(
      case
        when direction_correct
          then 100::numeric
        else 0::numeric
      end
    ),
    2
  )
    as directional_accuracy_percent,


  round(
    avg(
      case
        when base_range_hit
          then 100::numeric
        else 0::numeric
      end
    ),
    2
  )
    as base_range_accuracy_percent,


  round(
    avg(
      absolute_error_percent
    ),
    2
  )
    as average_absolute_error_percent,


  round(
    avg(
      brier_score
    ),
    6
  )
    as average_brier_score,


  min(
    evaluation_date
  )
    as first_evaluation_date,


  max(
    evaluation_date
  )
    as latest_evaluation_date


from
  public.investment_ai_forecast_outcomes

group by
  user_id;


-- =========================================================
-- 18. TRACK RECORD VIEW PRIVILEGES
-- =========================================================

revoke all privileges
on table public.investment_ai_track_record
from public, anon, authenticated;


grant select
on table public.investment_ai_track_record
to authenticated;


-- =========================================================
-- 19. COMMENTS
-- =========================================================

comment on table public.investment_ai_analyses
is
'Append-oriented LIFE Invest AI analysis records. AI advisory output only.';


comment on table public.investment_ai_evidence
is
'Source-backed factual evidence used by LIFE Invest AI analyses.';


comment on table public.investment_ai_forecasts
is
'Immutable probabilistic market forecasts used for objective Track Record measurement.';


comment on table public.investment_ai_forecast_outcomes
is
'Immutable observed outcomes with deterministic forecast accuracy metrics.';


comment on view public.investment_ai_track_record
is
'Objective LIFE Invest AI performance metrics calculated from immutable historical forecast outcomes.';


-- =========================================================
-- 20. FINAL SECURITY CONTRACT
-- =========================================================
--
-- User
--      ↓
-- authenticated Supabase session
--      ↓
-- RLS owner isolation
--      ↓
-- LIFE Invest AI analysis
--      ↓
-- evidence
--      ↓
-- immutable forecast
--      ↓
-- future observed market price
--      ↓
-- deterministic grading
--
--
-- AI CANNOT:
--
-- rewrite old forecasts
-- rewrite outcomes
-- buy securities
-- sell securities
-- transfer money
-- place broker orders
-- bypass RLS
--
--
-- Missing market evidence remains missing.
--
-- No fabricated confidence.
-- No fabricated live price.
-- No hidden retrospective editing.
-- =========================================================


commit;