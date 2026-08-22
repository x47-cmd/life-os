import {
  AUDIT_PAGE_SIZE,
  DEFAULT_CURRENCY,
  DEFAULT_TIMEZONE,
  MAX_DASHBOARD_GOALS,
  MAX_DASHBOARD_LEARNING_ITEMS,
  MAX_DASHBOARD_PRIORITIES,
  MAX_DASHBOARD_PROJECTS,
  MAX_DASHBOARD_TASKS,
  PRIORITY_WEIGHT,
} from "@/lib/constants";

import {
  assertAAL2Identity,
} from "@/lib/auth";

import {
  createClient,
  type ServerSupabaseClient,
} from "@/lib/supabase/server";

import type {
  AIRecommendation,
  AIRecommendationInsert,
  AIRecommendationUpdate,
  AuditLog,
  BudgetItem,
  BudgetItemInsert,
  BudgetItemUpdate,
  CareerItem,
  CareerItemInsert,
  CareerItemUpdate,
  CareerSnapshot,
  DashboardSnapshot,
  FinanceSnapshot,
  FinanceTotals,
  Goal,
  GoalInsert,
  GoalStatusSnapshot,
  GoalSummary,
  GoalUpdate,
  IncomeSource,
  IncomeSourceInsert,
  IncomeSourceUpdate,
  InvestmentAsset,
  InvestmentAssetInsert,
  InvestmentAssetUpdate,
  InvestmentPosition,
  InvestmentSnapshot,
  InvestmentTransaction,
  InvestmentTransactionInsert,
  InvestmentTransactionUpdate,
  LearningItem,
  LearningItemInsert,
  LearningItemUpdate,
  LearningStatusSnapshot,
  LearningSummary,
  MemoryItem,
  MemoryItemInsert,
  MemoryItemUpdate,
  MonthlySnapshot,
  MonthlySnapshotInsert,
  MonthlySnapshotUpdate,
  PriorityItem,
  Profile,
  ProfileInsert,
  ProfileUpdate,
  Project,
  ProjectInsert,
  ProjectStatusSnapshot,
  ProjectSummary,
  ProjectUpdate,
  Task,
  TaskInsert,
  TaskStatusSnapshot,
  TaskSummary,
  TaskUpdate,
  UUID,
} from "@/lib/types";

import {
  aiRecommendationInsertSchema,
  aiRecommendationUpdateSchema,
  budgetItemInsertSchema,
  budgetItemUpdateSchema,
  careerItemInsertSchema,
  careerItemUpdateSchema,
  goalInsertSchema,
  goalUpdateSchema,
  incomeSourceInsertSchema,
  incomeSourceUpdateSchema,
  investmentAssetInsertSchema,
  investmentAssetUpdateSchema,
  investmentTransactionInsertSchema,
  investmentTransactionUpdateSchema,
  learningItemInsertSchema,
  learningItemUpdateSchema,
  memoryItemInsertSchema,
  memoryItemUpdateSchema,
  monthlySnapshotInsertSchema,
  monthlySnapshotUpdateSchema,
  profileInsertSchema,
  profileUpdateSchema,
  projectInsertSchema,
  projectUpdateSchema,
  taskInsertSchema,
  taskUpdateSchema,
  uuidSchema,
} from "@/lib/validation";


/* =========================================================
 * 1. DATA ACCESS ERROR
 * ======================================================= */

export class DataAccessError extends Error {
  readonly operation: string;
  readonly databaseCode: string | null;

  constructor(
    operation: string,
    databaseCode: string | null = null,
  ) {
    super(
      `LIFE OS data operation failed: ${operation}.`,
    );

    this.name = "DataAccessError";
    this.operation = operation;
    this.databaseCode = databaseCode;
  }
}


/* =========================================================
 * 2. INTERNAL DATA CONTEXT
 * ======================================================= */

interface DataContext {
  supabase: ServerSupabaseClient;
  userId: UUID;
}


async function getDataContext():
Promise<DataContext> {
  const identity =
    await assertAAL2Identity();

  const supabase =
    await createClient();

  return {
    supabase,
    userId: identity.id,
  };
}


/* =========================================================
 * 3. DATABASE ERROR HANDLING
 * ======================================================= */

interface DatabaseErrorLike {
  code?: string | null;
}


function throwDataError(
  operation: string,
  error: DatabaseErrorLike | null,
): never {
  throw new DataAccessError(
    operation,
    error?.code ?? null,
  );
}


/* =========================================================
 * 4. SAFE ROW CASTING
 * ======================================================= */

/**
 * LIFE OS deliberately does not commit generated Supabase
 * database types in V1.
 *
 * Data returned here is constrained by:
 *
 * - the locked PostgreSQL schema
 * - RLS
 * - application validation
 *
 * These small boundary casts keep all untyped PostgREST data
 * isolated inside this file.
 */
function asRow<T>(
  value: unknown,
): T {
  return value as T;
}


function asRows<T>(
  value: unknown,
): T[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value as T[];
}


/* =========================================================
 * 5. ID VALIDATION
 * ======================================================= */

function validateId(
  id: UUID,
): UUID {
  return uuidSchema.parse(id);
}


/* =========================================================
 * 6. UPDATE SAFETY
 * ======================================================= */

function requireNonEmptyUpdate(
  value: object,
): void {
  if (
    Object.keys(value).length === 0
  ) {
    throw new DataAccessError(
      "empty_update_rejected",
    );
  }
}


/* =========================================================
 * 7. GENERIC OWNED INSERT
 * ======================================================= */

async function insertOwnedRow<T>(
  supabase: ServerSupabaseClient,
  userId: UUID,
  table: string,
  payload: object,
  operation: string,
): Promise<T> {
  const {
    data,
    error,
  } = await supabase
    .from(table)
    .insert({
      ...payload,
      user_id: userId,
    })
    .select("*")
    .single();

  if (
    error ||
    !data
  ) {
    throwDataError(
      operation,
      error,
    );
  }

  return asRow<T>(data);
}


/* =========================================================
 * 8. GENERIC OWNED UPDATE
 * ======================================================= */

async function updateOwnedRow<T>(
  supabase: ServerSupabaseClient,
  userId: UUID,
  table: string,
  id: UUID,
  payload: object,
  operation: string,
): Promise<T> {
  const safeId =
    validateId(id);

  requireNonEmptyUpdate(
    payload,
  );

  const {
    data,
    error,
  } = await supabase
    .from(table)
    .update(payload)
    .eq(
      "id",
      safeId,
    )
    .eq(
      "user_id",
      userId,
    )
    .select("*")
    .single();

  if (
    error ||
    !data
  ) {
    throwDataError(
      operation,
      error,
    );
  }

  return asRow<T>(data);
}


/* =========================================================
 * 9. GENERIC OWNED DELETE
 * ======================================================= */

async function deleteOwnedRow<T>(
  supabase: ServerSupabaseClient,
  userId: UUID,
  table: string,
  id: UUID,
  operation: string,
): Promise<T> {
  const safeId =
    validateId(id);

  const {
    data,
    error,
  } = await supabase
    .from(table)
    .delete()
    .eq(
      "id",
      safeId,
    )
    .eq(
      "user_id",
      userId,
    )
    .select("*")
    .single();

  if (
    error ||
    !data
  ) {
    throwDataError(
      operation,
      error,
    );
  }

  return asRow<T>(data);
}


/* =========================================================
 * 10. GENERIC OWNED FETCH BY ID
 * ======================================================= */

async function fetchOwnedRowById<T>(
  supabase: ServerSupabaseClient,
  userId: UUID,
  table: string,
  id: UUID,
  operation: string,
): Promise<T | null> {
  const safeId =
    validateId(id);

  const {
    data,
    error,
  } = await supabase
    .from(table)
    .select("*")
    .eq(
      "id",
      safeId,
    )
    .eq(
      "user_id",
      userId,
    )
    .maybeSingle();

  if (error) {
    throwDataError(
      operation,
      error,
    );
  }

  return data
    ? asRow<T>(data)
    : null;
}


/* =========================================================
 * 11. DATE HELPERS
 * ======================================================= */

function getDatePartsInTimeZone(
  date: Date,
  timeZone: string,
): {
  year: number;
  month: number;
  day: number;
} {
  const formatter =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      },
    );

  const parts =
    formatter.formatToParts(
      date,
    );

  const year =
    Number(
      parts.find(
        (part) =>
          part.type === "year",
      )?.value,
    );

  const month =
    Number(
      parts.find(
        (part) =>
          part.type === "month",
      )?.value,
    );

  const day =
    Number(
      parts.find(
        (part) =>
          part.type === "day",
      )?.value,
    );

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    throw new DataAccessError(
      "date_generation_failed",
    );
  }

  return {
    year,
    month,
    day,
  };
}


