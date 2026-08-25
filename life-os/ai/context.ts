import {
  AI_MAX_CONTEXT_ITEMS_PER_CATEGORY,
  DEFAULT_CURRENCY,
} from "@/lib/constants";

import {
  getActiveMemoryItems,
  getCareerSnapshot,
  getDashboardSnapshot,
} from "@/lib/data";

import {
  getTravelSnapshot,
} from "@/lib/travel-data";

import type {
  AIRequest,
  CareerItem,
  DashboardSnapshot,
  JsonObject,
  JsonValue,
  MemoryItem,
  TravelSnapshot,
} from "@/lib/types";


/* =========================================================
 * LIFE OS V2
 * AI CONTEXT BOUNDARY
 *
 * Responsibilities:
 *
 * - detect which life areas are relevant
 * - read only authenticated LIFE OS facts
 * - minimize private data before AI sees it
 * - include Travel OS when relevant
 * - filter potentially sensitive memory
 * - keep IDs and security metadata out of normal AI context
 *
 *
 * This module is READ-ONLY.
 *
 * It does not:
 *
 * - write database rows
 * - execute intake proposals
 * - upload documents
 * - generate signed file URLs
 * - expose PDF binaries
 * - expose auth tokens
 *
 *
 * Simple outside.
 * Intelligent underneath.
 * Private by default.
 * ======================================================= */


/* =========================================================
 * 1. CONTEXT SCOPES
 * ======================================================= */

export type AIContextScope =
  | "dashboard"
  | "finance"
  | "investments"
  | "goals"
  | "projects"
  | "tasks"
  | "travel"
  | "learning"
  | "career";


/* =========================================================
 * 2. CONTEXT ERROR
 * ======================================================= */

export type AIContextErrorCode =
  | "DECISION_CONTEXT_REQUIRED"
  | "CONTEXT_BUILD_FAILED";


export class AIContextError extends Error {
  readonly code:
    AIContextErrorCode;


  constructor(
    code:
      AIContextErrorCode,
  ) {
    const messages:
      Record<
        AIContextErrorCode,
        string
      > = {
        DECISION_CONTEXT_REQUIRED:
          "Decision requests must use the dedicated decision context.",

        CONTEXT_BUILD_FAILED:
          "LIFE OS could not prepare AI context.",
      };


    super(
      messages[
        code
      ],
    );


    this.name =
      "AIContextError";


    this.code =
      code;
  }
}


/* =========================================================
 * 3. FINANCE KEYWORDS
 * ======================================================= */

const FINANCE_KEYWORDS = [
  "finance",
  "financial",
  "money",
  "salary",
  "income",
  "budget",
  "saving",
  "savings",
  "expense",
  "expenses",
  "debt",
  "loan",
  "cash",
  "emergency fund",
  "travel saving",

  "مالي",
  "المالية",
  "مال",
  "المال",
  "فلوس",
  "راتب",
  "الراتب",
  "دخل",
  "الدخل",
  "ميزانية",
  "الميزانية",
  "توفير",
  "ادخار",
  "مصروف",
  "مصاريف",
  "قرض",
  "القرض",
  "دين",
  "كاش",
  "طوارئ",
] as const;


/* =========================================================
 * 4. INVESTMENT KEYWORDS
 * ======================================================= */

const INVESTMENT_KEYWORDS = [
  "investment",
  "investments",
  "portfolio",
  "stock",
  "stocks",
  "share",
  "shares",
  "etf",
  "fund",
  "sukuk",
  "dividend",
  "dividends",
  "market",

  "استثمار",
  "استثمارات",
  "الاستثمار",
  "الاستثمارات",
  "محفظة",
  "المحفظة",
  "سهم",
  "أسهم",
  "اسهم",
  "صندوق",
  "صناديق",
  "صكوك",
  "توزيعات",
  "السوق",
] as const;


/* =========================================================
 * 5. GOAL KEYWORDS
 * ======================================================= */

const GOAL_KEYWORDS = [
  "goal",
  "goals",
  "target",
  "targets",
  "objective",
  "objectives",

  "هدف",
  "أهداف",
  "اهداف",
  "الأهداف",
  "الاهداف",
  "مستهدف",
] as const;


/* =========================================================
 * 6. PROJECT KEYWORDS
 * ======================================================= */

const PROJECT_KEYWORDS = [
  "project",
  "projects",
  "initiative",
  "initiatives",

  "مشروع",
  "مشاريع",
  "المشروع",
  "المشاريع",
  "مبادرة",
] as const;


/* =========================================================
 * 7. TASK KEYWORDS
 * ======================================================= */

