import {
  NextResponse,
} from "next/server";

import {
  InvestmentCommitteeError,
  runInvestmentCommittee,
} from "@/ai/investment-intelligence";

import {
  AuthenticationError,
  assertAuthenticatedIdentity,
} from "@/lib/auth";

import {
  getInvestmentSnapshot,
} from "@/lib/data";

import {
  calculateInvestmentTechnicalSnapshot,
  type InvestmentTechnicalSnapshot,
} from "@/lib/investment-intelligence";

import {
  createInvestmentAIAnalysisPackage,
  InvestmentIntelligenceDataError,
  requireInvestmentIntelligenceAsset,
} from "@/lib/investment-intelligence-data";

import {
  fetchInvestmentResearchData,
  InvestmentMarketDataError,
  type InvestmentMarketDataBundle,
  type InvestmentMarketEvidence,
} from "@/lib/investment-market-data";

import type {
  InvestmentAsset,
  JsonValue,
  UUID,
} from "@/lib/types";


/* =========================================================
 * LIFE OS
 * LIFE INVEST AI
 * ANALYZE API
 *
 * Flow:
 *
 * authenticated owner
 *      ↓
 * existing LIFE OS investment asset
 *      ↓
 * current portfolio context
 *      ↓
 * external verified market data
 *      ↓
 * deterministic Technical Engine
 *      ↓
 * Investment Committee AI
 *      ↓
 * deterministic final scoring
 *      ↓
 * strict forecast validation
 *      ↓
 * append-only persistence
 *      ↓
 * immutable future Track Record
 *
 *
 * This route does NOT:
 *
 * - buy
 * - sell
 * - place broker orders
 * - move money
 * - modify investment holdings
 * - overwrite old forecasts
 *
 * ======================================================= */


/* =========================================================
 * 1. ROUTE CONFIGURATION
 * ======================================================= */

export const runtime =
  "nodejs";


export const dynamic =
  "force-dynamic";


export const maxDuration =
  60;


/* =========================================================
 * 2. LIMITS
 * ======================================================= */

const MAX_REQUEST_BODY_BYTES =
  4096;


const MAX_FORECAST_HORIZONS =
  4;


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
 * 4. REQUEST
 * ======================================================= */

interface AnalyzeInvestmentRequest {
  asset_id:
    UUID;

  forecast_horizons?:
    number[];
}


/* =========================================================
 * 5. RECORD GUARD
 * ======================================================= */

function isRecord(
  value:
    unknown,
): value is Record<string, unknown> {
  return (
    typeof value ===
      "object" &&
    value !==
      null &&
    !Array.isArray(
      value,
    )
  );
}


/* =========================================================
 * 6. ERROR RESPONSE
 * ======================================================= */

function errorResponse(
  status:
    number,

  error:
    string,

  code:
    string |
    null =
    null,
) {
  return NextResponse.json(
    {
      ok:
        false,

      error,

      code,
    },
    {
      status,

      headers:
        PRIVATE_RESPONSE_HEADERS,
    },
  );
}


/* =========================================================
 * 7. REQUEST BODY LENGTH
 * ======================================================= */

function assertContentLength(
  request:
    Request,
): void {
  const contentLength =
    request.headers.get(
      "content-length",
    );


  if (
    !contentLength
  ) {
    return;
  }


  const bytes =
    Number(
      contentLength,
    );


  if (
    Number.isFinite(
      bytes,
    ) &&
    bytes >
      MAX_REQUEST_BODY_BYTES
  ) {
    throw new InvestmentCommitteeError(
      "INVALID_INPUT",
      "حجم الطلب أكبر من المسموح.",
    );
  }
}


/* =========================================================
 * 8. PARSE REQUEST BODY
 * ======================================================= */

