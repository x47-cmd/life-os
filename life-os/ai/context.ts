import {
  AI_MAX_CONTEXT_ITEMS_PER_CATEGORY,
  DEFAULT_CURRENCY,
} from "@/lib/constants";

import {
  getActiveMemoryItems,
  getCareerSnapshot,
  getDashboardSnapshot,
} from "@/lib/data";

import type {
  AIRequest,
  CareerItem,
  DashboardSnapshot,
  JsonObject,
  JsonValue,
  MemoryItem,
} from "@/lib/types";


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
  | "learning"
  | "career";


/* =========================================================
 * 2. CONTEXT ERROR
 * ======================================================= */

export type AIContextErrorCode =
  | "DECISION_CONTEXT_REQUIRED"
  | "CONTEXT_BUILD_FAILED";


export class AIContextError extends Error {
  readonly code: AIContextErrorCode;

  constructor(
    code: AIContextErrorCode,
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
      messages[code],
    );

    this.name =
      "AIContextError";

    this.code =
      code;
  }
}


/* =========================================================
 * 3. KEYWORD GROUPS
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
 * 4. TEXT MATCHING
 * ======================================================= */

function normalizeText(
  value: string,
): string {
  return value
    .trim()
    .toLowerCase();
}


function containsAnyKeyword(
  message: string,
  keywords: readonly string[],
): boolean {
  const normalized =
    normalizeText(message);

  return keywords.some(
    (keyword) =>
      normalized.includes(
        normalizeText(keyword),
      ),
  );
}


/* =========================================================
 * 5. DETECT REQUIRED SCOPES
 * ======================================================= */

/**
 * Context selection is deterministic.
 *
 * We do NOT call AI to decide which private data AI should
 * receive.
 */
