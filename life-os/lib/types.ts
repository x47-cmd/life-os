/**
 * LIFE OS — Shared Core Types
 *
 * V1 foundation
 * +
 * V2 Universal Intake
 * +
 * V2 Structured Proposals
 * +
 * V2 Travel OS
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
 * - Structured Proposals
 * - Travel OS
 * - Private Documents
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
 * - Structured proposals describe exact possible actions.
 * - Structured proposals do not grant execution authority.
 */


/* =========================================================
 * 1. GENERIC TYPES
 * ======================================================= */

export type UUID =
  string;


export type ISODate =
  string;


export type ISODateTime =
  string;


export type CurrencyCode =
  string;


export type Nullable<T> =
  T | null;


export type JsonPrimitive =
  | string
  | number
  | boolean
  | null;


export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | {
      [key: string]:
        JsonValue;
    };


export type JsonObject = {
  [key: string]:
    JsonValue;
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


/* =========================================================
 * V2 TRAVEL + DOCUMENT STATUS VALUES
 * ======================================================= */

export type TripStatus =
  | "planned"
  | "booked"
  | "active"
  | "completed"
  | "cancelled";


export type DocumentStatus =
  | "active"
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


/* =========================================================
 * V2 DOCUMENT DOMAIN VALUES
 * ======================================================= */

export type DocumentCategory =
  | "travel"
  | "education"
  | "career"
  | "finance"
  | "personal"
  | "general"
  | "other";


export type DocumentMimeType =
  "application/pdf";


export type DocumentStorageBucket =
  "life-os-private-documents";


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
 * 4A. STRUCTURED PROPOSAL CORE
 * ======================================================= */

export type IntakeProposalVersion =
  1;


/* =========================================================
 * 4B. FINANCE STRUCTURED PROPOSALS
 * ======================================================= */

export type FinanceProposalAction =
  | "create_income_source"
  | "create_budget_item";


export interface FinanceIncomeSourceProposalData
  extends JsonObject {

  name:
    string;

  amount:
    number;

  currency:
    CurrencyCode;

  frequency:
    Frequency;

  next_expected_date:
    Nullable<ISODate>;

  notes:
    Nullable<string>;
}


export interface FinanceIncomeSourceProposal
  extends JsonObject {

  version:
    IntakeProposalVersion;

  kind:
    "finance";

  action:
    "create_income_source";

  data:
    FinanceIncomeSourceProposalData;
}


export interface FinanceBudgetItemProposalData
  extends JsonObject {

  name:
    string;

  category:
    BudgetCategory;

  item_type:
    BudgetItemType;

  amount:
    number;

  currency:
    CurrencyCode;

  frequency:
    Frequency;

  due_day:
    Nullable<number>;

  notes:
    Nullable<string>;
}


export interface FinanceBudgetItemProposal
  extends JsonObject {

  version:
    IntakeProposalVersion;

  kind:
    "finance";

  action:
    "create_budget_item";

  data:
    FinanceBudgetItemProposalData;
}


export type FinanceIntakeProposal =
  | FinanceIncomeSourceProposal
  | FinanceBudgetItemProposal;


/* =========================================================
 * 4C. PLAN STRUCTURED PROPOSALS
 * ======================================================= */

export type PlanProposalAction =
  | "create_goal"
  | "create_project";


export interface GoalProposalData
  extends JsonObject {

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
}


export interface GoalIntakeProposal
  extends JsonObject {

  version:
    IntakeProposalVersion;

  kind:
    "plan";

  action:
    "create_goal";

  data:
    GoalProposalData;
}


export interface ProjectProposalData
  extends JsonObject {

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
}


export interface ProjectIntakeProposal
  extends JsonObject {

  version:
    IntakeProposalVersion;

  kind:
    "plan";

  action:
    "create_project";

  data:
    ProjectProposalData;
}


export type PlanIntakeProposal =
  | GoalIntakeProposal
  | ProjectIntakeProposal;


/* =========================================================
 * 4D. GROWTH STRUCTURED PROPOSALS
 * ======================================================= */

export type GrowthProposalAction =
  | "create_learning_item"
  | "create_career_item";


export interface LearningProposalData
  extends JsonObject {

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
}


export interface LearningIntakeProposal
  extends JsonObject {

  version:
    IntakeProposalVersion;

  kind:
    "growth";

  action:
    "create_learning_item";

  data:
    LearningProposalData;
}


export interface CareerProposalData
  extends JsonObject {

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
}


export interface CareerIntakeProposal
  extends JsonObject {

  version:
    IntakeProposalVersion;

  kind:
    "growth";

  action:
    "create_career_item";

  data:
    CareerProposalData;
}


export type GrowthIntakeProposal =
  | LearningIntakeProposal
  | CareerIntakeProposal;


/* =========================================================
 * 4E. TRAVEL STRUCTURED PROPOSAL — STAGED
 * ======================================================= */

/**
 * Travel proposal contract.
 *
 * IMPORTANT:
 *
 * This type is defined now so Travel OS has a stable domain
 * contract.
 *
 * It is deliberately NOT part of:
 *
 * StructuredIntakeProposal
 *
 * yet.
 *
 *
 * Activation order:
 *
 * type contract
 *      ↓
 * runtime validation
 *      ↓
 * preview structured output
 *      ↓
 * UI exact-value review
 *      ↓
 * explicit confirmation
 *      ↓
 * deterministic executor
 *
 *
 * Until all those boundaries exist, travel continues to use:
 *
 * proposal: null
 *
 * at the active Universal Intake runtime boundary.
 */

export type TravelProposalAction =
  "create_trip";


export interface TripProposalData
  extends JsonObject {

  title:
    string;

  destination:
    string;

  start_date:
    Nullable<ISODate>;

  end_date:
    Nullable<ISODate>;

  status:
    TripStatus;

  budget_total:
    Nullable<number>;

  currency:
    CurrencyCode;

  readiness_percent:
    number;

  notes:
    Nullable<string>;
}


export interface TravelIntakeProposal
  extends JsonObject {

  version:
    IntakeProposalVersion;

  kind:
    "travel";

  action:
    "create_trip";

  data:
    TripProposalData;
}


/* =========================================================
 * TRAVEL PROPOSAL ACTIVATION RULE
 * ======================================================= */

/**
 * DO NOT add TravelIntakeProposal to StructuredIntakeProposal
 * until the active runtime validation + Universal Add review
 * UI support create_trip.
 *
 *
 * This protects against:
 *
 * TypeScript accepting travel
 *
 * while:
 *
 * UI cannot display its exact values.
 *
 *
 * User review must exist before execution authority exists.
 */


/* =========================================================
 * 4F. STRUCTURED PROPOSAL UNION
 * ======================================================= */

export type StructuredIntakeProposal =
  | FinanceIntakeProposal
  | PlanIntakeProposal
  | GrowthIntakeProposal;


export type StructuredIntakeProposalAction =
  | FinanceProposalAction
  | PlanProposalAction
  | GrowthProposalAction;


/* =========================================================
 * 4G. STRUCTURED PROPOSAL SAFETY MODEL
 * ======================================================= */

/**
 * Structured proposals describe an exact proposed domain
 * operation.
 *
 * They are still untrusted until:
 *
 * schema validation
 *      ↓
 * user review
 *      ↓
 * explicit approval
 *      ↓
 * deterministic executor
 */


/* =========================================================
 * 5. PROFILE
 * ======================================================= */

export interface Profile {
  user_id:
    UUID;

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
 * 15A. TRIPS — TRAVEL OS V2
 * ======================================================= */

export interface Trip {
  id:
    UUID;

  user_id:
    UUID;

  title:
    string;

  destination:
    string;

  start_date:
    Nullable<ISODate>;

  end_date:
    Nullable<ISODate>;

  status:
    TripStatus;

  budget_total:
    Nullable<number>;

  currency:
    CurrencyCode;

  readiness_percent:
    number;

  notes:
    Nullable<string>;

  created_at:
    ISODateTime;

  updated_at:
    ISODateTime;
}


/**
 * user_id is deliberately absent.
 *
 * Ownership must always come from the authenticated server
 * identity and never from browser or AI input.
 */
export interface TripInsert {
  title:
    string;

  destination:
    string;

  start_date?:
    Nullable<ISODate>;

  end_date?:
    Nullable<ISODate>;

  status?:
    TripStatus;

  budget_total?:
    Nullable<number>;

  currency?:
    CurrencyCode;

  readiness_percent?:
    number;

  notes?:
    Nullable<string>;
}


export type TripUpdate =
  Partial<
    TripInsert
  >;


/* =========================================================
 * 15B. PRIVATE DOCUMENTS — V2
 * ======================================================= */

/**
 * Document metadata only.
 *
 * PDF binary bytes are stored in:
 *
 * Supabase Storage
 *
 * bucket:
 *
 * life-os-private-documents
 *
 *
 * Never store PDF base64 or binary content in this object.
 */
export interface Document {
  id:
    UUID;

  user_id:
    UUID;

  trip_id:
    Nullable<UUID>;

  title:
    string;

  category:
    DocumentCategory;

  file_name:
    string;

  mime_type:
    DocumentMimeType;

  file_size_bytes:
    number;

  storage_bucket:
    DocumentStorageBucket;

  storage_path:
    string;

  status:
    DocumentStatus;

  notes:
    Nullable<string>;

  created_at:
    ISODateTime;

  updated_at:
    ISODateTime;
}


/**
 * New document metadata.
 *
 * user_id is deliberately absent.
 *
 * The server derives ownership from auth.uid().
 *
 *
 * storage_path must use:
 *
 * <authenticated-user-id>/...
 *
 * and is validated again by PostgreSQL + Storage RLS.
 */
export interface DocumentInsert {
  trip_id?:
    Nullable<UUID>;

  title:
    string;

  category?:
    DocumentCategory;

  file_name:
    string;

  mime_type?:
    DocumentMimeType;

  file_size_bytes:
    number;

  storage_bucket?:
    DocumentStorageBucket;

  storage_path:
    string;

  status?:
    DocumentStatus;

  notes?:
    Nullable<string>;
}


/**
 * Generic metadata updates deliberately cannot change:
 *
 * file_name
 * mime_type
 * file_size_bytes
 * storage_bucket
 * storage_path
 *
 *
 * Replacing or moving an actual Storage object requires a
 * dedicated coordinated file operation later.
 */
export interface DocumentUpdate {
  trip_id?:
    Nullable<UUID>;

  title?:
    string;

  category?:
    DocumentCategory;

  status?:
    DocumentStatus;

  notes?:
    Nullable<string>;
}


/* =========================================================
 * TRAVEL STORAGE SAFETY MODEL
 * ======================================================= */

/**
 * PostgreSQL:
 *
 * documents
 *
 * stores metadata.
 *
 *
 * Supabase Storage:
 *
 * life-os-private-documents
 *
 * stores PDF bytes.
 *
 *
 * Required object path:
 *
 * auth.uid()/...
 *
 *
 * Example:
 *
 * <user-id>/travel/<trip-id>/itinerary.pdf
 *
 *
 * No public URLs.
 * No service_role.
 * No AI-generated ownership identifiers.
 */


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
 * AI interpretation shown BEFORE a permanent domain write.
 *
 * `proposal` contains the exact structured action and values
 * when LIFE OS supports structured extraction for that kind.
 *
 * During the V2 rollout this property remains optional so
 * existing preview producers continue to type-check until
 * the preview API is upgraded in the next step.
 *
 * Runtime validation will become authoritative once the API
 * starts emitting this field.
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

  /**
   * finance / plan / growth:
   *
   * contains the exact validated proposal.
   *
   *
   * travel:
   *
   * TravelIntakeProposal is defined but remains staged until
   * validation + preview + review UI are all enabled.
   *
   *
   * document / note:
   *
   * currently null or omitted.
   */
  proposal?:
    Nullable<
      StructuredIntakeProposal
    >;

  requires_confirmation:
    true;
}


/* =========================================================
 * 20. UNIVERSAL INTAKE ITEM
 * ======================================================= */

/**
 * Durable V2 proposal record.
 *
 * proposed_payload can contain the exact structured proposal
 * that the user reviewed and approved.
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
 * 27A. TRAVEL SUMMARY TYPES
 * ======================================================= */

export interface TripSummary {
  id:
    UUID;

  title:
    string;

  destination:
    string;

  start_date:
    Nullable<ISODate>;

  end_date:
    Nullable<ISODate>;

  status:
    TripStatus;

  budget_total:
    Nullable<number>;

  currency:
    CurrencyCode;

  readiness_percent:
    number;
}


export interface TravelSnapshot {
  upcoming_trips:
    TripSummary[];

  active_trips:
    TripSummary[];

  completed_trip_count:
    number;

  document_count:
    number;

  next_trip:
    Nullable<TripSummary>;
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
  TData =
    JsonValue,
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
  TData =
    undefined,
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

  trips:
    Trip;

  documents:
    Document;

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
 * 46. STRUCTURED PROPOSAL RULE
 * ======================================================= */

/**
 * Structured proposal:
 *
 * = exact proposed action
 * + exact proposed values
 *
 *
 * Example:
 *
 * "راتبي 30,000"
 *
 * should eventually produce:
 *
 * {
 *   version: 1,
 *   kind: "finance",
 *   action: "create_income_source",
 *   data: {
 *     name: "الراتب",
 *     amount: 30000,
 *     currency: "AED",
 *     frequency: "monthly",
 *     next_expected_date: null,
 *     notes: null
 *   }
 * }
 */


/* =========================================================
 * 47. UNIVERSAL INTAKE SAFETY RULE
 * ======================================================= */

/**
 * IntakePreview
 *
 * = AI interpretation shown to the user.
 *
 *
 * IntakePreview.proposal
 *
 * = exact proposed domain operation and values.
 *
 *
 * IntakeItem
 *
 * = persisted proposal/lifecycle record.
 *
 *
 * Domain entity
 *
 * = actual LIFE OS fact created only after confirmation and
 * successful deterministic execution.
 */


/* =========================================================
 * 48. OWNERSHIP RULE
 * ======================================================= */

/**
 * Database records include user ownership.
 *
 * Browser/model insert interfaces do not accept user_id for
 * normal V2 intake records.
 *
 * Server code derives user ownership from the verified
 * authenticated Supabase identity.
 *
 *
 * Travel OS:
 *
 * TripInsert and DocumentInsert also deliberately do not
 * accept user_id.
 */


/* =========================================================
 * 49. STRUCTURED PROPOSAL VERSIONING
 * ======================================================= */

/**
 * Every structured proposal carries:
 *
 * version: 1
 *
 *
 * If the format changes:
 *
 * introduce a new proposal version.
 *
 * Never silently reinterpret an already-approved proposal.
 */


/* =========================================================
 * 50. ROLLOUT COMPATIBILITY RULE
 * ======================================================= */

/**
 * IntakePreview.proposal is temporarily optional at the
 * TypeScript boundary.
 *
 *
 * Runtime currently requires:
 *
 * finance → structured finance proposal
 * plan    → structured plan proposal
 * growth  → structured growth proposal
 *
 *
 * TravelIntakeProposal now has a stable TypeScript contract,
 * but remains intentionally staged.
 *
 * Until Travel validation + preview + UI review are enabled:
 *
 * travel → null
 *
 *
 * document → null
 * note     → null
 *
 *
 * Travel must not be added to StructuredIntakeProposal
 * prematurely.
 */


/* =========================================================
 * 51. TRAVEL STORAGE RULE
 * ======================================================= */

/**
 * Private documents:
 *
 * PostgreSQL
 *      ↓
 * document metadata only
 *
 *
 * Supabase Storage
 *      ↓
 * actual PDF bytes
 *
 *
 * Bucket:
 *
 * life-os-private-documents
 *
 *
 * Object ownership:
 *
 * auth.uid()/...
 *
 *
 * Never:
 *
 * public bucket
 * public permanent URL
 * service_role in browser
 * PDF base64 in documents table
 * AI-supplied user_id
 */


/* =========================================================
 * 52. FINAL TYPE SAFETY RULE
 * ======================================================= */

/**
 * LIFE OS V2:
 *
 * User Input
 *      ↓
 * AI Interpretation
 *      ↓
 * Exact Structured Proposal
 *      ↓
 * User Reviews Exact Values
 *      ↓
 * User Approves
 *      ↓
 * Deterministic Executor
 *
 *
 * AI classification alone is never enough to create a
 * permanent LIFE OS fact.
 */