async function parseAnalyzeRequest(
  request:
    Request,
): Promise<AnalyzeInvestmentRequest> {
  assertContentLength(
    request,
  );


  const contentType =
    request.headers
      .get(
        "content-type",
      )
      ?.toLowerCase() ??
    "";


  if (
    !contentType.includes(
      "application/json",
    )
  ) {
    throw new InvestmentCommitteeError(
      "INVALID_INPUT",
      "الطلب يجب أن يكون JSON.",
    );
  }


  let text:
    string;


  try {
    text =
      await request.text();
  } catch {
    throw new InvestmentCommitteeError(
      "INVALID_INPUT",
    );
  }


  if (
    text.length ===
      0 ||
    Buffer.byteLength(
      text,
      "utf8",
    ) >
      MAX_REQUEST_BODY_BYTES
  ) {
    throw new InvestmentCommitteeError(
      "INVALID_INPUT",
    );
  }


  let parsed:
    unknown;


  try {
    parsed =
      JSON.parse(
        text,
      );
  } catch {
    throw new InvestmentCommitteeError(
      "INVALID_INPUT",
      "JSON غير صالح.",
    );
  }


  if (
    !isRecord(
      parsed,
    )
  ) {
    throw new InvestmentCommitteeError(
      "INVALID_INPUT",
    );
  }


  /*
   * Keep this API deliberately narrow.
   *
   * Browser may select only:
   *
   * asset_id
   * forecast_horizons
   *
   *
   * Browser may NOT supply:
   *
   * price
   * scores
   * company facts
   * recommendation
   * confidence
   * market evidence
   */
  const allowedKeys =
    new Set([
      "asset_id",
      "forecast_horizons",
    ]);


  for (
    const key of
      Object.keys(
        parsed,
      )
  ) {
    if (
      !allowedKeys.has(
        key,
      )
    ) {
      throw new InvestmentCommitteeError(
        "INVALID_INPUT",
        `حقل غير مسموح: ${key}`,
      );
    }
  }


  if (
    typeof parsed.asset_id !==
      "string" ||
    parsed.asset_id
      .trim()
      .length ===
      0
  ) {
    throw new InvestmentCommitteeError(
      "INVALID_INPUT",
      "asset_id مطلوب.",
    );
  }


  let forecastHorizons:
    number[] |
    undefined;


  if (
    parsed.forecast_horizons !==
    undefined
  ) {
    if (
      !Array.isArray(
        parsed.forecast_horizons,
      ) ||
      parsed.forecast_horizons.length ===
        0 ||
      parsed.forecast_horizons.length >
        MAX_FORECAST_HORIZONS
    ) {
      throw new InvestmentCommitteeError(
        "INVALID_INPUT",
        "فترات التوقع غير صالحة.",
      );
    }


    forecastHorizons =
      parsed.forecast_horizons.map(
        (
          value,
        ) => {
          if (
            typeof value !==
              "number" ||
            !Number.isInteger(
              value,
            ) ||
            value <
              1 ||
            value >
              3650
          ) {
            throw new InvestmentCommitteeError(
              "INVALID_INPUT",
              "كل فترة توقع يجب أن تكون عدد أيام صحيح.",
            );
          }


          return value;
        },
      );


    if (
      new Set(
        forecastHorizons,
      ).size !==
      forecastHorizons.length
    ) {
      throw new InvestmentCommitteeError(
        "INVALID_INPUT",
        "لا يجوز تكرار فترة التوقع.",
      );
    }
  }


  return {
    asset_id:
      parsed.asset_id
        .trim(),

    forecast_horizons:
      forecastHorizons,
  };
}


/* =========================================================
 * 9. CURRENT PORTFOLIO ALLOCATION
 * ======================================================= */

async function getCurrentAssetAllocation(
  assetId:
    UUID,
): Promise<{
  allocation_percent:
    number |
    null;

  portfolio_currency:
    string;
}> {
  const snapshot =
    await getInvestmentSnapshot();


  const position =
    snapshot.positions.find(
      (
        item,
      ) =>
        item.asset.id ===
        assetId,
    );


  return {
    allocation_percent:
      position
        ?.allocation_percent ??
      null,

    portfolio_currency:
      snapshot.currency,
  };
}


/* =========================================================
 * 10. TECHNICAL EVIDENCE
 * ======================================================= */