export function detectContextScopes(
  message: string,
): AIContextScope[] {
  const scopes =
    new Set<AIContextScope>();

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
 * 6. MEMORY SAFETY FILTER
 * ======================================================= */

const SENSITIVE_MEMORY_PATTERNS = [
  "password",
  "passcode",
  "api key",
  "apikey",
  "access token",
  "refresh token",
  "service role",
  "secret key",
  "totp secret",
  "recovery code",

  "كلمة المرور",
  "رمز المرور",
  "مفتاح api",
  "مفتاح سري",
  "توكن",
  "رمز الاسترداد",
] as const;


function isPotentiallySensitiveMemory(
  item: MemoryItem,
): boolean {
  const combined =
    normalizeText(
      `${item.title} ${item.content}`,
    );

  return SENSITIVE_MEMORY_PATTERNS.some(
    (pattern) =>
      combined.includes(
        normalizeText(pattern),
      ),
  );
}


/* =========================================================
 * 7. MEMORY RELEVANCE
 * ======================================================= */

const MEMORY_IMPORTANCE_WEIGHT = {
  high: 3,
  medium: 2,
  low: 1,
} as const;


function isMemoryRelevantToScopes(
  item: MemoryItem,
  scopes: AIContextScope[],
): boolean {
  /**
   * Stable personal preferences and constraints may affect
   * almost any recommendation.
   */
  if (
    item.category === "preference" ||
    item.category === "constraint"
  ) {
    return true;
  }

  if (
    item.category === "decision" &&
    item.importance === "high"
  ) {
    return true;
  }

  if (
    scopes.includes("finance") &&
    item.category === "finance"
  ) {
    return true;
  }

  if (
    scopes.includes("investments") &&
    item.category === "investments"
  ) {
    return true;
  }

  if (
    scopes.includes("career") &&
    item.category === "career"
  ) {
    return true;
  }

  if (
    scopes.includes("learning") &&
    (
      item.category === "learning" ||
      item.category === "education"
    )
  ) {
    return true;
  }

  if (
    scopes.includes("projects") &&
    item.category === "projects"
  ) {
    return true;
  }

  return false;
}


function selectRelevantMemory(
  items: MemoryItem[],
  scopes: AIContextScope[],
): MemoryItem[] {
  return items
    .filter(
      (item) =>
        item.is_active,
    )
    .filter(
      (item) =>
        !isPotentiallySensitiveMemory(
          item,
        ),
    )
    .filter(
      (item) =>
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
          importanceDifference !== 0
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
 * 8. MINIMAL MEMORY OUTPUT
 * ======================================================= */

function buildMemoryContext(
  items: MemoryItem[],
): JsonValue[] {
  return items.map(
    (item) => ({
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
 * 9. DASHBOARD CORE CONTEXT
 * ======================================================= */

function buildDashboardCoreContext(
  dashboard: DashboardSnapshot,
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
          (item) => ({
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

    goal_summary: {
      active:
        dashboard.goals.active_count,

      planned:
        dashboard.goals.planned_count,

      paused:
        dashboard.goals.paused_count,

      completed:
        dashboard.goals.completed_count,
    },

    project_summary: {
      active:
        dashboard.projects.active_count,

      blocked:
        dashboard.projects.blocked_count,

      planned:
        dashboard.projects.planned_count,

      completed:
        dashboard.projects.completed_count,
    },

    task_summary: {
      pending:
        dashboard.tasks.pending_count,

      active:
        dashboard.tasks.active_count,

      overdue:
        dashboard.tasks.overdue_count,
    },

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
 * 10. FINANCE CONTEXT
 * ======================================================= */

function buildFinanceContext(
  dashboard: DashboardSnapshot,
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
          (item) =>
            item.is_active,
        )
        .slice(
          0,
          AI_MAX_CONTEXT_ITEMS_PER_CATEGORY,
        )
        .map(
          (item) => ({
            name:
              item.name,

            amount:
              item.amount,

            frequency:
              item.frequency,
          }),
        ),

    active_budget_items:
      finance.budget_items
        .filter(
          (item) =>
            item.is_active,
        )
        .slice(
          0,
          AI_MAX_CONTEXT_ITEMS_PER_CATEGORY,
        )
        .map(
          (item) => ({
            name:
              item.name,

            category:
              item.category,

            item_type:
              item.item_type,

            amount:
              item.amount,

            frequency:
              item.frequency,
          }),
        ),
  };
}


/* =========================================================
 * 11. INVESTMENT CONTEXT
 * ======================================================= */

function buildInvestmentContext(
  dashboard: DashboardSnapshot,
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
          (position) => ({
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
 * 12. GOALS CONTEXT
 * ======================================================= */

function buildGoalsContext(
  dashboard: DashboardSnapshot,
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
          (goal) => ({
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
 * 13. PROJECT CONTEXT
 * ======================================================= */

function buildProjectsContext(
  dashboard: DashboardSnapshot,
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
          (project) => ({
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
          (project) => ({
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
 * 14. TASK CONTEXT
 * ======================================================= */

function buildTasksContext(
  dashboard: DashboardSnapshot,
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
          (task) => ({
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
 * 15. LEARNING CONTEXT
 * ======================================================= */

function buildLearningContext(
  dashboard: DashboardSnapshot,
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
          (item) => ({
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
          (item) => ({
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
 * 16. CAREER CONTEXT
 * ======================================================= */

function buildMinimalCareerItems(
  items: CareerItem[],
): JsonValue[] {
  return items
    .slice(
      0,
      AI_MAX_CONTEXT_ITEMS_PER_CATEGORY,
    )
    .map(
      (item) => ({
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
 * 17. BUILD CHIEF OF STAFF CONTEXT
 * ======================================================= */

export async function buildChiefOfStaffContext(
  request: AIRequest,
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
      memories,
      career,
    ] =
      await Promise.all([
        getDashboardSnapshot(),

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
        "learning",
      )
    ) {
      context.learning =
        buildLearningContext(
          dashboard,
        );
    }

    if (
      career !== null
    ) {
      context.career =
        career;
    }

    return context;
  } catch (error) {
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
 * 18. DECISION CONTEXT
 * ======================================================= */

/**
 * Decision Simulator receives a broader but still controlled
 * snapshot because decisions may affect multiple life areas.
 *
 * Audit logs, credentials and unrelated raw records remain
 * excluded.
 */
export async function buildDecisionContext():
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

    const decisionScopes:
      AIContextScope[] = [
        "dashboard",
        "finance",
        "investments",
        "goals",
        "projects",
        "tasks",
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
 * 19. OPPORTUNITY CONTEXT
 * ======================================================= */

/**
 * Opportunity Search primarily needs:
 *
 * - active goals
 * - learning direction
 * - career direction
 * - relevant preferences / constraints
 *
 * It intentionally does NOT receive detailed financial or
 * investment positions.
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
 * 20. PRIVACY GUARANTEES
 * ======================================================= */

/**
 * Context generated by this file intentionally excludes:
 *
 * - user_id
 * - email
 * - authentication tokens
 * - cookies
 * - MFA information
 * - API keys
 * - service-role credentials
 * - audit history
 * - created_at database metadata
 * - unrelated personal records
 *
 * IDs are also generally excluded from AI context unless a
 * later tool specifically requires a controlled identifier.
 */


/* =========================================================
 * 21. CONTEXT AUTHORIZATION
 * ======================================================= */

/**
 * This file does not independently accept a user identifier.
 *
 * All underlying data functions:
 *
 * getDashboardSnapshot()
 * getCareerSnapshot()
 * getActiveMemoryItems()
 *
 * already require:
 *
 * Verified Supabase authentication
 *      ↓
 * AAL2
 *      ↓
 * authenticated user_id
 *      ↓
 * PostgreSQL RLS
 */


/* =========================================================
 * 22. PROMPT-INJECTION BOUNDARY
 * ======================================================= */

/**
 * Personal data may contain arbitrary text.
 *
 * Examples:
 *
 * - goal descriptions
 * - memory content
 * - project titles
 * - learning titles
 *
 * That text is DATA.
 *
 * It is never treated as trusted system instructions.
 *
 * ai/chief-of-staff.ts reinforces this rule in the model
 * instructions.
 */


/* =========================================================
 * 23. FINAL CONTEXT RULE
 * ======================================================= */

/**
 * LIFE OS AI Context Boundary
 *
 * User asks a question
 *      ↓
 * Deterministic scope detection
 *      ↓
 * Authenticated LIFE OS data
 *      ↓
 * Data minimization
 *      ↓
 * Sensitive-memory filtering
 *      ↓
 * Remove ownership/security metadata
 *      ↓
 * Minimal JsonObject
 *      ↓
 * AI module
 *
 *
 * Permanent rule:
 *
 * Give AI the minimum useful context,
 * not the maximum available context.
 */