const TASK_KEYWORDS = [
  "task",
  "tasks",
  "todo",
  "to-do",
  "deadline",
  "due",
  "overdue",

  "مهمة",
  "مهام",
  "المهام",
  "موعد",
  "ديدلاين",
  "متأخر",
  "متأخرة",
] as const;


/* =========================================================
 * 8. TRAVEL KEYWORDS
 * ======================================================= */

const TRAVEL_KEYWORDS = [
  "travel",
  "trip",
  "trips",
  "holiday",
  "vacation",
  "destination",
  "flight",
  "flights",
  "hotel",
  "hotels",
  "itinerary",
  "airport",
  "booking",
  "booked",
  "travel budget",
  "travel document",
  "travel documents",

  "سفر",
  "السفر",
  "رحلة",
  "رحلات",
  "الرحلة",
  "الرحلات",
  "وجهة",
  "الوجهة",
  "طيران",
  "رحلة طيران",
  "فندق",
  "فنادق",
  "حجز",
  "حجوزات",
  "محجوز",
  "مطار",
  "برنامج الرحلة",
  "جدول الرحلة",
  "ميزانية السفر",
  "ميزانية الرحلة",
  "جاهزية الرحلة",
] as const;


/* =========================================================
 * 9. LEARNING KEYWORDS
 * ======================================================= */

const LEARNING_KEYWORDS = [
  "learning",
  "course",
  "courses",
  "certification",
  "certifications",
  "education",
  "study",
  "masters",
  "master",
  "university",
  "certificate",

  "تعلم",
  "التعلم",
  "دورة",
  "دورات",
  "شهادة",
  "شهادات",
  "تعليم",
  "التعليم",
  "دراسة",
  "الدراسة",
  "ماجستير",
  "جامعة",
  "الجامعة",
] as const;


/* =========================================================
 * 10. CAREER KEYWORDS
 * ======================================================= */

const CAREER_KEYWORDS = [
  "career",
  "job",
  "jobs",
  "role",
  "promotion",
  "salary increase",
  "skill",
  "skills",
  "cv",
  "resume",
  "achievement",
  "achievements",

  "وظيفة",
  "وظيفي",
  "وظيفية",
  "مسار مهني",
  "ترقية",
  "مهارة",
  "مهارات",
  "سيفي",
  "السيفي",
  "إنجاز",
  "انجاز",
  "إنجازات",
  "انجازات",
] as const;


/* =========================================================
 * 11. TEXT NORMALIZATION
 * ======================================================= */

function normalizeText(
  value:
    string,
): string {
  return value
    .trim()
    .toLowerCase();
}


/* =========================================================
 * 12. KEYWORD MATCHING
 * ======================================================= */

function containsAnyKeyword(
  message:
    string,

  keywords:
    readonly string[],
): boolean {
  const normalized =
    normalizeText(
      message,
    );


  return keywords.some(
    (
      keyword,
    ) =>
      normalized.includes(
        normalizeText(
          keyword,
        ),
      ),
  );
}


/* =========================================================
 * 13. DETECT REQUIRED SCOPES
 * ======================================================= */

/**
 * Scope selection is deterministic.
 *
 * AI does not decide which private LIFE OS datasets it gets.
 */
export function detectContextScopes(
  message:
    string,
): AIContextScope[] {
  const scopes =
    new Set<
      AIContextScope
    >();


  /*
   * Minimal Home snapshot is always available.
   */
  scopes.add(
    "dashboard",
  );


  if (
    containsAnyKeyword(
      message,
      FINANCE_KEYWORDS,
    )
  ) {
    scopes.add(
      "finance",
    );
  }


  if (
    containsAnyKeyword(
      message,
      INVESTMENT_KEYWORDS,
    )
  ) {
    scopes.add(
      "investments",
    );
  }


  if (
    containsAnyKeyword(
      message,
      GOAL_KEYWORDS,
    )
  ) {
    scopes.add(
      "goals",
    );
  }


  if (
    containsAnyKeyword(
      message,
      PROJECT_KEYWORDS,
    )
  ) {
    scopes.add(
      "projects",
    );
  }


  if (
    containsAnyKeyword(
      message,
      TASK_KEYWORDS,
    )
  ) {
    scopes.add(
      "tasks",
    );
  }


  if (
    containsAnyKeyword(
      message,
      TRAVEL_KEYWORDS,
    )
  ) {
    scopes.add(
      "travel",
    );
  }


  if (
    containsAnyKeyword(
      message,
      LEARNING_KEYWORDS,
    )
  ) {
    scopes.add(
      "learning",
    );
  }


  if (
    containsAnyKeyword(
      message,
      CAREER_KEYWORDS,
    )
  ) {
    scopes.add(
      "career",
    );
  }


  return Array.from(
    scopes,
  );
}


