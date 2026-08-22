-- =========================================================
-- LIFE OS — Version 1 Database Schema
-- Migration: 001_v1_schema.sql
--
-- Purpose:
-- Create the complete LIFE OS V1 relational schema.
--
-- IMPORTANT:
-- - RLS policies are NOT defined here.
-- - RLS is implemented in 002_v1_rls.sql.
-- - No real personal data belongs in this file.
-- - Direct application privileges remain locked until 002.
-- =========================================================


-- =========================================================
-- 1. SHARED UPDATED_AT FUNCTION
-- =========================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- The trigger function is infrastructure.
-- Browser-facing roles must never invoke it directly.

revoke all privileges
on function public.set_updated_at()
from public, anon, authenticated;


-- =========================================================
-- 2. PROFILES
-- =========================================================

create table public.profiles (
  user_id uuid primary key
    references auth.users(id)
    on delete cascade,

  display_name text,

  default_currency text not null default 'AED',
  timezone text not null default 'Asia/Dubai',
  locale text not null default 'ar-AE',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profiles_currency_format_check
    check (default_currency ~ '^[A-Z]{3}$'),

  constraint profiles_timezone_not_blank_check
    check (length(trim(timezone)) > 0),

  constraint profiles_locale_not_blank_check
    check (length(trim(locale)) > 0),

  constraint profiles_display_name_not_blank_check
    check (
      display_name is null
      or length(trim(display_name)) > 0
    )
);


-- =========================================================
-- 3. INCOME SOURCES
-- =========================================================

create table public.income_sources (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  name text not null,

  amount numeric(14,2) not null,

  frequency text not null default 'monthly',

  is_active boolean not null default true,

  next_expected_date date,

  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint income_sources_name_not_blank_check
    check (length(trim(name)) > 0),

  constraint income_sources_amount_check
    check (amount >= 0),

  constraint income_sources_frequency_check
    check (
      frequency in (
        'monthly',
        'annual',
        'one_time',
        'other'
      )
    ),

  constraint income_sources_notes_not_blank_check
    check (
      notes is null
      or length(trim(notes)) > 0
    )
);


-- =========================================================
-- 4. BUDGET ITEMS
-- =========================================================

