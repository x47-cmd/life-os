import {
  NextResponse,
} from "next/server";

import {
  z,
} from "zod";

import {
  runChiefOfStaff,
} from "@/ai/chief-of-staff";

import {
  buildChiefOfStaffContext,
} from "@/ai/context";

import {
  simulateDecision,
} from "@/ai/decision-simulator";

import {
  requireAAL2UserId,
} from "@/lib/auth";


/* =========================================================
 * 1. ROUTE CONFIGURATION
 * ======================================================= */

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";


/* =========================================================
 * 2. SECURITY LIMITS
 * ======================================================= */

const MAX_REQUEST_BYTES =
  24_000;

const MAX_CHIEF_MESSAGE_LENGTH =
  4_000;

const MAX_DECISION_TITLE_LENGTH =
  200;

const MAX_DECISION_DESCRIPTION_LENGTH =
  2_500;

const MAX_MONEY_VALUE =
  1_000_000_000;


/* =========================================================
 * 3. RESPONSE HEADERS
 * ======================================================= */

const PRIVATE_RESPONSE_HEADERS = {
  "Cache-Control":
    "no-store, max-age=0",

  "X-Content-Type-Options":
    "nosniff",
} as const;


/* =========================================================
 * 4. TRANSPORT VALIDATION
 * ======================================================= */

/**
 * These schemas validate the HTTP transport contract used by
 * app/assistant/page.tsx.
 *
 * Domain validation and deterministic financial rules remain
 * inside the frozen AI/domain modules.
 */

const chiefRequestSchema =
  z
    .object({
      mode:
        z.literal(
          "chief_of_staff",
        ),

      message:
        z
          .string()
          .trim()
          .min(
            2,
          )
          .max(
            MAX_CHIEF_MESSAGE_LENGTH,
          ),
    })
    .strict();


const decisionRequestSchema =
  z
    .object({
      mode:
        z.literal(
          "decision",
        ),

      decision:
        z
          .object({
            title:
              z
                .string()
                .trim()
                .min(
                  2,
                )
                .max(
                  MAX_DECISION_TITLE_LENGTH,
                ),

            description:
              z
                .string()
                .trim()
                .min(
                  5,
                )
                .max(
                  MAX_DECISION_DESCRIPTION_LENGTH,
                ),

            proposed_one_time_cost:
              z
                .number()
                .finite()
                .min(
                  0,
                )
                .max(
                  MAX_MONEY_VALUE,
                ),

            proposed_monthly_cost:
              z
                .number()
                .finite()
                .min(
                  0,
                )
                .max(
                  MAX_MONEY_VALUE,
                ),

            proposed_monthly_investment_change:
              z
                .number()
                .finite()
                .min(
                  -MAX_MONEY_VALUE,
                )
                .max(
                  MAX_MONEY_VALUE,
                ),
          })
          .strict(),
    })
    .strict();


const requestSchema =
  z.discriminatedUnion(
    "mode",
    [
      chiefRequestSchema,
      decisionRequestSchema,
    ],
  );


/* =========================================================
 * 5. SAFE RESPONSE HELPERS
 * ======================================================= */

function successResponse(
  result: unknown,
) {
  return NextResponse.json(
    {
      ok:
        true,

      result,
    },
    {
      status:
        200,

      headers:
        PRIVATE_RESPONSE_HEADERS,
    },
  );
}


function errorResponse(
  status: number,
  message: string,
) {
  return NextResponse.json(
    {
      ok:
        false,

      message,
    },
    {
      status,

      headers:
        PRIVATE_RESPONSE_HEADERS,
    },
  );
}


/* =========================================================
 * 6. SAFE VALUE READERS
 * ======================================================= */

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value ===
      "object" &&
    value !== null &&
    !Array.isArray(
      value,
    )
  );
}


function readString(
  value: unknown,
  key: string,
): string | null {
  if (
    !isRecord(
      value,
    )
  ) {
    return null;
  }

  const field =
    value[key];

  if (
    typeof field !==
      "string"
  ) {
    return null;
  }

  const trimmed =
    field.trim();

  return trimmed.length >
    0
    ? trimmed
    : null;
}


function readNumber(
  value: unknown,
  key: string,
): number | null {
  if (
    !isRecord(
      value,
    )
  ) {
    return null;
  }

  const field =
    value[key];

  return (
    typeof field ===
      "number" &&
    Number.isFinite(
      field,
    )
  )
    ? field
    : null;
}


