import {
  NextResponse,
} from "next/server";

import {
  AuthenticationError,
  assertAuthenticatedIdentity,
} from "@/lib/auth";

import {
  calculateTrackRecordCalibrationScore,
  getInvestmentTrackRecordGrade,
  getTrackRecordGradeLabel,
} from "@/lib/investment-intelligence";

import {
  getInvestmentIntelligenceSnapshot,
  InvestmentIntelligenceDataError,
  listInvestmentAIForecastOutcomes,
  listInvestmentAIForecasts,
  type InvestmentAIForecast,
  type InvestmentAIForecastOutcome,
} from "@/lib/investment-intelligence-data";

import type {
  InvestmentAsset,
  UUID,
} from "@/lib/types";


/* =========================================================
 * LIFE OS
 * LIFE INVEST AI
 * TRACK RECORD API
 *
 * Purpose:
 *
 * Show objective historical performance of LIFE Invest AI.
 *
 *
 * This route reads:
 *
 * - immutable forecasts
 * - immutable forecast outcomes
 * - database Track Record
 * - current open forecasts
 *
 *
 * It calculates display-only statistics such as:
 *
 * - calibration score
 * - Track Record grade
 * - performance by horizon
 * - forecasts waiting for evaluation
 *
 *
 * This route does NOT:
 *
 * - run AI
 * - create forecasts
 * - modify forecasts
 * - grade forecasts
 * - fetch live market prices
 * - buy or sell investments
 *
 *
 * AI does not grade itself.
 *
 * PostgreSQL remains the source of historical accuracy.
 * ======================================================= */


/* =========================================================
 * 1. ROUTE CONFIGURATION
 * ======================================================= */

export const runtime =
  "nodejs";


export const dynamic =
  "force-dynamic";


export const maxDuration =
  30;


/* =========================================================
 * 2. PRIVATE RESPONSE HEADERS
 * ======================================================= */

const PRIVATE_RESPONSE_HEADERS = {
  "Cache-Control":
    "no-store, max-age=0",

  "X-Content-Type-Options":
    "nosniff",
} as const;


/* =========================================================
 * 3. HISTORY LIMIT
 * ======================================================= */

/**
 * V1 API returns up to the latest 100 detailed forecasts and
 * outcomes.
 *
 * Overall Track Record statistics are NOT limited because
 * they come from the PostgreSQL aggregate view.
 */
const DETAILED_HISTORY_LIMIT =
  100;


/* =========================================================
 * 4. ERROR RESPONSE
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
 * 5. ROUND
 * ======================================================= */

function roundMetric(
  value:
    number,

  decimals:
    number =
    2,
): number {
  const factor =
    10 **
    decimals;


  return (
    Math.round(
      (
        value +
        Number.EPSILON
      ) *
        factor,
    ) /
    factor
  );
}


/* =========================================================
 * 6. ASSET MAP
 * ======================================================= */

function createAssetMap(
  assets:
    InvestmentAsset[],
): Map<
  UUID,
  InvestmentAsset
> {
  return new Map(
    assets.map(
      (
        asset,
      ) => [
        asset.id,
        asset,
      ],
    ),
  );
}


/* =========================================================
 * 7. FORECAST MAP
 * ======================================================= */

function createForecastMap(
  forecasts:
    InvestmentAIForecast[],
): Map<
  UUID,
  InvestmentAIForecast
> {
  return new Map(
    forecasts.map(
      (
        forecast,
      ) => [
        forecast.id,
        forecast,
      ],
    ),
  );
}


/* =========================================================
 * 8. OUTCOME FORECAST IDS
 * ======================================================= */

function createEvaluatedForecastIdSet(
  outcomes:
    InvestmentAIForecastOutcome[],
): Set<UUID> {
  return new Set(
    outcomes.map(
      (
        outcome,
      ) =>
        outcome.forecast_id,
    ),
  );
}


/* =========================================================
 * 9. ASSET SUMMARY
 * ======================================================= */

function getAssetDisplay(
  asset:
    InvestmentAsset |
    undefined,
) {
  if (
    !asset
  ) {
    return null;
  }


  return {
    id:
      asset.id,

    ticker:
      asset.ticker,

    name:
      asset.name,

    market:
      asset.market,

    asset_type:
      asset.asset_type,

    currency:
      asset.currency,
  };
}