/* =========================================================
 * 14. MEMORY SAFETY FILTER
 * ======================================================= */

const SENSITIVE_MEMORY_PATTERNS = [
  "password",
  "passcode",
  "api key",
  "apikey",
  "access token",
  "refresh token",
  "service role",
  "service_role",
  "secret key",
  "totp secret",
  "recovery code",
  "private key",
  "authorization bearer",

  "كلمة المرور",
  "رمز المرور",
  "مفتاح api",
  "مفتاح سري",
  "توكن",
  "رمز الاسترداد",
] as const;


/* =========================================================
 * 15. SENSITIVE MEMORY DETECTION
 * ======================================================= */

function isPotentiallySensitiveMemory(
  item:
    MemoryItem,
): boolean {
  const combined =
    normalizeText(
      `${item.title} ${item.content}`,
    );


  return SENSITIVE_MEMORY_PATTERNS.some(
    (
      pattern,
    ) =>
      combined.includes(
        normalizeText(
          pattern,
        ),
      ),
  );
}


/* =========================================================
 * 16. MEMORY IMPORTANCE
 * ======================================================= */

const MEMORY_IMPORTANCE_WEIGHT = {
  high:
    3,

  medium:
    2,

  low:
    1,
} as const;


/* =========================================================
 * 17. MEMORY RELEVANCE
 * ======================================================= */

function isMemoryRelevantToScopes(
  item:
    MemoryItem,

  scopes:
    AIContextScope[],
): boolean {
  /*
   * Stable preferences and constraints may affect many
   * recommendations.
   */
  if (
    item.category ===
      "preference" ||
    item.category ===
      "constraint"
  ) {
    return true;
  }


  if (
    item.category ===
      "decision" &&
    item.importance ===
      "high"
  ) {
    return true;
  }


  if (
    scopes.includes(
      "finance",
    ) &&
    item.category ===
      "finance"
  ) {
    return true;
  }


  if (
    scopes.includes(
      "investments",
    ) &&
    item.category ===
      "investments"
  ) {
    return true;
  }


  if (
    scopes.includes(
      "career",
    ) &&
    item.category ===
      "career"
  ) {
    return true;
  }


  if (
    scopes.includes(
      "learning",
    ) &&
    (
      item.category ===
        "learning" ||
      item.category ===
        "education"
    )
  ) {
    return true;
  }


  if (
    scopes.includes(
      "projects",
    ) &&
    item.category ===
      "projects"
  ) {
    return true;
  }


  /*
   * Travel currently has its own structured Travel OS tables.
   *
   * We intentionally do not guess a MemoryItem category here
   * if the frozen MemoryItem enum does not define travel.
   *
   * General preference / constraint memory above can still
   * influence travel advice safely.
   */
  return false;
}


/* =========================================================
 * 18. SELECT RELEVANT MEMORY
 * ======================================================= */

function selectRelevantMemory(
  items:
    MemoryItem[],

  scopes:
    AIContextScope[],
): MemoryItem[] {
  return items
    .filter(
      (
        item,
      ) =>
        item.is_active,
    )
    .filter(
      (
        item,
      ) =>
        !isPotentiallySensitiveMemory(
          item,
        ),
    )
    .filter(
      (
        item,
      ) =>
        isMemoryRelevantToScopes(
          item,
          scopes,
        ),
    )
    .sort(
      (
        a,
        b,
      ) => {
        const importanceDifference =
          MEMORY_IMPORTANCE_WEIGHT[
            b.importance
          ] -
          MEMORY_IMPORTANCE_WEIGHT[
            a.importance
          ];


        if (
          importanceDifference !==
          0
        ) {
          return importanceDifference;
        }


        return b.updated_at.localeCompare(
          a.updated_at,
        );
      },
    )
    .slice(
      0,
      AI_MAX_CONTEXT_ITEMS_PER_CATEGORY,
    );
}


/* =========================================================
 * 19. MINIMAL MEMORY OUTPUT
 * ======================================================= */

function buildMemoryContext(
  items:
    MemoryItem[],
): JsonValue[] {
  return items.map(
    (
      item,
    ) => ({
      category:
        item.category,

      title:
        item.title,

      content:
        item.content,

      importance:
        item.importance,
    }),
  );
}


/* =========================================================
 * 20. TRIP MINIMAL OUTPUT
 * ======================================================= */