function buildTechnicalEvidence(
  asset:
    InvestmentAsset,

  snapshot:
    InvestmentTechnicalSnapshot,

  observedAt:
    string,
): InvestmentMarketEvidence {
  const value:
    JsonValue = {

      ticker:
        asset.ticker,

      data_points:
        snapshot.data_points,

      latest_date:
        snapshot.latest_date,

      latest_close:
        snapshot.latest_close,

      sma_20:
        snapshot.sma_20,

      sma_50:
        snapshot.sma_50,

      ema_20:
        snapshot.ema_20,

      rsi_14:
        snapshot.rsi_14,

      momentum_20_percent:
        snapshot.momentum_20_percent,

      annualized_volatility_percent:
        snapshot
          .annualized_volatility_percent,

      max_drawdown_percent:
        snapshot.max_drawdown_percent,

      technical_score:
        snapshot.technical_score,

      signal:
        snapshot.signal,
    };


  const scoreText =
    snapshot.technical_score ===
    null
      ? "غير متوفر"
      : String(
          snapshot.technical_score,
        );


  return {
    source_type:
      "technical",

    source_name:
      "LIFE OS Technical Engine",

    title:
      `${asset.ticker} deterministic technical snapshot`,

    source_url:
      null,

    published_at:
      null,

    observed_at:
      observedAt,

    fact:
      `تحليل فني حسابي مبني على ${snapshot.data_points} نقطة سعرية. Technical Score: ${scoreText}. الإشارة: ${snapshot.signal}.`,

    value_json:
      value,
  };
}


/* =========================================================
 * 11. PORTFOLIO EVIDENCE
 * ======================================================= */

function buildPortfolioEvidence(
  asset:
    InvestmentAsset,

  allocationPercent:
    number |
    null,

  portfolioCurrency:
    string,

  observedAt:
    string,
): InvestmentMarketEvidence {
  const allocationText =
    allocationPercent ===
    null
      ? "غير قابل للحساب ضمن عملة المحفظة الحالية"
      : `${allocationPercent.toFixed(2)}%`;


  return {
    source_type:
      "portfolio",

    source_name:
      "LIFE OS Portfolio Engine",

    title:
      `${asset.ticker} personal portfolio context`,

    source_url:
      null,

    published_at:
      null,

    observed_at:
      observedAt,

    fact:
      `الكمية الحالية ${asset.quantity}. الوزن الحالي في المحفظة ${allocationText}. الهدف الكمي ${asset.target_quantity ?? "غير محدد"}.`,

    value_json: {
      quantity:
        asset.quantity,

      average_cost:
        asset.average_cost,

      allocation_percent:
        allocationPercent,

      portfolio_currency:
        portfolioCurrency,

      asset_currency:
        asset.currency,

      target_quantity:
        asset.target_quantity,

      monthly_contribution_target:
        asset.monthly_contribution_target,
    },
  };
}


/* =========================================================
 * 12. COMPLETE EVIDENCE PACKAGE
 * ======================================================= */

function buildCompleteEvidence(
  asset:
    InvestmentAsset,

  marketData:
    InvestmentMarketDataBundle,

  technicalSnapshot:
    InvestmentTechnicalSnapshot,

  allocationPercent:
    number |
    null,

  portfolioCurrency:
    string,
): InvestmentMarketEvidence[] {
  return [
    ...marketData.evidence,

    buildTechnicalEvidence(
      asset,
      technicalSnapshot,
      marketData.fetched_at,
    ),

    buildPortfolioEvidence(
      asset,
      allocationPercent,
      portfolioCurrency,
      marketData.fetched_at,
    ),
  ];
}


/* =========================================================
 * 13. AUTH ERROR STATUS
 * ======================================================= */

function handleAuthenticationError(
  error:
    AuthenticationError,
) {
  return errorResponse(
    401,
    "يجب تسجيل الدخول لاستخدام LIFE Invest AI.",
    error.code,
  );
}


/* =========================================================
 * 14. MARKET DATA ERROR STATUS
 * ======================================================= */

function handleMarketDataError(
  error:
    InvestmentMarketDataError,
) {
  switch (
    error.code
  ) {
    case "RATE_LIMITED":
      return errorResponse(
        429,
        error.message,
        error.code,
      );


    case "DATA_NOT_FOUND":
    case "PRICE_HISTORY_UNAVAILABLE":
    case "INSTRUMENT_MISMATCH":
    case "CURRENCY_MISMATCH":
    case "INVALID_ASSET":
    case "INVALID_PROVIDER_SYMBOL":
      return errorResponse(
        422,
        error.message,
        error.code,
      );


    case "CONFIGURATION_MISSING":
    case "UNAUTHORIZED":
    case "FORBIDDEN":
      return errorResponse(
        503,
        error.message,
        error.code,
      );


    case "REQUEST_FAILED":
    case "INVALID_RESPONSE":
    default:
      return errorResponse(
        502,
        error.message,
        error.code,
      );
  }
}


