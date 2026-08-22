import { z } from "zod";

import {
  AI_MAX_CONTEXT_ITEMS_PER_CATEGORY,
  AI_MAX_TOOL_CALLS,
  AI_TOOL_NAMES,
} from "@/lib/constants";

import {
  getDashboardSnapshot,
  getFinanceSnapshot,
  getGoalStatus,
  getInvestmentSnapshot,
  getLearningStatus,
} from "@/lib/data";

import {
  simulateDecision,
} from "@/ai/decision-simulator";

import {
  searchOpportunities,
} from "@/ai/opportunity-engine";

import type {
  AIToolName,
  AIToolResult,
  DashboardSnapshot,
  FinanceSnapshot,
  GoalStatusSnapshot,
  InvestmentSnapshot,
  JsonValue,
  LearningStatusSnapshot,
} from "@/lib/types";

import {
  decisionSimulationInputSchema,
  opportunitySearchInputSchema,
} from "@/lib/validation";


/* =========================================================
 * 1. TOOL DEFINITION TYPE
 * ======================================================= */

/**
 * Shape used by the OpenAI Responses API for custom
 * function tools.
 *
 * Keeping the definition local prevents the rest of LIFE OS
 * from depending directly on OpenAI SDK implementation types.
 */
export interface LifeOSFunctionToolDefinition {
  type: "function";

  name: AIToolName;

  description: string;

  parameters: Record<
    string,
    unknown
  >;

  strict: true;
}


/* =========================================================
 * 2. TOOL EXECUTION ERROR
 * ======================================================= */

export type AIToolExecutionErrorCode =
  | "UNKNOWN_TOOL"
  | "TOOL_NOT_ALLOWED"
  | "TOOL_LIMIT_EXCEEDED";


export class AIToolExecutionError extends Error {
  readonly code:
    AIToolExecutionErrorCode;

  constructor(
    code: AIToolExecutionErrorCode,
  ) {
    const messages:
      Record<
        AIToolExecutionErrorCode,
        string
      > = {
        UNKNOWN_TOOL:
          "Unknown LIFE OS AI tool.",

        TOOL_NOT_ALLOWED:
          "The requested AI tool is not allowed in this context.",

        TOOL_LIMIT_EXCEEDED:
          "The LIFE OS AI tool-call limit was exceeded.",
      };

    super(
      messages[code],
    );

    this.name =
      "AIToolExecutionError";

    this.code =
      code;
  }
}


/* =========================================================
 * 3. EMPTY TOOL ARGUMENTS
 * ======================================================= */

const emptyArgumentsSchema =
  z
    .object({})
    .strict();


/* =========================================================
 * 4. SHARED EMPTY JSON SCHEMA
 * ======================================================= */

const EMPTY_PARAMETERS = {
  type: "object",

  properties: {},

  required: [],

  additionalProperties: false,
};


/* =========================================================
 * 5. TOOL DEFINITIONS
 * ======================================================= */

/**
 * These are the ONLY seven logical AI tools in LIFE OS V1.
 *
 * No tool can:
 *
 * - execute SQL
 * - transfer money
 * - execute investments
 * - send communication
 * - alter security
 * - delete records
 */