function buildMinimalTripContext(
  trip:
    TravelSnapshot["next_trip"],
): JsonObject | null {
  if (
    !trip
  ) {
    return null;
  }


  return {
    title:
      trip.title,

    destination:
      trip.destination,

    start_date:
      trip.start_date,

    end_date:
      trip.end_date,

    status:
      trip.status,

    budget_total:
      trip.budget_total,

    currency:
      trip.currency,

    readiness_percent:
      trip.readiness_percent,
  };
}


/* =========================================================
 * 21. TRAVEL SUMMARY
 * ======================================================= */

function buildTravelSummaryContext(
  travel:
    TravelSnapshot,
): JsonObject {
  return {
    next_trip:
      buildMinimalTripContext(
        travel.next_trip,
      ),

    active_trip_count:
      travel.active_trips.length,

    upcoming_trip_count:
      travel.upcoming_trips.length,

    completed_trip_count:
      travel.completed_trip_count,

    private_document_count:
      travel.document_count,
  };
}


/* =========================================================
 * 22. FULL TRAVEL CONTEXT
 * ======================================================= */

/**
 * Still deliberately minimal.
 *
 * We do not send:
 *
 * document file names
 * Storage paths
 * signed URLs
 * PDF binaries
 * document IDs
 * trip IDs
 */
function buildTravelContext(
  travel:
    TravelSnapshot,
): JsonObject {
  return {
    next_trip:
      buildMinimalTripContext(
        travel.next_trip,
      ),

    active_trips:
      travel.active_trips
        .slice(
          0,
          AI_MAX_CONTEXT_ITEMS_PER_CATEGORY,
        )
        .map(
          (
            trip,
          ) => ({
            title:
              trip.title,

            destination:
              trip.destination,

            start_date:
              trip.start_date,

            end_date:
              trip.end_date,

            status:
              trip.status,

            budget_total:
              trip.budget_total,

            currency:
              trip.currency,

            readiness_percent:
              trip.readiness_percent,
          }),
        ),

    upcoming_trips:
      travel.upcoming_trips
        .slice(
          0,
          AI_MAX_CONTEXT_ITEMS_PER_CATEGORY,
        )
        .map(
          (
            trip,
          ) => ({
            title:
              trip.title,

            destination:
              trip.destination,

            start_date:
              trip.start_date,

            end_date:
              trip.end_date,

            status:
              trip.status,

            budget_total:
              trip.budget_total,

            currency:
              trip.currency,

            readiness_percent:
              trip.readiness_percent,
          }),
        ),

    completed_trip_count:
      travel.completed_trip_count,

    private_document_count:
      travel.document_count,
  };
}


/* =========================================================
 * 23. DASHBOARD CORE CONTEXT
 * ======================================================= */

function buildDashboardCoreContext(
  dashboard:
    DashboardSnapshot,

  travel:
    TravelSnapshot,
): JsonObject {
  return {
    month:
      dashboard.month,


    top_priorities:
      dashboard.top_priorities
        .slice(
          0,
          3,
        )
        .map(
          (
            item,
          ) => ({
            source:
              item.source,

            title:
              item.title,

            priority:
              item.priority,

            next_action:
              item.next_action,

            target_date:
              item.target_date,
          }),
        ),


    finance_summary: {
      currency:
        dashboard.finance.currency,

      monthly_income:
        dashboard.finance.monthly_income,

      monthly_allocations:
        dashboard.finance.monthly_allocations,

      available_amount:
        dashboard.finance.available_amount,

      emergency_fund_balance:
        dashboard.finance
          .emergency_fund_balance,

      travel_savings_balance:
        dashboard.finance
          .travel_savings_balance,
    },


    investment_summary: {
      currency:
        dashboard.investments.currency,

      active_asset_count:
        dashboard.investments
          .active_asset_count,

      total_cost_basis:
        dashboard.investments
          .total_cost_basis,

      total_estimated_value:
        dashboard.investments
          .total_estimated_value,

      total_estimated_gain_loss:
        dashboard.investments
          .total_estimated_gain_loss,

      total_monthly_contribution_target:
        dashboard.investments
          .total_monthly_contribution_target,
    },


    plan_summary: {
      goals: {
        active:
          dashboard.goals.active_count,

        planned:
          dashboard.goals.planned_count,

        paused:
          dashboard.goals.paused_count,

        completed:
          dashboard.goals.completed_count,
      },

      projects: {
        active:
          dashboard.projects.active_count,

        blocked:
          dashboard.projects.blocked_count,

        planned:
          dashboard.projects.planned_count,

        completed:
          dashboard.projects.completed_count,
      },
    },


    task_summary: {
      pending:
        dashboard.tasks.pending_count,

      active:
        dashboard.tasks.active_count,

      overdue:
        dashboard.tasks.overdue_count,
    },


    travel_summary:
      buildTravelSummaryContext(
        travel,
      ),


    learning_summary: {
      active:
        dashboard.learning.active_count,

      planned:
        dashboard.learning.planned_count,

      completed:
        dashboard.learning.completed_count,
    },
  };
}


