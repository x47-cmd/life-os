import {
  assertAuthenticatedIdentity,
} from "@/lib/auth";

import {
  createClient,
  type ServerSupabaseClient,
} from "@/lib/supabase/server";

import {
  validateInvestmentForecast,
  type InvestmentForecastDraft,
  type InvestmentIntelligenceDataStatus,
  type InvestmentIntelligenceRecommendation,
  type InvestmentIntelligenceStance,
  type InvestmentForecastDirection,
} from "@/lib/investment-intelligence";

import {
  uuidSchema,
} from "@/lib/validation";

import type {
  CurrencyCode,
  InvestmentAsset,
  ISODate,
  ISODateTime,
  JsonValue,
  UUID,
} from "@/lib/types";


/* =========================================================
 * LIFE OS
 * LIFE INVEST AI
 * DATA ACCESS LAYER
 *
 * Responsibilities:
 *
 * - authenticated investment asset reads
 * - append-only AI analysis persistence
 * - evidence persistence
 * - immutable forecast persistence
 * - forecast outcome recording
 * - Track Record reads
 *
 *
 * Security:
 *
 * - verified server identity
 * - user_id always server-derived
 * - publishable Supabase client only
 * - PostgreSQL RLS remains active
 * - no service_role
 * - no browser-supplied ownership
 * - no historical forecast updates
 * - no historical forecast deletes
 *
 *
 * This file does NOT:
 *
 * - fetch public market data
 * - call OpenAI
 * - place trades
 * - connect to brokers
 * - move money
 * ======================================================= */


/* =========================================================
 * 1. ERROR CODES
 * ======================================================= */

export type InvestmentIntelligenceDataErrorCode =
  | "INVALID_ID"
  | "ASSET_NOT_FOUND"
  | "ANALYSIS_NOT_FOUND"
  | "FORECAST_NOT_FOUND"
  | "INVALID_ANALYSIS"
  | "INVALID_EVIDENCE"
  | "INVALID_FORECAST"
  | "INVALID_OUTCOME"
  | "ASSET_READ_FAILED"
  | "ANALYSIS_READ_FAILED"
  | "ANALYSIS_CREATE_FAILED"
  | "EVIDENCE_READ_FAILED"
  | "EVIDENCE_CREATE_FAILED"
  | "FORECAST_READ_FAILED"
  | "FORECAST_CREATE_FAILED"
  | "OUTCOME_READ_FAILED"
  | "OUTCOME_CREATE_FAILED"
  | "TRACK_RECORD_READ_FAILED";


/* =========================================================
 * 2. DATA ERROR
 * ======================================================= */

export class InvestmentIntelligenceDataError
  extends Error {

  readonly code:
    InvestmentIntelligenceDataErrorCode;

  readonly databaseCode:
    string | null;

  readonly details:
    string | null;


  constructor(
    code:
      InvestmentIntelligenceDataErrorCode,

    databaseCode:
      string | null =
      null,

    details:
      string | null =
      null,
  ) {
    const messages:
      Record<
        InvestmentIntelligenceDataErrorCode,
        string
      > = {

        INVALID_ID:
          "المعرّف غير صالح.",

        ASSET_NOT_FOUND:
          "الأصل الاستثماري غير موجود.",

        ANALYSIS_NOT_FOUND:
          "التحليل غير موجود.",

        FORECAST_NOT_FOUND:
          "التوقع غير موجود.",

        INVALID_ANALYSIS:
          "بيانات التحليل غير صالحة.",

        INVALID_EVIDENCE:
          "بيانات مصدر التحليل غير صالحة.",

        INVALID_FORECAST:
          "بيانات التوقع غير صالحة.",

        INVALID_OUTCOME:
          "بيانات نتيجة التوقع غير صالحة.",

        ASSET_READ_FAILED:
          "تعذر تحميل الأصل الاستثماري.",

        ANALYSIS_READ_FAILED:
          "تعذر تحميل تحليلات LIFE Invest AI.",

        ANALYSIS_CREATE_FAILED:
          "تعذر حفظ تحليل LIFE Invest AI.",

        EVIDENCE_READ_FAILED:
          "تعذر تحميل مصادر التحليل.",

        EVIDENCE_CREATE_FAILED:
          "تعذر حفظ مصدر التحليل.",

        FORECAST_READ_FAILED:
          "تعذر تحميل التوقعات.",

        FORECAST_CREATE_FAILED:
          "تعذر حفظ التوقع.",

        OUTCOME_READ_FAILED:
          "تعذر تحميل نتائج التوقعات.",

        OUTCOME_CREATE_FAILED:
          "تعذر تسجيل نتيجة التوقع.",

        TRACK_RECORD_READ_FAILED:
          "تعذر تحميل سجل دقة LIFE Invest AI.",
      };


    super(
      messages[
        code
      ],
    );


    this.name =
      "InvestmentIntelligenceDataError";


    this.code =
      code;


    this.databaseCode =
      databaseCode;


    this.details =
      details;
  }
}


/* =========================================================
 * 3. DATABASE ERROR SHAPE
 * ======================================================= */

interface DatabaseErrorLike {
  code?:
    string |
    null;

  message?:
    string |
    null;

  details?:
    string |
    null;
}


/* =========================================================
 * 4. DATA CONTEXT
 * ======================================================= */

interface InvestmentIntelligenceDataContext {
  supabase:
    ServerSupabaseClient;

  userId:
    UUID;
}


async function getInvestmentIntelligenceDataContext():
Promise<InvestmentIntelligenceDataContext> {
  const identity =
    await assertAuthenticatedIdentity();


  const supabase =
    await createClient();


  return {
    supabase,

    userId:
      identity.id,
  };
}


/* =========================================================
 * 5. SAFE ROW CASTING
 * ======================================================= */

function asRow<T>(
  value:
    unknown,
): T {
  return value as T;
}


function asRows<T>(
  value:
    unknown,
): T[] {
  if (
    !Array.isArray(
      value,
    )
  ) {
    return [];
  }


  return value as T[];
}


/* =========================================================
 * 6. DATABASE ERROR THROWER
 * ======================================================= */

function throwDataError(
  code:
    InvestmentIntelligenceDataErrorCode,

  error:
    DatabaseErrorLike |
    null,
): never {
  throw new InvestmentIntelligenceDataError(
    code,

    error?.code ??
      null,

    error?.message ??
      error?.details ??
      null,
  );
}


/* =========================================================
 * 7. STRING HELPERS
 * ======================================================= */

function normalizeRequiredText(
  value:
    string,

  maximumLength:
    number,

  errorCode:
    InvestmentIntelligenceDataErrorCode,
): string {
  const normalized =
    value.trim();


  if (
    normalized.length ===
      0 ||
    normalized.length >
      maximumLength
  ) {
    throw new InvestmentIntelligenceDataError(
      errorCode,
    );
  }


  return normalized;
}