function readBoolean(
  value: unknown,
  key: string,
): boolean | null {
  if (
    !isRecord(
      value,
    )
  ) {
    return null;
  }

  const field =
    value[key];

  return typeof field ===
    "boolean"
    ? field
    : null;
}


/* =========================================================
 * 7. SAME-ORIGIN PROTECTION
 * ======================================================= */

/**
 * AI endpoints use authenticated cookies and can incur
 * external API cost.
 *
 * Requests carrying an Origin header must therefore come
 * from the LIFE OS origin.
 */
function hasValidOrigin(
  request: Request,
): boolean {
  const origin =
    request.headers.get(
      "origin",
    );

  if (
    !origin
  ) {
    return true;
  }

  try {
    const requestUrl =
      new URL(
        request.url,
      );

    return (
      new URL(
        origin,
      ).origin ===
      requestUrl.origin
    );
  } catch {
    return false;
  }
}


/* =========================================================
 * 8. CONTENT TYPE
 * ======================================================= */

function isJsonRequest(
  request: Request,
): boolean {
  const contentType =
    request.headers.get(
      "content-type",
    );

  if (
    !contentType
  ) {
    return false;
  }

  return contentType
    .toLowerCase()
    .includes(
      "application/json",
    );
}


/* =========================================================
 * 9. BODY READER
 * ======================================================= */

async function readRequestBody(
  request: Request,
): Promise<unknown> {
  const declaredLength =
    request.headers.get(
      "content-length",
    );

  if (
    declaredLength
  ) {
    const size =
      Number(
        declaredLength,
      );

    if (
      Number.isFinite(
        size,
      ) &&
      size >
        MAX_REQUEST_BYTES
    ) {
      throw new Error(
        "REQUEST_TOO_LARGE",
      );
    }
  }


  const raw =
    await request.text();

  const actualBytes =
    new TextEncoder()
      .encode(
        raw,
      )
      .byteLength;

  if (
    actualBytes >
    MAX_REQUEST_BYTES
  ) {
    throw new Error(
      "REQUEST_TOO_LARGE",
    );
  }


  try {
    return JSON.parse(
      raw,
    ) as unknown;
  } catch {
    throw new Error(
      "INVALID_JSON",
    );
  }
}


/* =========================================================
 * 10. CHIEF RESPONSE NORMALIZATION
 * ======================================================= */

function normalizeChiefResult(
  value: unknown,
) {
  const situation =
    readString(
      value,
      "situation",
    );

  const recommendation =
    readString(
      value,
      "recommendation",
    );

  const nextAction =
    readString(
      value,
      "next_action",
    );

  if (
    !situation ||
    !recommendation ||
    !nextAction
  ) {
    throw new Error(
      "INVALID_AI_OUTPUT",
    );
  }

  return {
    situation,

    recommendation,

    next_action:
      nextAction,
  };
}


/* =========================================================
 * 11. DECISION CHANGE NORMALIZATION
 * ======================================================= */

function normalizeDecisionChange(
  value: unknown,
): string | null {
  if (
    typeof value ===
      "string"
  ) {
    const trimmed =
      value.trim();

    return trimmed.length >
      0
      ? trimmed
      : null;
  }

  if (
    !isRecord(
      value,
    )
  ) {
    return null;
  }


  const description =
    readString(
      value,
      "description",
    ) ??
    readString(
      value,
      "summary",
    ) ??
    readString(
      value,
      "effect",
    );

  const area =
    readString(
      value,
      "area",
    );


  if (
    area &&
    description
  ) {
    return (
      `${area}: ${description}`
    );
  }

  return (
    description ??
    area
  );
}


/* =========================================================
 * 12. DECISION SCENARIO NORMALIZATION
 * ======================================================= */

function normalizeScenario(
  value: unknown,
  index: number,
) {
  if (
    !isRecord(
      value,
    )
  ) {
    throw new Error(
      "INVALID_DECISION_OUTPUT",
    );
  }


  const id =
    readString(
      value,
      "id",
    ) ??
    `scenario-${index + 1}`;


  const title =
    readString(
      value,
      "title",
    ) ??
    `السيناريو ${index + 1}`;


  const summary =
    readString(
      value,
      "summary",
    );


  const monthlyAvailableAfter =
    readNumber(
      value,
      "monthly_available_after",
    );


  const affordable =
    readBoolean(
      value,
      "affordable",
    );


  const rawChanges =
    Array.isArray(
      value.changes,
    )
      ? value.changes
      : [];


  const changes =
    rawChanges
      .map(
        normalizeDecisionChange,
      )
      .filter(
        (
          item,
        ): item is string =>
          item !== null,
      );


  return {
    id,

    title,

    summary,

    monthly_available_after:
      monthlyAvailableAfter,

    affordable,

    changes,
  };
}