const LIFE_OS_AI_TOOL_DEFINITIONS:
  LifeOSFunctionToolDefinition[] = [
    {
      type: "function",

      name:
        "get_dashboard_snapshot",

      description:
        "Read a concise current LIFE OS dashboard snapshot including priorities and high-level status. Read-only.",

      strict: true,

      parameters:
        EMPTY_PARAMETERS,
    },

    {
      type: "function",

      name:
        "get_finance_snapshot",

      description:
        "Read the authenticated owner's current LIFE OS financial planning snapshot. Use only when financial context is necessary. Read-only.",

      strict: true,

      parameters:
        EMPTY_PARAMETERS,
    },

    {
      type: "function",

      name:
        "get_investment_snapshot",

      description:
        "Read the authenticated owner's current LIFE OS investment analysis snapshot. This never executes a trade. Read-only.",

      strict: true,

      parameters:
        EMPTY_PARAMETERS,
    },

    {
      type: "function",

      name:
        "get_goal_status",

      description:
        "Read a concise status summary of LIFE OS goals. Read-only.",

      strict: true,

      parameters:
        EMPTY_PARAMETERS,
    },

    {
      type: "function",

      name:
        "get_learning_status",

      description:
        "Read a concise status summary of current LIFE OS learning and education items. Read-only.",

      strict: true,

      parameters:
        EMPTY_PARAMETERS,
    },

    {
      type: "function",

      name:
        "simulate_decision",

      description:
        "Analyze a hypothetical personal decision using LIFE OS data and deterministic financial facts. It provides scenarios only and never executes the decision.",

      strict: true,

      parameters: {
        type: "object",

        additionalProperties:
          false,

        properties: {
          decision: {
            type: "string",
            minLength: 1,
            maxLength: 1000,
            description:
              "The decision or choice being evaluated.",
          },

          proposed_monthly_cost: {
            type: [
              "number",
              "null",
            ],
            minimum: 0,
            maximum:
              999999999999.99,
          },

          proposed_one_time_cost: {
            type: [
              "number",
              "null",
            ],
            minimum: 0,
            maximum:
              999999999999.99,
          },

          proposed_monthly_investment_change: {
            type: [
              "number",
              "null",
            ],
            minimum:
              -999999999999.99,
            maximum:
              999999999999.99,
          },

          proposed_start_date: {
            type: [
              "string",
              "null",
            ],
            pattern:
              "^\\d{4}-\\d{2}-\\d{2}$",
          },

          proposed_target_date: {
            type: [
              "string",
              "null",
            ],
            pattern:
              "^\\d{4}-\\d{2}-\\d{2}$",
          },

          notes: {
            type: [
              "string",
              "null",
            ],
            minLength: 1,
            maxLength: 1000,
          },
        },

        /**
         * Strict function calling requires a deterministic
         * object shape.
         *
         * Optional LIFE OS values are represented as null.
         */
        required: [
          "decision",
          "proposed_monthly_cost",
          "proposed_one_time_cost",
          "proposed_monthly_investment_change",
          "proposed_start_date",
          "proposed_target_date",
          "notes",
        ],
      },
    },

    {
      type: "function",

      name:
        "search_opportunities",

      description:
        "Research and evaluate current courses, certifications, jobs, education or professional-development opportunities against LIFE OS goals and career direction. Research only; never applies, registers or pays.",

      strict: true,

      parameters: {
        type: "object",

        additionalProperties:
          false,

        properties: {
          category: {
            type: "string",

            enum: [
              "course",
              "certification",
              "job",
              "education",
              "professional_program",
              "development",
            ],
          },

          query: {
            type: "string",
            minLength: 1,
            maxLength: 500,
          },
        },

        required: [
          "category",
          "query",
        ],
      },
    },
  ];


/* =========================================================
 * 6. TOOL MANIFEST VERIFICATION
 * ======================================================= */

/**
 * Fail immediately during development if the registry ever
 * drifts away from the locked seven-tool V1 specification.
 */
function verifyToolManifest():
void {
  if (
    LIFE_OS_AI_TOOL_DEFINITIONS.length !==
    AI_TOOL_NAMES.length
  ) {
    throw new Error(
      "LIFE OS AI tool manifest does not match the locked V1 specification.",
    );
  }

  const registeredNames =
    new Set(
      LIFE_OS_AI_TOOL_DEFINITIONS.map(
        (tool) =>
          tool.name,
      ),
    );

  if (
    registeredNames.size !==
    AI_TOOL_NAMES.length
  ) {
    throw new Error(
      "LIFE OS AI tool manifest contains duplicate tool names.",
    );
  }

  for (
    const expectedName
    of AI_TOOL_NAMES
  ) {
    if (
      !registeredNames.has(
        expectedName,
      )
    ) {
      throw new Error(
        `LIFE OS AI tool is missing: ${expectedName}`,
      );
    }
  }
}


