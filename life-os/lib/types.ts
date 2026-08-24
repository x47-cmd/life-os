/**
 * LIFE OS — Shared Core Types
 *
 * V1 foundation
 * +
 * V2 Universal Intake
 *
 * This file defines the shared TypeScript domain model used across:
 *
 * - database access
 * - application pages
 * - deterministic calculations
 * - Dashboard
 * - AI context
 * - AI tools
 * - Universal Intake
 * - Decision Simulator
 * - Opportunity Engine
 *
 * Rules:
 *
 * - No `any`.
 * - No framework-specific UI types.
 * - No secrets.
 * - Database facts remain separate from AI interpretations.
 * - AI proposals are never authoritative before user approval.
 */


/* =========================================================
 * 1. GENERIC TYPES
 * ======================================================= */

export type UUID = string;

export type ISODate = string;

export type ISODateTime = string;

export type CurrencyCode = string;

export type Nullable<T> = T | null;

export type JsonPrimitive =
  | string
  | number
  | boolean
  | null;

export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | {
      [key: string]: JsonValue;
    };

export type JsonObject = {
  [key: string]: JsonValue;
};


/* =========================================================
 * 2. SHARED DOMAIN VALUES
 * ======================================================= */

export type Priority =
  | "low"
  | "medium"
  | "high";


export type GoalStatus =
  | "planned"
  | "active"
  | "paused"
  | "completed"
  | "cancelled";


export type ProjectStatus =
  | "planned"
  | "active"
  | "blocked"
  | "paused"
  | "completed"
  | "cancelled";


export type TaskStatus =
  | "pending"
  | "active"
  | "completed"
  | "cancelled";


export type LearningStatus =
  | "planned"
  | "active"
  | "completed"
  | "paused"
  | "dropped";


export type CareerStatus =
  | "active"
  | "planned"
  | "completed"
  | "archived";


export type AIRecommendationStatus =
  | "new"
  | "reviewed"
  | "accepted"
  | "dismissed";


export type Frequency =
  | "monthly"
  | "annual"
  | "one_time"
  | "other";


/* =========================================================
 * 3. CATEGORY TYPES
 * ======================================================= */

export type GoalCategory =
  | "finance"
  | "investments"
  | "career"
  | "learning"
  | "education"
  | "business"
  | "travel"
  | "fitness"
  | "personal"
  | "other";


export type ProjectCategory =
  | "ai"
  | "career"
  | "education"
  | "finance"
  | "investments"
  | "business"
  | "travel"
  | "fitness"
  | "personal"
  | "other";


export type BudgetCategory =
  | "family"
  | "housing"
  | "debt"
  | "transport"
  | "personal"
  | "travel"
  | "emergency"
  | "investments"
  | "education"
  | "business"
  | "other";


export type BudgetItemType =
  | "expense"
  | "saving"
  | "investment"
  | "debt";


export type InvestmentAssetType =
  | "stock"
  | "etf"
  | "sukuk"
  | "fund"
  | "cash"
  | "other";


export type InvestmentTransactionType =
  | "buy"
  | "sell"
  | "dividend"
  | "fee"
  | "adjustment";


export type LearningItemType =
  | "course"
  | "certification"
  | "learning_path"
  | "masters"
  | "university_program"
  | "other";


export type CareerItemType =
  | "current_role"
  | "target_role"
  | "skill"
  | "achievement"
  | "milestone"
  | "gap";


export type MemoryCategory =
  | "finance"
  | "investments"
  | "career"
  | "learning"
  | "education"
  | "projects"
  | "travel"
  | "fitness"
  | "personal"
  | "preference"
  | "constraint"
  | "decision"
  | "other";


export type MemoryImportance =
  Priority;


export type AIRecommendationCategory =
  | "general"
  | "finance"
  | "investments"
  | "goals"
  | "projects"
  | "career"
  | "learning"
  | "education"
  | "travel"
  | "fitness"
  | "opportunity"
  | "decision";


export type AIRecommendationEntityType =
  | "goal"
  | "project"
  | "learning"
  | "career"
  | "investment"
  | "task";


/* =========================================================
 * 4. UNIVERSAL INTAKE DOMAIN VALUES
 * ======================================================= */

export type IntakeKind =
  | "finance"
  | "plan"
  | "travel"
  | "growth"
  | "document"
  | "note";


export type IntakeStatus =
  | "previewed"
  | "approved"
  | "applied"
  | "failed"
  | "cancelled";


export type IntakeTargetEntityType =
  | "income_source"
  | "budget_item"
  | "investment_asset"
  | "investment_transaction"
  | "goal"
  | "project"
  | "task"
  | "learning_item"
  | "career_item"
  | "memory_item"
  | "trip"
  | "document";