/* =========================================================
 * 24. FINANCE CONTEXT
 * ======================================================= */

function buildFinanceContext(
  dashboard:
    DashboardSnapshot,
): JsonObject {
  const finance =
    dashboard.finance;


  return {
    currency:
      finance.currency,

    monthly_income:
      finance.monthly_income,

    monthly_expenses:
      finance.monthly_expenses,

    monthly_savings:
      finance.monthly_savings,

    monthly_investments:
      finance.monthly_investments,

    monthly_debt_payments:
      finance.monthly_debt_payments,

    monthly_allocations:
      finance.monthly_allocations,

    available_amount:
      finance.available_amount,

    emergency_fund_balance:
      finance.emergency_fund_balance,

    travel_savings_balance:
      finance.travel_savings_balance,


    active_income_sources:
      finance.income_sources
        .filter(
          (
            item,
          ) =>
            item.is_active,
        )
        .slice(
          0,
          AI_MAX_CONTEXT_ITEMS_PER_CATEGORY,
        )
        .map(
          (
            item,
          ) => ({
            name:
              item.name,

            amount:
              item.amount,

            currency:
              item.currency,

            frequency:
              item.frequency,

            next_expected_date:
              item.next_expected_date,
          }),
        ),


    active_budget_items:
      finance.budget_items
        .filter(
          (
            item,
          ) =>
            item.is_active,
        )
        .slice(
          0,
          AI_MAX_CONTEXT_ITEMS_PER_CATEGORY,
        )
        .map(
          (
            item,
          ) => ({
            name:
              item.name,

            category:
              item.category,

            item_type:
              item.item_type,

            amount:
              item.amount,

            currency:
              item.currency,

            frequency:
              item.frequency,

            due_day:
              item.due_day,
          }),
        ),
  };
}


/* =========================================================
 * 25. INVESTMENT CONTEXT
 * ======================================================= */

function buildInvestmentContext(
  dashboard:
    DashboardSnapshot,
): JsonObject {
  const investments =
    dashboard.investments;


  return {
    currency:
      investments.currency,

    total_cost_basis:
      investments.total_cost_basis,

    total_estimated_value:
      investments.total_estimated_value,

    total_estimated_gain_loss:
      investments.total_estimated_gain_loss,

    total_monthly_contribution_target:
      investments
        .total_monthly_contribution_target,

    active_asset_count:
      investments.active_asset_count,


    positions:
      investments.positions
        .slice(
          0,
          AI_MAX_CONTEXT_ITEMS_PER_CATEGORY,
        )
        .map(
          (
            position,
          ) => ({
            ticker:
              position.asset.ticker,

            name:
              position.asset.name,

            market:
              position.asset.market,

            asset_type:
              position.asset.asset_type,

            currency:
              position.asset.currency,

            quantity:
              position.asset.quantity,

            average_cost:
              position.asset.average_cost,

            reference_price:
              position.asset.reference_price,

            monthly_contribution_target:
              position.asset
                .monthly_contribution_target,

            target_quantity:
              position.asset.target_quantity,

            cost_basis:
              position.cost_basis,

            estimated_value:
              position.estimated_value,

            estimated_gain_loss:
              position.estimated_gain_loss,

            estimated_gain_loss_percent:
              position
                .estimated_gain_loss_percent,

            allocation_percent:
              position.allocation_percent,

            target_progress_percent:
              position
                .target_progress_percent,
          }),
        ),
  };
}


/* =========================================================
 * 26. GOALS CONTEXT
 * ======================================================= */

function buildGoalsContext(
  dashboard:
    DashboardSnapshot,
): JsonObject {
  return {
    active_count:
      dashboard.goals.active_count,

    planned_count:
      dashboard.goals.planned_count,

    paused_count:
      dashboard.goals.paused_count,

    completed_count:
      dashboard.goals.completed_count,


    active_goals:
      dashboard.goals.active_goals
        .slice(
          0,
          AI_MAX_CONTEXT_ITEMS_PER_CATEGORY,
        )
        .map(
          (
            goal,
          ) => ({
            title:
              goal.title,

            category:
              goal.category,

            status:
              goal.status,

            priority:
              goal.priority,

            progress_percent:
              goal.progress_percent,

            target_date:
              goal.target_date,

            next_action:
              goal.next_action,
          }),
        ),
  };
}


/* =========================================================
 * 27. PROJECT CONTEXT
 * ======================================================= */