verifyToolManifest();


/* =========================================================
 * 7. VALIDATE TOOL NAME
 * ======================================================= */

export function isAIToolName(
  value: string,
): value is AIToolName {
  return (
    AI_TOOL_NAMES as
      readonly string[]
  ).includes(
    value,
  );
}


export function requireAIToolName(
  value: string,
): AIToolName {
  if (
    !isAIToolName(value)
  ) {
    throw new AIToolExecutionError(
      "UNKNOWN_TOOL",
    );
  }

  return value;
}


/* =========================================================
 * 8. TOOL ALLOW-LIST
 * ======================================================= */

/**
 * Tools are never implicitly authorized.
 *
 * The caller must provide the exact tools allowed for the
 * current AI operation.
 */
export function getAIToolDefinitions(
  allowedToolNames:
    readonly AIToolName[],
): LifeOSFunctionToolDefinition[] {
  const allowed =
    new Set(
      allowedToolNames,
    );

  return LIFE_OS_AI_TOOL_DEFINITIONS.filter(
    (tool) =>
      allowed.has(
        tool.name,
      ),
  );
}


/* =========================================================
 * 9. TOOL CALL LIMIT
 * ======================================================= */

export function assertAIToolCallCount(
  callCount: number,
): void {
  if (
    !Number.isInteger(
      callCount,
    ) ||
    callCount < 0 ||
    callCount >
      AI_MAX_TOOL_CALLS
  ) {
    throw new AIToolExecutionError(
      "TOOL_LIMIT_EXCEEDED",
    );
  }
}


/* =========================================================
 * 10. RAW ARGUMENT PARSING
 * ======================================================= */

const MAX_RAW_TOOL_ARGUMENT_LENGTH =
  20_000;


function parseRawArguments(
  rawArguments: unknown,
): unknown {
  if (
    rawArguments === null ||
    rawArguments === undefined
  ) {
    return {};
  }

  if (
    typeof rawArguments !==
    "string"
  ) {
    return rawArguments;
  }

  if (
    rawArguments.length >
    MAX_RAW_TOOL_ARGUMENT_LENGTH
  ) {
    return null;
  }

  if (
    rawArguments.trim()
      .length === 0
  ) {
    return {};
  }

  try {
    return JSON.parse(
      rawArguments,
    ) as unknown;
  } catch {
    return null;
  }
}


/* =========================================================
 * 11. JSON OUTPUT SAFETY
 * ======================================================= */

function toJsonValue(
  value: unknown,
): JsonValue {
  const serialized =
    JSON.stringify(
      value,
    );

  if (
    serialized ===
    undefined
  ) {
    return null;
  }

  return JSON.parse(
    serialized,
  ) as JsonValue;
}


/* =========================================================
 * 12. SAFE DASHBOARD OUTPUT
 * ======================================================= */

function buildSafeDashboardResult(
  dashboard:
    DashboardSnapshot,
): JsonValue {
  return toJsonValue({
    generated_at:
      dashboard.generated_at,

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

            description:
              item.description,

            priority:
              item.priority,

            next_action:
              item.next_action,

            target_date:
              item.target_date,
          }),
        ),

    finance: {
      currency:
        dashboard.finance.currency,

      monthly_income:
        dashboard.finance
          .monthly_income,

      monthly_allocations:
        dashboard.finance
          .monthly_allocations,

      available_amount:
        dashboard.finance
          .available_amount,

      emergency_fund_balance:
        dashboard.finance
          .emergency_fund_balance,

      travel_savings_balance:
        dashboard.finance
          .travel_savings_balance,
    },

    investments: {
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

    goals: {
      active:
        dashboard.goals
          .active_count,

      planned:
        dashboard.goals
          .planned_count,

      paused:
        dashboard.goals
          .paused_count,

      completed:
        dashboard.goals
          .completed_count,
    },

    projects: {
      active:
        dashboard.projects
          .active_count,

      blocked:
        dashboard.projects
          .blocked_count,

      planned:
        dashboard.projects
          .planned_count,

      completed:
        dashboard.projects
          .completed_count,
    },

    tasks: {
      pending:
        dashboard.tasks
          .pending_count,

      active:
        dashboard.tasks
          .active_count,

      overdue:
        dashboard.tasks
          .overdue_count,

      completed:
        dashboard.tasks
          .completed_count,
    },

    learning: {
      active:
        dashboard.learning
          .active_count,

      planned:
        dashboard.learning
          .planned_count,

      paused:
        dashboard.learning
          .paused_count,

      completed:
        dashboard.learning
          .completed_count,
    },

    latest_ai_recommendation:
      dashboard
        .latest_ai_recommendation
        ? {
            category:
              dashboard
                .latest_ai_recommendation
                .category,

            title:
              dashboard
                .latest_ai_recommendation
                .title,

            recommendation:
              dashboard
                .latest_ai_recommendation
                .recommendation,

            priority:
              dashboard
                .latest_ai_recommendation
                .priority,
          }
        : null,
  });
}