/* =========================================================
 * 5. PROFILE
 * ======================================================= */

export interface Profile {
  user_id: UUID;

  display_name:
    Nullable<string>;

  default_currency:
    CurrencyCode;

  timezone:
    string;

  locale:
    string;

  created_at:
    ISODateTime;

  updated_at:
    ISODateTime;
}


export interface ProfileInsert {
  user_id:
    UUID;

  display_name?:
    Nullable<string>;

  default_currency?:
    CurrencyCode;

  timezone?:
    string;

  locale?:
    string;
}


export interface ProfileUpdate {
  display_name?:
    Nullable<string>;

  default_currency?:
    CurrencyCode;

  timezone?:
    string;

  locale?:
    string;
}


/* =========================================================
 * 6. INCOME SOURCES
 * ======================================================= */

export interface IncomeSource {
  id:
    UUID;

  user_id:
    UUID;

  name:
    string;

  amount:
    number;

  frequency:
    Frequency;

  is_active:
    boolean;

  next_expected_date:
    Nullable<ISODate>;

  notes:
    Nullable<string>;

  created_at:
    ISODateTime;

  updated_at:
    ISODateTime;
}


export interface IncomeSourceInsert {
  name:
    string;

  amount:
    number;

  frequency?:
    Frequency;

  is_active?:
    boolean;

  next_expected_date?:
    Nullable<ISODate>;

  notes?:
    Nullable<string>;
}


export type IncomeSourceUpdate =
  Partial<IncomeSourceInsert>;


/* =========================================================
 * 7. BUDGET ITEMS
 * ======================================================= */

export interface BudgetItem {
  id:
    UUID;

  user_id:
    UUID;

  name:
    string;

  category:
    BudgetCategory;

  item_type:
    BudgetItemType;

  amount:
    number;

  frequency:
    Frequency;

  due_day:
    Nullable<number>;

  is_active:
    boolean;

  notes:
    Nullable<string>;

  created_at:
    ISODateTime;

  updated_at:
    ISODateTime;
}


export interface BudgetItemInsert {
  name:
    string;

  category:
    BudgetCategory;

  item_type:
    BudgetItemType;

  amount:
    number;

  frequency?:
    Frequency;

  due_day?:
    Nullable<number>;

  is_active?:
    boolean;

  notes?:
    Nullable<string>;
}


export type BudgetItemUpdate =
  Partial<BudgetItemInsert>;


/* =========================================================
 * 8. MONTHLY SNAPSHOTS
 * ======================================================= */

export interface MonthlySnapshot {
  id:
    UUID;

  user_id:
    UUID;

  month:
    ISODate;

  total_income:
    number;

  total_budget:
    number;

  total_savings:
    number;

  total_investments:
    number;

  available_amount:
    number;

  emergency_fund_balance:
    number;

  travel_savings_balance:
    number;

  notes:
    Nullable<string>;

  created_at:
    ISODateTime;

  updated_at:
    ISODateTime;
}


export interface MonthlySnapshotInsert {
  month:
    ISODate;

  total_income?:
    number;

  total_budget?:
    number;

  total_savings?:
    number;

  total_investments?:
    number;

  available_amount?:
    number;

  emergency_fund_balance?:
    number;

  travel_savings_balance?:
    number;

  notes?:
    Nullable<string>;
}


export type MonthlySnapshotUpdate =
  Partial<
    Omit<
      MonthlySnapshotInsert,
      "month"
    >
  >;


/* =========================================================
 * 9. INVESTMENT ASSETS
 * ======================================================= */

export interface InvestmentAsset {
  id:
    UUID;

  user_id:
    UUID;

  ticker:
    string;

  name:
    string;

  market:
    string;

  asset_type:
    InvestmentAssetType;

  currency:
    CurrencyCode;

  quantity:
    number;

  average_cost:
    number;

  reference_price:
    Nullable<number>;

  monthly_contribution_target:
    Nullable<number>;

  target_quantity:
    Nullable<number>;

  is_active:
    boolean;

  notes:
    Nullable<string>;

  created_at:
    ISODateTime;

  updated_at:
    ISODateTime;
}


export interface InvestmentAssetInsert {
  ticker:
    string;

  name:
    string;

  market:
    string;

  asset_type:
    InvestmentAssetType;

  currency?:
    CurrencyCode;

  quantity?:
    number;

  average_cost?:
    number;

  reference_price?:
    Nullable<number>;

  monthly_contribution_target?:
    Nullable<number>;

  target_quantity?:
    Nullable<number>;

  is_active?:
    boolean;

  notes?:
    Nullable<string>;
}