function normalizeOptionalText(
  value:
    string |
    null |
    undefined,

  maximumLength:
    number,

  errorCode:
    InvestmentIntelligenceDataErrorCode,
): string | null {
  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return null;
  }


  const normalized =
    value.trim();


  if (
    normalized.length ===
    0
  ) {
    return null;
  }


  if (
    normalized.length >
    maximumLength
  ) {
    throw new InvestmentIntelligenceDataError(
      errorCode,
    );
  }


  return normalized;
}


/* =========================================================
 * 8. UUID VALIDATION
 * ======================================================= */

function validateId(
  id:
    UUID,
): UUID {
  const parsed =
    uuidSchema.safeParse(
      id,
    );


  if (
    !parsed.success
  ) {
    throw new InvestmentIntelligenceDataError(
      "INVALID_ID",
    );
  }


  return parsed.data;
}


/* =========================================================
 * 9. NUMBER VALIDATION
 * ======================================================= */

function assertScoreOrNull(
  value:
    number |
    null,

  errorCode:
    InvestmentIntelligenceDataErrorCode,
): void {
  if (
    value ===
    null
  ) {
    return;
  }


  if (
    !Number.isFinite(
      value,
    ) ||
    value <
      0 ||
    value >
      100
  ) {
    throw new InvestmentIntelligenceDataError(
      errorCode,
    );
  }
}


function assertPositiveNumberOrNull(
  value:
    number |
    null,

  errorCode:
    InvestmentIntelligenceDataErrorCode,
): void {
  if (
    value ===
    null
  ) {
    return;
  }


  if (
    !Number.isFinite(
      value,
    ) ||
    value <=
      0
  ) {
    throw new InvestmentIntelligenceDataError(
      errorCode,
    );
  }
}


/* =========================================================
 * 10. DATE VALIDATION
 * ======================================================= */

function assertISODate(
  value:
    string,

  errorCode:
    InvestmentIntelligenceDataErrorCode,
): void {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value,
    )
  ) {
    throw new InvestmentIntelligenceDataError(
      errorCode,
    );
  }
}


function assertISODateTime(
  value:
    string,

  errorCode:
    InvestmentIntelligenceDataErrorCode,
): void {
  const timestamp =
    Date.parse(
      value,
    );


  if (
    !Number.isFinite(
      timestamp,
    )
  ) {
    throw new InvestmentIntelligenceDataError(
      errorCode,
    );
  }
}


/* =========================================================
 * 11. HTTPS URL VALIDATION
 * ======================================================= */

function normalizeHttpsUrl(
  value:
    string |
    null |
    undefined,

  errorCode:
    InvestmentIntelligenceDataErrorCode,
): string | null {
  if (
    value ===
      null ||
    value ===
      undefined ||
    value.trim().length ===
      0
  ) {
    return null;
  }


  try {
    const url =
      new URL(
        value,
      );


    if (
      url.protocol !==
      "https:"
    ) {
      throw new Error(
        "HTTPS required.",
      );
    }


    return url.toString();
  } catch {
    throw new InvestmentIntelligenceDataError(
      errorCode,
    );
  }
}


/* =========================================================
 * 12. CURRENCY VALIDATION
 * ======================================================= */

function normalizeCurrency(
  value:
    string,

  errorCode:
    InvestmentIntelligenceDataErrorCode,
): CurrencyCode {
  const normalized =
    value
      .trim()
      .toUpperCase();


  if (
    !/^[A-Z]{3}$/.test(
      normalized,
    )
  ) {
    throw new InvestmentIntelligenceDataError(
      errorCode,
    );
  }


  return normalized;
}


/* =========================================================
 * 13. READ LIMIT
 * ======================================================= */

function normalizeReadLimit(
  value:
    number |
    undefined,

  fallback:
    number =
    25,
): number {
  if (
    value ===
      undefined
  ) {
    return fallback;
  }


  if (
    !Number.isInteger(
      value,
    )
  ) {
    return fallback;
  }


  return Math.max(
    1,
    Math.min(
      value,
      100,
    ),
  );
}


/* =========================================================
 * 14. ANALYSIS ROW
 * ======================================================= */

export interface InvestmentAIAnalysis {
  id:
    UUID;

  user_id:
    UUID;

  subject_kind:
    "market_asset" |
    "real_estate" |
    "business";

  asset_id:
    UUID |
    null;

  subject_label:
    string;

  analysis_version:
    string;

  prompt_version:
    string;

  model_name:
    string;

  model_version:
    string |
    null;

  as_of:
    ISODateTime;

  reference_price:
    number |
    null;

  currency:
    CurrencyCode;

  data_status:
    InvestmentIntelligenceDataStatus;

  data_quality_score:
    number |
    null;

  fundamental_score:
    number |
    null;

  technical_score:
    number |
    null;

  sentiment_score:
    number |
    null;

  macro_score:
    number |
    null;

  portfolio_fit_score:
    number |
    null;

  risk_score:
    number |
    null;

  overall_score:
    number |
    null;

  stance:
    InvestmentIntelligenceStance;

  recommendation:
    InvestmentIntelligenceRecommendation;

  confidence:
    number;

  summary:
    string;

  thesis:
    string |
    null;

  key_catalysts:
    JsonValue[];

  key_risks:
    JsonValue[];

  input_fingerprint:
    string;

  created_at:
    ISODateTime;
}


/* =========================================================
 * 15. ANALYSIS INSERT INPUT
 * ======================================================= */

export interface InvestmentAIAnalysisInsert {
  asset_id:
    UUID;

  subject_label:
    string;

  analysis_version:
    string;

  prompt_version:
    string;

  model_name:
    string;

  model_version?:
    string |
    null;

  as_of:
    ISODateTime;

  reference_price:
    number |
    null;

  currency:
    CurrencyCode;

  data_status:
    InvestmentIntelligenceDataStatus;

  data_quality_score:
    number |
    null;

  fundamental_score:
    number |
    null;

  technical_score:
    number |
    null;

  sentiment_score:
    number |
    null;

  macro_score:
    number |
    null;

  portfolio_fit_score:
    number |
    null;

  risk_score:
    number |
    null;

  overall_score:
    number |
    null;

  stance:
    InvestmentIntelligenceStance;

  recommendation:
    InvestmentIntelligenceRecommendation;

  confidence:
    number;

  summary:
    string;

  thesis?:
    string |
    null;

  key_catalysts?:
    JsonValue[];

  key_risks?:
    JsonValue[];

  input_fingerprint:
    string;
}


/* =========================================================
 * 16. EVIDENCE ROW
 * ======================================================= */

export type InvestmentAIEvidenceSourceType =
  | "market_data"
  | "financials"
  | "filing"
  | "news"
  | "technical"
  | "macro"
  | "portfolio"
  | "company"
  | "other";


export interface InvestmentAIEvidence {
  id:
    UUID;

  user_id:
    UUID;

  analysis_id:
    UUID;

  source_type:
    InvestmentAIEvidenceSourceType;

  source_name:
    string;

  title:
    string;

  source_url:
    string |
    null;

  published_at:
    ISODateTime |
    null;