/* =========================================================
 * 13. SAFE FINANCE OUTPUT
 * ======================================================= */

function buildSafeFinanceResult(
  finance:
    FinanceSnapshot,
): JsonValue {
  return toJsonValue({
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

    income_sources:
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

            next_expected_date:
              item.next_expected_date,
          }),
        ),

    budget_items:
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

            due_day:
              item.due_day,
          }),
        ),
  });
}


/* =========================================================
 * 14. SAFE INVESTMENT OUTPUT
 * ======================================================= */

function buildSafeInvestmentResult(
  investments:
    InvestmentSnapshot,
): JsonValue {
  return toJsonValue({
    currency:
      investments.currency,

    total_cost_basis:
      investments.total_cost_basis,

    total_estimated_value:
      investments
        .total_estimated_value,

    total_estimated_gain_loss:
      investments
        .total_estimated_gain_loss,

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
              position.asset
                .target_quantity,

            cost_basis:
              position.cost_basis,

            estimated_value:
              position.estimated_value,

            estimated_gain_loss:
              position
                .estimated_gain_loss,

            estimated_gain_loss_percent:
              position
                .estimated_gain_loss_percent,

            allocation_percent:
              position
                .allocation_percent,

            target_progress_percent:
              position
                .target_progress_percent,
          }),
        ),
  });
}


/* =========================================================
 * 15. SAFE GOAL OUTPUT
 * ======================================================= */

function buildSafeGoalResult(
  goals:
    GoalStatusSnapshot,
): JsonValue {
  const cleanGoal = (
    goal:
      GoalStatusSnapshot[
        "active_goals"
      ][number],
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
  });

  return toJsonValue({
    active_count:
      goals.active_count,

    planned_count:
      goals.planned_count,

    paused_count:
      goals.paused_count,

    completed_count:
      goals.completed_count,

    high_priority_goals:
      goals.high_priority_goals.map(
        cleanGoal,
      ),

    active_goals:
      goals.active_goals.map(
        cleanGoal,
      ),
  });
}


/* =========================================================
 * 16. SAFE LEARNING OUTPUT
 * ======================================================= */

function buildSafeLearningResult(
  learning:
    LearningStatusSnapshot,
): JsonValue {
  const cleanLearningItem = (
    item:
      LearningStatusSnapshot[
        "active_items"
      ][number],
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
  });

  return toJsonValue({
    active_count:
      learning.active_count,

    planned_count:
      learning.planned_count,

    completed_count:
      learning.completed_count,

    paused_count:
      learning.paused_count,

    active_items:
      learning.active_items.map(
        cleanLearningItem,
      ),

    high_priority_items:
      learning.high_priority_items.map(
        cleanLearningItem,
      ),
  });
}


/* =========================================================
 * 17. TOOL AUTHORIZATION CHECK
 * ======================================================= */

function assertToolAllowed(
  tool:
    AIToolName,

  allowedToolNames:
    readonly AIToolName[],
): void {
  if (
    !allowedToolNames.includes(
      tool,
    )
  ) {
    throw new AIToolExecutionError(
      "TOOL_NOT_ALLOWED",
    );
  }
}