export type InvestmentAssetUpdate =
  Partial<
    InvestmentAssetInsert
  >;


/* =========================================================
 * 10. INVESTMENT TRANSACTIONS
 * ======================================================= */

export interface InvestmentTransaction {
  id:
    UUID;

  user_id:
    UUID;

  asset_id:
    UUID;

  transaction_type:
    InvestmentTransactionType;

  transaction_date:
    ISODate;

  quantity:
    Nullable<number>;

  unit_price:
    Nullable<number>;

  total_amount:
    number;

  fees:
    number;

  notes:
    Nullable<string>;

  created_at:
    ISODateTime;

  updated_at:
    ISODateTime;
}


export interface InvestmentTransactionInsert {
  asset_id:
    UUID;

  transaction_type:
    InvestmentTransactionType;

  transaction_date:
    ISODate;

  quantity?:
    Nullable<number>;

  unit_price?:
    Nullable<number>;

  total_amount:
    number;

  fees?:
    number;

  notes?:
    Nullable<string>;
}


export type InvestmentTransactionUpdate =
  Partial<
    InvestmentTransactionInsert
  >;


/* =========================================================
 * 11. GOALS
 * ======================================================= */

export interface Goal {
  id:
    UUID;

  user_id:
    UUID;

  title:
    string;

  category:
    GoalCategory;

  description:
    Nullable<string>;

  target_value:
    Nullable<number>;

  current_value:
    Nullable<number>;

  unit:
    Nullable<string>;

  progress_percent:
    number;

  target_date:
    Nullable<ISODate>;

  priority:
    Priority;

  status:
    GoalStatus;

  next_action:
    Nullable<string>;

  sort_order:
    number;

  created_at:
    ISODateTime;

  updated_at:
    ISODateTime;
}


export interface GoalInsert {
  title:
    string;

  category:
    GoalCategory;

  description?:
    Nullable<string>;

  target_value?:
    Nullable<number>;

  current_value?:
    Nullable<number>;

  unit?:
    Nullable<string>;

  progress_percent?:
    number;

  target_date?:
    Nullable<ISODate>;

  priority?:
    Priority;

  status?:
    GoalStatus;

  next_action?:
    Nullable<string>;

  sort_order?:
    number;
}


export type GoalUpdate =
  Partial<GoalInsert>;


/* =========================================================
 * 12. PROJECTS
 * ======================================================= */

export interface Project {
  id:
    UUID;

  user_id:
    UUID;

  goal_id:
    Nullable<UUID>;

  title:
    string;

  description:
    Nullable<string>;

  category:
    ProjectCategory;

  status:
    ProjectStatus;

  progress_percent:
    number;

  priority:
    Priority;

  start_date:
    Nullable<ISODate>;

  target_date:
    Nullable<ISODate>;

  next_action:
    Nullable<string>;

  created_at:
    ISODateTime;

  updated_at:
    ISODateTime;
}


export interface ProjectInsert {
  goal_id?:
    Nullable<UUID>;

  title:
    string;

  description?:
    Nullable<string>;

  category:
    ProjectCategory;

  status?:
    ProjectStatus;

  progress_percent?:
    number;

  priority?:
    Priority;

  start_date?:
    Nullable<ISODate>;

  target_date?:
    Nullable<ISODate>;

  next_action?:
    Nullable<string>;
}


export type ProjectUpdate =
  Partial<ProjectInsert>;


/* =========================================================
 * 13. TASKS
 * ======================================================= */

export interface Task {
  id:
    UUID;

  user_id:
    UUID;

  goal_id:
    Nullable<UUID>;

  project_id:
    Nullable<UUID>;

  title:
    string;

  notes:
    Nullable<string>;

  priority:
    Priority;

  status:
    TaskStatus;

  due_date:
    Nullable<ISODate>;

  completed_at:
    Nullable<ISODateTime>;

  created_at:
    ISODateTime;

  updated_at:
    ISODateTime;
}


export interface TaskInsert {
  goal_id?:
    Nullable<UUID>;

  project_id?:
    Nullable<UUID>;

  title:
    string;

  notes?:
    Nullable<string>;

  priority?:
    Priority;

  status?:
    TaskStatus;

  due_date?:
    Nullable<ISODate>;

  completed_at?:
    Nullable<ISODateTime>;
}


export type TaskUpdate =
  Partial<TaskInsert>;


/* =========================================================
 * 14. LEARNING ITEMS
 * ======================================================= */

export interface LearningItem {
  id:
    UUID;

  user_id:
    UUID;

  goal_id:
    Nullable<UUID>;

  title:
    string;

  provider:
    Nullable<string>;

  item_type:
    LearningItemType;

  status:
    LearningStatus;

  priority:
    Priority;