/* =========================================================
 * 15. COMMITTEE ERROR STATUS
 * ======================================================= */

function handleCommitteeError(
  error:
    InvestmentCommitteeError,
) {
  switch (
    error.code
  ) {
    case "INVALID_INPUT":
      return errorResponse(
        400,
        error.message,
        error.code,
      );


    case "INSUFFICIENT_EVIDENCE":
      return errorResponse(
        422,
        error.message,
        error.code,
      );


    case "OPENAI_UNAVAILABLE":
      return errorResponse(
        503,
        error.message,
        error.code,
      );


    case "EMPTY_RESPONSE":
    case "INVALID_RESPONSE":
    case "INVALID_FORECAST":
    default:
      return errorResponse(
        502,
        error.message,
        error.code,
      );
  }
}


/* =========================================================
 * 16. DATA ERROR STATUS
 * ======================================================= */

function handleDataError(
  error:
    InvestmentIntelligenceDataError,
) {
  switch (
    error.code
  ) {
    case "ASSET_NOT_FOUND":
      return errorResponse(
        404,
        error.message,
        error.code,
      );


    case "INVALID_ID":
    case "INVALID_ANALYSIS":
    case "INVALID_EVIDENCE":
    case "INVALID_FORECAST":
    case "INVALID_OUTCOME":
      return errorResponse(
        400,
        error.message,
        error.code,
      );


    default:
      return errorResponse(
        500,
        "تعذر حفظ أو قراءة بيانات LIFE Invest AI.",
        error.code,
      );
  }
}


/* =========================================================
 * 17. POST
 * ======================================================= */

