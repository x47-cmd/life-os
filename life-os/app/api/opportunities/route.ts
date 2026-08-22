import {
  NextResponse,
} from "next/server";

import {
  z,
} from "zod";

import {
  searchOpportunities,
} from "@/ai/opportunity-engine";

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
  12_000;

const MAX_QUERY_LENGTH =
  500;

const MAX_RESPONSE_RESULTS =
  10;


/* =========================================================
 * 3. PRIVATE RESPONSE HEADERS
 * ======================================================= */

const PRIVATE_RESPONSE_HEADERS = {
  "Cache-Control":
    "no-store, max-age=0",

  "X-Content-Type-Options":
    "nosniff",
} as const;


/* =========================================================
 * 4. ALLOWED CATEGORIES
 * ======================================================= */

/**
 * These values match the locked V1 Opportunity Engine.
 *
 * No arbitrary category is accepted from the browser.
 */
const opportunityCategorySchema =
  z.enum([
    "course",
    "certification",
    "job",
    "education",
    "professional_program",
    "development",
  ]);


/* =========================================================
 * 5. REQUEST SCHEMA
 * ======================================================= */

const opportunityRequestSchema =
  z
    .object({
      query:
        z
          .string()
          .trim()
          .min(
            2,
          )
          .max(
            MAX_QUERY_LENGTH,
          ),

      category:
        opportunityCategorySchema,
    })
    .strict();


/* =========================================================
 * 6. RESPONSE HELPERS
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
 * 7. RECORD HELPERS
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


/* =========================================================
 * 8. SAME-ORIGIN PROTECTION
 * ======================================================= */

/**
 * This route:
 *
 * - uses authenticated cookies
 * - can trigger external AI/web-search cost
 *
 * Browser-originated requests must therefore come from the
 * LIFE OS origin.
 */
function hasValidOrigin(
  request: Request,
): boolean {
  const origin =
    request.headers.get(
      "origin",
    );

  /**
   * Server-to-server requests may legitimately omit Origin.
   */
  if (
    !origin
  ) {
    return true;
  }

  try {
    const requestOrigin =
      new URL(
        request.url,
      ).origin;

    const suppliedOrigin =
      new URL(
        origin,
      ).origin;

    return (
      suppliedOrigin ===
      requestOrigin
    );
  } catch {
    return false;
  }
}


/* =========================================================
 * 9. JSON CONTENT TYPE
 * ======================================================= */

function isJsonRequest(
  request: Request,
): boolean {
  const contentType =
    request.headers.get(
      "content-type",
    );

  return Boolean(
    contentType
      ?.toLowerCase()
      .includes(
        "application/json",
      ),
  );
}


/* =========================================================
 * 10. BOUNDED BODY READER
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

  const actualSize =
    new TextEncoder()
      .encode(
        raw,
      )
      .byteLength;

  if (
    actualSize >
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
 * 11. SAFE URL VALIDATION
 * ======================================================= */

/**
 * Opportunity Engine already validates URLs.
 *
 * The HTTP boundary performs a final defensive check before
 * a URL is returned to the browser.
 */