  progress_percent:
    number;

  start_date:
    Nullable<ISODate>;

  target_date:
    Nullable<ISODate>;

  completed_date:
    Nullable<ISODate>;

  url:
    Nullable<string>;

  cost:
    Nullable<number>;

  currency:
    CurrencyCode;

  notes:
    Nullable<string>;

  created_at:
    ISODateTime;

  updated_at:
    ISODateTime;
}


export interface LearningItemInsert {
  goal_id?:
    Nullable<UUID>;

  title:
    string;

  provider?:
    Nullable<string>;

  item_type:
    LearningItemType;

  status?:
    LearningStatus;

  priority?:
    Priority;

  progress_percent?:
    number;

  start_date?:
    Nullable<ISODate>;

  target_date?:
    Nullable<ISODate>;

  completed_date?:
    Nullable<ISODate>;

  url?:
    Nullable<string>;

  cost?:
    Nullable<number>;

  currency?:
    CurrencyCode;

  notes?:
    Nullable<string>;
}


export type LearningItemUpdate =
  Partial<
    LearningItemInsert
  >;


/* =========================================================
 * 15. CAREER ITEMS
 * ======================================================= */

export interface CareerItem {
  id:
    UUID;

  user_id:
    UUID;

  goal_id:
    Nullable<UUID>;

  item_type:
    CareerItemType;

  title:
    string;

  description:
    Nullable<string>;

  status:
    CareerStatus;

  priority:
    Priority;

  rating:
    Nullable<number>;

  event_date:
    Nullable<ISODate>;

  target_date:
    Nullable<ISODate>;

  evidence_url:
    Nullable<string>;

  notes:
    Nullable<string>;

  created_at:
    ISODateTime;

  updated_at:
    ISODateTime;
}


export interface CareerItemInsert {
  goal_id?:
    Nullable<UUID>;

  item_type:
    CareerItemType;

  title:
    string;

  description?:
    Nullable<string>;

  status?:
    CareerStatus;

  priority?:
    Priority;

  rating?:
    Nullable<number>;

  event_date?:
    Nullable<ISODate>;

  target_date?:
    Nullable<ISODate>;

  evidence_url?:
    Nullable<string>;

  notes?:
    Nullable<string>;
}


export type CareerItemUpdate =
  Partial<
    CareerItemInsert
  >;


/* =========================================================
 * 16. MEMORY ITEMS
 * ======================================================= */

export interface MemoryItem {
  id:
    UUID;

  user_id:
    UUID;

  category:
    MemoryCategory;

  title:
    string;

  content:
    string;

  importance:
    MemoryImportance;

  is_active:
    boolean;

  created_at:
    ISODateTime;

  updated_at:
    ISODateTime;
}


export interface MemoryItemInsert {
  category:
    MemoryCategory;

  title:
    string;

  content:
    string;

  importance?:
    MemoryImportance;

  is_active?:
    boolean;
}


export type MemoryItemUpdate =
  Partial<
    MemoryItemInsert
  >;


/* =========================================================
 * 17. AI RECOMMENDATIONS
 * ======================================================= */

export interface AIRecommendation {
  id:
    UUID;

  user_id:
    UUID;

  category:
    AIRecommendationCategory;

  title:
    string;

  recommendation:
    string;

  priority:
    Priority;

  status:
    AIRecommendationStatus;

  related_entity_type:
    Nullable<
      AIRecommendationEntityType
    >;

  related_entity_id:
    Nullable<UUID>;

  reviewed_at:
    Nullable<ISODateTime>;

  created_at:
    ISODateTime;

  updated_at:
    ISODateTime;
}


export interface AIRecommendationInsert {
  category:
    AIRecommendationCategory;

  title:
    string;

  recommendation:
    string;

  priority?:
    Priority;

  status?:
    AIRecommendationStatus;

  related_entity_type?:
    Nullable<
      AIRecommendationEntityType
    >;

  related_entity_id?:
    Nullable<UUID>;

  reviewed_at?:
    Nullable<ISODateTime>;
}


export type AIRecommendationUpdate =
  Partial<
    AIRecommendationInsert
  >;


/* =========================================================
 * 18. AUDIT LOG
 * ======================================================= */

export interface AuditLog {
  id:
    UUID;

  user_id:
    UUID;

  action:
    string;

  entity_type:
    Nullable<string>;

  entity_id:
    Nullable<UUID>;

  metadata:
    JsonObject;

  created_at:
    ISODateTime;
}


export interface AuditLogInsert {
  action:
    string;

  entity_type?:
    Nullable<string>;

  entity_id?:
    Nullable<UUID>;

  metadata?:
    JsonObject;
}