/* =========================================================
 * 10. FORECAST RESPONSE
 * ======================================================= */

function serializeForecast(
  forecast:
    InvestmentAIForecast,

  assetMap:
    Map<
      UUID,
      InvestmentAsset
    >,
) {
  return {
    id:
      forecast.id,

    analysis_id:
      forecast.analysis_id,

    asset:
      getAssetDisplay(
        assetMap.get(
          forecast.asset_id,
        ),
      ),

    horizon_days:
      forecast.horizon_days,

    target_date:
      forecast.target_date,

    reference_price:
      forecast.reference_price,

    currency:
      forecast.currency,

    direction:
      forecast.direction,

    probabilities: {
      up:
        forecast.up_probability,

      flat:
        forecast.flat_probability,

      down:
        forecast.down_probability,
    },

    scenarios: {
      bull: {
        low:
          forecast.bull_low,

        high:
          forecast.bull_high,
      },

      base: {
        low:
          forecast.base_low,

        high:
          forecast.base_high,

        midpoint:
          forecast.base_midpoint,
      },

      bear: {
        low:
          forecast.bear_low,

        high:
          forecast.bear_high,
      },
    },

    expected_return_mid_percent:
      forecast.expected_return_mid_percent,

    flat_threshold_percent:
      forecast.flat_threshold_percent,

    invalidation_price:
      forecast.invalidation_price,

    confidence:
      forecast.confidence,

    thesis:
      forecast.thesis,

    created_at:
      forecast.created_at,
  };
}


/* =========================================================
 * 11. OUTCOME RESPONSE
 * ======================================================= */

function serializeOutcome(
  outcome:
    InvestmentAIForecastOutcome,

  forecastMap:
    Map<
      UUID,
      InvestmentAIForecast
    >,

  assetMap:
    Map<
      UUID,
      InvestmentAsset
    >,
) {
  const forecast =
    forecastMap.get(
      outcome.forecast_id,
    );


  const asset =
    forecast
      ? assetMap.get(
          forecast.asset_id,
        )
      : undefined;


  return {
    id:
      outcome.id,

    forecast_id:
      outcome.forecast_id,

    asset:
      getAssetDisplay(
        asset,
      ),

    forecast:
      forecast
        ? {
            horizon_days:
              forecast.horizon_days,

            target_date:
              forecast.target_date,

            reference_price:
              forecast.reference_price,

            predicted_direction:
              forecast.direction,

            up_probability:
              forecast.up_probability,

            flat_probability:
              forecast.flat_probability,

            down_probability:
              forecast.down_probability,

            base_low:
              forecast.base_low,

            base_high:
              forecast.base_high,

            base_midpoint:
              forecast.base_midpoint,

            expected_return_mid_percent:
              forecast.expected_return_mid_percent,

            confidence:
              forecast.confidence,
          }
        : null,

    result: {
      evaluation_date:
        outcome.evaluation_date,

      actual_price:
        outcome.actual_price,

      currency:
        outcome.currency,

      actual_change_percent:
        outcome.actual_change_percent,

      actual_direction:
        outcome.actual_direction,

      direction_correct:
        outcome.direction_correct,

      base_range_hit:
        outcome.base_range_hit,

      absolute_error_percent:
        outcome.absolute_error_percent,

      brier_score:
        outcome.brier_score,
    },

    source: {
      name:
        outcome.actual_source_name,

      url:
        outcome.actual_source_url,

      observed_at:
        outcome.actual_observed_at,
    },

    created_at:
      outcome.created_at,
  };
}


/* =========================================================
 * 12. HORIZON PERFORMANCE
 * ======================================================= */

interface HorizonPerformanceBucket {
  horizon_days:
    number;

  evaluated_forecasts:
    number;

  direction_correct:
    number;

  range_hits:
    number;

  total_absolute_error:
    number;

  total_brier_score:
    number;
}


/* =========================================================
 * 13. PERFORMANCE BY HORIZON
 * ======================================================= */

/**
 * This calculation uses only the detailed history loaded by
 * this endpoint.
 *
 * Overall historical accuracy still comes from the database
 * Track Record view and is not limited to 100.
 */