export async function POST(
  request:
    Request,
) {
  try {

    /* -----------------------------------------------------
     * AUTH FIRST
     *
     * Never call external market or AI providers before
     * verifying the LIFE OS owner.
     * -------------------------------------------------- */

    await assertAuthenticatedIdentity();


    /* -----------------------------------------------------
     * USER-CONTROLLED INPUT
     * -------------------------------------------------- */

    const input =
      await parseAnalyzeRequest(
        request,
      );


    /* -----------------------------------------------------
     * EXISTING PRIVATE ASSET
     *
     * Asset identity comes from LIFE OS database.
     *
     * Browser does not supply:
     *
     * ticker
     * market
     * currency
     * quantity
     * average cost
     * -------------------------------------------------- */

    const asset =
      await requireInvestmentIntelligenceAsset(
        input.asset_id,
      );


    if (
      !asset.is_active
    ) {
      return errorResponse(
        422,
        "الأصل الاستثماري غير نشط.",
        "INACTIVE_ASSET",
      );
    }


    /* -----------------------------------------------------
     * PERSONAL PORTFOLIO CONTEXT
     * -------------------------------------------------- */

    const portfolio =
      await getCurrentAssetAllocation(
        asset.id,
      );


    /* -----------------------------------------------------
     * VERIFIED EXTERNAL MARKET DATA
     * -------------------------------------------------- */

    const marketData =
      await fetchInvestmentResearchData(
        asset,
      );


    /* -----------------------------------------------------
     * DETERMINISTIC TECHNICAL ENGINE
     * -------------------------------------------------- */

    const technicalSnapshot =
      calculateInvestmentTechnicalSnapshot(
        marketData.price_history,
      );


    /* -----------------------------------------------------
     * AUDITABLE EVIDENCE
     *
     * External evidence
     * +
     * deterministic technical evidence
     * +
     * private portfolio evidence
     * -------------------------------------------------- */

    const evidence =
      buildCompleteEvidence(
        asset,
        marketData,
        technicalSnapshot,
        portfolio.allocation_percent,
        portfolio.portfolio_currency,
      );


    /* -----------------------------------------------------
     * INVESTMENT COMMITTEE
     *
     * AI interpretation
     *
     * followed internally by deterministic LIFE OS scoring.
     * -------------------------------------------------- */

    const committee =
      await runInvestmentCommittee({
        asset,


        as_of:
          marketData.fetched_at,


        reference_price:
          marketData.reference_price,


        currency:
          marketData.currency,


        technical_snapshot:
          technicalSnapshot,


        portfolio: {
          current_allocation_percent:
            portfolio.allocation_percent,

          /*
           * LIFE OS currently has no authoritative personal
           * maximum-allocation field.
           *
           * Do NOT invent one.
           */
          preferred_max_allocation_percent:
            null,
        },


        evidence,


        forecast_horizons:
          input.forecast_horizons,
      });


    /* -----------------------------------------------------
     * APPEND-ONLY PERSISTENCE
     *
     * The AI module itself cannot persist.
     *
     * Controlled server code performs persistence here.
     * -------------------------------------------------- */

    const saved =
      await createInvestmentAIAnalysisPackage(
        committee.package_input,
      );


    /* -----------------------------------------------------
     * RESPONSE
     *
     * Keep the browser response useful but compact.
     *
     * Full evidence remains in the private database and can
     * be loaded later from the intelligence page.
     * -------------------------------------------------- */

    return NextResponse.json(
      {
        ok:
          true,


        asset: {
          id:
            asset.id,

          ticker:
            asset.ticker,

          name:
            asset.name,

          market:
            asset.market,

          currency:
            asset.currency,
        },


        market: {
          provider:
            marketData.provider,

          reference_price:
            marketData.reference_price,

          reference_price_source:
            marketData
              .reference_price_source,

          fetched_at:
            marketData.fetched_at,

          price_history_points:
            marketData
              .price_history
              .length,
        },


        analysis: {
          id:
            saved.analysis.id,

          created_at:
            saved.analysis.created_at,

          data_status:
            saved.analysis.data_status,

          data_quality_score:
            saved.analysis
              .data_quality_score,

          overall_score:
            saved.analysis.overall_score,

          stance:
            saved.analysis.stance,

          recommendation:
            saved.analysis.recommendation,

          confidence:
            saved.analysis.confidence,

          summary:
            saved.analysis.summary,

          thesis:
            saved.analysis.thesis,

          fundamental_score:
            saved.analysis
              .fundamental_score,

          technical_score:
            saved.analysis
              .technical_score,

          sentiment_score:
            saved.analysis
              .sentiment_score,

          macro_score:
            saved.analysis
              .macro_score,

          portfolio_fit_score:
            saved.analysis
              .portfolio_fit_score,

          risk_score:
            saved.analysis.risk_score,

          key_catalysts:
            saved.analysis
              .key_catalysts,

          key_risks:
            saved.analysis.key_risks,
        },


        technical: {
          latest_date:
            technicalSnapshot.latest_date,

          latest_close:
            technicalSnapshot.latest_close,

          sma_20:
            technicalSnapshot.sma_20,

          sma_50:
            technicalSnapshot.sma_50,

          ema_20:
            technicalSnapshot.ema_20,

          rsi_14:
            technicalSnapshot.rsi_14,

          momentum_20_percent:
            technicalSnapshot
              .momentum_20_percent,

          annualized_volatility_percent:
            technicalSnapshot
              .annualized_volatility_percent,

          max_drawdown_percent:
            technicalSnapshot
              .max_drawdown_percent,

          technical_score:
            technicalSnapshot
              .technical_score,

          signal:
            technicalSnapshot.signal,
        },


        portfolio: {
          allocation_percent:
            portfolio.allocation_percent,

          portfolio_currency:
            portfolio.portfolio_currency,

          target_quantity:
            asset.target_quantity,
        },


        forecasts:
          saved.forecasts.map(
            (
              forecast,
            ) => ({
              id:
                forecast.id,

              horizon_days:
                forecast.horizon_days,

              target_date:
                forecast.target_date,

              reference_price:
                forecast.reference_price,

              up_probability:
                forecast.up_probability,

              flat_probability:
                forecast.flat_probability,

              down_probability:
                forecast.down_probability,

              direction:
                forecast.direction,

              bull_low:
                forecast.bull_low,

              bull_high:
                forecast.bull_high,

              base_low:
                forecast.base_low,

              base_high:
                forecast.base_high,

              bear_low:
                forecast.bear_low,

              bear_high:
                forecast.bear_high,

              expected_return_mid_percent:
                forecast
                  .expected_return_mid_percent,

              invalidation_price:
                forecast
                  .invalidation_price,

              confidence:
                forecast.confidence,
            }),
          ),


        evidence_count:
          saved.evidence.length,


        warnings:
          marketData.warnings,
      },
      {
        status:
          200,

        headers:
          PRIVATE_RESPONSE_HEADERS,
      },
    );


  } catch (
    error
  ) {

    /* -----------------------------------------------------
     * AUTH
     * -------------------------------------------------- */

    if (
      error instanceof
      AuthenticationError
    ) {
      return handleAuthenticationError(
        error,
      );
    }


    /* -----------------------------------------------------
     * MARKET PROVIDER
     * -------------------------------------------------- */

    if (
      error instanceof
      InvestmentMarketDataError
    ) {
      return handleMarketDataError(
        error,
      );
    }


    /* -----------------------------------------------------
     * INVESTMENT COMMITTEE
     * -------------------------------------------------- */

    if (
      error instanceof
      InvestmentCommitteeError
    ) {
      return handleCommitteeError(
        error,
      );
    }


    /* -----------------------------------------------------
     * DATABASE / RLS
     * -------------------------------------------------- */

    if (
      error instanceof
      InvestmentIntelligenceDataError
    ) {
      return handleDataError(
        error,
      );
    }


    /* -----------------------------------------------------
     * UNKNOWN
     *
     * Never return raw provider/database errors.
     * -------------------------------------------------- */

    return errorResponse(
      500,
      "حدث خطأ غير متوقع أثناء تحليل الاستثمار.",
      "INVESTMENT_ANALYSIS_FAILED",
    );
  }
}