/* =========================================================
 * 19. UNIVERSAL INTAKE PREVIEW
 * ======================================================= */

/**
 * AI understanding shown to the user BEFORE any permanent
 * LIFE OS write occurs.
 *
 * This is not a database fact.
 */
export interface IntakePreview {
  kind:
    IntakeKind;

  label:
    string;

  title:
    string;

  summary:
    string;

  confidence:
    number;

  next_action:
    string;

  requires_confirmation:
    true;
}


/* =========================================================
 * 20. UNIVERSAL INTAKE ITEM
 * ======================================================= */

/**
 * Durable V2 proposal record.
 *
 * Lifecycle:
 *
 * previewed
 *      ↓
 * approved
 *      ↓
 * applied
 *
 * or:
 *
 * cancelled / failed
 */
export interface IntakeItem {
  id:
    UUID;

  user_id:
    UUID;

  kind:
    IntakeKind;

  source_text:
    Nullable<string>;

  source_file_name:
    Nullable<string>;

  source_file_mime:
    Nullable<string>;

  source_file_size_bytes:
    Nullable<number>;

  title:
    string;

  summary:
    string;

  confidence:
    number;

  next_action:
    string;

  proposed_payload:
    JsonObject;

  status:
    IntakeStatus;

  approved_at:
    Nullable<ISODateTime>;

  applied_at:
    Nullable<ISODateTime>;

  target_entity_type:
    Nullable<
      IntakeTargetEntityType
    >;

  target_entity_id:
    Nullable<UUID>;

  error_code:
    Nullable<string>;

  created_at:
    ISODateTime;

  updated_at:
    ISODateTime;
}


/**
 * Insert input deliberately does NOT accept user_id.
 *
 * The authenticated server identity owns the record.
 */
export interface IntakeItemInsert {
  kind:
    IntakeKind;

  source_text?:
    Nullable<string>;

  source_file_name?:
    Nullable<string>;

  source_file_mime?:
    Nullable<string>;

  source_file_size_bytes?:
    Nullable<number>;

  title:
    string;

  summary:
    string;

  confidence:
    number;

  next_action:
    string;

  proposed_payload?:
    JsonObject;

  status?:
    IntakeStatus;

  approved_at?:
    Nullable<ISODateTime>;

  applied_at?:
    Nullable<ISODateTime>;

  target_entity_type?:
    Nullable<
      IntakeTargetEntityType
    >;

  target_entity_id?:
    Nullable<UUID>;

  error_code?:
    Nullable<string>;
}


export type IntakeItemUpdate =
  Partial<
    IntakeItemInsert
  >;


/* =========================================================
 * 21. FINANCE CALCULATION TYPES
 * ======================================================= */

export interface FinanceTotals {
  total_income:
    number;

  total_expenses:
    number;

  total_savings:
    number;

  total_investments:
    number;

  total_debt_payments:
    number;

  total_allocations:
    number;

  available_amount:
    number;
}


export interface FinanceSnapshot {
  currency:
    CurrencyCode;

  monthly_income:
    number;

  monthly_expenses:
    number;

  monthly_savings:
    number;

  monthly_investments:
    number;

  monthly_debt_payments:
    number;

  monthly_allocations:
    number;

  available_amount:
    number;

  emergency_fund_balance:
    number;

  travel_savings_balance:
    number;

  income_sources:
    IncomeSource[];

  budget_items:
    BudgetItem[];

  latest_monthly_snapshot:
    Nullable<
      MonthlySnapshot
    >;
}


/* =========================================================
 * 22. INVESTMENT CALCULATION TYPES
 * ======================================================= */

export interface InvestmentPosition {
  asset:
    InvestmentAsset;

  cost_basis:
    number;

  estimated_value:
    Nullable<number>;

  estimated_gain_loss:
    Nullable<number>;

  estimated_gain_loss_percent:
    Nullable<number>;

  allocation_percent:
    Nullable<number>;

  target_progress_percent:
    Nullable<number>;
}


export interface InvestmentSnapshot {
  currency:
    CurrencyCode;

  total_cost_basis:
    number;

  total_estimated_value:
    number;

  total_estimated_gain_loss:
    number;

  total_monthly_contribution_target:
    number;

  active_asset_count:
    number;

  positions:
    InvestmentPosition[];
}


/* =========================================================
 * 23. GOAL SUMMARY TYPES
 * ======================================================= */

export interface GoalSummary {
  id:
    UUID;

  title:
    string;

  category:
    GoalCategory;

  status:
    GoalStatus;

  priority:
    Priority;

  progress_percent:
    number;

  target_date:
    Nullable<ISODate>;

  next_action:
    Nullable<string>;
}


export interface GoalStatusSnapshot {
  active_count:
    number;