function normalizeExternalUrl(
  value: string,
): string | null {
  try {
    const url =
      new URL(
        value,
      );

    if (
      url.protocol !==
        "https:" &&
      url.protocol !==
        "http:"
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}


/* =========================================================
 * 12. PRIORITY NORMALIZATION
 * ======================================================= */

type SafePriority =
  | "high"
  | "medium"
  | "low";


function normalizePriority(
  value: unknown,
  score: number,
): SafePriority {
  if (
    value ===
      "high" ||
    value ===
      "medium" ||
    value ===
      "low"
  ) {
    return value;
  }

  if (
    score >=
    80
  ) {
    return "high";
  }

  if (
    score >=
    50
  ) {
    return "medium";
  }

  return "low";
}


/* =========================================================
 * 13. OPPORTUNITY NORMALIZATION
 * ======================================================= */

function normalizeOpportunity(
  value: unknown,
) {
  if (
    !isRecord(
      value,
    )
  ) {
    return null;
  }


  const title =
    readString(
      value,
      "title",
    );

  const description =
    readString(
      value,
      "description",
    );

  const rawUrl =
    readString(
      value,
      "url",
    );

  const reason =
    readString(
      value,
      "reason",
    );

  const fitScore =
    readNumber(
      value,
      "fit_score",
    );


  if (
    !title ||
    !description ||
    !rawUrl ||
    !reason ||
    fitScore ===
      null
  ) {
    return null;
  }


  const url =
    normalizeExternalUrl(
      rawUrl,
    );


  if (
    !url
  ) {
    return null;
  }


  const safeScore =
    Math.min(
      100,
      Math.max(
        0,
        fitScore,
      ),
    );


  const rawRecommendation =
    readString(
      value,
      "recommendation",
    );


  const recommendation =
    rawRecommendation ===
      "strong_match"
      ? "مطابقة قوية"
      : rawRecommendation ===
          "consider"
        ? "تستحق الدراسة"
        : rawRecommendation ===
            "low_priority"
          ? "أولوية منخفضة"
          : rawRecommendation ===
              "skip"
            ? "تجاوزها"
            : readString(
                value,
                "recommendation_label",
              ) ??
              (
                safeScore >=
                85
                  ? "مطابقة قوية"
                  : safeScore >=
                      70
                    ? "تستحق الدراسة"
                    : safeScore >=
                        45
                      ? "أولوية منخفضة"
                      : "تجاوزها"
              );


  return {
    title,

    provider:
      readString(
        value,
        "provider",
      ),

    description,

    url,

    fit_score:
      safeScore,

    recommendation,

    reason,

    priority:
      normalizePriority(
        value.priority,
        safeScore,
      ),
  };
}


/* =========================================================
 * 14. RESULT EXTRACTION
 * ======================================================= */

/**
 * Supports the locked engine returning either:
 *
 * {
 *   opportunities: [...]
 * }
 *
 * or an array directly.
 *
 * The browser receives one stable V1 contract.
 */
function normalizeOpportunityResult(
  value: unknown,
) {
  const rawItems =
    Array.isArray(
      value,
    )
      ? value
      : isRecord(
            value,
          ) &&
          Array.isArray(
            value.opportunities,
          )
        ? value.opportunities
        : [];


  const opportunities =
    rawItems
      .map(
        normalizeOpportunity,
      )
      .filter(
        (
          item,
        ): item is NonNullable<
          ReturnType<
            typeof normalizeOpportunity
          >
        > =>
          item !==
          null,
      )
      .sort(
        (
          a,
          b,
        ) =>
          b.fit_score -
          a.fit_score,
      )
      .slice(
        0,
        MAX_RESPONSE_RESULTS,
      );


  return {
    opportunities,
  };
}


/* =========================================================
 * 15. POST
 * ======================================================= */

export async function POST(
  request: Request,
) {

  /* -------------------------------------------------------
   * Same-origin
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
   * Content-Type
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
   * AAL2 authentication
   * ---------------------------------------------------- */

  try {
    /**
     * Returned user id is deliberately not passed to the
     * Opportunity Engine.
     *
     * Protected context builders derive ownership from the
     * authenticated session themselves.
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
   * Validate request
   * ---------------------------------------------------- */

  const validation =
    opportunityRequestSchema.safeParse(
      rawBody,
    );


  if (
    !validation.success
  ) {
    return errorResponse(
      400,
      "بيانات البحث غير صالحة.",
    );
  }


  /* -------------------------------------------------------
   * Execute isolated opportunity workflow
   * ---------------------------------------------------- */

  try {
    const result =
      await searchOpportunities(
        validation.data,
      );


    return successResponse(
      normalizeOpportunityResult(
        result,
      ),
    );
  } catch {
    /**
     * Never expose:
     *
     * - OpenAI/provider errors
     * - search internals
     * - prompts
     * - personal context
     * - stack traces
     * - Supabase details
     */
    return errorResponse(
      500,
      "تعذر البحث عن الفرص حاليًا. حاول مرة أخرى.",
    );
  }
}


/* =========================================================
 * 16. SEARCH-ONLY RULE
 * ======================================================= */

/**
 * /api/opportunities exists for one purpose:
 *
 * Find and evaluate external opportunities.
 *
 *
 * It is not a general-purpose AI route.
 */


/* =========================================================
 * 17. USER-INITIATED RULE
 * ======================================================= */

/**
 * V1 Opportunity Search runs only after an explicit user
 * request.
 *
 * It does NOT:
 *
 * monitor the web continuously
 * run background searches
 * automatically enroll
 * automatically apply
 * automatically purchase
 */


/* =========================================================
 * 18. CONTEXT RULE
 * ======================================================= */

/**
 * Browser sends:
 *
 * search query
 * category
 *
 *
 * Server-side Opportunity Engine decides the minimum LIFE OS
 * context needed for fit evaluation.
 *
 *
 * Browser does not send:
 *
 * user_id
 * salary database
 * portfolio database
 * personal memory dump
 * authentication data
 */


/* =========================================================
 * 19. EXTERNAL CONTENT RULE
 * ======================================================= */

/**
 * Search results are untrusted external data.
 *
 * External pages cannot:
 *
 * override system instructions
 * request LIFE OS secrets
 * create tools
 * change permissions
 * cause execution
 *
 * Search content is evidence, not authority.
 */


/* =========================================================
 * 20. URL RULE
 * ======================================================= */

/**
 * Only:
 *
 * http://
 * https://
 *
 * URLs are returned to the browser.
 *
 *
 * Schemes such as:
 *
 * javascript:
 * data:
 * file:
 *
 * are rejected.
 */


/* =========================================================
 * 21. FIT SCORE RULE
 * ======================================================= */

/**
 * fit_score is bounded to:
 *
 * 0–100
 *
 *
 * The Opportunity Engine owns the real fit evaluation and
 * deterministic recommendation thresholds.
 *
 * Route normalization exists only as defense-in-depth.
 */


/* =========================================================
 * 22. RESULTS RULE
 * ======================================================= */

/**
 * V1 returns a small ranked list.
 *
 * More results do not automatically mean a better decision.
 *
 * LIFE OS prioritizes:
 *
 * relevance
 * fit
 * evidence
 *
 * over result volume.
 */


/* =========================================================
 * 23. SECURITY RULE
 * ======================================================= */

/**
 * Request
 *      ↓
 * Same Origin
 *      ↓
 * JSON + Size Limit
 *      ↓
 * AAL2
 *      ↓
 * Strict Category + Query Validation
 *      ↓
 * Opportunity Engine
 *      ↓
 * Web Search
 *      ↓
 * Safe URLs
 *      ↓
 * Ranked Response
 */


/* =========================================================
 * 24. AUDIT RULE
 * ======================================================= */

/**
 * The Opportunity Engine owns the workflow audit event.
 *
 * This HTTP route does not duplicate it.
 *
 * Audit metadata must remain minimal and secret-free.
 */


/* =========================================================
 * 25. EXECUTION BOUNDARY
 * ======================================================= */

/**
 * Opportunity Search may:
 *
 * search ✅
 * compare ✅
 * score ✅
 * recommend ✅
 *
 *
 * It may not:
 *
 * enroll in a course ❌
 * submit a job application ❌
 * pay for anything ❌
 * send messages ❌
 * modify personal plans ❌
 * execute external actions ❌
 */


/* =========================================================
 * 26. FINAL OPPORTUNITY RULE
 * ======================================================= */

/**
 * User asks
 *      ↓
 * LIFE OS searches
 *      ↓
 * LIFE OS compares against personal context
 *      ↓
 * LIFE OS ranks
 *      ↓
 * User decides
 *
 *
 * Simple outside.
 * Intelligent underneath.
 */