  observed_at:
    ISODateTime;

  fact:
    string;

  value_json:
    JsonValue |
    null;

  created_at:
    ISODateTime;
}


/* =========================================================
 * 17. EVIDENCE INSERT INPUT
 * ======================================================= */

export interface InvestmentAIEvidenceInsert {
  analysis_id:
    UUID;

  source_type:
    InvestmentAIEvidenceSourceType;

  source_name:
    string;

  title:
    string;

  source_url?:
    string |
    null;

  published_at?:
    ISODateTime |
    null;

  observed_at:
    ISODateTime;

  fact:
    string;

  value_json?:
    JsonValue |
    null;
}


/* =========================================================
 * 18. FORECAST ROW
 * ======================================================= */

export interface InvestmentAIForecast {
  id:
    UUID;

  user_id:
    UUID;

  analysis_id:
    UUID;

  asset_id:
    UUID;

  horizon_days:
    number;

  target_date:
    ISODate;

  reference_price:
    number;

  currency:
    CurrencyCode;

  up_probability:
    number;

  flat_probability:
    number;

  down_probability:
    number;

  direction:
    InvestmentForecastDirection;

  flat_threshold_percent:
    number;

  bull_low:
    number;

  bull_high:
    number;

  base_low:
    number;

  base_high:
    number;

  bear_low:
    number;

  bear_high:
    number;

  base_midpoint:
    number;

  expected_return_mid_percent:
    number;

  invalidation_price:
    number |
    null;

  confidence:
    number;

  thesis:
    string;

  created_at:
    ISODateTime;
}


/* =========================================================
 * 19. FORECAST INSERT INPUT
 * ======================================================= */

export interface InvestmentAIForecastInsert
  extends InvestmentForecastDraft {

  analysis_id:
    UUID;

  asset_id:
    UUID;
}


/* =========================================================
 * 20. FORECAST OUTCOME ROW
 * ======================================================= */

export interface InvestmentAIForecastOutcome {
  id:
    UUID;

  user_id:
    UUID;

  forecast_id:
    UUID;

  evaluation_date:
    ISODate;

  actual_price:
    number;

  currency:
    CurrencyCode;

  actual_source_name:
    string;

  actual_source_url:
    string |
    null;

  actual_observed_at:
    ISODateTime;

  actual_change_percent:
    number;

  actual_direction:
    InvestmentForecastDirection;

  direction_correct:
    boolean;

  base_range_hit:
    boolean;

  absolute_error_percent:
    number;

  brier_score:
    number;

  created_at:
    ISODateTime;
}


/* =========================================================
 * 21. FORECAST OUTCOME INSERT
 * ======================================================= */

export interface InvestmentAIForecastOutcomeInsert {
  forecast_id:
    UUID;

  evaluation_date:
    ISODate;

  actual_price:
    number;

  currency:
    CurrencyCode;

  actual_source_name:
    string;

  actual_source_url?:
    string |
    null;

  actual_observed_at:
    ISODateTime;
}


/* =========================================================
 * 22. TRACK RECORD ROW
 * ======================================================= */

export interface InvestmentAITrackRecord {
  user_id:
    UUID;

  evaluated_forecasts:
    number;

  directional_accuracy_percent:
    number |
    null;

  base_range_accuracy_percent:
    number |
    null;

  average_absolute_error_percent:
    number |
    null;

  average_brier_score:
    number |
    null;

  first_evaluation_date:
    ISODate |
    null;

  latest_evaluation_date:
    ISODate |
    null;
}


/* =========================================================
 * 23. ASSET INTELLIGENCE SUMMARY
 * ======================================================= */

export interface InvestmentAIAssetSummary {
  asset:
    InvestmentAsset;

  latest_analysis:
    InvestmentAIAnalysis |
    null;

  active_forecasts:
    InvestmentAIForecast[];

  evaluated_forecast_count:
    number;
}


/* =========================================================
 * 24. FULL INTELLIGENCE SNAPSHOT
 * ======================================================= */

export interface InvestmentIntelligenceSnapshot {
  assets:
    InvestmentAsset[];

  latest_analyses:
    InvestmentAIAnalysis[];

  open_forecasts:
    InvestmentAIForecast[];

  recent_outcomes:
    InvestmentAIForecastOutcome[];

  track_record:
    InvestmentAITrackRecord |
    null;
}


/* =========================================================
 * 25. ASSET READ
 * ======================================================= */

export async function getInvestmentIntelligenceAsset(
  assetId:
    UUID,
): Promise<InvestmentAsset | null> {
  const id =
    validateId(
      assetId,
    );


  const {
    supabase,
    userId,
  } =
    await getInvestmentIntelligenceDataContext();


  const {
    data,
    error,
  } =
    await supabase
      .from(
        "investment_assets",
      )
      .select(
        "*",
      )
      .eq(
        "user_id",
        userId,
      )
      .eq(
        "id",
        id,
      )
      .maybeSingle();


  if (
    error
  ) {
    throwDataError(
      "ASSET_READ_FAILED",
      error,
    );
  }


  return data
    ? asRow<InvestmentAsset>(
        data,
      )
    : null;
}


/* =========================================================
 * 26. REQUIRE ASSET
 * ======================================================= */

export async function requireInvestmentIntelligenceAsset(
  assetId:
    UUID,
): Promise<InvestmentAsset> {
  const asset =
    await getInvestmentIntelligenceAsset(
      assetId,
    );


  if (
    !asset
  ) {
    throw new InvestmentIntelligenceDataError(
      "ASSET_NOT_FOUND",
    );
  }


  return asset;
}


/* =========================================================
 * 27. LIST INVESTMENT ASSETS
 * ======================================================= */

export async function listInvestmentIntelligenceAssets():
Promise<InvestmentAsset[]> {
  const {
    supabase,
    userId,
  } =
    await getInvestmentIntelligenceDataContext();


  const {
    data,
    error,
  } =
    await supabase
      .from(
        "investment_assets",
      )
      .select(
        "*",
      )
      .eq(
        "user_id",
        userId,
      )
      .eq(
        "is_active",
        true,
      )
      .order(
        "created_at",
        {
          ascending:
            true,
        },
      );


  if (
    error
  ) {
    throwDataError(
      "ASSET_READ_FAILED",
      error,
    );
  }


  return asRows<InvestmentAsset>(
    data,
  );
}


/* =========================================================
 * 28. ANALYSIS INPUT VALIDATION
 * ======================================================= */