/* =========================================================
 * 18. SUCCESS RESULT
 * ======================================================= */

function toolSuccess(
  tool:
    AIToolName,

  data:
    JsonValue,
): AIToolResult<JsonValue> {
  return {
    tool,

    success: true,

    data,

    error: null,
  };
}


/* =========================================================
 * 19. SAFE FAILURE RESULT
 * ======================================================= */

function toolFailure(
  tool:
    AIToolName,

  message:
    string,
): AIToolResult<JsonValue> {
  return {
    tool,

    success: false,

    data: null,

    error:
      message,
  };
}


/* =========================================================
 * 20. EXECUTE TOOL
 * ======================================================= */

/**
 * Central LIFE OS AI tool execution boundary.
 *
 * IMPORTANT:
 *
 * - tool name is validated
 * - caller must explicitly allow the tool
 * - arguments are validated again with Zod
 * - no user_id is accepted
 * - database authorization remains AAL2 + RLS
 * - raw internal errors are never returned to AI
 */
export async function executeAITool(
  rawToolName:
    string,

  rawArguments:
    unknown,

  allowedToolNames:
    readonly AIToolName[],
): Promise<
  AIToolResult<JsonValue>
> {
  const tool =
    requireAIToolName(
      rawToolName,
    );

  assertToolAllowed(
    tool,
    allowedToolNames,
  );

  const args =
    parseRawArguments(
      rawArguments,
    );

  try {
    switch (tool) {
      case "get_dashboard_snapshot": {
        const result =
          emptyArgumentsSchema
            .safeParse(
              args,
            );

        if (!result.success) {
          return toolFailure(
            tool,
            "Invalid tool arguments.",
          );
        }

        const dashboard =
          await getDashboardSnapshot();

        return toolSuccess(
          tool,
          buildSafeDashboardResult(
            dashboard,
          ),
        );
      }


      case "get_finance_snapshot": {
        const result =
          emptyArgumentsSchema
            .safeParse(
              args,
            );

        if (!result.success) {
          return toolFailure(
            tool,
            "Invalid tool arguments.",
          );
        }

        const finance =
          await getFinanceSnapshot();

        return toolSuccess(
          tool,
          buildSafeFinanceResult(
            finance,
          ),
        );
      }


      case "get_investment_snapshot": {
        const result =
          emptyArgumentsSchema
            .safeParse(
              args,
            );

        if (!result.success) {
          return toolFailure(
            tool,
            "Invalid tool arguments.",
          );
        }

        const investments =
          await getInvestmentSnapshot();

        return toolSuccess(
          tool,
          buildSafeInvestmentResult(
            investments,
          ),
        );
      }


      case "get_goal_status": {
        const result =
          emptyArgumentsSchema
            .safeParse(
              args,
            );

        if (!result.success) {
          return toolFailure(
            tool,
            "Invalid tool arguments.",
          );
        }

        const goals =
          await getGoalStatus();

        return toolSuccess(
          tool,
          buildSafeGoalResult(
            goals,
          ),
        );
      }


      case "get_learning_status": {
        const result =
          emptyArgumentsSchema
            .safeParse(
              args,
            );

        if (!result.success) {
          return toolFailure(
            tool,
            "Invalid tool arguments.",
          );
        }

        const learning =
          await getLearningStatus();

        return toolSuccess(
          tool,
          buildSafeLearningResult(
            learning,
          ),
        );
      }


      case "simulate_decision": {
        const parsed =
          decisionSimulationInputSchema
            .safeParse(
              args,
            );

        if (!parsed.success) {
          return toolFailure(
            tool,
            "Invalid decision simulation arguments.",
          );
        }

        const simulation =
          await simulateDecision(
            parsed.data,
          );

        return toolSuccess(
          tool,
          toJsonValue(
            simulation,
          ),
        );
      }


      case "search_opportunities": {
        const parsed =
          opportunitySearchInputSchema
            .safeParse(
              args,
            );

        if (!parsed.success) {
          return toolFailure(
            tool,
            "Invalid opportunity search arguments.",
          );
        }

        const opportunities =
          await searchOpportunities(
            parsed.data,
          );

        return toolSuccess(
          tool,
          toJsonValue(
            opportunities,
          ),
        );
      }


      default: {
        /**
         * Exhaustive security fallback.
         *
         * No dynamically named or arbitrary tool may execute.
         */
        throw new AIToolExecutionError(
          "UNKNOWN_TOOL",
        );
      }
    }
  } catch (error) {
    if (
      error instanceof
      AIToolExecutionError
    ) {
      throw error;
    }

    /**
     * Do not send:
     *
     * - Supabase errors
     * - provider errors
     * - stack traces
     * - secrets
     * - database details
     *
     * back into the model.
     */
    return toolFailure(
      tool,
      "Tool execution failed.",
    );
  }
}