function padTwo(
  value: number,
): string {
  return String(value)
    .padStart(
      2,
      "0",
    );
}


export function getCurrentISODate(
  timeZone = DEFAULT_TIMEZONE,
): string {
  const {
    year,
    month,
    day,
  } =
    getDatePartsInTimeZone(
      new Date(),
      timeZone,
    );

  return `${year}-${padTwo(month)}-${padTwo(day)}`;
}


export function getCurrentMonthISODate(
  timeZone = DEFAULT_TIMEZONE,
): string {
  const {
    year,
    month,
  } =
    getDatePartsInTimeZone(
      new Date(),
      timeZone,
    );

  return `${year}-${padTwo(month)}-01`;
}


/* =========================================================
 * 12. NUMBER HELPERS
 * ======================================================= */

function roundMoney(
  value: number,
): number {
  return Math.round(
    (
      value +
      Number.EPSILON
    ) * 100,
  ) / 100;
}


function roundPercent(
  value: number,
): number {
  return Math.round(
    (
      value +
      Number.EPSILON
    ) * 100,
  ) / 100;
}


function monthlyEquivalent(
  amount: number,
  frequency:
    | "monthly"
    | "annual"
    | "one_time"
    | "other",
): number {
  switch (frequency) {
    case "monthly":
      return amount;

    case "annual":
      return amount / 12;

    case "one_time":
    case "other":
      return 0;

    default:
      return 0;
  }
}


/* =========================================================
 * 13. PROFILE — INTERNAL FETCH
 * ======================================================= */

async function fetchProfile(
  supabase: ServerSupabaseClient,
  userId: UUID,
): Promise<Profile | null> {
  const {
    data,
    error,
  } = await supabase
    .from("profiles")
    .select("*")
    .eq(
      "user_id",
      userId,
    )
    .maybeSingle();

  if (error) {
    throwDataError(
      "fetch_profile",
      error,
    );
  }

  return data
    ? asRow<Profile>(data)
    : null;
}


/* =========================================================
 * 14. PROFILE — PUBLIC OPERATIONS
 * ======================================================= */

export async function getProfile():
Promise<Profile | null> {
  const {
    supabase,
    userId,
  } =
    await getDataContext();

  return fetchProfile(
    supabase,
    userId,
  );
}