function validateAnalysisInput(
  input:
    InvestmentAIAnalysisInsert,
): InvestmentAIAnalysisInsert {
  validateId(
    input.asset_id,
  );


  const subjectLabel =
    normalizeRequiredText(
      input.subject_label,
      160,
      "INVALID_ANALYSIS",
    );


  const analysisVersion =
    normalizeRequiredText(
      input.analysis_version,
      50,
      "INVALID_ANALYSIS",
    );


  const promptVersion =
    normalizeRequiredText(
      input.prompt_version,
      50,
      "INVALID_ANALYSIS",
    );


  const modelName =
    normalizeRequiredText(
      input.model_name,
      120,
      "INVALID_ANALYSIS",
    );


  const modelVersion =
    normalizeOptionalText(
      input.model_version,
      120,
      "INVALID_ANALYSIS",
    );


  assertISODateTime(
    input.as_of,
    "INVALID_ANALYSIS",
  );


  assertPositiveNumberOrNull(
    input.reference_price,
    "INVALID_ANALYSIS",
  );


  const currency =
    normalizeCurrency(
      input.currency,
      "INVALID_ANALYSIS",
    );


  assertScoreOrNull(
    input.data_quality_score,
    "INVALID_ANALYSIS",
  );


  assertScoreOrNull(
    input.fundamental_score,
    "INVALID_ANALYSIS",
  );


  assertScoreOrNull(
    input.technical_score,
    "INVALID_ANALYSIS",
  );


  assertScoreOrNull(
    input.sentiment_score,
    "INVALID_ANALYSIS",
  );


  assertScoreOrNull(
    input.macro_score,
    "INVALID_ANALYSIS",
  );


  assertScoreOrNull(
    input.portfolio_fit_score,
    "INVALID_ANALYSIS",
  );


  assertScoreOrNull(
    input.risk_score,
    "INVALID_ANALYSIS",
  );


  assertScoreOrNull(
    input.overall_score,
    "INVALID_ANALYSIS",
  );


  if (
    !Number.isFinite(
      input.confidence,
    ) ||
    input.confidence <
      0 ||
    input.confidence >
      100
  ) {
    throw new InvestmentIntelligenceDataError(
      "INVALID_ANALYSIS",
    );
  }


  const summary =
    normalizeRequiredText(
      input.summary,
      4000,
      "INVALID_ANALYSIS",
    );


  const thesis =
    normalizeOptionalText(
      input.thesis,
      6000,
      "INVALID_ANALYSIS",
    );


  const fingerprint =
    input.input_fingerprint
      .trim()
      .toLowerCase();


  if (
    !/^[0-9a-f]{64}$/.test(
      fingerprint,
    )
  ) {
    throw new InvestmentIntelligenceDataError(
      "INVALID_ANALYSIS",
    );
  }


  if (
    input.data_status ===
      "sufficient" &&
    input.overall_score ===
      null
  ) {
    throw new InvestmentIntelligenceDataError(
      "INVALID_ANALYSIS",
    );
  }


  return {
    ...input,

    subject_label:
      subjectLabel,

    analysis_version:
      analysisVersion,

    prompt_version:
      promptVersion,

    model_name:
      modelName,

    model_version:
      modelVersion,

    currency,

    summary,

    thesis,

    key_catalysts:
      input.key_catalysts ??
      [],

    key_risks:
      input.key_risks ??
      [],

    input_fingerprint:
      fingerprint,
  };
}


/* =========================================================
 * 29. CREATE ANALYSIS
 * ======================================================= */

export async function createInvestmentAIAnalysis(
  input:
    InvestmentAIAnalysisInsert,
): Promise<InvestmentAIAnalysis> {
  const parsed =
    validateAnalysisInput(
      input,
    );


  const {
    supabase,
    userId,
  } =
    await getInvestmentIntelligenceDataContext();


  const {
    data,
    error,
  } =
    await supabase
      .from(
        "investment_ai_analyses",
      )
      .insert({
        user_id:
          userId,

        subject_kind:
          "market_asset",

        asset_id:
          parsed.asset_id,

        subject_label:
          parsed.subject_label,

        analysis_version:
          parsed.analysis_version,

        prompt_version:
          parsed.prompt_version,

        model_name:
          parsed.model_name,

        model_version:
          parsed.model_version ??
          null,

        as_of:
          parsed.as_of,

        reference_price:
          parsed.reference_price,

        currency:
          parsed.currency,

        data_status:
          parsed.data_status,

        data_quality_score:
          parsed.data_quality_score,

        fundamental_score:
          parsed.fundamental_score,

        technical_score:
          parsed.technical_score,

        sentiment_score:
          parsed.sentiment_score,

        macro_score:
          parsed.macro_score,

        portfolio_fit_score:
          parsed.portfolio_fit_score,

        risk_score:
          parsed.risk_score,

        overall_score:
          parsed.overall_score,

        stance:
          parsed.stance,

        recommendation:
          parsed.recommendation,

        confidence:
          parsed.confidence,

        summary:
          parsed.summary,

        thesis:
          parsed.thesis ??
          null,

        key_catalysts:
          parsed.key_catalysts ??
          [],

        key_risks:
          parsed.key_risks ??
          [],

        input_fingerprint:
          parsed.input_fingerprint,
      })
      .select(
        "*",
      )
      .single();


  if (
    error ||
    !data
  ) {
    throwDataError(
      "ANALYSIS_CREATE_FAILED",
      error,
    );
  }


  return asRow<InvestmentAIAnalysis>(
    data,
  );
}


/* =========================================================
 * 30. GET ANALYSIS
 * ======================================================= */

export async function getInvestmentAIAnalysis(
  analysisId:
    UUID,
): Promise<InvestmentAIAnalysis | null> {
  const id =
    validateId(
      analysisId,
    );


  const {
    supabase,
    userId,
  } =
    await getInvestmentIntelligenceDataContext();


  const {
    data,
    error,
  } =
    await supabase
      .from(
        "investment_ai_analyses",
      )
      .select(
        "*",
      )
      .eq(
        "user_id",
        userId,
      )
      .eq(
        "id",
        id,
      )
      .maybeSingle();


  if (
    error
  ) {
    throwDataError(
      "ANALYSIS_READ_FAILED",
      error,
    );
  }


  return data
    ? asRow<InvestmentAIAnalysis>(
        data,
      )
    : null;
}


/* =========================================================
 * 31. LIST ANALYSES
 * ======================================================= */

export interface ListInvestmentAIAnalysesOptions {
  asset_id?:
    UUID;

  limit?:
    number;
}


export async function listInvestmentAIAnalyses(
  options:
    ListInvestmentAIAnalysesOptions =
    {},
): Promise<InvestmentAIAnalysis[]> {
  const {
    supabase,
    userId,
  } =
    await getInvestmentIntelligenceDataContext();


  const limit =
    normalizeReadLimit(
      options.limit,
    );


  let query =
    supabase
      .from(
        "investment_ai_analyses",
      )
      .select(
        "*",
      )
      .eq(
        "user_id",
        userId,
      );


  if (
    options.asset_id
  ) {
    query =
      query.eq(
        "asset_id",
        validateId(
          options.asset_id,
        ),
      );
  }


  const {
    data,
    error,
  } =
    await query
      .order(
        "created_at",
        {
          ascending:
            false,
        },
      )
      .limit(
        limit,
      );


  if (
    error
  ) {
    throwDataError(
      "ANALYSIS_READ_FAILED",
      error,
    );
  }


  return asRows<InvestmentAIAnalysis>(
    data,
  );
}