create table public.budget_items (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  name text not null,

  category text not null,

  item_type text not null,

  amount numeric(14,2) not null,

  frequency text not null default 'monthly',

  due_day smallint,

  is_active boolean not null default true,

  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint budget_items_name_not_blank_check
    check (length(trim(name)) > 0),

  constraint budget_items_category_check
    check (
      category in (
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
    ),

  constraint budget_items_type_check
    check (
      item_type in (
        'expense',
        'saving',
        'investment',
        'debt'
      )
    ),

  constraint budget_items_amount_check
    check (amount >= 0),

  constraint budget_items_frequency_check
    check (
      frequency in (
        'monthly',
        'annual',
        'one_time',
        'other'
      )
    ),

  constraint budget_items_due_day_check
    check (
      due_day is null
      or due_day between 1 and 31
    ),

  constraint budget_items_notes_not_blank_check
    check (
      notes is null
      or length(trim(notes)) > 0
    )
);


-- =========================================================
-- 5. MONTHLY SNAPSHOTS
-- =========================================================

create table public.monthly_snapshots (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  month date not null,

  total_income numeric(14,2) not null default 0,
  total_budget numeric(14,2) not null default 0,
  total_savings numeric(14,2) not null default 0,
  total_investments numeric(14,2) not null default 0,

  available_amount numeric(14,2) not null default 0,

  emergency_fund_balance numeric(14,2) not null default 0,
  travel_savings_balance numeric(14,2) not null default 0,

  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint monthly_snapshots_user_month_unique
    unique (user_id, month),

  constraint monthly_snapshots_month_first_day_check
    check (
      month = date_trunc('month', month)::date
    ),

  constraint monthly_snapshots_income_check
    check (total_income >= 0),

  constraint monthly_snapshots_budget_check
    check (total_budget >= 0),

  constraint monthly_snapshots_savings_check
    check (total_savings >= 0),

  constraint monthly_snapshots_investments_check
    check (total_investments >= 0),

  constraint monthly_snapshots_emergency_check
    check (emergency_fund_balance >= 0),

  constraint monthly_snapshots_travel_check
    check (travel_savings_balance >= 0),

  constraint monthly_snapshots_notes_not_blank_check
    check (
      notes is null
      or length(trim(notes)) > 0
    )
);


-- =========================================================
-- 6. INVESTMENT ASSETS
-- =========================================================

create table public.investment_assets (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  ticker text not null,
  name text not null,
  market text not null,

  asset_type text not null,

  currency text not null default 'AED',

  quantity numeric(20,8) not null default 0,
  average_cost numeric(20,6) not null default 0,
  reference_price numeric(20,6),

  monthly_contribution_target numeric(14,2),
  target_quantity numeric(20,8),

  is_active boolean not null default true,

  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint investment_assets_owner_id_unique
    unique (user_id, id),

  constraint investment_assets_instrument_unique
    unique (user_id, ticker, market),

  constraint investment_assets_ticker_not_blank_check
    check (length(trim(ticker)) > 0),

  constraint investment_assets_ticker_uppercase_check
    check (ticker = upper(ticker)),

  constraint investment_assets_name_not_blank_check
    check (length(trim(name)) > 0),

  constraint investment_assets_market_not_blank_check
    check (length(trim(market)) > 0),

  constraint investment_assets_type_check
    check (
      asset_type in (
        'stock',
        'etf',
        'sukuk',
        'fund',
        'cash',
        'other'
      )
    ),

  constraint investment_assets_currency_format_check
    check (currency ~ '^[A-Z]{3}$'),

  constraint investment_assets_quantity_check
    check (quantity >= 0),

  constraint investment_assets_average_cost_check
    check (average_cost >= 0),

  constraint investment_assets_reference_price_check
    check (
      reference_price is null
      or reference_price >= 0
    ),

  constraint investment_assets_monthly_target_check
    check (
      monthly_contribution_target is null
      or monthly_contribution_target >= 0
    ),

  constraint investment_assets_target_quantity_check
    check (
      target_quantity is null
      or target_quantity >= 0
    ),

  constraint investment_assets_notes_not_blank_check
    check (
      notes is null
      or length(trim(notes)) > 0
    )
);


-- =========================================================
-- 7. INVESTMENT TRANSACTIONS
-- =========================================================

create table public.investment_transactions (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  asset_id uuid not null,

  transaction_type text not null,

  transaction_date date not null,

  quantity numeric(20,8),
  unit_price numeric(20,6),

  total_amount numeric(14,2) not null,

  fees numeric(14,2) not null default 0,

  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint investment_transactions_asset_owner_fk
    foreign key (user_id, asset_id)
    references public.investment_assets(user_id, id)
    on delete restrict,

  constraint investment_transactions_type_check
    check (
      transaction_type in (
        'buy',
        'sell',
        'dividend',
        'fee',
        'adjustment'
      )
    ),

  constraint investment_transactions_quantity_check
    check (
      quantity is null
      or quantity >= 0
    ),

  constraint investment_transactions_unit_price_check
    check (
      unit_price is null
      or unit_price >= 0
    ),

  constraint investment_transactions_total_amount_check
    check (total_amount >= 0),

  constraint investment_transactions_fees_check
    check (fees >= 0),

  constraint investment_transactions_notes_not_blank_check
    check (
      notes is null
      or length(trim(notes)) > 0
    )
);


-- =========================================================
-- 8. GOALS
-- =========================================================

create table public.goals (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  title text not null,

  category text not null,

  description text,

  target_value numeric(18,4),
  current_value numeric(18,4),

  unit text,

  progress_percent smallint not null default 0,

  target_date date,

  priority text not null default 'medium',

  status text not null default 'planned',

  next_action text,

  sort_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint goals_owner_id_unique
    unique (user_id, id),

  constraint goals_title_not_blank_check
    check (length(trim(title)) > 0),

  constraint goals_category_check
    check (
      category in (
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
    ),

  constraint goals_progress_check
    check (
      progress_percent between 0 and 100
    ),

  constraint goals_priority_check
    check (
      priority in (
        'low',
        'medium',
        'high'
      )
    ),

  constraint goals_status_check
    check (
      status in (
        'planned',
        'active',
        'paused',
        'completed',
        'cancelled'
      )
    ),

  constraint goals_sort_order_check
    check (sort_order >= 0),

  constraint goals_description_not_blank_check
    check (
      description is null
      or length(trim(description)) > 0
    ),

  constraint goals_unit_not_blank_check
    check (
      unit is null
      or length(trim(unit)) > 0
    ),

  constraint goals_next_action_not_blank_check
    check (
      next_action is null
      or length(trim(next_action)) > 0
    )
);


-- =========================================================
-- 9. PROJECTS
-- =========================================================

create table public.projects (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  goal_id uuid,

  title text not null,

  description text,

  category text not null,

  status text not null default 'planned',

  progress_percent smallint not null default 0,

  priority text not null default 'medium',

  start_date date,
  target_date date,

  next_action text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint projects_owner_id_unique
    unique (user_id, id),

  constraint projects_goal_owner_fk
    foreign key (user_id, goal_id)
    references public.goals(user_id, id)
    on delete restrict,

  constraint projects_title_not_blank_check
    check (length(trim(title)) > 0),

  constraint projects_description_not_blank_check
    check (
      description is null
      or length(trim(description)) > 0
    ),

  constraint projects_category_check
    check (
      category in (
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
    ),

  constraint projects_status_check
    check (
      status in (
        'planned',
        'active',
        'blocked',
        'paused',
        'completed',
        'cancelled'
      )
    ),

  constraint projects_progress_check
    check (
      progress_percent between 0 and 100
    ),

  constraint projects_priority_check
    check (
      priority in (
        'low',
        'medium',
        'high'
      )
    ),

  constraint projects_dates_check
    check (
      start_date is null
      or target_date is null
      or target_date >= start_date
    ),

  constraint projects_next_action_not_blank_check
    check (
      next_action is null
      or length(trim(next_action)) > 0
    )
);


-- =========================================================
-- 10. TASKS
-- =========================================================

create table public.tasks (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  goal_id uuid,
  project_id uuid,

  title text not null,

  notes text,

  priority text not null default 'medium',

  status text not null default 'pending',

  due_date date,

  completed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint tasks_goal_owner_fk
    foreign key (user_id, goal_id)
    references public.goals(user_id, id)
    on delete restrict,

  constraint tasks_project_owner_fk
    foreign key (user_id, project_id)
    references public.projects(user_id, id)
    on delete restrict,

  constraint tasks_title_not_blank_check
    check (length(trim(title)) > 0),

  constraint tasks_notes_not_blank_check
    check (
      notes is null
      or length(trim(notes)) > 0
    ),

  constraint tasks_priority_check
    check (
      priority in (
        'low',
        'medium',
        'high'
      )
    ),

  constraint tasks_status_check
    check (
      status in (
        'pending',
        'active',
        'completed',
        'cancelled'
      )
    ),

  constraint tasks_completion_state_check
    check (
      (
        status = 'completed'
        and completed_at is not null
      )
      or
      (
        status <> 'completed'
        and completed_at is null
      )
    )
);


-- =========================================================
-- 11. LEARNING ITEMS
-- =========================================================

create table public.learning_items (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  goal_id uuid,

  title text not null,

  provider text,

  item_type text not null,

  status text not null default 'planned',

  priority text not null default 'medium',

  progress_percent smallint not null default 0,

  start_date date,
  target_date date,
  completed_date date,

  url text,

  cost numeric(14,2),

  currency text not null default 'AED',

  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint learning_items_goal_owner_fk
    foreign key (user_id, goal_id)
    references public.goals(user_id, id)
    on delete restrict,

  constraint learning_items_title_not_blank_check
    check (length(trim(title)) > 0),

  constraint learning_items_provider_not_blank_check
    check (
      provider is null
      or length(trim(provider)) > 0
    ),

  constraint learning_items_type_check
    check (
      item_type in (
        'course',
        'certification',
        'learning_path',
        'masters',
        'university_program',
        'other'
      )
    ),

  constraint learning_items_status_check
    check (
      status in (
        'planned',
        'active',
        'completed',
        'paused',
        'dropped'
      )
    ),

  constraint learning_items_priority_check
    check (
      priority in (
        'low',
        'medium',
        'high'
      )
    ),

  constraint learning_items_progress_check
    check (
      progress_percent between 0 and 100
    ),

  constraint learning_items_cost_check
    check (
      cost is null
      or cost >= 0
    ),

  constraint learning_items_currency_format_check
    check (currency ~ '^[A-Z]{3}$'),

  constraint learning_items_dates_check
    check (
      start_date is null
      or target_date is null
      or target_date >= start_date
    ),

  constraint learning_items_completed_date_check
    check (
      completed_date is null
      or start_date is null
      or completed_date >= start_date
    ),

  constraint learning_items_url_not_blank_check
    check (
      url is null
      or length(trim(url)) > 0
    ),

  constraint learning_items_notes_not_blank_check
    check (
      notes is null
      or length(trim(notes)) > 0
    )
);


-- =========================================================
-- 12. CAREER ITEMS
-- =========================================================

create table public.career_items (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  goal_id uuid,

  item_type text not null,

  title text not null,

  description text,

  status text not null default 'active',

  priority text not null default 'medium',

  rating smallint,

  event_date date,
  target_date date,

  evidence_url text,

  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint career_items_goal_owner_fk
    foreign key (user_id, goal_id)
    references public.goals(user_id, id)
    on delete restrict,

  constraint career_items_type_check
    check (
      item_type in (
        'current_role',
        'target_role',
        'skill',
        'achievement',
        'milestone',
        'gap'
      )
    ),

  constraint career_items_title_not_blank_check
    check (length(trim(title)) > 0),

  constraint career_items_description_not_blank_check
    check (
      description is null
      or length(trim(description)) > 0
    ),

  constraint career_items_status_check
    check (
      status in (
        'active',
        'planned',
        'completed',
        'archived'
      )
    ),

  constraint career_items_priority_check
    check (
      priority in (
        'low',
        'medium',
        'high'
      )
    ),

  constraint career_items_rating_check
    check (
      rating is null
      or rating between 1 and 5
    ),

  constraint career_items_dates_check
    check (
      event_date is null
      or target_date is null
      or target_date >= event_date
    ),

  constraint career_items_evidence_url_not_blank_check
    check (
      evidence_url is null
      or length(trim(evidence_url)) > 0
    ),

  constraint career_items_notes_not_blank_check
    check (
      notes is null
      or length(trim(notes)) > 0
    )
);


-- =========================================================
-- 13. MEMORY ITEMS
-- =========================================================

create table public.memory_items (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  category text not null,

  title text not null,

  content text not null,

  importance text not null default 'medium',

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint memory_items_category_check
    check (
      category in (
        'finance',
        'investments',
        'career',
        'learning',
        'education',
        'projects',
        'travel',
        'fitness',
        'personal',
        'preference',
        'constraint',
        'decision',
        'other'
      )
    ),

  constraint memory_items_title_not_blank_check
    check (length(trim(title)) > 0),

  constraint memory_items_content_not_blank_check
    check (length(trim(content)) > 0),

  constraint memory_items_importance_check
    check (
      importance in (
        'low',
        'medium',
        'high'
      )
    )
);


-- =========================================================
-- 14. AI RECOMMENDATIONS
-- =========================================================

create table public.ai_recommendations (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  category text not null,

  title text not null,

  recommendation text not null,

  priority text not null default 'medium',

  status text not null default 'new',

  related_entity_type text,
  related_entity_id uuid,

  reviewed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint ai_recommendations_category_check
    check (
      category in (
        'general',
        'finance',
        'investments',
        'goals',
        'projects',
        'career',
        'learning',
        'education',
        'travel',
        'fitness',
        'opportunity',
        'decision'
      )
    ),

  constraint ai_recommendations_title_not_blank_check
    check (length(trim(title)) > 0),

  constraint ai_recommendations_recommendation_not_blank_check
    check (length(trim(recommendation)) > 0),

  constraint ai_recommendations_priority_check
    check (
      priority in (
        'low',
        'medium',
        'high'
      )
    ),

  constraint ai_recommendations_status_check
    check (
      status in (
        'new',
        'reviewed',
        'accepted',
        'dismissed'
      )
    ),

  constraint ai_recommendations_entity_type_check
    check (
      related_entity_type is null
      or related_entity_type in (
        'goal',
        'project',
        'learning',
        'career',
        'investment',
        'task'
      )
    ),

  constraint ai_recommendations_relationship_pair_check
    check (
      (
        related_entity_type is null
        and related_entity_id is null
      )
      or
      (
        related_entity_type is not null
        and related_entity_id is not null
      )
    ),

  constraint ai_recommendations_review_state_check
    check (
      (
        status = 'new'
        and reviewed_at is null
      )
      or
      (
        status in (
          'reviewed',
          'accepted',
          'dismissed'
        )
        and reviewed_at is not null
      )
    )
);


-- =========================================================
-- 15. AUDIT LOGS
-- =========================================================

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  action text not null,

  entity_type text,
  entity_id uuid,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint audit_logs_action_not_blank_check
    check (length(trim(action)) > 0),

  constraint audit_logs_entity_type_not_blank_check
    check (
      entity_type is null
      or length(trim(entity_type)) > 0
    ),

  constraint audit_logs_metadata_object_check
    check (
      jsonb_typeof(metadata) = 'object'
    ),

  constraint audit_logs_entity_pair_check
    check (
      entity_id is null
      or entity_type is not null
    )
);


-- =========================================================
-- 16. PRE-RLS PRIVILEGE LOCKDOWN
-- =========================================================
--
-- Supabase projects may define default privileges for newly
-- created public tables.
--
-- This migration therefore closes direct browser-role access
-- immediately, before the RLS migration is applied.
--
-- 002_v1_rls.sql will later grant only the minimum required
-- privileges after RLS + AAL2 policies are installed.
-- =========================================================

revoke all privileges
on table public.profiles
from public, anon, authenticated;


revoke all privileges
on table public.income_sources
from public, anon, authenticated;


revoke all privileges
on table public.budget_items
from public, anon, authenticated;


revoke all privileges
on table public.monthly_snapshots
from public, anon, authenticated;


revoke all privileges
on table public.investment_assets
from public, anon, authenticated;


revoke all privileges
on table public.investment_transactions
from public, anon, authenticated;


revoke all privileges
on table public.goals
from public, anon, authenticated;


revoke all privileges
on table public.projects
from public, anon, authenticated;


revoke all privileges
on table public.tasks
from public, anon, authenticated;


revoke all privileges
on table public.learning_items
from public, anon, authenticated;


revoke all privileges
on table public.career_items
from public, anon, authenticated;


revoke all privileges
on table public.memory_items
from public, anon, authenticated;


revoke all privileges
on table public.ai_recommendations
from public, anon, authenticated;


revoke all privileges
on table public.audit_logs
from public, anon, authenticated;


-- =========================================================
-- 17. INDEXES — FINANCE
-- =========================================================

create index income_sources_user_active_idx
  on public.income_sources (
    user_id,
    is_active
  );


create index budget_items_user_active_idx
  on public.budget_items (
    user_id,
    is_active
  );


create index budget_items_user_category_idx
  on public.budget_items (
    user_id,
    category
  );


create index monthly_snapshots_user_month_idx
  on public.monthly_snapshots (
    user_id,
    month desc
  );


-- =========================================================
-- 18. INDEXES — INVESTMENTS
-- =========================================================

create index investment_assets_user_active_idx
  on public.investment_assets (
    user_id,
    is_active
  );


create index investment_assets_user_type_idx
  on public.investment_assets (
    user_id,
    asset_type
  );


create index investment_transactions_user_asset_date_idx
  on public.investment_transactions (
    user_id,
    asset_id,
    transaction_date desc
  );


create index investment_transactions_user_date_idx
  on public.investment_transactions (
    user_id,
    transaction_date desc
  );


-- =========================================================
-- 19. INDEXES — GOALS / PROJECTS / TASKS
-- =========================================================

create index goals_user_status_priority_idx
  on public.goals (
    user_id,
    status,
    priority
  );


create index goals_user_target_date_idx
  on public.goals (
    user_id,
    target_date
  );


create index goals_user_category_idx
  on public.goals (
    user_id,
    category
  );


create index projects_user_status_priority_idx
  on public.projects (
    user_id,
    status,
    priority
  );


create index projects_user_target_date_idx
  on public.projects (
    user_id,
    target_date
  );


create index projects_user_goal_idx
  on public.projects (
    user_id,
    goal_id
  );


create index tasks_user_status_due_date_idx
  on public.tasks (
    user_id,
    status,
    due_date
  );


create index tasks_user_priority_idx
  on public.tasks (
    user_id,
    priority
  );


create index tasks_user_goal_idx
  on public.tasks (
    user_id,
    goal_id
  );


create index tasks_user_project_idx
  on public.tasks (
    user_id,
    project_id
  );


-- =========================================================
-- 20. INDEXES — LEARNING / CAREER
-- =========================================================

create index learning_items_user_status_priority_idx
  on public.learning_items (
    user_id,
    status,
    priority
  );


create index learning_items_user_target_date_idx
  on public.learning_items (
    user_id,
    target_date
  );


create index learning_items_user_type_idx
  on public.learning_items (
    user_id,
    item_type
  );


create index learning_items_user_goal_idx
  on public.learning_items (
    user_id,
    goal_id
  );


create index career_items_user_type_status_idx
  on public.career_items (
    user_id,
    item_type,
    status
  );


create index career_items_user_priority_idx
  on public.career_items (
    user_id,
    priority
  );


create index career_items_user_goal_idx
  on public.career_items (
    user_id,
    goal_id
  );


-- =========================================================
-- 21. INDEXES — MEMORY / AI / AUDIT
-- =========================================================

create index memory_items_user_active_importance_idx
  on public.memory_items (
    user_id,
    is_active,
    importance
  );


create index memory_items_user_category_idx
  on public.memory_items (
    user_id,
    category
  );


create index memory_items_user_updated_at_idx
  on public.memory_items (
    user_id,
    updated_at desc
  );


create index ai_recommendations_user_status_created_idx
  on public.ai_recommendations (
    user_id,
    status,
    created_at desc
  );


create index ai_recommendations_user_category_idx
  on public.ai_recommendations (
    user_id,
    category
  );


create index audit_logs_user_created_idx
  on public.audit_logs (
    user_id,
    created_at desc
  );


create index audit_logs_user_action_idx
  on public.audit_logs (
    user_id,
    action
  );


-- =========================================================
-- 22. UPDATED_AT TRIGGERS
-- =========================================================

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();


create trigger income_sources_set_updated_at
before update on public.income_sources
for each row
execute function public.set_updated_at();


create trigger budget_items_set_updated_at
before update on public.budget_items
for each row
execute function public.set_updated_at();


create trigger monthly_snapshots_set_updated_at
before update on public.monthly_snapshots
for each row
execute function public.set_updated_at();


create trigger investment_assets_set_updated_at
before update on public.investment_assets
for each row
execute function public.set_updated_at();


create trigger investment_transactions_set_updated_at
before update on public.investment_transactions
for each row
execute function public.set_updated_at();


create trigger goals_set_updated_at
before update on public.goals
for each row
execute function public.set_updated_at();


create trigger projects_set_updated_at
before update on public.projects
for each row
execute function public.set_updated_at();


create trigger tasks_set_updated_at
before update on public.tasks
for each row
execute function public.set_updated_at();


create trigger learning_items_set_updated_at
before update on public.learning_items
for each row
execute function public.set_updated_at();


create trigger career_items_set_updated_at
before update on public.career_items
for each row
execute function public.set_updated_at();


create trigger memory_items_set_updated_at
before update on public.memory_items
for each row
execute function public.set_updated_at();


create trigger ai_recommendations_set_updated_at
before update on public.ai_recommendations
for each row
execute function public.set_updated_at();


-- =========================================================
-- 23. SCHEMA COMMENTS
-- =========================================================

comment on table public.profiles is
  'Private LIFE OS owner profile and non-secret preferences.';


comment on table public.income_sources is
  'Current and planned personal income sources.';


comment on table public.budget_items is
  'Planned expenses, savings, investments and debt allocations.';


comment on table public.monthly_snapshots is
  'Historical monthly financial summaries.';


comment on table public.investment_assets is
  'Current LIFE OS investment positions and planning targets.';


comment on table public.investment_transactions is
  'Historical investment activity records.';


comment on table public.goals is
  'Personal and professional LIFE OS goals.';


comment on table public.projects is
  'Multi-step initiatives linked optionally to LIFE OS goals.';


comment on table public.tasks is
  'Concrete actionable tasks linked optionally to goals or projects.';


comment on table public.learning_items is
  'Courses, certifications, learning paths and education programs.';


comment on table public.career_items is
  'Structured career roles, skills, achievements, milestones and gaps.';


comment on table public.memory_items is
  'Structured long-term personal context for LIFE OS intelligence.';


comment on table public.ai_recommendations is
  'Useful AI recommendations intentionally retained for later review.';


comment on table public.audit_logs is
  'Append-oriented safe audit history for important LIFE OS actions.';


-- =========================================================
-- 24. MIGRATION COMPLETION
-- =========================================================

-- LIFE OS V1 schema:
--
-- 14 primary tables
-- deterministic constraints
-- ownership-preserving relationships
-- financial numeric precision
-- investment precision
-- indexes for expected V1 query patterns
-- automatic updated_at handling
-- immediate browser-role privilege lockdown
--
-- SECURITY POLICIES ARE DEFINED SEPARATELY IN:
--
-- supabase/migrations/002_v1_rls.sql
--
-- END OF LIFE OS V1 SCHEMA