  planned_count:
    number;

  paused_count:
    number;

  completed_count:
    number;

  high_priority_goals:
    GoalSummary[];

  active_goals:
    GoalSummary[];
}


/* =========================================================
 * 24. PROJECT SUMMARY TYPES
 * ======================================================= */

export interface ProjectSummary {
  id:
    UUID;

  title:
    string;

  category:
    ProjectCategory;

  status:
    ProjectStatus;

  priority:
    Priority;

  progress_percent:
    number;

  target_date:
    Nullable<ISODate>;

  next_action:
    Nullable<string>;
}


export interface ProjectStatusSnapshot {
  active_count:
    number;

  blocked_count:
    number;

  planned_count:
    number;

  completed_count:
    number;

  high_priority_projects:
    ProjectSummary[];

  blocked_projects:
    ProjectSummary[];
}


/* =========================================================
 * 25. TASK SUMMARY TYPES
 * ======================================================= */

export interface TaskSummary {
  id:
    UUID;

  title:
    string;

  priority:
    Priority;

  status:
    TaskStatus;

  due_date:
    Nullable<ISODate>;

  goal_id:
    Nullable<UUID>;

  project_id:
    Nullable<UUID>;
}


export interface TaskStatusSnapshot {
  pending_count:
    number;

  active_count:
    number;

  completed_count:
    number;

  overdue_count:
    number;

  urgent_tasks:
    TaskSummary[];
}


/* =========================================================
 * 26. LEARNING SUMMARY TYPES
 * ======================================================= */

export interface LearningSummary {
  id:
    UUID;

  title:
    string;

  provider:
    Nullable<string>;

  item_type:
    LearningItemType;

  status:
    LearningStatus;

  priority:
    Priority;

  progress_percent:
    number;

  target_date:
    Nullable<ISODate>;
}


export interface LearningStatusSnapshot {
  active_count:
    number;

  planned_count:
    number;

  completed_count:
    number;

  paused_count:
    number;

  active_items:
    LearningSummary[];

  high_priority_items:
    LearningSummary[];
}


/* =========================================================
 * 27. CAREER SUMMARY TYPES
 * ======================================================= */

export interface CareerSnapshot {
  current_roles:
    CareerItem[];

  target_roles:
    CareerItem[];

  skills:
    CareerItem[];

  achievements:
    CareerItem[];

  milestones:
    CareerItem[];

  gaps:
    CareerItem[];
}


/* =========================================================
 * 28. PRIORITY ENGINE TYPES
 * ======================================================= */

export type PrioritySource =
  | "goal"
  | "project"
  | "task"
  | "finance"
  | "investment"
  | "career"
  | "learning"
  | "ai";


export interface PriorityItem {
  id:
    string;

  source:
    PrioritySource;

  title:
    string;

  description:
    Nullable<string>;

  priority:
    Priority;

  next_action:
    Nullable<string>;

  target_date:
    Nullable<ISODate>;
}


/* =========================================================
 * 29. DASHBOARD
 * ======================================================= */

export interface DashboardSnapshot {
  generated_at:
    ISODateTime;

  month:
    ISODate;

  top_priorities:
    PriorityItem[];

  finance:
    FinanceSnapshot;

  investments:
    InvestmentSnapshot;

  goals:
    GoalStatusSnapshot;

  projects:
    ProjectStatusSnapshot;

  tasks:
    TaskStatusSnapshot;

  learning:
    LearningStatusSnapshot;

  latest_ai_recommendation:
    Nullable<
      AIRecommendation
    >;
}


/* =========================================================
 * 30. PERSONAL CONTEXT
 * ======================================================= */

export interface PersonalContext {
  profile:
    Nullable<Profile>;

  relevant_goals:
    Goal[];

  relevant_projects:
    Project[];

  relevant_tasks:
    Task[];

  relevant_learning:
    LearningItem[];

  relevant_career:
    CareerItem[];

  relevant_memory:
    MemoryItem[];

  finance?:
    FinanceSnapshot;

  investments?:
    InvestmentSnapshot;
}


/* =========================================================
 * 31. AI REQUEST TYPES
 * ======================================================= */

export type AIRequestMode =
  | "chief_of_staff"
  | "summary"
  | "recommendation"
  | "decision";


export interface AIRequest {
  mode:
    AIRequestMode;

  message:
    string;
}


/* =========================================================
 * 32. AI RESPONSE TYPES
 * ======================================================= */

export interface AIResponse {
  situation:
    Nullable<string>;

  recommendation:
    string;

  next_action:
    Nullable<string>;
}


export interface AIErrorResponse {
  error:
    string;
}


/* =========================================================
 * 33. AI TOOL NAMES
 * ======================================================= */