/* =========================================================
 * 13. DECISION RESPONSE NORMALIZATION
 * ======================================================= */

function normalizeDecisionResult(
  value: unknown,
) {
  if (
    !isRecord(
      value,
    )
  ) {
    throw new Error(
      "INVALID_DECISION_OUTPUT",
    );
  }


  const summary =
    readString(
      value,
      "summary",
    ) ??
    "تمت مقارنة السيناريوهات.";


  const recommendation =
    readString(
      value,
      "recommendation",
    ) ??
    "راجع السيناريوهات قبل اتخاذ القرار.";


  const bestScenarioId =
    readString(
      value,
      "best_scenario_id",
    );


  const rawScenarios =
    Array.isArray(
      value.scenarios,
    )
      ? value.scenarios
      : [];


  const scenarios =
    rawScenarios.map(
      normalizeScenario,
    );


  if (
    scenarios.length <
    2
  ) {
    throw new Error(
      "INVALID_DECISION_OUTPUT",
    );
  }


  return {
    summary,

    recommendation,

    best_scenario_id:
      bestScenarioId,

    scenarios,
  };
}


/* =========================================================
 * 14. CHIEF OF STAFF WORKFLOW
 * ======================================================= */

async function handleChiefOfStaff(
  message: string,
) {
  /**
   * The browser supplies only the explicit question.
   *
   * LIFE OS constructs relevant personal context on the
   * server.
   */
  const aiRequest = {
    mode:
      "chief_of_staff" as const,

    message,
  };


  const context =
    await buildChiefOfStaffContext(
      aiRequest,
    );


  const result =
    await runChiefOfStaff({
      request:
        aiRequest,

      context,
    });


  return normalizeChiefResult(
    result,
  );
}


/* =========================================================
 * 15. DECISION WORKFLOW
 * ======================================================= */

async function handleDecision(
  decision: {
    title: string;
    description: string;
    proposed_one_time_cost: number;
    proposed_monthly_cost: number;
    proposed_monthly_investment_change: number;
  },
) {
  /**
   * simulateDecision owns:
   *
   * - current finance retrieval
   * - deterministic arithmetic
   * - contextual AI analysis
   * - scenario construction
   *
   * The route does not ask the model to calculate money.
   */
  const result =
    await simulateDecision(
      decision,
    );


  return normalizeDecisionResult(
    result,
  );
}


/* =========================================================
 * 16. POST
 * ======================================================= */

export async function POST(
  request: Request,
) {

  /* -------------------------------------------------------
   * Same-origin check
   * ---------------------------------------------------- */

  if (
    !hasValidOrigin(
      request,
    )
  ) {
    return errorResponse(
      403,
      "تم رفض الطلب.",
    );
  }


  /* -------------------------------------------------------
   * Content-Type check
   * ---------------------------------------------------- */

  if (
    !isJsonRequest(
      request,
    )
  ) {
    return errorResponse(
      415,
      "صيغة الطلب غير مدعومة.",
    );
  }


  /* -------------------------------------------------------
   * Authentication boundary
   * ---------------------------------------------------- */

  try {
    /**
     * The returned user id is deliberately discarded.
     *
     * AI input never receives browser-selected or
     * application-injected user_id values.
     *
     * Protected DAL calls derive ownership from the verified
     * authenticated session independently.
     */
    await requireAAL2UserId();
  } catch {
    return errorResponse(
      401,
      "تحتاج تسجيل الدخول والتحقق الأمني من جديد.",
    );
  }


  /* -------------------------------------------------------
   * Read body
   * ---------------------------------------------------- */

  let rawBody:
    unknown;

  try {
    rawBody =
      await readRequestBody(
        request,
      );
  } catch (
    error
  ) {
    if (
      error instanceof
        Error &&
      error.message ===
        "REQUEST_TOO_LARGE"
    ) {
      return errorResponse(
        413,
        "حجم الطلب أكبر من المسموح.",
      );
    }

    return errorResponse(
      400,
      "الطلب غير صالح.",
    );
  }


  /* -------------------------------------------------------
   * Validate transport contract
   * ---------------------------------------------------- */

  const validation =
    requestSchema.safeParse(
      rawBody,
    );


  if (
    !validation.success
  ) {
    return errorResponse(
      400,
      "بيانات الطلب غير صالحة.",
    );
  }


  /* -------------------------------------------------------
   * Execute allow-listed workflow
   * ---------------------------------------------------- */

  try {
    switch (
      validation.data.mode
    ) {

      case "chief_of_staff": {
        const result =
          await handleChiefOfStaff(
            validation
              .data
              .message,
          );

        return successResponse(
          result,
        );
      }


      case "decision": {
        const result =
          await handleDecision(
            validation
              .data
              .decision,
          );

        return successResponse(
          result,
        );
      }
    }
  } catch {
    /**
     * Never expose:
     *
     * - OpenAI errors
     * - stack traces
     * - Supabase errors
     * - prompts
     * - personal context
     * - internal model output
     */
    return errorResponse(
      500,
      "تعذر إكمال التحليل حاليًا. حاول مرة أخرى.",
    );
  }
}