function calculatePerformanceByHorizon(
  outcomes:
    InvestmentAIForecastOutcome[],

  forecastMap:
    Map<
      UUID,
      InvestmentAIForecast
    >,
) {
  const buckets =
    new Map<
      number,
      HorizonPerformanceBucket
    >();


  for (
    const outcome of
      outcomes
  ) {
    const forecast =
      forecastMap.get(
        outcome.forecast_id,
      );


    if (
      !forecast
    ) {
      continue;
    }


    const existing =
      buckets.get(
        forecast.horizon_days,
      ) ?? {
        horizon_days:
          forecast.horizon_days,

        evaluated_forecasts:
          0,

        direction_correct:
          0,

        range_hits:
          0,

        total_absolute_error:
          0,

        total_brier_score:
          0,
      };


    existing.evaluated_forecasts +=
      1;


    if (
      outcome.direction_correct
    ) {
      existing.direction_correct +=
        1;
    }


    if (
      outcome.base_range_hit
    ) {
      existing.range_hits +=
        1;
    }


    existing.total_absolute_error +=
      outcome.absolute_error_percent;


    existing.total_brier_score +=
      outcome.brier_score;


    buckets.set(
      forecast.horizon_days,
      existing,
    );
  }


  return Array.from(
    buckets.values(),
  )
    .sort(
      (
        a,
        b,
      ) =>
        a.horizon_days -
        b.horizon_days,
    )
    .map(
      (
        bucket,
      ) => {

        const count =
          bucket.evaluated_forecasts;


        return {
          horizon_days:
            bucket.horizon_days,

          evaluated_forecasts:
            count,

          directional_accuracy_percent:
            roundMetric(
              (
                bucket.direction_correct /
                count
              ) *
                100,
            ),

          base_range_accuracy_percent:
            roundMetric(
              (
                bucket.range_hits /
                count
              ) *
                100,
            ),

          average_absolute_error_percent:
            roundMetric(
              bucket.total_absolute_error /
                count,
            ),

          average_brier_score:
            roundMetric(
              bucket.total_brier_score /
                count,
              6,
            ),
        };
      },
    );
}


/* =========================================================
 * 14. TODAY
 * ======================================================= */

function getUTCDate():
string {
  return new Date()
    .toISOString()
    .slice(
      0,
      10,
    );
}


/* =========================================================
 * 15. ACTIVE FORECASTS
 * ======================================================= */