export type AIToolName =
  | "get_dashboard_snapshot"
  | "get_finance_snapshot"
  | "get_investment_snapshot"
  | "get_goal_status"
  | "get_learning_status"
  | "simulate_decision"
  | "search_opportunities";


/* =========================================================
 * 34. AI TOOL RESULT
 * ======================================================= */

export interface AIToolResult<
  TData = JsonValue,
> {
  tool:
    AIToolName;

  success:
    boolean;

  data:
    Nullable<TData>;

  error:
    Nullable<string>;
}


/* =========================================================
 * 35. DECISION SIMULATOR
 * ======================================================= */

export type DecisionImpactDirection =
  | "positive"
  | "negative"
  | "neutral";


export interface DecisionChange {
  area:
    | "finance"
    | "investments"
    | "career"
    | "learning"
    | "education"
    | "travel"
    | "time"
    | "project"
    | "other";

  description:
    string;

  direction:
    DecisionImpactDirection;
}


export interface DecisionSimulationInput {
  decision:
    string;

  proposed_monthly_cost?:
    Nullable<number>;

  proposed_one_time_cost?:
    Nullable<number>;

  proposed_monthly_investment_change?:
    Nullable<number>;

  proposed_start_date?:
    Nullable<ISODate>;

  proposed_target_date?:
    Nullable<ISODate>;

  notes?:
    Nullable<string>;
}


export interface DecisionScenario {
  id:
    string;

  title:
    string;

  summary:
    string;

  affordability:
    Nullable<boolean>;

  monthly_available_after:
    Nullable<number>;

  changes:
    DecisionChange[];
}


export interface DecisionSimulationResult {
  decision:
    string;

  scenarios:
    DecisionScenario[];

  recommended_scenario_id:
    Nullable<string>;

  main_tradeoff:
    Nullable<string>;

  next_action:
    string;
}


/* =========================================================
 * 36. OPPORTUNITY ENGINE
 * ======================================================= */

export type OpportunityCategory =
  | "course"
  | "certification"
  | "job"
  | "education"
  | "professional_program"
  | "development";


export type OpportunityRecommendation =
  | "strong_match"
  | "consider"
  | "low_priority"
  | "skip";


export interface OpportunitySearchInput {
  category:
    OpportunityCategory;

  query:
    string;
}


export interface Opportunity {
  title:
    string;

  provider:
    Nullable<string>;

  category:
    OpportunityCategory;

  description:
    Nullable<string>;

  url:
    Nullable<string>;

  fit_score:
    number;

  priority:
    Priority;

  recommendation:
    OpportunityRecommendation;

  reason:
    string;
}


export interface OpportunitySearchResult {
  query:
    string;

  category:
    OpportunityCategory;

  opportunities:
    Opportunity[];

  searched_at:
    ISODateTime;
}


/* =========================================================
 * 37. DATA TABLE UI TYPES
 * ======================================================= */

export type DataTableCell =
  | string
  | number
  | boolean
  | null;


export interface DataTableColumn<
  TRow,
> {
  key:
    keyof TRow;

  label:
    string;

  align?:
    | "start"
    | "center"
    | "end";
}


export interface DataTableRow {
  id:
    string;

  [key: string]:
    DataTableCell;
}


/* =========================================================
 * 38. NAVIGATION
 * ======================================================= */

export interface NavigationItem {
  label:
    string;

  href:
    string;

  icon:
    string;
}


/* =========================================================
 * 39. USER-FACING STATUS
 * ======================================================= */

export type UIStatusTone =
  | "neutral"
  | "positive"
  | "warning"
  | "critical";


export interface StatusMessage {
  title:
    string;

  message:
    Nullable<string>;

  tone:
    UIStatusTone;
}


/* =========================================================
 * 40. OPERATION RESULTS
 * ======================================================= */

export type OperationResult<
  TData = undefined,
> =
  | {
      success:
        true;

      data:
        TData;
    }
  | {
      success:
        false;

      error:
        string;
    };


/* =========================================================
 * 41. PAGINATION
 * ======================================================= */

export interface PaginationInput {
  page:
    number;

  page_size:
    number;
}


export interface PaginatedResult<
  TItem,
> {
  items:
    TItem[];

  page:
    number;

  page_size:
    number;

  total:
    number;

  has_more:
    boolean;
}


/* =========================================================
 * 42. DATABASE ENTITY MAP
 * ======================================================= */

export interface LifeOSEntityMap {
  profiles:
    Profile;

  income_sources:
    IncomeSource;

  budget_items:
    BudgetItem;

  monthly_snapshots:
    MonthlySnapshot;

  investment_assets:
    InvestmentAsset;