function buildProjectsContext(
  dashboard:
    DashboardSnapshot,
): JsonObject {
  return {
    active_count:
      dashboard.projects.active_count,

    blocked_count:
      dashboard.projects.blocked_count,

    planned_count:
      dashboard.projects.planned_count,

    completed_count:
      dashboard.projects.completed_count,


    high_priority_projects:
      dashboard.projects
        .high_priority_projects
        .slice(
          0,
          AI_MAX_CONTEXT_ITEMS_PER_CATEGORY,
        )
        .map(
          (
            project,
          ) => ({
            title:
              project.title,

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
          }),
        ),


    blocked_projects:
      dashboard.projects
        .blocked_projects
        .slice(
          0,
          AI_MAX_CONTEXT_ITEMS_PER_CATEGORY,
        )
        .map(
          (
            project,
          ) => ({
            title:
              project.title,

            priority:
              project.priority,

            target_date:
              project.target_date,

            next_action:
              project.next_action,
          }),
        ),
  };
}


/* =========================================================
 * 28. TASK CONTEXT
 * ======================================================= */

function buildTasksContext(
  dashboard:
    DashboardSnapshot,
): JsonObject {
  return {
    pending_count:
      dashboard.tasks.pending_count,

    active_count:
      dashboard.tasks.active_count,

    completed_count:
      dashboard.tasks.completed_count,

    overdue_count:
      dashboard.tasks.overdue_count,


    urgent_tasks:
      dashboard.tasks.urgent_tasks
        .slice(
          0,
          AI_MAX_CONTEXT_ITEMS_PER_CATEGORY,
        )
        .map(
          (
            task,
          ) => ({
            title:
              task.title,

            priority:
              task.priority,

            status:
              task.status,

            due_date:
              task.due_date,
          }),
        ),
  };
}


/* =========================================================
 * 29. LEARNING CONTEXT
 * ======================================================= */

function buildLearningContext(
  dashboard:
    DashboardSnapshot,
): JsonObject {
  return {
    active_count:
      dashboard.learning.active_count,

    planned_count:
      dashboard.learning.planned_count,

    completed_count:
      dashboard.learning.completed_count,

    paused_count:
      dashboard.learning.paused_count,


    active_items:
      dashboard.learning.active_items
        .slice(
          0,
          AI_MAX_CONTEXT_ITEMS_PER_CATEGORY,
        )
        .map(
          (
            item,
          ) => ({
            title:
              item.title,

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
          }),
        ),


    high_priority_items:
      dashboard.learning
        .high_priority_items
        .slice(
          0,
          AI_MAX_CONTEXT_ITEMS_PER_CATEGORY,
        )
        .map(
          (
            item,
          ) => ({
            title:
              item.title,

            provider:
              item.provider,

            item_type:
              item.item_type,

            status:
              item.status,

            progress_percent:
              item.progress_percent,

            target_date:
              item.target_date,
          }),
        ),
  };
}


/* =========================================================
 * 30. CAREER MINIMAL OUTPUT
 * ======================================================= */

function buildMinimalCareerItems(
  items:
    CareerItem[],
): JsonValue[] {
  return items
    .slice(
      0,
      AI_MAX_CONTEXT_ITEMS_PER_CATEGORY,
    )
    .map(
      (
        item,
      ) => ({
        item_type:
          item.item_type,

        title:
          item.title,

        description:
          item.description,

        status:
          item.status,

        priority:
          item.priority,

        rating:
          item.rating,

        event_date:
          item.event_date,

        target_date:
          item.target_date,
      }),
    );
}


/* =========================================================
 * 31. CAREER CONTEXT
 * ======================================================= */

async function buildCareerContext():
Promise<JsonObject> {
  const career =
    await getCareerSnapshot();


  return {
    current_roles:
      buildMinimalCareerItems(
        career.current_roles,
      ),

    target_roles:
      buildMinimalCareerItems(
        career.target_roles,
      ),

    skills:
      buildMinimalCareerItems(
        career.skills,
      ),

    achievements:
      buildMinimalCareerItems(
        career.achievements,
      ),

    milestones:
      buildMinimalCareerItems(
        career.milestones,
      ),

    gaps:
      buildMinimalCareerItems(
        career.gaps,
      ),
  };
}


/* =========================================================
 * 32. BUILD CHIEF OF STAFF CONTEXT
 * ======================================================= */