function getActiveForecasts(
  forecasts:
    InvestmentAIForecast[],

  evaluatedIds:
    Set<UUID>,

  today:
    string,
): InvestmentAIForecast[] {
  return forecasts
    .filter(
      (
        forecast,
      ) =>
        !evaluatedIds.has(
          forecast.id,
        ) &&
        forecast.target_date >=
          today,
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
}


/* =========================================================
 * 16. FORECASTS DUE FOR EVALUATION
 * ======================================================= */

/**
 * We use target_date < today.
 *
 * A forecast expiring today is not automatically graded before
 * the market session has completed and a trusted closing price
 * is available.
 */
function getForecastsDueForEvaluation(
  forecasts:
    InvestmentAIForecast[],

  evaluatedIds:
    Set<UUID>,

  today:
    string,
): InvestmentAIForecast[] {
  return forecasts
    .filter(
      (
        forecast,
      ) =>
        !evaluatedIds.has(
          forecast.id,
        ) &&
        forecast.target_date <
          today,
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
}


/* =========================================================
 * 17. TRACK RECORD SUMMARY
 * ======================================================= */

function buildTrackRecordSummary(
  trackRecord:
    Awaited<
      ReturnType<
        typeof getInvestmentIntelligenceSnapshot
      >
    >[
      "track_record"
    ],
) {
  if (
    !trackRecord
  ) {
    return {
      status:
        "insufficient" as const,

      evaluated_forecasts:
        0,

      directional_accuracy_percent:
        null,

      base_range_accuracy_percent:
        null,

      average_absolute_error_percent:
        null,

      average_brier_score:
        null,

      calibration_score:
        null,

      grade:
        "insufficient" as const,

      grade_label:
        getTrackRecordGradeLabel(
          "insufficient",
        ),

      first_evaluation_date:
        null,

      latest_evaluation_date:
        null,
    };
  }


  const grade =
    getInvestmentTrackRecordGrade({
      evaluated_forecasts:
        trackRecord.evaluated_forecasts,

      directional_accuracy_percent:
        trackRecord
          .directional_accuracy_percent,

      average_brier_score:
        trackRecord.average_brier_score,
    });


  const calibrationScore =
    trackRecord.average_brier_score ===
    null
      ? null
      : calculateTrackRecordCalibrationScore(
          trackRecord.average_brier_score,
        );


  return {
    status:
      trackRecord.evaluated_forecasts >=
      10
        ? "measurable" as const
        : "insufficient" as const,

    evaluated_forecasts:
      trackRecord.evaluated_forecasts,

    directional_accuracy_percent:
      trackRecord
        .directional_accuracy_percent,

    base_range_accuracy_percent:
      trackRecord
        .base_range_accuracy_percent,

    average_absolute_error_percent:
      trackRecord
        .average_absolute_error_percent,

    average_brier_score:
      trackRecord.average_brier_score,

    calibration_score:
      calibrationScore,

    grade,

    grade_label:
      getTrackRecordGradeLabel(
        grade,
      ),

    first_evaluation_date:
      trackRecord
        .first_evaluation_date,

    latest_evaluation_date:
      trackRecord
        .latest_evaluation_date,
  };
}


/* =========================================================
 * 18. GET
 * ======================================================= */

export async function GET() {
  try {

    /* -----------------------------------------------------
     * AUTH FIRST
     * -------------------------------------------------- */

    await assertAuthenticatedIdentity();


    /* -----------------------------------------------------
     * PRIVATE LIFE INVEST AI DATA
     * -------------------------------------------------- */

    const [
      snapshot,
      detailedForecasts,
      detailedOutcomes,
    ] =
      await Promise.all([
        getInvestmentIntelligenceSnapshot(),

        listInvestmentAIForecasts({
          limit:
            DETAILED_HISTORY_LIMIT,
        }),

        listInvestmentAIForecastOutcomes(
          DETAILED_HISTORY_LIMIT,
        ),
      ]);


    /* -----------------------------------------------------
     * LOOKUP MAPS
     * -------------------------------------------------- */

    const assetMap =
      createAssetMap(
        snapshot.assets,
      );


    const forecastMap =
      createForecastMap(
        detailedForecasts,
      );


    const evaluatedIds =
      createEvaluatedForecastIdSet(
        detailedOutcomes,
      );


    const today =
      getUTCDate();


    /* -----------------------------------------------------
     * ACTIVE FORECASTS
     * -------------------------------------------------- */

    const activeForecasts =
      getActiveForecasts(
        detailedForecasts,
        evaluatedIds,
        today,
      );


    /* -----------------------------------------------------
     * DUE FORECASTS
     * -------------------------------------------------- */

    const dueForecasts =
      getForecastsDueForEvaluation(
        detailedForecasts,
        evaluatedIds,
        today,
      );


    /* -----------------------------------------------------
     * HISTORICAL PERFORMANCE
     * -------------------------------------------------- */

    const trackRecord =
      buildTrackRecordSummary(
        snapshot.track_record,
      );


    const performanceByHorizon =
      calculatePerformanceByHorizon(
        detailedOutcomes,
        forecastMap,
      );


    /* -----------------------------------------------------
     * SUCCESS
     * -------------------------------------------------- */

    return NextResponse.json(
      {
        ok:
          true,


        generated_at:
          new Date()
            .toISOString(),


        track_record:
          trackRecord,


        coverage: {
          active_assets:
            snapshot.assets.length,

          assets_with_analysis:
            snapshot
              .latest_analyses
              .length,

          active_forecasts:
            activeForecasts.length,

          forecasts_due_for_evaluation:
            dueForecasts.length,

          detailed_forecasts_loaded:
            detailedForecasts.length,

          detailed_outcomes_loaded:
            detailedOutcomes.length,

          detailed_history_limit:
            DETAILED_HISTORY_LIMIT,
        },


        performance_by_horizon:
          performanceByHorizon,


        active_forecasts:
          activeForecasts.map(
            (
              forecast,
            ) =>
              serializeForecast(
                forecast,
                assetMap,
              ),
          ),


        due_for_evaluation:
          dueForecasts.map(
            (
              forecast,
            ) =>
              serializeForecast(
                forecast,
                assetMap,
              ),
          ),


        recent_results:
          detailedOutcomes.map(
            (
              outcome,
            ) =>
              serializeOutcome(
                outcome,
                forecastMap,
                assetMap,
              ),
          ),


        latest_asset_analyses:
          snapshot.latest_analyses.map(
            (
              analysis,
            ) => ({
              id:
                analysis.id,

              asset:
                analysis.asset_id
                  ? getAssetDisplay(
                      assetMap.get(
                        analysis.asset_id,
                      ),
                    )
                  : null,

              as_of:
                analysis.as_of,

              data_status:
                analysis.data_status,

              data_quality_score:
                analysis
                  .data_quality_score,

              overall_score:
                analysis.overall_score,

              stance:
                analysis.stance,

              recommendation:
                analysis.recommendation,

              confidence:
                analysis.confidence,

              created_at:
                analysis.created_at,
            }),
          ),
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
      return errorResponse(
        401,
        "يجب تسجيل الدخول لعرض سجل LIFE Invest AI.",
        error.code,
      );
    }


    /* -----------------------------------------------------
     * DATABASE / RLS
     * -------------------------------------------------- */

    if (
      error instanceof
      InvestmentIntelligenceDataError
    ) {
      return errorResponse(
        500,
        "تعذر تحميل سجل LIFE Invest AI.",
        error.code,
      );
    }


    /* -----------------------------------------------------
     * UNKNOWN
     * -------------------------------------------------- */

    return errorResponse(
      500,
      "حدث خطأ غير متوقع أثناء تحميل سجل LIFE Invest AI.",
      "TRACK_RECORD_FAILED",
    );
  }
}


/* =========================================================
 * 19. READ-ONLY CONTRACT
 * ======================================================= */

/**
 * This route contains:
 *
 * GET
 *
 *
 * It intentionally contains NO:
 *
 * POST
 * PUT
 * PATCH
 * DELETE
 *
 *
 * Reading Track Record can never mutate investment history.
 */


/* =========================================================
 * 20. ACCURACY CONTRACT
 * ======================================================= */

/**
 * Overall metrics come from:
 *
 * public.investment_ai_track_record
 *
 *
 * which is calculated from immutable outcome rows.
 *
 *
 * The API does not let AI self-report accuracy.
 */


/* =========================================================
 * 21. MINIMUM SAMPLE RULE
 * ======================================================= */

/**
 * Fewer than 10 evaluated forecasts:
 *
 * grade = insufficient
 *
 *
 * LIFE OS must not advertise a strong accuracy claim from a
 * tiny sample.
 */


/* =========================================================
 * 22. DETAILED HISTORY RULE
 * ======================================================= */

/**
 * Detailed lists are capped at 100 records in V1.
 *
 *
 * This does NOT affect lifetime overall Track Record because
 * the PostgreSQL aggregate view evaluates the complete stored
 * outcome history.
 */


/* =========================================================
 * 23. DUE FORECAST RULE
 * ======================================================= */

/**
 * target_date < today
 * +
 * no stored outcome
 *
 * =
 *
 * due_for_evaluation
 *
 *
 * A future evaluator can fetch the trusted historical market
 * price and record the outcome.
 */


/* =========================================================
 * 24. HISTORICAL IMMUTABILITY
 * ======================================================= */

/**
 * Even if this endpoint discovers:
 *
 * wrong prediction
 * bad probability
 * missed price range
 *
 *
 * it NEVER modifies the historical forecast.
 *
 *
 * A losing prediction remains visible permanently.
 */


/* =========================================================
 * 25. TRACK RECORD PURPOSE
 * ======================================================= */

/**
 * LIFE Invest AI does not compete by saying:
 *
 * "Our AI is 95% accurate."
 *
 *
 * It competes by showing:
 *
 * number of evaluated predictions
 * directional accuracy
 * scenario-range accuracy
 * average forecast error
 * Brier score
 * calibration score
 * performance by horizon
 *
 *
 * All based on stored historical results.
 */


/* =========================================================
 * 26. FINAL TRACK RECORD RULE
 * ======================================================= */

/**
 * Prediction
 *      ↓
 * immutable storage
 *      ↓
 * time passes
 *      ↓
 * trusted actual price
 *      ↓
 * deterministic database grading
 *      ↓
 * Track Record API
 *      ↓
 * user sees the truth
 *
 *
 * Wins stay.
 *
 * Losses stay.
 *
 * Accuracy is earned.
 */