export async function saveProfile(
  input: ProfileInsert | ProfileUpdate,
): Promise<Profile> {
  const {
    supabase,
    userId,
  } =
    await getDataContext();

  const existing =
    await fetchProfile(
      supabase,
      userId,
    );

  const parsed =
    existing
      ? profileUpdateSchema.parse(
          input,
        )
      : profileInsertSchema.parse(
          input,
        );

  if (
    existing &&
    Object.keys(parsed).length === 0
  ) {
    throw new DataAccessError(
      "empty_profile_update_rejected",
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from("profiles")
    .upsert(
      {
        user_id: userId,
        ...parsed,
      },
      {
        onConflict: "user_id",
      },
    )
    .select("*")
    .single();

  if (
    error ||
    !data
  ) {
    throwDataError(
      "save_profile",
      error,
    );
  }

  return asRow<Profile>(data);
}


/* =========================================================
 * 15. INCOME SOURCES — INTERNAL FETCH
 * ======================================================= */

async function fetchIncomeSources(
  supabase: ServerSupabaseClient,
  userId: UUID,
): Promise<IncomeSource[]> {
  const {
    data,
    error,
  } = await supabase
    .from("income_sources")
    .select("*")
    .eq(
      "user_id",
      userId,
    )
    .order(
      "is_active",
      {
        ascending: false,
      },
    )
    .order(
      "created_at",
      {
        ascending: true,
      },
    );

  if (error) {
    throwDataError(
      "fetch_income_sources",
      error,
    );
  }

  return asRows<IncomeSource>(
    data,
  );
}


/* =========================================================
 * 16. INCOME SOURCES — PUBLIC OPERATIONS
 * ======================================================= */

export async function listIncomeSources():
Promise<IncomeSource[]> {
  const {
    supabase,
    userId,
  } =
    await getDataContext();

  return fetchIncomeSources(
    supabase,
    userId,
  );
}


export async function createIncomeSource(
  input: IncomeSourceInsert,
): Promise<IncomeSource> {
  const parsed =
    incomeSourceInsertSchema.parse(
      input,
    );

  const {
    supabase,
    userId,
  } =
    await getDataContext();

  return insertOwnedRow<IncomeSource>(
    supabase,
    userId,
    "income_sources",
    parsed,
    "create_income_source",
  );
}


export async function updateIncomeSource(
  id: UUID,
  input: IncomeSourceUpdate,
): Promise<IncomeSource> {
  const parsed =
    incomeSourceUpdateSchema.parse(
      input,
    );

  const {
    supabase,
    userId,
  } =
    await getDataContext();

  return updateOwnedRow<IncomeSource>(
    supabase,
    userId,
    "income_sources",
    id,
    parsed,
    "update_income_source",
  );
}


export async function deleteIncomeSource(
  id: UUID,
): Promise<IncomeSource> {
  const {
    supabase,
    userId,
  } =
    await getDataContext();

  return deleteOwnedRow<IncomeSource>(
    supabase,
    userId,
    "income_sources",
    id,
    "delete_income_source",
  );
}


/* =========================================================
 * 17. BUDGET ITEMS — INTERNAL FETCH
 * ======================================================= */

async function fetchBudgetItems(
  supabase: ServerSupabaseClient,
  userId: UUID,
): Promise<BudgetItem[]> {
  const {
    data,
    error,
  } = await supabase
    .from("budget_items")
    .select("*")
    .eq(
      "user_id",
      userId,
    )
    .order(
      "is_active",
      {
        ascending: false,
      },
    )
    .order(
      "created_at",
      {
        ascending: true,
      },
    );

  if (error) {
    throwDataError(
      "fetch_budget_items",
      error,
    );
  }

  return asRows<BudgetItem>(
    data,
  );
}


/* =========================================================
 * 18. BUDGET ITEMS — PUBLIC OPERATIONS
 * ======================================================= */

export async function listBudgetItems():
Promise<BudgetItem[]> {
  const {
    supabase,
    userId,
  } =
    await getDataContext();

  return fetchBudgetItems(
    supabase,
    userId,
  );
}


export async function createBudgetItem(
  input: BudgetItemInsert,
): Promise<BudgetItem> {
  const parsed =
    budgetItemInsertSchema.parse(
      input,
    );

  const {
    supabase,
    userId,
  } =
    await getDataContext();

  return insertOwnedRow<BudgetItem>(
    supabase,
    userId,
    "budget_items",
    parsed,
    "create_budget_item",
  );
}


export async function updateBudgetItem(
  id: UUID,
  input: BudgetItemUpdate,
): Promise<BudgetItem> {
  const parsed =
    budgetItemUpdateSchema.parse(
      input,
    );

  const {
    supabase,
    userId,
  } =
    await getDataContext();

  return updateOwnedRow<BudgetItem>(
    supabase,
    userId,
    "budget_items",
    id,
    parsed,
    "update_budget_item",
  );
}


export async function deleteBudgetItem(
  id: UUID,
): Promise<BudgetItem> {
  const {
    supabase,
    userId,
  } =
    await getDataContext();

  return deleteOwnedRow<BudgetItem>(
    supabase,
    userId,
    "budget_items",
    id,
    "delete_budget_item",
  );
}


/* =========================================================
 * 19. MONTHLY SNAPSHOTS — INTERNAL FETCH
 * ======================================================= */

async function fetchMonthlySnapshots(
  supabase: ServerSupabaseClient,
  userId: UUID,
): Promise<MonthlySnapshot[]> {
  const {
    data,
    error,
  } = await supabase
    .from("monthly_snapshots")
    .select("*")
    .eq(
      "user_id",
      userId,
    )
    .order(
      "month",
      {
        ascending: false,
      },
    );

  if (error) {
    throwDataError(
      "fetch_monthly_snapshots",
      error,
    );
  }

  return asRows<MonthlySnapshot>(
    data,
  );
}


async function fetchLatestMonthlySnapshot(
  supabase: ServerSupabaseClient,
  userId: UUID,
): Promise<MonthlySnapshot | null> {
  const {
    data,
    error,
  } = await supabase
    .from("monthly_snapshots")
    .select("*")
    .eq(
      "user_id",
      userId,
    )
    .order(
      "month",
      {
        ascending: false,
      },
    )
    .limit(1)
    .maybeSingle();

  if (error) {
    throwDataError(
      "fetch_latest_monthly_snapshot",
      error,
    );
  }

  return data
    ? asRow<MonthlySnapshot>(data)
    : null;
}


/* =========================================================
 * 20. MONTHLY SNAPSHOTS — PUBLIC OPERATIONS
 * ======================================================= */

export async function listMonthlySnapshots():
Promise<MonthlySnapshot[]> {
  const {
    supabase,
    userId,
  } =
    await getDataContext();

  return fetchMonthlySnapshots(
    supabase,
    userId,
  );
}


export async function saveMonthlySnapshot(
  input: MonthlySnapshotInsert,
): Promise<MonthlySnapshot> {
  const parsed =
    monthlySnapshotInsertSchema.parse(
      input,
    );

  const {
    supabase,
    userId,
  } =
    await getDataContext();

  const {
    data,
    error,
  } = await supabase
    .from("monthly_snapshots")
    .upsert(
      {
        user_id: userId,
        ...parsed,
      },
      {
        onConflict:
          "user_id,month",
      },
    )
    .select("*")
    .single();

  if (
    error ||
    !data
  ) {
    throwDataError(
      "save_monthly_snapshot",
      error,
    );
  }

  return asRow<MonthlySnapshot>(
    data,
  );
}


export async function updateMonthlySnapshot(
  id: UUID,
  input: MonthlySnapshotUpdate,
): Promise<MonthlySnapshot> {
  const parsed =
    monthlySnapshotUpdateSchema.parse(
      input,
    );

  const {
    supabase,
    userId,
  } =
    await getDataContext();

  return updateOwnedRow<MonthlySnapshot>(
    supabase,
    userId,
    "monthly_snapshots",
    id,
    parsed,
    "update_monthly_snapshot",
  );
}


/* =========================================================
 * 21. INVESTMENT ASSETS — INTERNAL FETCH
 * ======================================================= */

async function fetchInvestmentAssets(
  supabase: ServerSupabaseClient,
  userId: UUID,
): Promise<InvestmentAsset[]> {
  const {
    data,
    error,
  } = await supabase
    .from("investment_assets")
    .select("*")
    .eq(
      "user_id",
      userId,
    )
    .order(
      "is_active",
      {
        ascending: false,
      },
    )
    .order(
      "created_at",
      {
        ascending: true,
      },
    );

  if (error) {
    throwDataError(
      "fetch_investment_assets",
      error,
    );
  }

  return asRows<InvestmentAsset>(
    data,
  );
}


/* =========================================================
 * 22. INVESTMENT ASSETS — PUBLIC OPERATIONS
 * ======================================================= */

export async function listInvestmentAssets():
Promise<InvestmentAsset[]> {
  const {
    supabase,
    userId,
  } =
    await getDataContext();

  return fetchInvestmentAssets(
    supabase,
    userId,
  );
}


export async function createInvestmentAsset(
  input: InvestmentAssetInsert,
): Promise<InvestmentAsset> {
  const parsed =
    investmentAssetInsertSchema.parse(
      input,
    );

  const {
    supabase,
    userId,
  } =
    await getDataContext();

  return insertOwnedRow<InvestmentAsset>(
    supabase,
    userId,
    "investment_assets",
    parsed,
    "create_investment_asset",
  );
}


export async function updateInvestmentAsset(
  id: UUID,
  input: InvestmentAssetUpdate,
): Promise<InvestmentAsset> {
  const parsed =
    investmentAssetUpdateSchema.parse(
      input,
    );

  const {
    supabase,
    userId,
  } =
    await getDataContext();

  return updateOwnedRow<InvestmentAsset>(
    supabase,
    userId,
    "investment_assets",
    id,
    parsed,
    "update_investment_asset",
  );
}


export async function deleteInvestmentAsset(
  id: UUID,
): Promise<InvestmentAsset> {
  const {
    supabase,
    userId,
  } =
    await getDataContext();

  return deleteOwnedRow<InvestmentAsset>(
    supabase,
    userId,
    "investment_assets",
    id,
    "delete_investment_asset",
  );
}


/* =========================================================
 * 23. INVESTMENT TRANSACTIONS — INTERNAL FETCH
 * ======================================================= */

async function fetchInvestmentTransactions(
  supabase: ServerSupabaseClient,
  userId: UUID,
  assetId?: UUID,
): Promise<InvestmentTransaction[]> {
  let query =
    supabase
      .from(
        "investment_transactions",
      )
      .select("*")
      .eq(
        "user_id",
        userId,
      );

  if (assetId) {
    query =
      query.eq(
        "asset_id",
        validateId(assetId),
      );
  }

  const {
    data,
    error,
  } = await query
    .order(
      "transaction_date",
      {
        ascending: false,
      },
    )
    .order(
      "created_at",
      {
        ascending: false,
      },
    );

  if (error) {
    throwDataError(
      "fetch_investment_transactions",
      error,
    );
  }

  return asRows<InvestmentTransaction>(
    data,
  );
}


/* =========================================================
 * 24. INVESTMENT TRANSACTIONS — PUBLIC OPERATIONS
 * ======================================================= */

export async function listInvestmentTransactions(
  assetId?: UUID,
): Promise<InvestmentTransaction[]> {
  const {
    supabase,
    userId,
  } =
    await getDataContext();

  return fetchInvestmentTransactions(
    supabase,
    userId,
    assetId,
  );
}


export async function createInvestmentTransaction(
  input: InvestmentTransactionInsert,
): Promise<InvestmentTransaction> {
  const parsed =
    investmentTransactionInsertSchema.parse(
      input,
    );

  const {
    supabase,
    userId,
  } =
    await getDataContext();

  return insertOwnedRow<InvestmentTransaction>(
    supabase,
    userId,
    "investment_transactions",
    parsed,
    "create_investment_transaction",
  );
}


export async function updateInvestmentTransaction(
  id: UUID,
  input: InvestmentTransactionUpdate,
): Promise<InvestmentTransaction> {
  const partial =
    investmentTransactionUpdateSchema.parse(
      input,
    );

  requireNonEmptyUpdate(
    partial,
  );

  const {
    supabase,
    userId,
  } =
    await getDataContext();

  const current =
    await fetchOwnedRowById<InvestmentTransaction>(
      supabase,
      userId,
      "investment_transactions",
      id,
      "fetch_investment_transaction_for_update",
    );

  if (!current) {
    throw new DataAccessError(
      "investment_transaction_not_found",
    );
  }

  /**
   * Validate the complete resulting transaction.
   *
   * This prevents an update such as:
   *
   * dividend → buy
   *
   * without also providing a valid quantity and unit price.
   */
  investmentTransactionInsertSchema.parse({
    asset_id:
      partial.asset_id ??
      current.asset_id,

    transaction_type:
      partial.transaction_type ??
      current.transaction_type,

    transaction_date:
      partial.transaction_date ??
      current.transaction_date,

    quantity:
      partial.quantity !== undefined
        ? partial.quantity
        : current.quantity,

    unit_price:
      partial.unit_price !== undefined
        ? partial.unit_price
        : current.unit_price,

    total_amount:
      partial.total_amount ??
      current.total_amount,

    fees:
      partial.fees ??
      current.fees,

    notes:
      partial.notes !== undefined
        ? partial.notes
        : current.notes,
  });

  return updateOwnedRow<InvestmentTransaction>(
    supabase,
    userId,
    "investment_transactions",
    id,
    partial,
    "update_investment_transaction",
  );
}


export async function deleteInvestmentTransaction(
  id: UUID,
): Promise<InvestmentTransaction> {
  const {
    supabase,
    userId,
  } =
    await getDataContext();

  return deleteOwnedRow<InvestmentTransaction>(
    supabase,
    userId,
    "investment_transactions",
    id,
    "delete_investment_transaction",
  );
}


/* =========================================================
 * 25. GOALS — INTERNAL FETCH
 * ======================================================= */

async function fetchGoals(
  supabase: ServerSupabaseClient,
  userId: UUID,
): Promise<Goal[]> {
  const {
    data,
    error,
  } = await supabase
    .from("goals")
    .select("*")
    .eq(
      "user_id",
      userId,
    )
    .order(
      "sort_order",
      {
        ascending: true,
      },
    )
    .order(
      "created_at",
      {
        ascending: true,
      },
    );

  if (error) {
    throwDataError(
      "fetch_goals",
      error,
    );
  }

  return asRows<Goal>(
    data,
  );
}


/* =========================================================
 * 26. GOALS — PUBLIC OPERATIONS
 * ======================================================= */

export async function listGoals():
Promise<Goal[]> {
  const {
    supabase,
    userId,
  } =
    await getDataContext();

  return fetchGoals(
    supabase,
    userId,
  );
}


export async function createGoal(
  input: GoalInsert,
): Promise<Goal> {
  const parsed =
    goalInsertSchema.parse(
      input,
    );

  const {
    supabase,
    userId,
  } =
    await getDataContext();

  return insertOwnedRow<Goal>(
    supabase,
    userId,
    "goals",
    parsed,
    "create_goal",
  );
}


export async function updateGoal(
  id: UUID,
  input: GoalUpdate,
): Promise<Goal> {
  const parsed =
    goalUpdateSchema.parse(
      input,
    );

  const {
    supabase,
    userId,
  } =
    await getDataContext();

  return updateOwnedRow<Goal>(
    supabase,
    userId,
    "goals",
    id,
    parsed,
    "update_goal",
  );
}


export async function deleteGoal(
  id: UUID,
): Promise<Goal> {
  const {
    supabase,
    userId,
  } =
    await getDataContext();

  return deleteOwnedRow<Goal>(
    supabase,
    userId,
    "goals",
    id,
    "delete_goal",
  );
}


/* =========================================================
 * 27. PROJECTS — INTERNAL FETCH
 * ======================================================= */

async function fetchProjects(
  supabase: ServerSupabaseClient,
  userId: UUID,
): Promise<Project[]> {
  const {
    data,
    error,
  } = await supabase
    .from("projects")
    .select("*")
    .eq(
      "user_id",
      userId,
    )
    .order(
      "created_at",
      {
        ascending: false,
      },
    );

  if (error) {
    throwDataError(
      "fetch_projects",
      error,
    );
  }

  return asRows<Project>(
    data,
  );
}


/* =========================================================
 * 28. PROJECTS — PUBLIC OPERATIONS
 * ======================================================= */

export async function listProjects():
Promise<Project[]> {
  const {
    supabase,
    userId,
  } =
    await getDataContext();

  return fetchProjects(
    supabase,
    userId,
  );
}


export async function createProject(
  input: ProjectInsert,
): Promise<Project> {
  const parsed =
    projectInsertSchema.parse(
      input,
    );

  const {
    supabase,
    userId,
  } =
    await getDataContext();

  return insertOwnedRow<Project>(
    supabase,
    userId,
    "projects",
    parsed,
    "create_project",
  );
}


export async function updateProject(
  id: UUID,
  input: ProjectUpdate,
): Promise<Project> {
  const parsed =
    projectUpdateSchema.parse(
      input,
    );

  const {
    supabase,
    userId,
  } =
    await getDataContext();

  return updateOwnedRow<Project>(
    supabase,
    userId,
    "projects",
    id,
    parsed,
    "update_project",
  );
}


export async function deleteProject(
  id: UUID,
): Promise<Project> {
  const {
    supabase,
    userId,
  } =
    await getDataContext();

  return deleteOwnedRow<Project>(
    supabase,
    userId,
    "projects",
    id,
    "delete_project",
  );
}


/* =========================================================
 * 29. TASKS — INTERNAL FETCH
 * ======================================================= */

async function fetchTasks(
  supabase: ServerSupabaseClient,
  userId: UUID,
): Promise<Task[]> {
  const {
    data,
    error,
  } = await supabase
    .from("tasks")
    .select("*")
    .eq(
      "user_id",
      userId,
    )
    .order(
      "due_date",
      {
        ascending: true,
        nullsFirst: false,
      },
    )
    .order(
      "created_at",
      {
        ascending: false,
      },
    );

  if (error) {
    throwDataError(
      "fetch_tasks",
      error,
    );
  }

  return asRows<Task>(
    data,
  );
}


/* =========================================================
 * 30. TASKS — PUBLIC OPERATIONS
 * ======================================================= */

export async function listTasks():
Promise<Task[]> {
  const {
    supabase,
    userId,
  } =
    await getDataContext();

  return fetchTasks(
    supabase,
    userId,
  );
}


export async function createTask(
  input: TaskInsert,
): Promise<Task> {
  const parsed =
    taskInsertSchema.parse(
      input,
    );

  const {
    supabase,
    userId,
  } =
    await getDataContext();

  return insertOwnedRow<Task>(
    supabase,
    userId,
    "tasks",
    parsed,
    "create_task",
  );
}


export async function updateTask(
  id: UUID,
  input: TaskUpdate,
): Promise<Task> {
  const parsed =
    taskUpdateSchema.parse(
      input,
    );

  const {
    supabase,
    userId,
  } =
    await getDataContext();

  return updateOwnedRow<Task>(
    supabase,
    userId,
    "tasks",
    id,
    parsed,
    "update_task",
  );
}


export async function deleteTask(
  id: UUID,
): Promise<Task> {
  const {
    supabase,
    userId,
  } =
    await getDataContext();

  return deleteOwnedRow<Task>(
    supabase,
    userId,
    "tasks",
    id,
    "delete_task",
  );
}


/* =========================================================
 * 31. LEARNING — INTERNAL FETCH
 * ======================================================= */

async function fetchLearningItems(
  supabase: ServerSupabaseClient,
  userId: UUID,
): Promise<LearningItem[]> {
  const {
    data,
    error,
  } = await supabase
    .from("learning_items")
    .select("*")
    .eq(
      "user_id",
      userId,
    )
    .order(
      "created_at",
      {
        ascending: false,
      },
    );

  if (error) {
    throwDataError(
      "fetch_learning_items",
      error,
    );
  }

  return asRows<LearningItem>(
    data,
  );
}


/* =========================================================
 * 32. LEARNING — PUBLIC OPERATIONS
 * ======================================================= */

export async function listLearningItems():
Promise<LearningItem[]> {
  const {
    supabase,
    userId,
  } =
    await getDataContext();

  return fetchLearningItems(
    supabase,
    userId,
  );
}


export async function createLearningItem(
  input: LearningItemInsert,
): Promise<LearningItem> {
  const parsed =
    learningItemInsertSchema.parse(
      input,
    );

  const {
    supabase,
    userId,
  } =
    await getDataContext();

  return insertOwnedRow<LearningItem>(
    supabase,
    userId,
    "learning_items",
    parsed,
    "create_learning_item",
  );
}


export async function updateLearningItem(
  id: UUID,
  input: LearningItemUpdate,
): Promise<LearningItem> {
  const parsed =
    learningItemUpdateSchema.parse(
      input,
    );

  const {
    supabase,
    userId,
  } =
    await getDataContext();

  return updateOwnedRow<LearningItem>(
    supabase,
    userId,
    "learning_items",
    id,
    parsed,
    "update_learning_item",
  );
}


export async function deleteLearningItem(
  id: UUID,
): Promise<LearningItem> {
  const {
    supabase,
    userId,
  } =
    await getDataContext();

  return deleteOwnedRow<LearningItem>(
    supabase,
    userId,
    "learning_items",
    id,
    "delete_learning_item",
  );
}


/* =========================================================
 * 33. CAREER — INTERNAL FETCH
 * ======================================================= */

async function fetchCareerItems(
  supabase: ServerSupabaseClient,
  userId: UUID,
): Promise<CareerItem[]> {
  const {
    data,
    error,
  } = await supabase
    .from("career_items")
    .select("*")
    .eq(
      "user_id",
      userId,
    )
    .order(
      "created_at",
      {
        ascending: false,
      },
    );

  if (error) {
    throwDataError(
      "fetch_career_items",
      error,
    );
  }

  return asRows<CareerItem>(
    data,
  );
}


/* =========================================================
 * 34. CAREER — PUBLIC OPERATIONS
 * ======================================================= */

export async function listCareerItems():
Promise<CareerItem[]> {
  const {
    supabase,
    userId,
  } =
    await getDataContext();

  return fetchCareerItems(
    supabase,
    userId,
  );
}


export async function createCareerItem(
  input: CareerItemInsert,
): Promise<CareerItem> {
  const parsed =
    careerItemInsertSchema.parse(
      input,
    );

  const {
    supabase,
    userId,
  } =
    await getDataContext();

  return insertOwnedRow<CareerItem>(
    supabase,
    userId,
    "career_items",
    parsed,
    "create_career_item",
  );
}


export async function updateCareerItem(
  id: UUID,
  input: CareerItemUpdate,
): Promise<CareerItem> {
  const parsed =
    careerItemUpdateSchema.parse(
      input,
    );

  const {
    supabase,
    userId,
  } =
    await getDataContext();

  return updateOwnedRow<CareerItem>(
    supabase,
    userId,
    "career_items",
    id,
    parsed,
    "update_career_item",
  );
}


export async function deleteCareerItem(
  id: UUID,
): Promise<CareerItem> {
  const {
    supabase,
    userId,
  } =
    await getDataContext();

  return deleteOwnedRow<CareerItem>(
    supabase,
    userId,
    "career_items",
    id,
    "delete_career_item",
  );
}


/* =========================================================
 * 35. MEMORY — INTERNAL FETCH
 * ======================================================= */

async function fetchMemoryItems(
  supabase: ServerSupabaseClient,
  userId: UUID,
): Promise<MemoryItem[]> {
  const {
    data,
    error,
  } = await supabase
    .from("memory_items")
    .select("*")
    .eq(
      "user_id",
      userId,
    )
    .order(
      "importance",
      {
        ascending: false,
      },
    )
    .order(
      "updated_at",
      {
        ascending: false,
      },
    );

  if (error) {
    throwDataError(
      "fetch_memory_items",
      error,
    );
  }

  return asRows<MemoryItem>(
    data,
  );
}


/* =========================================================
 * 36. MEMORY — PUBLIC OPERATIONS
 * ======================================================= */

export async function listMemoryItems():
Promise<MemoryItem[]> {
  const {
    supabase,
    userId,
  } =
    await getDataContext();

  return fetchMemoryItems(
    supabase,
    userId,
  );
}


export async function createMemoryItem(
  input: MemoryItemInsert,
): Promise<MemoryItem> {
  const parsed =
    memoryItemInsertSchema.parse(
      input,
    );

  const {
    supabase,
    userId,
  } =
    await getDataContext();

  return insertOwnedRow<MemoryItem>(
    supabase,
    userId,
    "memory_items",
    parsed,
    "create_memory_item",
  );
}


export async function updateMemoryItem(
  id: UUID,
  input: MemoryItemUpdate,
): Promise<MemoryItem> {
  const parsed =
    memoryItemUpdateSchema.parse(
      input,
    );

  const {
    supabase,
    userId,
  } =
    await getDataContext();

  return updateOwnedRow<MemoryItem>(
    supabase,
    userId,
    "memory_items",
    id,
    parsed,
    "update_memory_item",
  );
}


export async function deleteMemoryItem(
  id: UUID,
): Promise<MemoryItem> {
  const {
    supabase,
    userId,
  } =
    await getDataContext();

  return deleteOwnedRow<MemoryItem>(
    supabase,
    userId,
    "memory_items",
    id,
    "delete_memory_item",
  );
}


/* =========================================================
 * 37. AI RECOMMENDATIONS — INTERNAL FETCH
 * ======================================================= */

async function fetchAIRecommendations(
  supabase: ServerSupabaseClient,
  userId: UUID,
): Promise<AIRecommendation[]> {
  const {
    data,
    error,
  } = await supabase
    .from(
      "ai_recommendations",
    )
    .select("*")
    .eq(
      "user_id",
      userId,
    )
    .order(
      "created_at",
      {
        ascending: false,
      },
    );

  if (error) {
    throwDataError(
      "fetch_ai_recommendations",
      error,
    );
  }

  return asRows<AIRecommendation>(
    data,
  );
}


async function fetchLatestAIRecommendation(
  supabase: ServerSupabaseClient,
  userId: UUID,
): Promise<AIRecommendation | null> {
  const {
    data,
    error,
  } = await supabase
    .from(
      "ai_recommendations",
    )
    .select("*")
    .eq(
      "user_id",
      userId,
    )
    .eq(
      "status",
      "new",
    )
    .order(
      "created_at",
      {
        ascending: false,
      },
    )
    .limit(1)
    .maybeSingle();

  if (error) {
    throwDataError(
      "fetch_latest_ai_recommendation",
      error,
    );
  }

  return data
    ? asRow<AIRecommendation>(
        data,
      )
    : null;
}


/* =========================================================
 * 38. AI RECOMMENDATIONS — PUBLIC OPERATIONS
 * ======================================================= */

export async function listAIRecommendations():
Promise<AIRecommendation[]> {
  const {
    supabase,
    userId,
  } =
    await getDataContext();

  return fetchAIRecommendations(
    supabase,
    userId,
  );
}


export async function createAIRecommendation(
  input: AIRecommendationInsert,
): Promise<AIRecommendation> {
  const parsed =
    aiRecommendationInsertSchema.parse(
      input,
    );

  const {
    supabase,
    userId,
  } =
    await getDataContext();

  return insertOwnedRow<AIRecommendation>(
    supabase,
    userId,
    "ai_recommendations",
    parsed,
    "create_ai_recommendation",
  );
}


export async function updateAIRecommendation(
  id: UUID,
  input: AIRecommendationUpdate,
): Promise<AIRecommendation> {
  const parsed =
    aiRecommendationUpdateSchema.parse(
      input,
    );

  const {
    supabase,
    userId,
  } =
    await getDataContext();

  return updateOwnedRow<AIRecommendation>(
    supabase,
    userId,
    "ai_recommendations",
    id,
    parsed,
    "update_ai_recommendation",
  );
}


export async function deleteAIRecommendation(
  id: UUID,
): Promise<AIRecommendation> {
  const {
    supabase,
    userId,
  } =
    await getDataContext();

  return deleteOwnedRow<AIRecommendation>(
    supabase,
    userId,
    "ai_recommendations",
    id,
    "delete_ai_recommendation",
  );
}


/* =========================================================
 * 39. AUDIT LOG — READ ONLY
 * ======================================================= */

export async function listAuditLogs(
  limit = AUDIT_PAGE_SIZE,
): Promise<AuditLog[]> {
  const {
    supabase,
    userId,
  } =
    await getDataContext();

  const safeLimit =
    Math.min(
      Math.max(
        Math.trunc(limit),
        1,
      ),
      100,
    );

  const {
    data,
    error,
  } = await supabase
    .from("audit_logs")
    .select("*")
    .eq(
      "user_id",
      userId,
    )
    .order(
      "created_at",
      {
        ascending: false,
      },
    )
    .limit(
      safeLimit,
    );

  if (error) {
    throwDataError(
      "fetch_audit_logs",
      error,
    );
  }

  return asRows<AuditLog>(
    data,
  );
}


/* =========================================================
 * 40. FINANCE — PURE CALCULATION
 * ======================================================= */

/**
 * Monthly planning rule:
 *
 * monthly  → full amount
 * annual   → amount / 12
 * one_time → excluded from recurring monthly baseline
 * other    → excluded unless explicitly classified later
 *
 * LIFE OS does not guess timing for unknown one-time items.
 */
export function calculateFinanceTotals(
  incomeSources: IncomeSource[],
  budgetItems: BudgetItem[],
): FinanceTotals {
  const activeIncome =
    incomeSources.filter(
      (item) => item.is_active,
    );

  const activeBudget =
    budgetItems.filter(
      (item) => item.is_active,
    );

  const totalIncome =
    activeIncome.reduce(
      (
        total,
        item,
      ) =>
        total +
        monthlyEquivalent(
          item.amount,
          item.frequency,
        ),
      0,
    );

  let totalExpenses = 0;
  let totalSavings = 0;
  let totalInvestments = 0;
  let totalDebtPayments = 0;

  activeBudget.forEach(
    (item) => {
      const monthlyAmount =
        monthlyEquivalent(
          item.amount,
          item.frequency,
        );

      switch (
        item.item_type
      ) {
        case "expense":
          totalExpenses +=
            monthlyAmount;
          break;

        case "saving":
          totalSavings +=
            monthlyAmount;
          break;

        case "investment":
          totalInvestments +=
            monthlyAmount;
          break;

        case "debt":
          totalDebtPayments +=
            monthlyAmount;
          break;

        default:
          break;
      }
    },
  );

  const totalAllocations =
    totalExpenses +
    totalSavings +
    totalInvestments +
    totalDebtPayments;

  return {
    total_income:
      roundMoney(totalIncome),

    total_expenses:
      roundMoney(totalExpenses),

    total_savings:
      roundMoney(totalSavings),

    total_investments:
      roundMoney(
        totalInvestments,
      ),

    total_debt_payments:
      roundMoney(
        totalDebtPayments,
      ),

    total_allocations:
      roundMoney(
        totalAllocations,
      ),

    available_amount:
      roundMoney(
        totalIncome -
        totalAllocations,
      ),
  };
}


/* =========================================================
 * 41. FINANCE SNAPSHOT
 * ======================================================= */

export function calculateFinanceSnapshot(
  profile: Profile | null,
  incomeSources: IncomeSource[],
  budgetItems: BudgetItem[],
  latestSnapshot: MonthlySnapshot | null,
): FinanceSnapshot {
  const totals =
    calculateFinanceTotals(
      incomeSources,
      budgetItems,
    );

  return {
    currency:
      profile?.default_currency ??
      DEFAULT_CURRENCY,

    monthly_income:
      totals.total_income,

    monthly_expenses:
      totals.total_expenses,

    monthly_savings:
      totals.total_savings,

    monthly_investments:
      totals.total_investments,

    monthly_debt_payments:
      totals.total_debt_payments,

    monthly_allocations:
      totals.total_allocations,

    available_amount:
      totals.available_amount,

    emergency_fund_balance:
      latestSnapshot
        ?.emergency_fund_balance ??
      0,

    travel_savings_balance:
      latestSnapshot
        ?.travel_savings_balance ??
      0,

    income_sources:
      incomeSources,

    budget_items:
      budgetItems,

    latest_monthly_snapshot:
      latestSnapshot,
  };
}


/* =========================================================
 * 42. FINANCE SNAPSHOT — DATABASE
 * ======================================================= */

export async function getFinanceSnapshot():
Promise<FinanceSnapshot> {
  const {
    supabase,
    userId,
  } =
    await getDataContext();

  const [
    profile,
    incomeSources,
    budgetItems,
    latestSnapshot,
  ] =
    await Promise.all([
      fetchProfile(
        supabase,
        userId,
      ),

      fetchIncomeSources(
        supabase,
        userId,
      ),

      fetchBudgetItems(
        supabase,
        userId,
      ),

      fetchLatestMonthlySnapshot(
        supabase,
        userId,
      ),
    ]);

  return calculateFinanceSnapshot(
    profile,
    incomeSources,
    budgetItems,
    latestSnapshot,
  );
}


/* =========================================================
 * 43. INVESTMENTS — PURE CALCULATION
 * ======================================================= */

/**
 * V1 does not contain an FX conversion engine.
 *
 * Therefore portfolio totals are aggregated only for assets
 * matching the selected portfolio currency.
 *
 * Foreign-currency positions may still appear individually,
 * but they are never silently converted or added into an AED
 * total without an authoritative FX rate.
 */
export function calculateInvestmentSnapshot(
  assets: InvestmentAsset[],
  currency = DEFAULT_CURRENCY,
): InvestmentSnapshot {
  const activeAssets =
    assets.filter(
      (asset) =>
        asset.is_active,
    );

  const aggregateAssets =
    activeAssets.filter(
      (asset) =>
        asset.currency ===
        currency,
    );

  const pricedAggregateAssets =
    aggregateAssets.filter(
      (asset) =>
        asset.reference_price !==
        null,
    );

  const totalEstimatedValue =
    pricedAggregateAssets.reduce(
      (
        total,
        asset,
      ) =>
        total +
        (
          asset.quantity *
          (
            asset.reference_price ??
            0
          )
        ),
      0,
    );

  const totalCostBasis =
    aggregateAssets.reduce(
      (
        total,
        asset,
      ) =>
        total +
        (
          asset.quantity *
          asset.average_cost
        ),
      0,
    );

  const totalEstimatedGainLoss =
    pricedAggregateAssets.reduce(
      (
        total,
        asset,
      ) => {
        const value =
          asset.quantity *
          (
            asset.reference_price ??
            0
          );

        const cost =
          asset.quantity *
          asset.average_cost;

        return (
          total +
          (
            value -
            cost
          )
        );
      },
      0,
    );

  const totalMonthlyContributionTarget =
    aggregateAssets.reduce(
      (
        total,
        asset,
      ) =>
        total +
        (
          asset
            .monthly_contribution_target ??
          0
        ),
      0,
    );

  const positions:
    InvestmentPosition[] =
    activeAssets.map(
      (asset) => {
        const costBasis =
          asset.quantity *
          asset.average_cost;

        const estimatedValue =
          asset.reference_price ===
          null
            ? null
            : asset.quantity *
              asset.reference_price;

        const estimatedGainLoss =
          estimatedValue === null
            ? null
            : estimatedValue -
              costBasis;

        const estimatedGainLossPercent =
          estimatedGainLoss === null ||
          costBasis <= 0
            ? null
            : (
                estimatedGainLoss /
                costBasis
              ) * 100;

        const allocationPercent =
          asset.currency !==
            currency ||
          estimatedValue === null ||
          totalEstimatedValue <= 0
            ? null
            : (
                estimatedValue /
                totalEstimatedValue
              ) * 100;

        const targetProgressPercent =
          asset.target_quantity ===
            null ||
          asset.target_quantity <= 0
            ? null
            : Math.min(
                100,
                (
                  asset.quantity /
                  asset.target_quantity
                ) * 100,
              );

        return {
          asset,

          cost_basis:
            roundMoney(
              costBasis,
            ),

          estimated_value:
            estimatedValue === null
              ? null
              : roundMoney(
                  estimatedValue,
                ),

          estimated_gain_loss:
            estimatedGainLoss === null
              ? null
              : roundMoney(
                  estimatedGainLoss,
                ),

          estimated_gain_loss_percent:
            estimatedGainLossPercent ===
            null
              ? null
              : roundPercent(
                  estimatedGainLossPercent,
                ),

          allocation_percent:
            allocationPercent ===
            null
              ? null
              : roundPercent(
                  allocationPercent,
                ),

          target_progress_percent:
            targetProgressPercent ===
            null
              ? null
              : roundPercent(
                  targetProgressPercent,
                ),
        };
      },
    );

  return {
    currency,

    total_cost_basis:
      roundMoney(
        totalCostBasis,
      ),

    total_estimated_value:
      roundMoney(
        totalEstimatedValue,
      ),

    total_estimated_gain_loss:
      roundMoney(
        totalEstimatedGainLoss,
      ),

    total_monthly_contribution_target:
      roundMoney(
        totalMonthlyContributionTarget,
      ),

    active_asset_count:
      activeAssets.length,

    positions,
  };
}


/* =========================================================
 * 44. INVESTMENT SNAPSHOT — DATABASE
 * ======================================================= */

export async function getInvestmentSnapshot():
Promise<InvestmentSnapshot> {
  const {
    supabase,
    userId,
  } =
    await getDataContext();

  const [
    profile,
    assets,
  ] =
    await Promise.all([
      fetchProfile(
        supabase,
        userId,
      ),

      fetchInvestmentAssets(
        supabase,
        userId,
      ),
    ]);

  return calculateInvestmentSnapshot(
    assets,
    profile?.default_currency ??
      DEFAULT_CURRENCY,
  );
}


/* =========================================================
 * 45. GOAL STATUS — PURE CALCULATION
 * ======================================================= */

function toGoalSummary(
  goal: Goal,
): GoalSummary {
  return {
    id: goal.id,
    title: goal.title,
    category: goal.category,
    status: goal.status,
    priority: goal.priority,
    progress_percent:
      goal.progress_percent,
    target_date:
      goal.target_date,
    next_action:
      goal.next_action,
  };
}


function compareTargetDates(
  a: string | null,
  b: string | null,
): number {
  if (
    a === null &&
    b === null
  ) {
    return 0;
  }

  if (a === null) {
    return 1;
  }

  if (b === null) {
    return -1;
  }

  return a.localeCompare(b);
}


export function calculateGoalStatus(
  goals: Goal[],
): GoalStatusSnapshot {
  const activeGoals =
    goals.filter(
      (goal) =>
        goal.status ===
        "active",
    );

  const highPriorityGoals =
    activeGoals
      .filter(
        (goal) =>
          goal.priority ===
          "high",
      )
      .sort(
        (
          a,
          b,
        ) =>
          compareTargetDates(
            a.target_date,
            b.target_date,
          ),
      );

  return {
    active_count:
      activeGoals.length,

    planned_count:
      goals.filter(
        (goal) =>
          goal.status ===
          "planned",
      ).length,

    paused_count:
      goals.filter(
        (goal) =>
          goal.status ===
          "paused",
      ).length,

    completed_count:
      goals.filter(
        (goal) =>
          goal.status ===
          "completed",
      ).length,

    high_priority_goals:
      highPriorityGoals
        .slice(
          0,
          MAX_DASHBOARD_GOALS,
        )
        .map(
          toGoalSummary,
        ),

    active_goals:
      activeGoals
        .sort(
          (
            a,
            b,
          ) =>
            PRIORITY_WEIGHT[
              b.priority
            ] -
              PRIORITY_WEIGHT[
                a.priority
              ] ||
            compareTargetDates(
              a.target_date,
              b.target_date,
            ),
        )
        .slice(
          0,
          MAX_DASHBOARD_GOALS,
        )
        .map(
          toGoalSummary,
        ),
  };
}


/* =========================================================
 * 46. GOAL STATUS — DATABASE
 * ======================================================= */

export async function getGoalStatus():
Promise<GoalStatusSnapshot> {
  const {
    supabase,
    userId,
  } =
    await getDataContext();

  const goals =
    await fetchGoals(
      supabase,
      userId,
    );

  return calculateGoalStatus(
    goals,
  );
}


/* =========================================================
 * 47. PROJECT STATUS
 * ======================================================= */

function toProjectSummary(
  project: Project,
): ProjectSummary {
  return {
    id: project.id,
    title: project.title,
    category:
      project.category,
    status:
      project.status,
    priority:
      project.priority,
    progress_percent:
      project.progress_percent,
    target_date:
      project.target_date,
    next_action:
      project.next_action,
  };
}


export function calculateProjectStatus(
  projects: Project[],
): ProjectStatusSnapshot {
  const activeProjects =
    projects.filter(
      (project) =>
        project.status ===
        "active",
    );

  const blockedProjects =
    projects.filter(
      (project) =>
        project.status ===
        "blocked",
    );

  const highPriorityProjects =
    projects
      .filter(
        (project) =>
          (
            project.status ===
              "active" ||
            project.status ===
              "blocked"
          ) &&
          project.priority ===
            "high",
      )
      .sort(
        (
          a,
          b,
        ) =>
          compareTargetDates(
            a.target_date,
            b.target_date,
          ),
      );

  return {
    active_count:
      activeProjects.length,

    blocked_count:
      blockedProjects.length,

    planned_count:
      projects.filter(
        (project) =>
          project.status ===
          "planned",
      ).length,

    completed_count:
      projects.filter(
        (project) =>
          project.status ===
          "completed",
      ).length,

    high_priority_projects:
      highPriorityProjects
        .slice(
          0,
          MAX_DASHBOARD_PROJECTS,
        )
        .map(
          toProjectSummary,
        ),

    blocked_projects:
      blockedProjects
        .sort(
          (
            a,
            b,
          ) =>
            PRIORITY_WEIGHT[
              b.priority
            ] -
              PRIORITY_WEIGHT[
                a.priority
              ] ||
            compareTargetDates(
              a.target_date,
              b.target_date,
            ),
        )
        .slice(
          0,
          MAX_DASHBOARD_PROJECTS,
        )
        .map(
          toProjectSummary,
        ),
  };
}


export async function getProjectStatus():
Promise<ProjectStatusSnapshot> {
  const {
    supabase,
    userId,
  } =
    await getDataContext();

  const projects =
    await fetchProjects(
      supabase,
      userId,
    );

  return calculateProjectStatus(
    projects,
  );
}


/* =========================================================
 * 48. TASK STATUS
 * ======================================================= */

function toTaskSummary(
  task: Task,
): TaskSummary {
  return {
    id: task.id,
    title: task.title,
    priority:
      task.priority,
    status:
      task.status,
    due_date:
      task.due_date,
    goal_id:
      task.goal_id,
    project_id:
      task.project_id,
  };
}


function isTaskOverdue(
  task: Task,
  today: string,
): boolean {
  return (
    task.due_date !== null &&
    task.due_date < today &&
    task.status !==
      "completed" &&
    task.status !==
      "cancelled"
  );
}


export function calculateTaskStatus(
  tasks: Task[],
  today: string,
): TaskStatusSnapshot {
  const overdueTasks =
    tasks.filter(
      (task) =>
        isTaskOverdue(
          task,
          today,
        ),
    );

  const urgentTasks =
    tasks
      .filter(
        (task) =>
          task.status ===
            "pending" ||
          task.status ===
            "active",
      )
      .sort(
        (
          a,
          b,
        ) => {
          const aOverdue =
            isTaskOverdue(
              a,
              today,
            )
              ? 1
              : 0;

          const bOverdue =
            isTaskOverdue(
              b,
              today,
            )
              ? 1
              : 0;

          if (
            aOverdue !==
            bOverdue
          ) {
            return (
              bOverdue -
              aOverdue
            );
          }

          const priorityDifference =
            PRIORITY_WEIGHT[
              b.priority
            ] -
            PRIORITY_WEIGHT[
              a.priority
            ];

          if (
            priorityDifference !==
            0
          ) {
            return priorityDifference;
          }

          return compareTargetDates(
            a.due_date,
            b.due_date,
          );
        },
      )
      .slice(
        0,
        MAX_DASHBOARD_TASKS,
      );

  return {
    pending_count:
      tasks.filter(
        (task) =>
          task.status ===
          "pending",
      ).length,

    active_count:
      tasks.filter(
        (task) =>
          task.status ===
          "active",
      ).length,

    completed_count:
      tasks.filter(
        (task) =>
          task.status ===
          "completed",
      ).length,

    overdue_count:
      overdueTasks.length,

    urgent_tasks:
      urgentTasks.map(
        toTaskSummary,
      ),
  };
}


export async function getTaskStatus():
Promise<TaskStatusSnapshot> {
  const {
    supabase,
    userId,
  } =
    await getDataContext();

  const [
    profile,
    tasks,
  ] =
    await Promise.all([
      fetchProfile(
        supabase,
        userId,
      ),

      fetchTasks(
        supabase,
        userId,
      ),
    ]);

  const today =
    getCurrentISODate(
      profile?.timezone ??
        DEFAULT_TIMEZONE,
    );

  return calculateTaskStatus(
    tasks,
    today,
  );
}


/* =========================================================
 * 49. LEARNING STATUS
 * ======================================================= */

function toLearningSummary(
  item: LearningItem,
): LearningSummary {
  return {
    id: item.id,
    title: item.title,
    provider:
      item.provider,
    item_type:
      item.item_type,
    status:
      item.status,
    priority:
      item.priority,
    progress_percent:
      item.progress_percent,
    target_date:
      item.target_date,
  };
}


export function calculateLearningStatus(
  items: LearningItem[],
): LearningStatusSnapshot {
  const activeItems =
    items.filter(
      (item) =>
        item.status ===
        "active",
    );

  const highPriorityItems =
    items
      .filter(
        (item) =>
          (
            item.status ===
              "active" ||
            item.status ===
              "planned"
          ) &&
          item.priority ===
            "high",
      )
      .sort(
        (
          a,
          b,
        ) =>
          compareTargetDates(
            a.target_date,
            b.target_date,
          ),
      );

  return {
    active_count:
      activeItems.length,

    planned_count:
      items.filter(
        (item) =>
          item.status ===
          "planned",
      ).length,

    completed_count:
      items.filter(
        (item) =>
          item.status ===
          "completed",
      ).length,

    paused_count:
      items.filter(
        (item) =>
          item.status ===
          "paused",
      ).length,

    active_items:
      activeItems
        .sort(
          (
            a,
            b,
          ) =>
            PRIORITY_WEIGHT[
              b.priority
            ] -
              PRIORITY_WEIGHT[
                a.priority
              ] ||
            compareTargetDates(
              a.target_date,
              b.target_date,
            ),
        )
        .slice(
          0,
          MAX_DASHBOARD_LEARNING_ITEMS,
        )
        .map(
          toLearningSummary,
        ),

    high_priority_items:
      highPriorityItems
        .slice(
          0,
          MAX_DASHBOARD_LEARNING_ITEMS,
        )
        .map(
          toLearningSummary,
        ),
  };
}


export async function getLearningStatus():
Promise<LearningStatusSnapshot> {
  const {
    supabase,
    userId,
  } =
    await getDataContext();

  const items =
    await fetchLearningItems(
      supabase,
      userId,
    );

  return calculateLearningStatus(
    items,
  );
}


/* =========================================================
 * 50. CAREER SNAPSHOT
 * ======================================================= */

export function calculateCareerSnapshot(
  items: CareerItem[],
): CareerSnapshot {
  return {
    current_roles:
      items.filter(
        (item) =>
          item.item_type ===
          "current_role",
      ),

    target_roles:
      items.filter(
        (item) =>
          item.item_type ===
          "target_role",
      ),

    skills:
      items.filter(
        (item) =>
          item.item_type ===
          "skill",
      ),

    achievements:
      items.filter(
        (item) =>
          item.item_type ===
          "achievement",
      ),

    milestones:
      items.filter(
        (item) =>
          item.item_type ===
          "milestone",
      ),

    gaps:
      items.filter(
        (item) =>
          item.item_type ===
          "gap",
      ),
  };
}


export async function getCareerSnapshot():
Promise<CareerSnapshot> {
  const {
    supabase,
    userId,
  } =
    await getDataContext();

  const items =
    await fetchCareerItems(
      supabase,
      userId,
    );

  return calculateCareerSnapshot(
    items,
  );
}


/* =========================================================
 * 51. DASHBOARD PRIORITY ENGINE
 * ======================================================= */

function buildDashboardPriorities(
  finance:
    FinanceSnapshot,
  goals:
    Goal[],
  projects:
    Project[],
  tasks:
    Task[],
  learning:
    LearningItem[],
  today:
    string,
): PriorityItem[] {
  const candidates:
    PriorityItem[] = [];

  if (
    finance.available_amount <
    0
  ) {
    candidates.push({
      id:
        "finance-negative-available",

      source:
        "finance",

      title:
        "راجع التوزيع المالي",

      description:
        "التوزيعات الشهرية الحالية تتجاوز الدخل الشهري.",

      priority:
        "high",

      next_action:
        "خفض أو إعادة ترتيب أحد البنود الشهرية.",

      target_date:
        null,
    });
  }

  tasks
    .filter(
      (task) =>
        (
          task.status ===
            "pending" ||
          task.status ===
            "active"
        ) &&
        (
          task.priority ===
            "high" ||
          isTaskOverdue(
            task,
            today,
          )
        ),
    )
    .forEach(
      (task) => {
        candidates.push({
          id:
            `task:${task.id}`,

          source:
            "task",

          title:
            task.title,

          description:
            isTaskOverdue(
              task,
              today,
            )
              ? "المهمة متأخرة عن موعدها."
              : task.notes,

          priority:
            isTaskOverdue(
              task,
              today,
            )
              ? "high"
              : task.priority,

          next_action:
            task.title,

          target_date:
            task.due_date,
        });
      },
    );

  projects
    .filter(
      (project) =>
        project.status ===
          "blocked" ||
        (
          project.status ===
            "active" &&
          project.priority ===
            "high"
        ),
    )
    .forEach(
      (project) => {
        candidates.push({
          id:
            `project:${project.id}`,

          source:
            "project",

          title:
            project.title,

          description:
            project.status ===
            "blocked"
              ? "المشروع متعطل ويحتاج قرارًا أو إجراءً."
              : project.description,

          priority:
            project.status ===
            "blocked"
              ? "high"
              : project.priority,

          next_action:
            project.next_action,

          target_date:
            project.target_date,
        });
      },
    );

  goals
    .filter(
      (goal) =>
        goal.status ===
          "active" &&
        goal.priority ===
          "high",
    )
    .forEach(
      (goal) => {
        candidates.push({
          id:
            `goal:${goal.id}`,

          source:
            "goal",

          title:
            goal.title,

          description:
            goal.description,

          priority:
            goal.priority,

          next_action:
            goal.next_action,

          target_date:
            goal.target_date,
        });
      },
    );

  learning
    .filter(
      (item) =>
        item.status ===
          "active" &&
        item.priority ===
          "high",
    )
    .forEach(
      (item) => {
        candidates.push({
          id:
            `learning:${item.id}`,

          source:
            "learning",

          title:
            item.title,

          description:
            item.provider,

          priority:
            item.priority,

          next_action:
            "استمر في العنصر التعليمي الحالي.",

          target_date:
            item.target_date,
        });
      },
    );

  return candidates
    .sort(
      (
        a,
        b,
      ) => {
        const priorityDifference =
          PRIORITY_WEIGHT[
            b.priority
          ] -
          PRIORITY_WEIGHT[
            a.priority
          ];

        if (
          priorityDifference !==
          0
        ) {
          return priorityDifference;
        }

        return compareTargetDates(
          a.target_date,
          b.target_date,
        );
      },
    )
    .slice(
      0,
      MAX_DASHBOARD_PRIORITIES,
    );
}


/* =========================================================
 * 52. DASHBOARD SNAPSHOT
 * ======================================================= */

export async function getDashboardSnapshot():
Promise<DashboardSnapshot> {
  const {
    supabase,
    userId,
  } =
    await getDataContext();

  const [
    profile,
    incomeSources,
    budgetItems,
    latestMonthlySnapshot,
    investmentAssets,
    goals,
    projects,
    tasks,
    learning,
    latestAIRecommendation,
  ] =
    await Promise.all([
      fetchProfile(
        supabase,
        userId,
      ),

      fetchIncomeSources(
        supabase,
        userId,
      ),

      fetchBudgetItems(
        supabase,
        userId,
      ),

      fetchLatestMonthlySnapshot(
        supabase,
        userId,
      ),

      fetchInvestmentAssets(
        supabase,
        userId,
      ),

      fetchGoals(
        supabase,
        userId,
      ),

      fetchProjects(
        supabase,
        userId,
      ),

      fetchTasks(
        supabase,
        userId,
      ),

      fetchLearningItems(
        supabase,
        userId,
      ),

      fetchLatestAIRecommendation(
        supabase,
        userId,
      ),
    ]);

  const currency =
    profile?.default_currency ??
    DEFAULT_CURRENCY;

  const timeZone =
    profile?.timezone ??
    DEFAULT_TIMEZONE;

  const finance =
    calculateFinanceSnapshot(
      profile,
      incomeSources,
      budgetItems,
      latestMonthlySnapshot,
    );

  const investments =
    calculateInvestmentSnapshot(
      investmentAssets,
      currency,
    );

  const goalStatus =
    calculateGoalStatus(
      goals,
    );

  const projectStatus =
    calculateProjectStatus(
      projects,
    );

  const today =
    getCurrentISODate(
      timeZone,
    );

  const taskStatus =
    calculateTaskStatus(
      tasks,
      today,
    );

  const learningStatus =
    calculateLearningStatus(
      learning,
    );

  const priorities =
    buildDashboardPriorities(
      finance,
      goals,
      projects,
      tasks,
      learning,
      today,
    );

  return {
    generated_at:
      new Date().toISOString(),

    month:
      getCurrentMonthISODate(
        timeZone,
      ),

    top_priorities:
      priorities,

    finance,

    investments,

    goals:
      goalStatus,

    projects:
      projectStatus,

    tasks:
      taskStatus,

    learning:
      learningStatus,

    latest_ai_recommendation:
      latestAIRecommendation,
  };
}


/* =========================================================
 * 53. ACTIVE MEMORY FOR AI
 * ======================================================= */

export async function getActiveMemoryItems():
Promise<MemoryItem[]> {
  const {
    supabase,
    userId,
  } =
    await getDataContext();

  const {
    data,
    error,
  } = await supabase
    .from("memory_items")
    .select("*")
    .eq(
      "user_id",
      userId,
    )
    .eq(
      "is_active",
      true,
    )
    .order(
      "updated_at",
      {
        ascending: false,
      },
    );

  if (error) {
    throwDataError(
      "fetch_active_memory",
      error,
    );
  }

  return asRows<MemoryItem>(
    data,
  );
}


/* =========================================================
 * 54. FINAL DATA ACCESS RULE
 * ======================================================= */

/**
 * LIFE OS Data Boundary
 *
 * Browser / AI input
 *      ↓
 * Zod validation
 *      ↓
 * Verified Supabase identity
 *      ↓
 * AAL2
 *      ↓
 * user_id derived from authenticated JWT
 *      ↓
 * lib/data.ts
 *      ↓
 * PostgreSQL RLS
 *      ↓
 * Ownership constraints
 *
 *
 * IMPORTANT:
 *
 * - No create/update function accepts user_id.
 * - No AI function receives arbitrary SQL capability.
 * - No service_role key is used here.
 * - Real calculations are deterministic.
 * - Financial strings are never used for arithmetic.
 * - Cross-currency assets are not silently aggregated.
 * - Database errors are not exposed with raw messages.
 * - Audit insertion is intentionally isolated in lib/audit.ts.
 */