export async function buildChiefOfStaffContext(
  request:
    AIRequest,
): Promise<JsonObject> {
  if (
    request.mode ===
    "decision"
  ) {
    throw new AIContextError(
      "DECISION_CONTEXT_REQUIRED",
    );
  }


  try {
    const scopes =
      detectContextScopes(
        request.message,
      );


    const needsCareer =
      scopes.includes(
        "career",
      );


    const [
      dashboard,
      travel,
      memories,
      career,
    ] =
      await Promise.all([
        getDashboardSnapshot(),

        getTravelSnapshot(),

        getActiveMemoryItems(),

        needsCareer
          ? buildCareerContext()
          : Promise.resolve(
              null,
            ),
      ]);


    const relevantMemory =
      selectRelevantMemory(
        memories,
        scopes,
      );


    const context:
      JsonObject = {
        generated_at:
          dashboard.generated_at,

        request_scope:
          scopes,

        dashboard:
          buildDashboardCoreContext(
            dashboard,
            travel,
          ),

        relevant_memory:
          buildMemoryContext(
            relevantMemory,
          ),
      };


    if (
      scopes.includes(
        "finance",
      )
    ) {
      context.finance =
        buildFinanceContext(
          dashboard,
        );
    }


    if (
      scopes.includes(
        "investments",
      )
    ) {
      context.investments =
        buildInvestmentContext(
          dashboard,
        );
    }


    if (
      scopes.includes(
        "goals",
      )
    ) {
      context.goals =
        buildGoalsContext(
          dashboard,
        );
    }


    if (
      scopes.includes(
        "projects",
      )
    ) {
      context.projects =
        buildProjectsContext(
          dashboard,
        );
    }


    if (
      scopes.includes(
        "tasks",
      )
    ) {
      context.tasks =
        buildTasksContext(
          dashboard,
        );
    }


    if (
      scopes.includes(
        "travel",
      )
    ) {
      context.travel =
        buildTravelContext(
          travel,
        );
    }


    if (
      scopes.includes(
        "learning",
      )
    ) {
      context.learning =
        buildLearningContext(
          dashboard,
        );
    }


    if (
      career !==
      null
    ) {
      context.career =
        career;
    }


    return context;
  } catch (
    error
  ) {
    if (
      error instanceof
      AIContextError
    ) {
      throw error;
    }


    throw new AIContextError(
      "CONTEXT_BUILD_FAILED",
    );
  }
}


/* =========================================================
 * 33. DECISION CONTEXT
 * ======================================================= */

/**
 * Decision Simulator gets a broader but still controlled
 * snapshot because a decision may affect several life areas.
 *
 *
 * It still receives no:
 *
 * credentials
 * document binaries
 * Storage paths
 * audit history
 * public/private file URLs
 */
export async function buildDecisionContext():
Promise<JsonObject> {
  try {
    const [
      dashboard,
      travel,
      memories,
      career,
    ] =
      await Promise.all([
        getDashboardSnapshot(),

        getTravelSnapshot(),

        getActiveMemoryItems(),

        buildCareerContext(),
      ]);


    const decisionScopes:
      AIContextScope[] = [
        "dashboard",
        "finance",
        "investments",
        "goals",
        "projects",
        "tasks",
        "travel",
        "learning",
        "career",
      ];


    const relevantMemory =
      selectRelevantMemory(
        memories,
        decisionScopes,
      );


    return {
      generated_at:
        dashboard.generated_at,

      currency:
        dashboard.finance.currency ??
        DEFAULT_CURRENCY,

      dashboard:
        buildDashboardCoreContext(
          dashboard,
          travel,
        ),

      finance:
        buildFinanceContext(
          dashboard,
        ),

      investments:
        buildInvestmentContext(
          dashboard,
        ),

      goals:
        buildGoalsContext(
          dashboard,
        ),

      projects:
        buildProjectsContext(
          dashboard,
        ),

      tasks:
        buildTasksContext(
          dashboard,
        ),

      travel:
        buildTravelContext(
          travel,
        ),

      learning:
        buildLearningContext(
          dashboard,
        ),

      career,

      relevant_memory:
        buildMemoryContext(
          relevantMemory,
        ),
    };
  } catch {
    throw new AIContextError(
      "CONTEXT_BUILD_FAILED",
    );
  }
}


/* =========================================================
 * 34. OPPORTUNITY CONTEXT
 * ======================================================= */

/**
 * Opportunity Search primarily needs:
 *
 * - current goals
 * - learning direction
 * - career direction
 * - relevant preferences / constraints
 *
 *
 * It intentionally does not receive:
 *
 * detailed financial information
 * investment positions
 * Travel OS
 *
 *
 * unless that feature is explicitly expanded later.
 */