/* =========================================================
 * 21. FUNCTION-CALL OUTPUT HELPER
 * ======================================================= */

/**
 * OpenAI function_call_output accepts serialized output.
 *
 * This helper guarantees that only the sanitized LIFE OS
 * result is returned to the model.
 */
export async function executeAIToolAsString(
  rawToolName:
    string,

  rawArguments:
    unknown,

  allowedToolNames:
    readonly AIToolName[],
): Promise<string> {
  const result =
    await executeAITool(
      rawToolName,
      rawArguments,
      allowedToolNames,
    );

  return JSON.stringify(
    result,
  );
}


/* =========================================================
 * 22. READ-ONLY TOOLS
 * ======================================================= */

export const READ_ONLY_AI_TOOLS =
  [
    "get_dashboard_snapshot",
    "get_finance_snapshot",
    "get_investment_snapshot",
    "get_goal_status",
    "get_learning_status",
  ] as const satisfies
    readonly AIToolName[];


/* =========================================================
 * 23. ANALYSIS TOOLS
 * ======================================================= */

export const ANALYSIS_AI_TOOLS =
  [
    "simulate_decision",
    "search_opportunities",
  ] as const satisfies
    readonly AIToolName[];


/* =========================================================
 * 24. SECURITY CHARACTERISTICS
 * ======================================================= */

/**
 * Every V1 AI tool is non-executing.
 *
 * READ-ONLY:
 *
 * get_dashboard_snapshot
 * get_finance_snapshot
 * get_investment_snapshot
 * get_goal_status
 * get_learning_status
 *
 *
 * ANALYSIS / RESEARCH:
 *
 * simulate_decision
 * search_opportunities
 *
 *
 * NONE can:
 *
 * INSERT normal user data
 * UPDATE normal user data
 * DELETE user data
 * execute SQL
 * invoke shell commands
 * transfer funds
 * place trades
 * send messages
 * change authentication
 * change security settings
 */


/* =========================================================
 * 25. PRIVACY CHARACTERISTICS
 * ======================================================= */

/**
 * Tool output intentionally strips database ownership and
 * operational metadata before returning data to AI.
 *
 * The AI does not receive from these tools:
 *
 * user_id
 * authentication data
 * cookies
 * tokens
 * API keys
 * database audit logs
 * service-role credentials
 * raw Supabase errors
 *
 * Raw notes and unrelated database metadata are also avoided
 * whenever they are unnecessary for the tool's purpose.
 */


/* =========================================================
 * 26. FINAL TOOL RULE
 * ======================================================= */

/**
 * LIFE OS AI Tool Boundary
 *
 * AI requests tool
 *      ↓
 * Known tool name?
 *      ↓
 * Explicitly allowed?
 *      ↓
 * Tool-call limit respected?
 *      ↓
 * Strict argument validation
 *      ↓
 * Authenticated LIFE OS function
 *      ↓
 * AAL2
 *      ↓
 * PostgreSQL RLS
 *      ↓
 * Sanitized result
 *      ↓
 * AI
 *
 *
 * Permanent rule:
 *
 * AI receives capabilities,
 * never unrestricted system access.
 */