/* =========================================================
 * 18. CLIENT AUTHORITY CONTRACT
 * ======================================================= */

/**
 * Browser may send:
 *
 * {
 *   asset_id,
 *   forecast_horizons?
 * }
 *
 *
 * Browser may NOT send:
 *
 * ticker
 * market
 * latest price
 * financial results
 * news
 * technical score
 * overall score
 * recommendation
 * forecast ranges
 * confidence
 *
 *
 * Those values originate from trusted server-side layers.
 */


/* =========================================================
 * 19. DATA ORIGIN CONTRACT
 * ======================================================= */

/**
 * Asset facts
 *      → LIFE OS / Supabase / RLS
 *
 * Market facts
 *      → market-data gateway
 *
 * Technical values
 *      → deterministic Technical Engine
 *
 * Fundamental interpretation
 *      → Investment Committee
 *
 * Overall score
 *      → deterministic Intelligence Engine
 *
 * Historical accuracy
 *      → immutable Track Record
 */


/* =========================================================
 * 20. PORTFOLIO CONCENTRATION RULE
 * ======================================================= */

/**
 * LIFE OS currently knows:
 *
 * actual allocation_percent
 *
 *
 * But it does NOT currently have:
 *
 * preferred_max_allocation_percent
 *
 *
 * Therefore this route passes:
 *
 * preferred_max_allocation_percent = null
 *
 *
 * We do not invent a concentration limit merely to make the
 * Portfolio Fit score look complete.
 */


/* =========================================================
 * 21. PERSISTENCE RULE
 * ======================================================= */

/**
 * Running an analysis creates an auditable intelligence
 * record.
 *
 *
 * It does NOT modify:
 *
 * investment_assets.quantity
 * investment_assets.average_cost
 * investment_transactions
 * bank balances
 * broker accounts
 */


/* =========================================================
 * 22. EXECUTION RULE
 * ======================================================= */

/**
 * LIFE Invest AI:
 *
 * analyzes
 * scores
 * forecasts
 * records its Track Record
 *
 *
 * It NEVER:
 *
 * executes a trade
 * buys a stock
 * sells a stock
 * transfers money
 */


/* =========================================================
 * 23. FINAL ROUTE CONTRACT
 * ======================================================= */

/**
 * Authenticated user clicks Analyze
 *      ↓
 * LIFE OS identifies exact owned asset
 *      ↓
 * real market evidence
 *      ↓
 * deterministic technical analysis
 *      ↓
 * bounded AI committee
 *      ↓
 * deterministic score
 *      ↓
 * validated probability forecast
 *      ↓
 * permanent auditable record
 *
 *
 * The recommendation is advisory.
 *
 * The historical forecast cannot later be rewritten.
 */