/* =========================================================
 * 17. ALLOWED MODES
 * ======================================================= */

/**
 * /api/ai accepts only:
 *
 * chief_of_staff ✅
 * decision       ✅
 *
 *
 * Opportunity Search has its own isolated route:
 *
 * /api/opportunities
 *
 *
 * There is no generic:
 *
 * execute
 * tool
 * sql
 * shell
 * command
 *
 * AI endpoint.
 */


/* =========================================================
 * 18. AUTHENTICATION RULE
 * ======================================================= */

/**
 * Successful password login alone is insufficient.
 *
 * Request
 *      ↓
 * verified Supabase session
 *      ↓
 * AAL2
 *      ↓
 * AI workflow
 *
 *
 * AAL1 cannot use this private AI boundary.
 */


/* =========================================================
 * 19. USER ID RULE
 * ======================================================= */

/**
 * Request JSON cannot contain a trusted user_id.
 *
 * Ownership always comes from:
 *
 * authenticated Supabase identity
 *
 * never:
 *
 * request body
 * model output
 * browser state
 */


/* =========================================================
 * 20. CONTEXT MINIMIZATION RULE
 * ======================================================= */

/**
 * Browser sends:
 *
 * explicit question
 *
 * Server decides:
 *
 * what personal context is actually necessary.
 *
 *
 * Full LIFE OS data is never blindly serialized into an AI
 * request.
 */


/* =========================================================
 * 21. FINANCIAL RULE
 * ======================================================= */

/**
 * AI does not calculate authoritative financial arithmetic.
 *
 * Decision Simulator:
 *
 * deterministic application calculations
 *      ↓
 * AI qualitative analysis
 *
 *
 * Never the reverse.
 */


/* =========================================================
 * 22. INPUT SIZE RULE
 * ======================================================= */

/**
 * Request body size is bounded before AI execution.
 *
 * This reduces:
 *
 * - accidental huge prompts
 * - unnecessary token usage
 * - abuse
 * - memory pressure
 */


/* =========================================================
 * 23. ERROR RULE
 * ======================================================= */

/**
 * Client receives safe errors only.
 *
 * Internal provider/database errors remain server-side and
 * are never copied into the browser response.
 */


/* =========================================================
 * 24. CACHE RULE
 * ======================================================= */

/**
 * AI responses may contain highly personal derived context.
 *
 * Therefore every response uses:
 *
 * Cache-Control: no-store
 *
 * and the route is force-dynamic.
 */


/* =========================================================
 * 25. EXECUTION BOUNDARY
 * ======================================================= */

/**
 * This API can:
 *
 * analyze ✅
 * summarize ✅
 * compare ✅
 * recommend ✅
 *
 *
 * It cannot expose tools that:
 *
 * transfer money ❌
 * place investments ❌
 * send email ❌
 * execute SQL ❌
 * execute shell commands ❌
 * change authentication ❌
 * delete important records ❌
 */


/* =========================================================
 * 26. AUDIT OWNERSHIP
 * ======================================================= */

/**
 * Audit events belong to the AI workflow modules themselves,
 * close to the successful operation being audited.
 *
 * The HTTP gateway does not create a second duplicate audit
 * event for the same workflow.
 */


/* =========================================================
 * 27. FINAL API RULE
 * ======================================================= */

/**
 * Client
 *      ↓
 * Same Origin
 *      ↓
 * AAL2
 *      ↓
 * Strict Validation
 *      ↓
 * Minimal Context
 *      ↓
 * Allow-listed AI Workflow
 *      ↓
 * Safe Structured Response
 *
 *
 * No generic execution path exists.
 */