/* =========================================================
 * 32. LATEST ANALYSIS FOR ASSET
 * ======================================================= */

export async function getLatestInvestmentAIAnalysis(
  assetId:
    UUID,
): Promise<InvestmentAIAnalysis | null> {
  const id =
    validateId(
      assetId,
    );


  const {
    supabase,
    userId,
  } =
    await getInvestmentIntelligenceDataContext();


  const {
    data,
    error,
  } =
    await supabase
      .from(
        "investment_ai_analyses",
      )
      .select(
        "*",
      )
      .eq(
        "user_id",
        userId,
      )
      .eq(
        "asset_id",
        id,
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        },
      )
      .limit(
        1,
      )
      .maybeSingle();


  if (
    error
  ) {
    throwDataError(
      "ANALYSIS_READ_FAILED",
      error,
    );
  }


  return data
    ? asRow<InvestmentAIAnalysis>(
        data,
      )
    : null;
}


/* =========================================================
 * 33. EVIDENCE VALIDATION
 * ======================================================= */

function validateEvidenceInput(
  input:
    InvestmentAIEvidenceInsert,
): InvestmentAIEvidenceInsert {
  validateId(
    input.analysis_id,
  );


  const validSourceTypes:
    readonly InvestmentAIEvidenceSourceType[] = [
      "market_data",
      "financials",
      "filing",
      "news",
      "technical",
      "macro",
      "portfolio",
      "company",
      "other",
    ];


  if (
    !validSourceTypes.includes(
      input.source_type,
    )
  ) {
    throw new InvestmentIntelligenceDataError(
      "INVALID_EVIDENCE",
    );
  }


  const sourceName =
    normalizeRequiredText(
      input.source_name,
      160,
      "INVALID_EVIDENCE",
    );


  const title =
    normalizeRequiredText(
      input.title,
      500,
      "INVALID_EVIDENCE",
    );


  const sourceUrl =
    normalizeHttpsUrl(
      input.source_url,
      "INVALID_EVIDENCE",
    );


  if (
    input.published_at
  ) {
    assertISODateTime(
      input.published_at,
      "INVALID_EVIDENCE",
    );
  }


  assertISODateTime(
    input.observed_at,
    "INVALID_EVIDENCE",
  );


  const fact =
    normalizeRequiredText(
      input.fact,
      4000,
      "INVALID_EVIDENCE",
    );


  return {
    ...input,

    source_name:
      sourceName,

    title,

    source_url:
      sourceUrl,

    fact,

    value_json:
      input.value_json ??
      null,
  };
}


/* =========================================================
 * 34. CREATE EVIDENCE
 * ======================================================= */

export async function createInvestmentAIEvidence(
  input:
    InvestmentAIEvidenceInsert,
): Promise<InvestmentAIEvidence> {
  const parsed =
    validateEvidenceInput(
      input,
    );


  const {
    supabase,
    userId,
  } =
    await getInvestmentIntelligenceDataContext();


  const {
    data,
    error,
  } =
    await supabase
      .from(
        "investment_ai_evidence",
      )
      .insert({
        user_id:
          userId,

        analysis_id:
          parsed.analysis_id,

        source_type:
          parsed.source_type,

        source_name:
          parsed.source_name,

        title:
          parsed.title,

        source_url:
          parsed.source_url ??
          null,

        published_at:
          parsed.published_at ??
          null,

        observed_at:
          parsed.observed_at,

        fact:
          parsed.fact,

        value_json:
          parsed.value_json ??
          null,
      })
      .select(
        "*",
      )
      .single();


  if (
    error ||
    !data
  ) {
    throwDataError(
      "EVIDENCE_CREATE_FAILED",
      error,
    );
  }


  return asRow<InvestmentAIEvidence>(
    data,
  );
}


/* =========================================================
 * 35. CREATE MULTIPLE EVIDENCE ROWS
 * ======================================================= */

export async function createInvestmentAIEvidenceBatch(
  inputs:
    InvestmentAIEvidenceInsert[],
): Promise<InvestmentAIEvidence[]> {
  if (
    inputs.length ===
    0
  ) {
    return [];
  }


  if (
    inputs.length >
    100
  ) {
    throw new InvestmentIntelligenceDataError(
      "INVALID_EVIDENCE",
    );
  }


  const parsed =
    inputs.map(
      (
        input,
      ) =>
        validateEvidenceInput(
          input,
        ),
    );


  const {
    supabase,
    userId,
  } =
    await getInvestmentIntelligenceDataContext();


  const {
    data,
    error,
  } =
    await supabase
      .from(
        "investment_ai_evidence",
      )
      .insert(
        parsed.map(
          (
            item,
          ) => ({
            user_id:
              userId,

            analysis_id:
              item.analysis_id,

            source_type:
              item.source_type,

            source_name:
              item.source_name,

            title:
              item.title,

            source_url:
              item.source_url ??
              null,

            published_at:
              item.published_at ??
              null,

            observed_at:
              item.observed_at,

            fact:
              item.fact,

            value_json:
              item.value_json ??
              null,
          }),
        ),
      )
      .select(
        "*",
      );


  if (
    error
  ) {
    throwDataError(
      "EVIDENCE_CREATE_FAILED",
      error,
    );
  }


  return asRows<InvestmentAIEvidence>(
    data,
  );
}


/* =========================================================
 * 36. LIST EVIDENCE
 * ======================================================= */

export async function listInvestmentAIEvidence(
  analysisId:
    UUID,
): Promise<InvestmentAIEvidence[]> {
  const id =
    validateId(
      analysisId,
    );


  const {
    supabase,
    userId,
  } =
    await getInvestmentIntelligenceDataContext();


  const {
    data,
    error,
  } =
    await supabase
      .from(
        "investment_ai_evidence",
      )
      .select(
        "*",
      )
      .eq(
        "user_id",
        userId,
      )
      .eq(
        "analysis_id",
        id,
      )
      .order(
        "observed_at",
        {
          ascending:
            false,
        },
      );


  if (
    error
  ) {
    throwDataError(
      "EVIDENCE_READ_FAILED",
      error,
    );
  }


  return asRows<InvestmentAIEvidence>(
    data,
  );
}


/* =========================================================
 * 37. FORECAST INPUT VALIDATION
 * ======================================================= */