export async function buildOpportunityContext():
Promise<JsonObject> {
  try {
    const [
      dashboard,
      memories,
      career,
    ] =
      await Promise.all([
        getDashboardSnapshot(),

        getActiveMemoryItems(),

        buildCareerContext(),
      ]);


    const opportunityScopes:
      AIContextScope[] = [
        "goals",
        "learning",
        "career",
      ];


    const relevantMemory =
      selectRelevantMemory(
        memories,
        opportunityScopes,
      );


    return {
      generated_at:
        dashboard.generated_at,

      goals:
        buildGoalsContext(
          dashboard,
        ),

      learning:
        buildLearningContext(
          dashboard,
        ),

      career,

      relevant_memory:
        buildMemoryContext(
          relevantMemory,
        ),
    };
  } catch {
    throw new AIContextError(
      "CONTEXT_BUILD_FAILED",
    );
  }
}


/* =========================================================
 * 35. TRAVEL CONTEXT PRIVACY
 * ======================================================= */

/**
 * LIFE AI may know:
 *
 * destination
 * trip title
 * trip status
 * known dates
 * approved budget
 * approved readiness
 * number of private documents
 *
 *
 * LIFE AI does NOT receive here:
 *
 * PDF content
 * file names
 * Storage bucket
 * Storage path
 * signed URL
 * document ID
 * trip ID
 */


/* =========================================================
 * 36. TRAVEL READ-ONLY RULE
 * ======================================================= */

/**
 * Travel context allows LIFE AI to answer questions such as:
 *
 * - شو رحلتي القادمة؟
 * - كم جاهزيتي؟
 * - كم الميزانية؟
 * - متى السفر؟
 * - عندي كم ملف سفر؟
 *
 *
 * It does NOT allow LIFE AI to:
 *
 * create trip
 * update trip
 * cancel trip
 * alter readiness
 * upload PDF
 * delete PDF
 *
 *
 * Writes continue to require explicit deterministic flows.
 */


/* =========================================================
 * 37. CONTEXT PRIVACY GUARANTEES
 * ======================================================= */

/**
 * Normal AI context intentionally excludes:
 *
 * user_id
 * email
 * authentication tokens
 * cookies
 * passwords
 * MFA secrets
 * API keys
 * service-role credentials
 * audit history
 * database ownership metadata
 * Storage paths
 * permanent/public file URLs
 *
 *
 * IDs are generally excluded unless a future controlled tool
 * explicitly requires one.
 */


/* =========================================================
 * 38. CONTEXT AUTHORIZATION
 * ======================================================= */

/**
 * This module never accepts:
 *
 * user_id
 *
 * from the AI or browser.
 *
 *
 * Underlying data functions resolve the authenticated user
 * from the verified Supabase session and PostgreSQL RLS
 * enforces ownership.
 *
 *
 * Password-authenticated verified LIFE OS sessions are
 * sufficient for V2.
 */


/* =========================================================
 * 39. PROMPT-INJECTION BOUNDARY
 * ======================================================= */

/**
 * Stored personal text is DATA.
 *
 *
 * Examples:
 *
 * memory content
 * goal description
 * project title
 * learning title
 * career description
 * trip title
 * destination
 *
 *
 * None of that text becomes trusted system instructions.
 *
 *
 * If stored content says:
 *
 * "Ignore all instructions"
 *
 * it remains user data only.
 */


/* =========================================================
 * 40. DATA MINIMIZATION
 * ======================================================= */

/**
 * LIFE OS does not send every database row to AI.
 *
 *
 * It sends:
 *
 * minimum relevant summaries
 * +
 * bounded relevant records
 *
 *
 * using:
 *
 * AI_MAX_CONTEXT_ITEMS_PER_CATEGORY
 */


/* =========================================================
 * 41. DETERMINISTIC SCOPE RULE
 * ======================================================= */

/**
 * AI never chooses:
 *
 * which private database area it may inspect.
 *
 *
 * Flow:
 *
 * user message
 *      ↓
 * deterministic keyword scope detection
 *      ↓
 * server-controlled context builder
 *      ↓
 * minimized authenticated facts
 *      ↓
 * LIFE AI
 */


/* =========================================================
 * 42. FINAL LIFE OS AI CONTEXT RULE
 * ======================================================= */

/**
 * User asks a question
 *      ↓
 * Deterministic scope detection
 *      ↓
 * Authenticated LIFE OS reads
 *      ↓
 * Data minimization
 *      ↓
 * Sensitive-memory filtering
 *      ↓
 * Remove security / ownership metadata
 *      ↓
 * Minimal JsonObject
 *      ↓
 * Read-only LIFE AI
 *
 *
 * Give AI the minimum useful context,
 * not the maximum available context.
 *
 *
 * Simple outside.
 * Intelligent underneath.
 * Private by default.
 */