  investment_transactions:
    InvestmentTransaction;

  goals:
    Goal;

  projects:
    Project;

  tasks:
    Task;

  learning_items:
    LearningItem;

  career_items:
    CareerItem;

  memory_items:
    MemoryItem;

  ai_recommendations:
    AIRecommendation;

  audit_logs:
    AuditLog;

  intake_items:
    IntakeItem;
}


export type LifeOSTableName =
  keyof LifeOSEntityMap;


/* =========================================================
 * 43. MUTABLE ENTITY NAME
 * ======================================================= */

export type MutableLifeOSTableName =
  Exclude<
    LifeOSTableName,
    "audit_logs"
  >;


/* =========================================================
 * 44. SECURITY-SENSITIVE ACTION TYPES
 * ======================================================= */

export type ProhibitedAIAction =
  | "transfer_money"
  | "buy_investment"
  | "sell_investment"
  | "place_broker_order"
  | "send_email"
  | "send_message"
  | "change_authentication"
  | "change_security"
  | "delete_important_data"
  | "execute_sql"
  | "execute_shell_command";


/* =========================================================
 * 45. AUDIT ACTION TYPES
 * ======================================================= */

export type AuditAction =
  | "AUTH_LOGIN"
  | "AUTH_LOGOUT"
  | "MFA_ENROLLED"
  | "MFA_VERIFIED"
  | "PROFILE_CREATED"
  | "PROFILE_UPDATED"
  | "INCOME_CREATED"
  | "INCOME_UPDATED"
  | "INCOME_DELETED"
  | "BUDGET_CREATED"
  | "BUDGET_UPDATED"
  | "BUDGET_DELETED"
  | "FINANCE_SNAPSHOT_CREATED"
  | "FINANCE_SNAPSHOT_UPDATED"
  | "INVESTMENT_CREATED"
  | "INVESTMENT_UPDATED"
  | "INVESTMENT_DELETED"
  | "INVESTMENT_TRANSACTION_CREATED"
  | "INVESTMENT_TRANSACTION_UPDATED"
  | "INVESTMENT_TRANSACTION_DELETED"
  | "GOAL_CREATED"
  | "GOAL_UPDATED"
  | "GOAL_DELETED"
  | "PROJECT_CREATED"
  | "PROJECT_UPDATED"
  | "PROJECT_DELETED"
  | "TASK_CREATED"
  | "TASK_UPDATED"
  | "TASK_DELETED"
  | "LEARNING_CREATED"
  | "LEARNING_UPDATED"
  | "LEARNING_DELETED"
  | "CAREER_CREATED"
  | "CAREER_UPDATED"
  | "CAREER_DELETED"
  | "MEMORY_CREATED"
  | "MEMORY_UPDATED"
  | "MEMORY_DELETED"
  | "AI_RECOMMENDATION"
  | "AI_DECISION_SIMULATION"
  | "OPPORTUNITY_SEARCH"
  | "INTAKE_CREATED"
  | "INTAKE_APPROVED"
  | "INTAKE_APPLIED"
  | "INTAKE_CANCELLED"
  | "INTAKE_FAILED"
  | "SETTING_CHANGED";


/* =========================================================
 * 46. UNIVERSAL INTAKE SAFETY RULE
 * ======================================================= */

/**
 * IntakePreview
 *
 * = AI interpretation shown to the user.
 *
 *
 * IntakeItem
 *
 * = persisted proposal/lifecycle record.
 *
 *
 * Domain entity
 *
 * = actual LIFE OS fact created only after confirmation.
 *
 *
 * Never treat:
 *
 * IntakePreview
 *
 * as:
 *
 * authoritative user data.
 */


/* =========================================================
 * 47. OWNERSHIP RULE
 * ======================================================= */

/**
 * Database records include user ownership.
 *
 * Browser/model insert interfaces do not accept user_id for
 * normal V2 intake records.
 *
 * Server code derives user ownership from the verified
 * authenticated Supabase identity.
 */


/* =========================================================
 * 48. FINAL TYPE SAFETY RULE
 * ======================================================= */

/**
 * LIFE OS domain rules:
 *
 * - Database records include user ownership.
 * - Server derives user_id from authenticated identity.
 * - Audit logs are append-oriented.
 * - AI responses remain recommendations.
 * - Financial calculations remain deterministic.
 * - AI cannot create arbitrary database operations.
 * - Universal Intake proposals require explicit user review.
 * - AI classification alone never becomes a permanent fact.
 * - Sensitive execution remains server-controlled.
 *
 *
 * Permanent V2 rule:
 *
 * AI Suggests
 *      ↓
 * User Reviews
 *      ↓
 * User Approves
 *      ↓
 * System Executes
 */