function validateForecastInput(
  input:
    InvestmentAIForecastInsert,
): InvestmentAIForecastInsert {
  const analysisId =
    validateId(
      input.analysis_id,
    );


  const assetId =
    validateId(
      input.asset_id,
    );


  const currency =
    normalizeCurrency(
      input.currency,
      "INVALID_FORECAST",
    );


  const thesis =
    normalizeRequiredText(
      input.thesis,
      4000,
      "INVALID_FORECAST",
    );


  const draft:
    InvestmentForecastDraft = {
      horizon_days:
        input.horizon_days,

      target_date:
        input.target_date,

      reference_price:
        input.reference_price,

      currency,

      up_probability:
        input.up_probability,

      flat_probability:
        input.flat_probability,

      down_probability:
        input.down_probability,

      direction:
        input.direction,

      flat_threshold_percent:
        input.flat_threshold_percent,

      bull_low:
        input.bull_low,

      bull_high:
        input.bull_high,

      base_low:
        input.base_low,

      base_high:
        input.base_high,

      bear_low:
        input.bear_low,

      bear_high:
        input.bear_high,

      invalidation_price:
        input.invalidation_price,

      confidence:
        input.confidence,

      thesis,
    };


  const validation =
    validateInvestmentForecast(
      draft,
    );


  if (
    !validation.valid
  ) {
    throw new InvestmentIntelligenceDataError(
      "INVALID_FORECAST",
      null,
      validation.errors.join(
        " ",
      ),
    );
  }


  return {
    ...input,

    analysis_id:
      analysisId,

    asset_id:
      assetId,

    currency,

    thesis,
  };
}


/* =========================================================
 * 38. CREATE FORECAST
 * ======================================================= */

export async function createInvestmentAIForecast(
  input:
    InvestmentAIForecastInsert,
): Promise<InvestmentAIForecast> {
  const parsed =
    validateForecastInput(
      input,
    );


  const {
    supabase,
    userId,
  } =
    await getInvestmentIntelligenceDataContext();


  const {
    data,
    error,
  } =
    await supabase
      .from(
        "investment_ai_forecasts",
      )
      .insert({
        user_id:
          userId,

        analysis_id:
          parsed.analysis_id,

        asset_id:
          parsed.asset_id,

        horizon_days:
          parsed.horizon_days,

        target_date:
          parsed.target_date,

        reference_price:
          parsed.reference_price,

        currency:
          parsed.currency,

        up_probability:
          parsed.up_probability,

        flat_probability:
          parsed.flat_probability,

        down_probability:
          parsed.down_probability,

        direction:
          parsed.direction,

        flat_threshold_percent:
          parsed.flat_threshold_percent,

        bull_low:
          parsed.bull_low,

        bull_high:
          parsed.bull_high,

        base_low:
          parsed.base_low,

        base_high:
          parsed.base_high,

        bear_low:
          parsed.bear_low,

        bear_high:
          parsed.bear_high,

        invalidation_price:
          parsed.invalidation_price,

        confidence:
          parsed.confidence,

        thesis:
          parsed.thesis,
      })
      .select(
        "*",
      )
      .single();


  if (
    error ||
    !data
  ) {
    throwDataError(
      "FORECAST_CREATE_FAILED",
      error,
    );
  }


  return asRow<InvestmentAIForecast>(
    data,
  );
}


/* =========================================================
 * 39. GET FORECAST
 * ======================================================= */

export async function getInvestmentAIForecast(
  forecastId:
    UUID,
): Promise<InvestmentAIForecast | null> {
  const id =
    validateId(
      forecastId,
    );


  const {
    supabase,
    userId,
  } =
    await getInvestmentIntelligenceDataContext();


  const {
    data,
    error,
  } =
    await supabase
      .from(
        "investment_ai_forecasts",
      )
      .select(
        "*",
      )
      .eq(
        "user_id",
        userId,
      )
      .eq(
        "id",
        id,
      )
      .maybeSingle();


  if (
    error
  ) {
    throwDataError(
      "FORECAST_READ_FAILED",
      error,
    );
  }


  return data
    ? asRow<InvestmentAIForecast>(
        data,
      )
    : null;
}


/* =========================================================
 * 40. LIST FORECASTS
 * ======================================================= */

export interface ListInvestmentAIForecastsOptions {
  asset_id?:
    UUID;

  analysis_id?:
    UUID;

  limit?:
    number;
}


export async function listInvestmentAIForecasts(
  options:
    ListInvestmentAIForecastsOptions =
    {},
): Promise<InvestmentAIForecast[]> {
  const {
    supabase,
    userId,
  } =
    await getInvestmentIntelligenceDataContext();


  let query =
    supabase
      .from(
        "investment_ai_forecasts",
      )
      .select(
        "*",
      )
      .eq(
        "user_id",
        userId,
      );


  if (
    options.asset_id
  ) {
    query =
      query.eq(
        "asset_id",
        validateId(
          options.asset_id,
        ),
      );
  }


  if (
    options.analysis_id
  ) {
    query =
      query.eq(
        "analysis_id",
        validateId(
          options.analysis_id,
        ),
      );
  }


  const {
    data,
    error,
  } =
    await query
      .order(
        "created_at",
        {
          ascending:
            false,
        },
      )
      .limit(
        normalizeReadLimit(
          options.limit,
        ),
      );


  if (
    error
  ) {
    throwDataError(
      "FORECAST_READ_FAILED",
      error,
    );
  }


  return asRows<InvestmentAIForecast>(
    data,
  );
}


/* =========================================================
 * 41. LIST OPEN FORECASTS
 * ======================================================= */

export async function listOpenInvestmentAIForecasts(
  limit:
    number =
    50,
): Promise<InvestmentAIForecast[]> {
  const {
    supabase,
    userId,
  } =
    await getInvestmentIntelligenceDataContext();


  const today =
    new Date()
      .toISOString()
      .slice(
        0,
        10,
      );


  const {
    data,
    error,
  } =
    await supabase
      .from(
        "investment_ai_forecasts",
      )
      .select(
        "*",
      )
      .eq(
        "user_id",
        userId,
      )
      .gte(
        "target_date",
        today,
      )
      .order(
        "target_date",
        {
          ascending:
            true,
        },
      )
      .limit(
        normalizeReadLimit(
          limit,
          50,
        ),
      );


  if (
    error
  ) {
    throwDataError(
      "FORECAST_READ_FAILED",
      error,
    );
  }


  return asRows<InvestmentAIForecast>(
    data,
  );
}


/* =========================================================
 * 42. OUTCOME INPUT VALIDATION
 * ======================================================= */

function validateForecastOutcomeInput(
  input:
    InvestmentAIForecastOutcomeInsert,
): InvestmentAIForecastOutcomeInsert {
  const forecastId =
    validateId(
      input.forecast_id,
    );


  assertISODate(
    input.evaluation_date,
    "INVALID_OUTCOME",
  );


  if (
    !Number.isFinite(
      input.actual_price,
    ) ||
    input.actual_price <=
      0
  ) {
    throw new InvestmentIntelligenceDataError(
      "INVALID_OUTCOME",
    );
  }


  const currency =
    normalizeCurrency(
      input.currency,
      "INVALID_OUTCOME",
    );


  const sourceName =
    normalizeRequiredText(
      input.actual_source_name,
      160,
      "INVALID_OUTCOME",
    );


  const sourceUrl =
    normalizeHttpsUrl(
      input.actual_source_url,
      "INVALID_OUTCOME",
    );


  assertISODateTime(
    input.actual_observed_at,
    "INVALID_OUTCOME",
  );


  return {
    ...input,

    forecast_id:
      forecastId,

    currency,

    actual_source_name:
      sourceName,

    actual_source_url:
      sourceUrl,
  };
}


/* =========================================================
 * 43. RECORD FORECAST OUTCOME
 * ======================================================= */

/**
 * IMPORTANT:
 *
 * The caller supplies only observed market facts:
 *
 * evaluation_date
 * actual_price
 * actual source
 *
 *
 * PostgreSQL calculates:
 *
 * actual_change_percent
 * actual_direction
 * direction_correct
 * base_range_hit
 * absolute_error_percent
 * brier_score
 *
 *
 * AI never grades itself.
 */
export async function recordInvestmentAIForecastOutcome(
  input:
    InvestmentAIForecastOutcomeInsert,
): Promise<InvestmentAIForecastOutcome> {
  const parsed =
    validateForecastOutcomeInput(
      input,
    );


  const {
    supabase,
    userId,
  } =
    await getInvestmentIntelligenceDataContext();


  const {
    data,
    error,
  } =
    await supabase
      .from(
        "investment_ai_forecast_outcomes",
      )
      .insert({
        user_id:
          userId,

        forecast_id:
          parsed.forecast_id,

        evaluation_date:
          parsed.evaluation_date,

        actual_price:
          parsed.actual_price,

        currency:
          parsed.currency,

        actual_source_name:
          parsed.actual_source_name,

        actual_source_url:
          parsed.actual_source_url ??
          null,

        actual_observed_at:
          parsed.actual_observed_at,
      })
      .select(
        "*",
      )
      .single();


  if (
    error ||
    !data
  ) {
    throwDataError(
      "OUTCOME_CREATE_FAILED",
      error,
    );
  }


  return asRow<InvestmentAIForecastOutcome>(
    data,
  );
}


/* =========================================================
 * 44. LIST OUTCOMES
 * ======================================================= */

export async function listInvestmentAIForecastOutcomes(
  limit:
    number =
    50,
): Promise<InvestmentAIForecastOutcome[]> {
  const {
    supabase,
    userId,
  } =
    await getInvestmentIntelligenceDataContext();


  const {
    data,
    error,
  } =
    await supabase
      .from(
        "investment_ai_forecast_outcomes",
      )
      .select(
        "*",
      )
      .eq(
        "user_id",
        userId,
      )
      .order(
        "evaluation_date",
        {
          ascending:
            false,
        },
      )
      .limit(
        normalizeReadLimit(
          limit,
          50,
        ),
      );


  if (
    error
  ) {
    throwDataError(
      "OUTCOME_READ_FAILED",
      error,
    );
  }


  return asRows<InvestmentAIForecastOutcome>(
    data,
  );
}


/* =========================================================
 * 45. GET OUTCOME FOR FORECAST
 * ======================================================= */

export async function getInvestmentAIForecastOutcome(
  forecastId:
    UUID,
): Promise<InvestmentAIForecastOutcome | null> {
  const id =
    validateId(
      forecastId,
    );


  const {
    supabase,
    userId,
  } =
    await getInvestmentIntelligenceDataContext();


  const {
    data,
    error,
  } =
    await supabase
      .from(
        "investment_ai_forecast_outcomes",
      )
      .select(
        "*",
      )
      .eq(
        "user_id",
        userId,
      )
      .eq(
        "forecast_id",
        id,
      )
      .maybeSingle();


  if (
    error
  ) {
    throwDataError(
      "OUTCOME_READ_FAILED",
      error,
    );
  }


  return data
    ? asRow<InvestmentAIForecastOutcome>(
        data,
      )
    : null;
}


/* =========================================================
 * 46. TRACK RECORD
 * ======================================================= */

export async function getInvestmentAITrackRecord():
Promise<InvestmentAITrackRecord | null> {
  const {
    supabase,
    userId,
  } =
    await getInvestmentIntelligenceDataContext();


  const {
    data,
    error,
  } =
    await supabase
      .from(
        "investment_ai_track_record",
      )
      .select(
        "*",
      )
      .eq(
        "user_id",
        userId,
      )
      .maybeSingle();


  if (
    error
  ) {
    throwDataError(
      "TRACK_RECORD_READ_FAILED",
      error,
    );
  }


  return data
    ? asRow<InvestmentAITrackRecord>(
        data,
      )
    : null;
}


/* =========================================================
 * 47. LATEST ANALYSIS PER ASSET
 * ======================================================= */

async function getLatestAnalysesForAssets(
  assets:
    InvestmentAsset[],
): Promise<InvestmentAIAnalysis[]> {
  if (
    assets.length ===
    0
  ) {
    return [];
  }


  const analyses =
    await listInvestmentAIAnalyses({
      limit:
        100,
    });


  const seen =
    new Set<
      UUID
    >();


  const latest:
    InvestmentAIAnalysis[] = [];


  for (
    const analysis of
      analyses
  ) {
    if (
      analysis.asset_id ===
      null
    ) {
      continue;
    }


    if (
      seen.has(
        analysis.asset_id,
      )
    ) {
      continue;
    }


    seen.add(
      analysis.asset_id,
    );


    latest.push(
      analysis,
    );
  }


  return latest;
}


/* =========================================================
 * 48. FULL SNAPSHOT
 * ======================================================= */

export async function getInvestmentIntelligenceSnapshot():
Promise<InvestmentIntelligenceSnapshot> {
  const [
    assets,
    openForecasts,
    recentOutcomes,
    trackRecord,
  ] =
    await Promise.all([
      listInvestmentIntelligenceAssets(),

      listOpenInvestmentAIForecasts(
        50,
      ),

      listInvestmentAIForecastOutcomes(
        25,
      ),

      getInvestmentAITrackRecord(),
    ]);


  const latestAnalyses =
    await getLatestAnalysesForAssets(
      assets,
    );


  return {
    assets,

    latest_analyses:
      latestAnalyses,

    open_forecasts:
      openForecasts,

    recent_outcomes:
      recentOutcomes,

    track_record:
      trackRecord,
  };
}


/* =========================================================
 * 49. ASSET SUMMARY
 * ======================================================= */

export async function getInvestmentAIAssetSummary(
  assetId:
    UUID,
): Promise<InvestmentAIAssetSummary> {
  const asset =
    await requireInvestmentIntelligenceAsset(
      assetId,
    );


  const [
    latestAnalysis,
    forecasts,
    outcomes,
  ] =
    await Promise.all([
      getLatestInvestmentAIAnalysis(
        asset.id,
      ),

      listInvestmentAIForecasts({
        asset_id:
          asset.id,

        limit:
          50,
      }),

      listInvestmentAIForecastOutcomes(
        100,
      ),
    ]);


  const forecastIds =
    new Set(
      forecasts.map(
        (
          forecast,
        ) =>
          forecast.id,
      ),
    );


  const evaluatedForecastCount =
    outcomes.filter(
      (
        outcome,
      ) =>
        forecastIds.has(
          outcome.forecast_id,
        ),
    ).length;


  const nowDate =
    new Date()
      .toISOString()
      .slice(
        0,
        10,
      );


  const activeForecasts =
    forecasts
      .filter(
        (
          forecast,
        ) =>
          forecast.target_date >=
          nowDate,
      )
      .sort(
        (
          a,
          b,
        ) =>
          a.target_date.localeCompare(
            b.target_date,
          ),
      );


  return {
    asset,

    latest_analysis:
      latestAnalysis,

    active_forecasts:
      activeForecasts,

    evaluated_forecast_count:
      evaluatedForecastCount,
  };
}


/* =========================================================
 * 50. ANALYSIS PACKAGE
 * ======================================================= */

export interface InvestmentAIAnalysisPackageInput {
  analysis:
    InvestmentAIAnalysisInsert;

  evidence:
    Omit<
      InvestmentAIEvidenceInsert,
      "analysis_id"
    >[];

  forecasts:
    Omit<
      InvestmentAIForecastInsert,
      "analysis_id" |
      "asset_id"
    >[];
}


export interface InvestmentAIAnalysisPackage {
  analysis:
    InvestmentAIAnalysis;

  evidence:
    InvestmentAIEvidence[];

  forecasts:
    InvestmentAIForecast[];
}


/* =========================================================
 * 51. CREATE ANALYSIS PACKAGE
 * ======================================================= */

/**
 * All application-level validation happens before the first
 * database write.
 *
 *
 * Persistence order:
 *
 * analysis
 *      ↓
 * evidence
 *      ↓
 * forecasts
 *
 *
 * The history tables are append-only.
 *
 * Therefore, if a later database write fails unexpectedly,
 * the already-written analysis remains as an auditable
 * partial record instead of being silently deleted.
 *
 *
 * A future database RPC can make this package transactional
 * if atomic multi-table persistence becomes necessary.
 */
export async function createInvestmentAIAnalysisPackage(
  input:
    InvestmentAIAnalysisPackageInput,
): Promise<InvestmentAIAnalysisPackage> {
  const validatedAnalysis =
    validateAnalysisInput(
      input.analysis,
    );


  /*
   * Validate all evidence BEFORE any durable write.
   */
  const validatedEvidence =
    input.evidence.map(
      (
        evidence,
      ) =>
        validateEvidenceInput({
          ...evidence,

          analysis_id:
            "00000000-0000-4000-8000-000000000000",
        }),
    );


  /*
   * Validate all forecasts BEFORE any durable write.
   *
   * Temporary valid UUIDs are used only for local validation.
   * They are never written to the database.
   */
  const validatedForecasts =
    input.forecasts.map(
      (
        forecast,
      ) =>
        validateForecastInput({
          ...forecast,

          analysis_id:
            "00000000-0000-4000-8000-000000000000",

          asset_id:
            validatedAnalysis.asset_id,
        }),
    );


  const analysis =
    await createInvestmentAIAnalysis(
      validatedAnalysis,
    );


  const evidence =
    validatedEvidence.length >
      0
      ? await createInvestmentAIEvidenceBatch(
          validatedEvidence.map(
            (
              item,
            ) => ({
              ...item,

              analysis_id:
                analysis.id,
            }),
          ),
        )
      : [];


  const forecasts:
    InvestmentAIForecast[] = [];


  for (
    const forecast of
      validatedForecasts
  ) {
    const created =
      await createInvestmentAIForecast({
        ...forecast,

        analysis_id:
          analysis.id,

        asset_id:
          validatedAnalysis.asset_id,
      });


    forecasts.push(
      created,
    );
  }


  return {
    analysis,

    evidence,

    forecasts,
  };
}


/* =========================================================
 * 52. APPEND-ONLY GUARANTEE
 * ======================================================= */

/**
 * There are deliberately NO functions here named:
 *
 * updateInvestmentAIAnalysis
 * deleteInvestmentAIAnalysis
 * updateInvestmentAIForecast
 * deleteInvestmentAIForecast
 * updateInvestmentAIForecastOutcome
 * deleteInvestmentAIForecastOutcome
 *
 *
 * Historical intelligence must remain auditable.
 */


/* =========================================================
 * 53. OWNERSHIP GUARANTEE
 * ======================================================= */

/**
 * Public insert input types deliberately DO NOT contain:
 *
 * user_id
 *
 *
 * Every durable write injects:
 *
 * user_id = verified authenticated identity
 *
 *
 * PostgreSQL RLS then independently enforces:
 *
 * auth.uid() = user_id
 */


/* =========================================================
 * 54. AI AUTHORITY GUARANTEE
 * ======================================================= */

/**
 * LIFE Invest AI may create:
 *
 * analysis
 * evidence
 * forecast
 *
 *
 * only through controlled server-side code.
 *
 *
 * These records are ADVISORY.
 *
 *
 * None of these tables grant:
 *
 * brokerage access
 * bank access
 * trade execution
 * order placement
 * transfer authority
 */


/* =========================================================
 * 55. OUTCOME GUARANTEE
 * ======================================================= */

/**
 * When a forecast expires:
 *
 * public market evidence
 *      ↓
 * actual observed price
 *      ↓
 * outcome insert
 *      ↓
 * PostgreSQL trigger
 *      ↓
 * deterministic grading
 *
 *
 * LIFE AI does NOT submit:
 *
 * direction_correct
 * base_range_hit
 * absolute_error_percent
 * brier_score
 *
 *
 * The database calculates them.
 */


/* =========================================================
 * 56. SOURCE GUARANTEE
 * ======================================================= */

/**
 * Investment evidence stores:
 *
 * source type
 * source name
 * source title
 * source URL
 * publication time
 * observation time
 * factual statement
 *
 *
 * This lets LIFE OS later answer:
 *
 * "ليش عطاني هالتقييم؟"
 *
 * with traceable evidence instead of unsupported AI prose.
 */


/* =========================================================
 * 57. FUTURE ASSET CLASSES
 * ======================================================= */

/**
 * The database architecture already understands:
 *
 * market_asset
 * real_estate
 * business
 *
 *
 * This TypeScript layer intentionally activates:
 *
 * market_asset only
 *
 *
 * Real Estate AI and Business AI get dedicated evidence and
 * valuation engines later instead of pretending stock logic
 * works for every investment type.
 */


/* =========================================================
 * 58. FINAL DATA FLOW
 * ======================================================= */

/**
 * Existing LIFE OS portfolio
 *      ↓
 * investment_assets
 *      ↓
 * LIFE Invest AI evidence package
 *      ↓
 * deterministic intelligence score
 *      ↓
 * AI interpretation
 *      ↓
 * investment_ai_analyses
 *      ↓
 * investment_ai_evidence
 *      ↓
 * immutable investment_ai_forecasts
 *      ↓
 * future observed market result
 *      ↓
 * investment_ai_forecast_outcomes
 *      ↓
 * investment_ai_track_record
 *
 *
 * No hidden rewriting.
 * No fake accuracy.
 * No autonomous trading.
 */