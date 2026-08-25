/* =========================================================
 * LIFE OS
 * LIFE INVEST AI
 * DETERMINISTIC INVESTMENT INTELLIGENCE ENGINE
 *
 * Responsibilities:
 *
 * - score investment evidence
 * - measure data quality
 * - measure signal agreement
 * - produce deterministic overall score
 * - produce deterministic advisory stance
 * - calculate technical market statistics
 * - validate probabilistic forecasts
 * - evaluate expired forecasts
 * - calculate Brier score
 * - summarize historical Track Record
 *
 *
 * IMPORTANT:
 *
 * This module does NOT:
 *
 * - fetch market prices
 * - fetch news
 * - call AI
 * - write database rows
 * - buy
 * - sell
 * - place broker orders
 *
 *
 * AI may interpret evidence.
 *
 * This engine calculates the measurable parts.
 *
 *
 * Simple outside.
 * Intelligent underneath.
 * Measurable by default.
 * ======================================================= */


/* =========================================================
 * 1. CORE DOMAIN VALUES
 * ======================================================= */

export type InvestmentIntelligenceDataStatus =
  | "sufficient"
  | "partial"
  | "insufficient";


export type InvestmentIntelligenceStance =
  | "strong_bullish"
  | "bullish"
  | "neutral"
  | "bearish"
  | "strong_bearish"
  | "insufficient";


export type InvestmentIntelligenceRecommendation =
  | "accumulate"
  | "hold"
  | "watch"
  | "avoid"
  | "insufficient";


export type InvestmentForecastDirection =
  | "up"
  | "flat"
  | "down";


export type InvestmentTechnicalSignal =
  | "strong_bullish"
  | "bullish"
  | "neutral"
  | "bearish"
  | "strong_bearish"
  | "insufficient";


export type InvestmentTrackRecordGrade =
  | "strong"
  | "good"
  | "developing"
  | "weak"
  | "insufficient";


/* =========================================================
 * 2. COMPONENT SCORE INPUT
 * ======================================================= */

export interface InvestmentIntelligenceScoreInput {
  fundamental_score:
    number | null;

  technical_score:
    number | null;

  sentiment_score:
    number | null;

  macro_score:
    number | null;

  portfolio_fit_score:
    number | null;

  /**
   * Risk:
   *
   * 0   = lower observed risk
   * 100 = higher observed risk
   */
  risk_score:
    number | null;

  /**
   * Used only for personal recommendation wording.
   *
   * Example:
   *
   * strong asset + existing position
   *      → hold / accumulate
   *
   * strong asset + no position
   *      → watch / accumulate
   */
  has_position:
    boolean;
}


/* =========================================================
 * 3. SCORE RESULT
 * ======================================================= */

export interface InvestmentIntelligenceScoreResult {
  data_status:
    InvestmentIntelligenceDataStatus;

  data_quality_score:
    number;

  signal_agreement_score:
    number;

  overall_score:
    number | null;

  stance:
    InvestmentIntelligenceStance;

  recommendation:
    InvestmentIntelligenceRecommendation;

  confidence:
    number;

  available_component_count:
    number;

  missing_components:
    InvestmentScoreComponentName[];
}


/* =========================================================
 * 4. COMPONENT NAMES
 * ======================================================= */

export type InvestmentScoreComponentName =
  | "fundamental"
  | "technical"
  | "sentiment"
  | "macro"
  | "portfolio_fit"
  | "risk";


/* =========================================================
 * 5. SCORE WEIGHTS
 * ======================================================= */

/**
 * Positive intelligence signals.
 *
 * Total = 1.00
 */
const POSITIVE_SCORE_WEIGHTS = {
  fundamental:
    0.30,

  technical:
    0.25,

  sentiment:
    0.10,

  macro:
    0.15,

  portfolio_fit:
    0.20,
} as const;


/**
 * Data-quality coverage weights.
 *
 * Total = 1.00
 */
const DATA_QUALITY_WEIGHTS = {
  fundamental:
    0.25,

  technical:
    0.20,

  sentiment:
    0.10,

  macro:
    0.10,

  portfolio_fit:
    0.20,

  risk:
    0.15,
} as const;


/**
 * Final score:
 *
 * 90%
 * investment signals
 *
 * +
 *
 * 10%
 * inverse risk score
 *
 *
 * If risk evidence is unavailable, no risk score is invented.
 */
const RISK_ADJUSTMENT_WEIGHT =
  0.10;


/* =========================================================
 * 6. PRICE DATA
 * ======================================================= */

export interface InvestmentMarketPricePoint {
  date:
    string;

  close:
    number;
}


/* =========================================================
 * 7. TECHNICAL SNAPSHOT
 * ======================================================= */

export interface InvestmentTechnicalSnapshot {
  data_points:
    number;

  latest_date:
    string | null;

  latest_close:
    number | null;

  sma_20:
    number | null;

  sma_50:
    number | null;

  ema_20:
    number | null;

  rsi_14:
    number | null;

  momentum_20_percent:
    number | null;

  annualized_volatility_percent:
    number | null;

  max_drawdown_percent:
    number | null;

  technical_score:
    number | null;

  signal:
    InvestmentTechnicalSignal;
}


/* =========================================================
 * 8. FORECAST DRAFT
 * ======================================================= */

export interface InvestmentForecastDraft {
  horizon_days:
    number;

  target_date:
    string;

  reference_price:
    number;

  currency:
    string;

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

  invalidation_price:
    number | null;

  confidence:
    number;

  thesis:
    string;
}


/* =========================================================
 * 9. FORECAST VALIDATION
 * ======================================================= */

export interface InvestmentForecastValidationResult {
  valid:
    boolean;

  errors:
    string[];

  primary_direction:
    InvestmentForecastDirection | null;

  probability_total:
    number;

  base_midpoint:
    number | null;

  expected_return_mid_percent:
    number | null;
}


/* =========================================================
 * 10. FORECAST EVALUATION
 * ======================================================= */

export interface InvestmentForecastEvaluationInput {
  reference_price:
    number;

  actual_price:
    number;

  flat_threshold_percent:
    number;

  predicted_direction:
    InvestmentForecastDirection;

  up_probability:
    number;

  flat_probability:
    number;

  down_probability:
    number;

  base_low:
    number;

  base_high:
    number;
}


export interface InvestmentForecastEvaluation {
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
}


/* =========================================================
 * 11. TRACK RECORD OUTCOME
 * ======================================================= */

export interface InvestmentTrackRecordOutcome {
  direction_correct:
    boolean;

  base_range_hit:
    boolean;

  absolute_error_percent:
    number;

  brier_score:
    number;
}


/* =========================================================
 * 12. TRACK RECORD SUMMARY
 * ======================================================= */

export interface InvestmentTrackRecordSummary {
  evaluated_forecasts:
    number;

  directional_accuracy_percent:
    number | null;

  base_range_accuracy_percent:
    number | null;

  average_absolute_error_percent:
    number | null;

  average_brier_score:
    number | null;

  calibration_score:
    number | null;

  grade:
    InvestmentTrackRecordGrade;
}


/* =========================================================
 * 13. BASIC NUMBER HELPERS
 * ======================================================= */

export function clampNumber(
  value:
    number,

  minimum:
    number,

  maximum:
    number,
): number {
  return Math.min(
    maximum,
    Math.max(
      minimum,
      value,
    ),
  );
}


export function roundNumber(
  value:
    number,

  decimals:
    number = 2,
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


function isFiniteNumber(
  value:
    number | null,
): value is number {
  return (
    value !==
      null &&
    Number.isFinite(
      value,
    )
  );
}


/* =========================================================
 * 14. SCORE NORMALIZATION
 * ======================================================= */

export function normalizeInvestmentScore(
  value:
    number,
): number {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    throw new Error(
      "Investment score must be a finite number.",
    );
  }


  return roundNumber(
    clampNumber(
      value,
      0,
      100,
    ),
    2,
  );
}


/* =========================================================
 * 15. SCORE INPUT NORMALIZATION
 * ======================================================= */

function normalizeNullableScore(
  value:
    number | null,
): number | null {
  if (
    value ===
    null
  ) {
    return null;
  }


  return normalizeInvestmentScore(
    value,
  );
}


/* =========================================================
 * 16. AVAILABLE COMPONENTS
 * ======================================================= */

function getAvailableComponents(
  input:
    InvestmentIntelligenceScoreInput,
): InvestmentScoreComponentName[] {
  const components:
    InvestmentScoreComponentName[] = [];


  if (
    isFiniteNumber(
      input.fundamental_score,
    )
  ) {
    components.push(
      "fundamental",
    );
  }


  if (
    isFiniteNumber(
      input.technical_score,
    )
  ) {
    components.push(
      "technical",
    );
  }


  if (
    isFiniteNumber(
      input.sentiment_score,
    )
  ) {
    components.push(
      "sentiment",
    );
  }


  if (
    isFiniteNumber(
      input.macro_score,
    )
  ) {
    components.push(
      "macro",
    );
  }


  if (
    isFiniteNumber(
      input.portfolio_fit_score,
    )
  ) {
    components.push(
      "portfolio_fit",
    );
  }


  if (
    isFiniteNumber(
      input.risk_score,
    )
  ) {
    components.push(
      "risk",
    );
  }


  return components;
}


/* =========================================================
 * 17. MISSING COMPONENTS
 * ======================================================= */

function getMissingComponents(
  available:
    InvestmentScoreComponentName[],
): InvestmentScoreComponentName[] {
  const all:
    InvestmentScoreComponentName[] = [
      "fundamental",
      "technical",
      "sentiment",
      "macro",
      "portfolio_fit",
      "risk",
    ];


  return all.filter(
    (
      component,
    ) =>
      !available.includes(
        component,
      ),
  );
}


/* =========================================================
 * 18. DATA QUALITY
 * ======================================================= */

/**
 * Data Quality does NOT measure whether the stock is good.
 *
 * It measures how much of the intended evidence stack exists.
 */
export function calculateInvestmentDataQuality(
  input:
    InvestmentIntelligenceScoreInput,
): number {
  let coverage =
    0;


  if (
    isFiniteNumber(
      input.fundamental_score,
    )
  ) {
    coverage +=
      DATA_QUALITY_WEIGHTS
        .fundamental;
  }


  if (
    isFiniteNumber(
      input.technical_score,
    )
  ) {
    coverage +=
      DATA_QUALITY_WEIGHTS
        .technical;
  }


  if (
    isFiniteNumber(
      input.sentiment_score,
    )
  ) {
    coverage +=
      DATA_QUALITY_WEIGHTS
        .sentiment;
  }


  if (
    isFiniteNumber(
      input.macro_score,
    )
  ) {
    coverage +=
      DATA_QUALITY_WEIGHTS
        .macro;
  }


  if (
    isFiniteNumber(
      input.portfolio_fit_score,
    )
  ) {
    coverage +=
      DATA_QUALITY_WEIGHTS
        .portfolio_fit;
  }


  if (
    isFiniteNumber(
      input.risk_score,
    )
  ) {
    coverage +=
      DATA_QUALITY_WEIGHTS
        .risk;
  }


  return roundNumber(
    coverage *
      100,
    2,
  );
}


/* =========================================================
 * 19. DATA STATUS
 * ======================================================= */

export function getInvestmentDataStatus(
  dataQualityScore:
    number,
): InvestmentIntelligenceDataStatus {
  if (
    dataQualityScore >=
    75
  ) {
    return "sufficient";
  }


  if (
    dataQualityScore >=
    40
  ) {
    return "partial";
  }


  return "insufficient";
}


/* =========================================================
 * 20. WEIGHTED POSITIVE SCORE
 * ======================================================= */

function calculateWeightedPositiveScore(
  input:
    InvestmentIntelligenceScoreInput,
): number | null {
  const values = [
    {
      score:
        normalizeNullableScore(
          input.fundamental_score,
        ),

      weight:
        POSITIVE_SCORE_WEIGHTS
          .fundamental,
    },

    {
      score:
        normalizeNullableScore(
          input.technical_score,
        ),

      weight:
        POSITIVE_SCORE_WEIGHTS
          .technical,
    },

    {
      score:
        normalizeNullableScore(
          input.sentiment_score,
        ),

      weight:
        POSITIVE_SCORE_WEIGHTS
          .sentiment,
    },

    {
      score:
        normalizeNullableScore(
          input.macro_score,
        ),

      weight:
        POSITIVE_SCORE_WEIGHTS
          .macro,
    },

    {
      score:
        normalizeNullableScore(
          input.portfolio_fit_score,
        ),

      weight:
        POSITIVE_SCORE_WEIGHTS
          .portfolio_fit,
    },
  ];


  let weightedTotal =
    0;

  let availableWeight =
    0;


  for (
    const value of
      values
  ) {
    if (
      value.score ===
      null
    ) {
      continue;
    }


    weightedTotal +=
      value.score *
      value.weight;


    availableWeight +=
      value.weight;
  }


  if (
    availableWeight ===
    0
  ) {
    return null;
  }


  return normalizeInvestmentScore(
    weightedTotal /
      availableWeight,
  );
}


/* =========================================================
 * 21. RISK ADJUSTMENT
 * ======================================================= */

function calculateRiskAdjustedScore(
  positiveScore:
    number,

  riskScore:
    number | null,
): number {
  if (
    riskScore ===
    null
  ) {
    return normalizeInvestmentScore(
      positiveScore,
    );
  }


  const normalizedRisk =
    normalizeInvestmentScore(
      riskScore,
    );


  const safetyScore =
    100 -
    normalizedRisk;


  const result =
    positiveScore *
      (
        1 -
        RISK_ADJUSTMENT_WEIGHT
      )
    +
    safetyScore *
      RISK_ADJUSTMENT_WEIGHT;


  return normalizeInvestmentScore(
    result,
  );
}


/* =========================================================
 * 22. SIGNAL VALUES
 * ======================================================= */

function getSignalValues(
  input:
    InvestmentIntelligenceScoreInput,
): number[] {
  const values:
    number[] = [];


  const positiveScores = [
    input.fundamental_score,
    input.technical_score,
    input.sentiment_score,
    input.macro_score,
    input.portfolio_fit_score,
  ];


  for (
    const value of
      positiveScores
  ) {
    if (
      value !==
      null
    ) {
      values.push(
        normalizeInvestmentScore(
          value,
        ),
      );
    }
  }


  /*
   * Convert risk into directional safety before measuring
   * agreement with positive signals.
   */
  if (
    input.risk_score !==
    null
  ) {
    values.push(
      100 -
        normalizeInvestmentScore(
          input.risk_score,
        ),
    );
  }


  return values;
}


/* =========================================================
 * 23. STANDARD DEVIATION
 * ======================================================= */

function calculateStandardDeviation(
  values:
    number[],
): number {
  if (
    values.length <=
    1
  ) {
    return 0;
  }


  const average =
    values.reduce(
      (
        total,
        value,
      ) =>
        total +
        value,
      0,
    ) /
    values.length;


  const variance =
    values.reduce(
      (
        total,
        value,
      ) =>
        total +
        (
          value -
          average
        ) **
          2,
      0,
    ) /
    values.length;


  return Math.sqrt(
    variance,
  );
}


/* =========================================================
 * 24. SIGNAL AGREEMENT
 * ======================================================= */

/**
 * 100:
 * signals are very close together.
 *
 * 0:
 * signals strongly disagree.
 *
 *
 * This is NOT forecast accuracy.
 */
export function calculateSignalAgreement(
  input:
    InvestmentIntelligenceScoreInput,
): number {
  const values =
    getSignalValues(
      input,
    );


  if (
    values.length ===
    0
  ) {
    return 0;
  }


  if (
    values.length ===
    1
  ) {
    return 50;
  }


  const deviation =
    calculateStandardDeviation(
      values,
    );


  /*
   * A dispersion of 50 points or more maps to zero agreement.
   */
  const agreement =
    (
      1 -
      clampNumber(
        deviation /
          50,
        0,
        1,
      )
    ) *
    100;


  return roundNumber(
    agreement,
    2,
  );
}


/* =========================================================
 * 25. CONFIDENCE
 * ======================================================= */

/**
 * Confidence is calculated from:
 *
 * 70% evidence coverage
 * 30% signal agreement
 *
 *
 * Confidence is NOT probability of future profit.
 */
export function calculateInvestmentConfidence(
  dataQualityScore:
    number,

  signalAgreementScore:
    number,

  status:
    InvestmentIntelligenceDataStatus,
): number {
  let confidence =
    dataQualityScore *
      0.70
    +
    signalAgreementScore *
      0.30;


  if (
    status ===
    "insufficient"
  ) {
    confidence =
      Math.min(
        confidence,
        35,
      );
  }


  if (
    status ===
    "partial"
  ) {
    confidence =
      Math.min(
        confidence,
        70,
      );
  }


  /*
   * Never present machine confidence as 100%.
   */
  confidence =
    Math.min(
      confidence,
      95,
    );


  return roundNumber(
    clampNumber(
      confidence,
      0,
      95,
    ),
    0,
  );
}


/* =========================================================
 * 26. STANCE
 * ======================================================= */

export function getInvestmentStance(
  overallScore:
    number | null,

  dataStatus:
    InvestmentIntelligenceDataStatus,
): InvestmentIntelligenceStance {
  if (
    dataStatus ===
      "insufficient" ||
    overallScore ===
      null
  ) {
    return "insufficient";
  }


  if (
    overallScore >=
    80
  ) {
    return "strong_bullish";
  }


  if (
    overallScore >=
    65
  ) {
    return "bullish";
  }


  if (
    overallScore >=
    45
  ) {
    return "neutral";
  }


  if (
    overallScore >=
    30
  ) {
    return "bearish";
  }


  return "strong_bearish";
}


/* =========================================================
 * 27. PERSONAL RECOMMENDATION
 * ======================================================= */

export function getInvestmentRecommendation(
  input: {
    overall_score:
      number | null;

    risk_score:
      number | null;

    data_status:
      InvestmentIntelligenceDataStatus;

    has_position:
      boolean;
  },
): InvestmentIntelligenceRecommendation {
  if (
    input.data_status ===
      "insufficient" ||
    input.overall_score ===
      null
  ) {
    return "insufficient";
  }


  const risk =
    input.risk_score;


  /*
   * Strong score with controlled observed risk.
   */
  if (
    input.overall_score >=
      72 &&
    (
      risk ===
        null ||
      risk <=
        65
    )
  ) {
    return "accumulate";
  }


  /*
   * Existing position with reasonable fundamentals.
   */
  if (
    input.has_position &&
    input.overall_score >=
      50
  ) {
    return "hold";
  }


  /*
   * Interesting but not strong enough to prioritize.
   */
  if (
    input.overall_score >=
    40
  ) {
    return "watch";
  }


  return "avoid";
}


/* =========================================================
 * 28. COMPLETE INTELLIGENCE SCORE
 * ======================================================= */

export function calculateInvestmentIntelligenceScore(
  input:
    InvestmentIntelligenceScoreInput,
): InvestmentIntelligenceScoreResult {
  const normalized:
    InvestmentIntelligenceScoreInput = {
      fundamental_score:
        normalizeNullableScore(
          input.fundamental_score,
        ),

      technical_score:
        normalizeNullableScore(
          input.technical_score,
        ),

      sentiment_score:
        normalizeNullableScore(
          input.sentiment_score,
        ),

      macro_score:
        normalizeNullableScore(
          input.macro_score,
        ),

      portfolio_fit_score:
        normalizeNullableScore(
          input.portfolio_fit_score,
        ),

      risk_score:
        normalizeNullableScore(
          input.risk_score,
        ),

      has_position:
        input.has_position,
    };


  const availableComponents =
    getAvailableComponents(
      normalized,
    );


  const missingComponents =
    getMissingComponents(
      availableComponents,
    );


  const dataQualityScore =
    calculateInvestmentDataQuality(
      normalized,
    );


  const dataStatus =
    getInvestmentDataStatus(
      dataQualityScore,
    );


  const signalAgreementScore =
    calculateSignalAgreement(
      normalized,
    );


  const positiveScore =
    calculateWeightedPositiveScore(
      normalized,
    );


  const overallScore =
    dataStatus ===
      "insufficient" ||
    positiveScore ===
      null
      ? null
      : calculateRiskAdjustedScore(
          positiveScore,
          normalized.risk_score,
        );


  const stance =
    getInvestmentStance(
      overallScore,
      dataStatus,
    );


  const recommendation =
    getInvestmentRecommendation({
      overall_score:
        overallScore,

      risk_score:
        normalized.risk_score,

      data_status:
        dataStatus,

      has_position:
        normalized.has_position,
    });


  const confidence =
    calculateInvestmentConfidence(
      dataQualityScore,
      signalAgreementScore,
      dataStatus,
    );


  return {
    data_status:
      dataStatus,

    data_quality_score:
      dataQualityScore,

    signal_agreement_score:
      signalAgreementScore,

    overall_score:
      overallScore,

    stance,

    recommendation,

    confidence,

    available_component_count:
      availableComponents.length,

    missing_components:
      missingComponents,
  };
}


/* =========================================================
 * 29. SORT PRICE SERIES
 * ======================================================= */

export function normalizeMarketPriceSeries(
  points:
    InvestmentMarketPricePoint[],
): InvestmentMarketPricePoint[] {
  const valid =
    points
      .filter(
        (
          point,
        ) =>
          point.date
            .trim()
            .length >
            0 &&
          Number.isFinite(
            point.close,
          ) &&
          point.close >
            0,
      )
      .map(
        (
          point,
        ) => ({
          date:
            point.date.trim(),

          close:
            point.close,
        }),
      )
      .sort(
        (
          a,
          b,
        ) =>
          a.date.localeCompare(
            b.date,
          ),
      );


  /*
   * If the same date appears multiple times,
   * keep the latest supplied value for that date.
   */
  const byDate =
    new Map<
      string,
      InvestmentMarketPricePoint
    >();


  for (
    const point of
      valid
  ) {
    byDate.set(
      point.date,
      point,
    );
  }


  return Array.from(
    byDate.values(),
  ).sort(
    (
      a,
      b,
    ) =>
      a.date.localeCompare(
        b.date,
      ),
  );
}


/* =========================================================
 * 30. SIMPLE MOVING AVERAGE
 * ======================================================= */

export function calculateSimpleMovingAverage(
  values:
    number[],

  period:
    number,
): number | null {
  if (
    !Number.isInteger(
      period,
    ) ||
    period <=
      0 ||
    values.length <
      period
  ) {
    return null;
  }


  const sample =
    values.slice(
      values.length -
        period,
    );


  const average =
    sample.reduce(
      (
        total,
        value,
      ) =>
        total +
        value,
      0,
    ) /
    period;


  return roundNumber(
    average,
    6,
  );
}


/* =========================================================
 * 31. EXPONENTIAL MOVING AVERAGE
 * ======================================================= */

export function calculateExponentialMovingAverage(
  values:
    number[],

  period:
    number,
): number | null {
  if (
    !Number.isInteger(
      period,
    ) ||
    period <=
      0 ||
    values.length <
      period
  ) {
    return null;
  }


  const seed =
    values
      .slice(
        0,
        period,
      )
      .reduce(
        (
          total,
          value,
        ) =>
          total +
          value,
        0,
      ) /
    period;


  const multiplier =
    2 /
    (
      period +
      1
    );


  let ema =
    seed;


  for (
    let index =
      period;
    index <
      values.length;
    index +=
      1
  ) {
    const value =
      values[
        index
      ];


    if (
      value ===
      undefined
    ) {
      continue;
    }


    ema =
      (
        value -
        ema
      ) *
        multiplier
      +
      ema;
  }


  return roundNumber(
    ema,
    6,
  );
}


/* =========================================================
 * 32. RSI
 * ======================================================= */

export function calculateRelativeStrengthIndex(
  values:
    number[],

  period:
    number = 14,
): number | null {
  if (
    !Number.isInteger(
      period,
    ) ||
    period <=
      0 ||
    values.length <
      period +
        1
  ) {
    return null;
  }


  const sample =
    values.slice(
      values.length -
        (
          period +
          1
        ),
    );


  let gains =
    0;

  let losses =
    0;


  for (
    let index =
      1;
    index <
      sample.length;
    index +=
      1
  ) {
    const current =
      sample[
        index
      ];

    const previous =
      sample[
        index -
          1
      ];


    if (
      current ===
        undefined ||
      previous ===
        undefined
    ) {
      continue;
    }


    const change =
      current -
      previous;


    if (
      change >
      0
    ) {
      gains +=
        change;
    } else {
      losses +=
        Math.abs(
          change,
        );
    }
  }


  const averageGain =
    gains /
    period;


  const averageLoss =
    losses /
    period;


  if (
    averageLoss ===
    0
  ) {
    return 100;
  }


  if (
    averageGain ===
    0
  ) {
    return 0;
  }


  const relativeStrength =
    averageGain /
    averageLoss;


  const rsi =
    100 -
    (
      100 /
      (
        1 +
        relativeStrength
      )
    );


  return roundNumber(
    rsi,
    2,
  );
}


/* =========================================================
 * 33. MOMENTUM
 * ======================================================= */

export function calculateMomentumPercent(
  values:
    number[],

  periodsBack:
    number,
): number | null {
  if (
    periodsBack <=
      0 ||
    values.length <=
      periodsBack
  ) {
    return null;
  }


  const latest =
    values[
      values.length -
        1
    ];


  const previous =
    values[
      values.length -
        1 -
        periodsBack
    ];


  if (
    latest ===
      undefined ||
    previous ===
      undefined ||
    previous <=
      0
  ) {
    return null;
  }


  return roundNumber(
    (
      (
        latest /
        previous
      ) -
      1
    ) *
      100,
    2,
  );
}


/* =========================================================
 * 34. DAILY RETURNS
 * ======================================================= */

export function calculateDailyReturns(
  values:
    number[],
): number[] {
  const returns:
    number[] = [];


  for (
    let index =
      1;
    index <
      values.length;
    index +=
      1
  ) {
    const current =
      values[
        index
      ];

    const previous =
      values[
        index -
          1
      ];


    if (
      current ===
        undefined ||
      previous ===
        undefined ||
      previous <=
        0
    ) {
      continue;
    }


    returns.push(
      (
        current /
        previous
      ) -
        1,
    );
  }


  return returns;
}


/* =========================================================
 * 35. ANNUALIZED VOLATILITY
 * ======================================================= */

export function calculateAnnualizedVolatilityPercent(
  values:
    number[],

  sampleDays:
    number = 20,
): number | null {
  const returns =
    calculateDailyReturns(
      values,
    );


  if (
    returns.length <
    2
  ) {
    return null;
  }


  const sample =
    returns.slice(
      -Math.max(
        2,
        sampleDays,
      ),
    );


  const deviation =
    calculateStandardDeviation(
      sample,
    );


  const annualized =
    deviation *
    Math.sqrt(
      252,
    ) *
    100;


  return roundNumber(
    annualized,
    2,
  );
}


/* =========================================================
 * 36. MAX DRAWDOWN
 * ======================================================= */

export function calculateMaxDrawdownPercent(
  values:
    number[],
): number | null {
  if (
    values.length ===
    0
  ) {
    return null;
  }


  let peak =
    values[
      0
    ];


  if (
    peak ===
      undefined ||
    peak <=
      0
  ) {
    return null;
  }


  let maxDrawdown =
    0;


  for (
    const value of
      values
  ) {
    if (
      value >
      peak
    ) {
      peak =
        value;
    }


    const drawdown =
      (
        (
          value -
          peak
        ) /
        peak
      ) *
      100;


    if (
      drawdown <
      maxDrawdown
    ) {
      maxDrawdown =
        drawdown;
    }
  }


  return roundNumber(
    maxDrawdown,
    2,
  );
}


/* =========================================================
 * 37. DETERMINISTIC TECHNICAL SCORE
 * ======================================================= */

/**
 * V1 Technical Engine.
 *
 * This is intentionally understandable and auditable.
 *
 * It is NOT a claim that technical indicators can predict the
 * future with certainty.
 */
function calculateTechnicalScore(
  input: {
    latest_close:
      number;

    sma_20:
      number | null;

    sma_50:
      number | null;

    rsi_14:
      number | null;

    momentum_20_percent:
      number | null;

    annualized_volatility_percent:
      number | null;

    max_drawdown_percent:
      number | null;
  },
): number {
  let score =
    50;


  /* -------------------------------------------------------
   * Short-term trend
   * ---------------------------------------------------- */

  if (
    input.sma_20 !==
    null
  ) {
    score +=
      input.latest_close >
      input.sma_20
        ? 15
        : -15;
  }


  /* -------------------------------------------------------
   * Medium-term trend
   * ---------------------------------------------------- */

  if (
    input.sma_20 !==
      null &&
    input.sma_50 !==
      null
  ) {
    score +=
      input.sma_20 >
      input.sma_50
        ? 10
        : -10;
  }


  /* -------------------------------------------------------
   * Momentum
   * ---------------------------------------------------- */

  if (
    input.momentum_20_percent !==
    null
  ) {
    if (
      input.momentum_20_percent >
      5
    ) {
      score +=
        10;
    } else if (
      input.momentum_20_percent >
      0
    ) {
      score +=
        5;
    } else if (
      input.momentum_20_percent <
      -5
    ) {
      score -=
        10;
    } else if (
      input.momentum_20_percent <
      0
    ) {
      score -=
        5;
    }
  }


  /* -------------------------------------------------------
   * RSI
   *
   * RSI extremes reduce score because momentum may be
   * stretched.
   * ---------------------------------------------------- */

  if (
    input.rsi_14 !==
    null
  ) {
    if (
      input.rsi_14 >=
        45 &&
      input.rsi_14 <=
        65
    ) {
      score +=
        8;
    } else if (
      input.rsi_14 >
      75
    ) {
      score -=
        6;
    } else if (
      input.rsi_14 <
      25
    ) {
      score -=
        6;
    }
  }


  /* -------------------------------------------------------
   * Volatility
   * ---------------------------------------------------- */

  if (
    input.annualized_volatility_percent !==
    null
  ) {
    if (
      input.annualized_volatility_percent >
      50
    ) {
      score -=
        10;
    } else if (
      input.annualized_volatility_percent >
      30
    ) {
      score -=
        5;
    }
  }


  /* -------------------------------------------------------
   * Drawdown
   * ---------------------------------------------------- */

  if (
    input.max_drawdown_percent !==
    null
  ) {
    if (
      input.max_drawdown_percent <=
      -35
    ) {
      score -=
        10;
    } else if (
      input.max_drawdown_percent <=
      -20
    ) {
      score -=
        5;
    }
  }


  return normalizeInvestmentScore(
    score,
  );
}


/* =========================================================
 * 38. TECHNICAL SIGNAL
 * ======================================================= */

function getTechnicalSignal(
  score:
    number | null,
): InvestmentTechnicalSignal {
  if (
    score ===
    null
  ) {
    return "insufficient";
  }


  if (
    score >=
    80
  ) {
    return "strong_bullish";
  }


  if (
    score >=
    65
  ) {
    return "bullish";
  }


  if (
    score >=
    45
  ) {
    return "neutral";
  }


  if (
    score >=
    30
  ) {
    return "bearish";
  }


  return "strong_bearish";
}


/* =========================================================
 * 39. TECHNICAL SNAPSHOT
 * ======================================================= */

export function calculateInvestmentTechnicalSnapshot(
  inputPoints:
    InvestmentMarketPricePoint[],
): InvestmentTechnicalSnapshot {
  const points =
    normalizeMarketPriceSeries(
      inputPoints,
    );


  if (
    points.length ===
    0
  ) {
    return {
      data_points:
        0,

      latest_date:
        null,

      latest_close:
        null,

      sma_20:
        null,

      sma_50:
        null,

      ema_20:
        null,

      rsi_14:
        null,

      momentum_20_percent:
        null,

      annualized_volatility_percent:
        null,

      max_drawdown_percent:
        null,

      technical_score:
        null,

      signal:
        "insufficient",
    };
  }


  const values =
    points.map(
      (
        point,
      ) =>
        point.close,
    );


  const latestPoint =
    points[
      points.length -
        1
    ];


  if (
    !latestPoint
  ) {
    throw new Error(
      "Technical snapshot could not resolve latest price.",
    );
  }


  const sma20 =
    calculateSimpleMovingAverage(
      values,
      20,
    );


  const sma50 =
    calculateSimpleMovingAverage(
      values,
      50,
    );


  const ema20 =
    calculateExponentialMovingAverage(
      values,
      20,
    );


  const rsi14 =
    calculateRelativeStrengthIndex(
      values,
      14,
    );


  const momentum20 =
    calculateMomentumPercent(
      values,
      20,
    );


  const volatility =
    calculateAnnualizedVolatilityPercent(
      values,
      20,
    );


  const maxDrawdown =
    calculateMaxDrawdownPercent(
      values,
    );


  /*
   * At least 20 observations are required before LIFE OS
   * produces a technical score.
   */
  const technicalScore =
    points.length >=
    20
      ? calculateTechnicalScore({
          latest_close:
            latestPoint.close,

          sma_20:
            sma20,

          sma_50:
            sma50,

          rsi_14:
            rsi14,

          momentum_20_percent:
            momentum20,

          annualized_volatility_percent:
            volatility,

          max_drawdown_percent:
            maxDrawdown,
        })
      : null;


  return {
    data_points:
      points.length,

    latest_date:
      latestPoint.date,

    latest_close:
      roundNumber(
        latestPoint.close,
        6,
      ),

    sma_20:
      sma20,

    sma_50:
      sma50,

    ema_20:
      ema20,

    rsi_14:
      rsi14,

    momentum_20_percent:
      momentum20,

    annualized_volatility_percent:
      volatility,

    max_drawdown_percent:
      maxDrawdown,

    technical_score:
      technicalScore,

    signal:
      getTechnicalSignal(
        technicalScore,
      ),
  };
}


/* =========================================================
 * 40. FORECAST PRIMARY DIRECTION
 * ======================================================= */

export function getPrimaryForecastDirection(
  input: {
    up_probability:
      number;

    flat_probability:
      number;

    down_probability:
      number;
  },
): InvestmentForecastDirection {
  const maximum =
    Math.max(
      input.up_probability,
      input.flat_probability,
      input.down_probability,
    );


  /*
   * Deterministic tie order:
   *
   * flat
   * up
   * down
   *
   * A tie is not treated as strongly directional.
   */
  if (
    input.flat_probability ===
    maximum
  ) {
    return "flat";
  }


  if (
    input.up_probability ===
    maximum
  ) {
    return "up";
  }


  return "down";
}


/* =========================================================
 * 41. FORECAST VALIDATION
 * ======================================================= */

export function validateInvestmentForecast(
  forecast:
    InvestmentForecastDraft,
): InvestmentForecastValidationResult {
  const errors:
    string[] = [];


  const probabilityTotal =
    roundNumber(
      forecast.up_probability +
        forecast.flat_probability +
        forecast.down_probability,
      2,
    );


  /* -------------------------------------------------------
   * Horizon
   * ---------------------------------------------------- */

  if (
    !Number.isInteger(
      forecast.horizon_days,
    ) ||
    forecast.horizon_days <
      1 ||
    forecast.horizon_days >
      3650
  ) {
    errors.push(
      "Forecast horizon must be between 1 and 3650 days.",
    );
  }


  /* -------------------------------------------------------
   * Target date
   * ---------------------------------------------------- */

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      forecast.target_date,
    )
  ) {
    errors.push(
      "Forecast target date must use YYYY-MM-DD.",
    );
  }


  /* -------------------------------------------------------
   * Reference price
   * ---------------------------------------------------- */

  if (
    !Number.isFinite(
      forecast.reference_price,
    ) ||
    forecast.reference_price <=
      0
  ) {
    errors.push(
      "Forecast reference price must be greater than zero.",
    );
  }


  /* -------------------------------------------------------
   * Currency
   * ---------------------------------------------------- */

  if (
    !/^[A-Z]{3}$/.test(
      forecast.currency,
    )
  ) {
    errors.push(
      "Forecast currency must be a three-letter uppercase code.",
    );
  }


  /* -------------------------------------------------------
   * Probabilities
   * ---------------------------------------------------- */

  const probabilities = [
    forecast.up_probability,
    forecast.flat_probability,
    forecast.down_probability,
  ];


  if (
    probabilities.some(
      (
        value,
      ) =>
        !Number.isFinite(
          value,
        ) ||
        value <
          0 ||
        value >
          100,
    )
  ) {
    errors.push(
      "Forecast probabilities must be between 0 and 100.",
    );
  }


  if (
    Math.abs(
      probabilityTotal -
        100,
    ) >
    0.01
  ) {
    errors.push(
      "Forecast probabilities must total exactly 100.",
    );
  }


  const primaryDirection =
    probabilities.every(
      (
        value,
      ) =>
        Number.isFinite(
          value,
        ),
    )
      ? getPrimaryForecastDirection({
          up_probability:
            forecast.up_probability,

          flat_probability:
            forecast.flat_probability,

          down_probability:
            forecast.down_probability,
        })
      : null;


  if (
    primaryDirection !==
      null &&
    forecast.direction !==
      primaryDirection
  ) {
    errors.push(
      "Forecast direction must match the highest probability.",
    );
  }


  /* -------------------------------------------------------
   * Flat threshold
   * ---------------------------------------------------- */

  if (
    !Number.isFinite(
      forecast.flat_threshold_percent,
    ) ||
    forecast.flat_threshold_percent <
      0 ||
    forecast.flat_threshold_percent >
      10
  ) {
    errors.push(
      "Flat threshold must be between 0 and 10 percent.",
    );
  }


  /* -------------------------------------------------------
   * Scenario ranges
   * ---------------------------------------------------- */

  const ranges = [
    {
      name:
        "bear",

      low:
        forecast.bear_low,

      high:
        forecast.bear_high,
    },

    {
      name:
        "base",

      low:
        forecast.base_low,

      high:
        forecast.base_high,
    },

    {
      name:
        "bull",

      low:
        forecast.bull_low,

      high:
        forecast.bull_high,
    },
  ];


  for (
    const range of
      ranges
  ) {
    if (
      !Number.isFinite(
        range.low,
      ) ||
      !Number.isFinite(
        range.high,
      ) ||
      range.low <=
        0 ||
      range.high <
        range.low
    ) {
      errors.push(
        `${range.name} scenario range is invalid.`,
      );
    }
  }


  const bearMidpoint =
    (
      forecast.bear_low +
      forecast.bear_high
    ) /
    2;


  const baseMidpoint =
    (
      forecast.base_low +
      forecast.base_high
    ) /
    2;


  const bullMidpoint =
    (
      forecast.bull_low +
      forecast.bull_high
    ) /
    2;


  if (
    Number.isFinite(
      bearMidpoint,
    ) &&
    Number.isFinite(
      baseMidpoint,
    ) &&
    Number.isFinite(
      bullMidpoint,
    ) &&
    !(
      bearMidpoint <=
        baseMidpoint &&
      baseMidpoint <=
        bullMidpoint
    )
  ) {
    errors.push(
      "Scenario midpoints must follow bear ≤ base ≤ bull.",
    );
  }


  /* -------------------------------------------------------
   * Invalidation
   * ---------------------------------------------------- */

  if (
    forecast.invalidation_price !==
      null &&
    (
      !Number.isFinite(
        forecast.invalidation_price,
      ) ||
      forecast.invalidation_price <=
        0
    )
  ) {
    errors.push(
      "Invalidation price must be greater than zero.",
    );
  }


  /* -------------------------------------------------------
   * Confidence
   * ---------------------------------------------------- */

  if (
    !Number.isFinite(
      forecast.confidence,
    ) ||
    forecast.confidence <
      0 ||
    forecast.confidence >
      100
  ) {
    errors.push(
      "Forecast confidence must be between 0 and 100.",
    );
  }


  /* -------------------------------------------------------
   * Thesis
   * ---------------------------------------------------- */

  if (
    forecast.thesis
      .trim()
      .length ===
      0
  ) {
    errors.push(
      "Forecast thesis is required.",
    );
  }


  const expectedReturn =
    forecast.reference_price >
      0 &&
    Number.isFinite(
      baseMidpoint,
    )
      ? roundNumber(
          (
            (
              baseMidpoint -
              forecast.reference_price
            ) /
            forecast.reference_price
          ) *
            100,
          4,
        )
      : null;


  return {
    valid:
      errors.length ===
      0,

    errors,

    primary_direction:
      primaryDirection,

    probability_total:
      probabilityTotal,

    base_midpoint:
      Number.isFinite(
        baseMidpoint,
      )
        ? roundNumber(
            baseMidpoint,
            6,
          )
        : null,

    expected_return_mid_percent:
      expectedReturn,
  };
}


/* =========================================================
 * 42. ACTUAL DIRECTION
 * ======================================================= */

export function getActualForecastDirection(
  actualChangePercent:
    number,

  flatThresholdPercent:
    number,
): InvestmentForecastDirection {
  if (
    actualChangePercent >
    flatThresholdPercent
  ) {
    return "up";
  }


  if (
    actualChangePercent <
    (
      flatThresholdPercent *
      -1
    )
  ) {
    return "down";
  }


  return "flat";
}


/* =========================================================
 * 43. BRIER SCORE
 * ======================================================= */

/**
 * Multiclass Brier score.
 *
 * 0 = perfect probability forecast.
 * 2 = theoretical worst.
 */
export function calculateInvestmentBrierScore(
  input: {
    up_probability:
      number;

    flat_probability:
      number;

    down_probability:
      number;

    actual_direction:
      InvestmentForecastDirection;
  },
): number {
  const up =
    input.up_probability /
    100;


  const flat =
    input.flat_probability /
    100;


  const down =
    input.down_probability /
    100;


  const actualUp =
    input.actual_direction ===
    "up"
      ? 1
      : 0;


  const actualFlat =
    input.actual_direction ===
    "flat"
      ? 1
      : 0;


  const actualDown =
    input.actual_direction ===
    "down"
      ? 1
      : 0;


  const score =
    (
      up -
      actualUp
    ) **
      2
    +
    (
      flat -
      actualFlat
    ) **
      2
    +
    (
      down -
      actualDown
    ) **
      2;


  return roundNumber(
    clampNumber(
      score,
      0,
      2,
    ),
    8,
  );
}


/* =========================================================
 * 44. FORECAST EVALUATION
 * ======================================================= */

export function evaluateInvestmentForecast(
  input:
    InvestmentForecastEvaluationInput,
): InvestmentForecastEvaluation {
  if (
    input.reference_price <=
      0 ||
    input.actual_price <=
      0
  ) {
    throw new Error(
      "Forecast evaluation prices must be greater than zero.",
    );
  }


  if (
    input.base_low <=
      0 ||
    input.base_high <
      input.base_low
  ) {
    throw new Error(
      "Forecast base range is invalid.",
    );
  }


  const actualChangePercent =
    roundNumber(
      (
        (
          input.actual_price -
          input.reference_price
        ) /
        input.reference_price
      ) *
        100,
      4,
    );


  const actualDirection =
    getActualForecastDirection(
      actualChangePercent,
      input.flat_threshold_percent,
    );


  const baseRangeHit =
    input.actual_price >=
      input.base_low &&
    input.actual_price <=
      input.base_high;


  const baseMidpoint =
    (
      input.base_low +
      input.base_high
    ) /
    2;


  const absoluteErrorPercent =
    roundNumber(
      (
        Math.abs(
          input.actual_price -
            baseMidpoint,
        ) /
        input.reference_price
      ) *
        100,
      4,
    );


  const brierScore =
    calculateInvestmentBrierScore({
      up_probability:
        input.up_probability,

      flat_probability:
        input.flat_probability,

      down_probability:
        input.down_probability,

      actual_direction:
        actualDirection,
    });


  return {
    actual_change_percent:
      actualChangePercent,

    actual_direction:
      actualDirection,

    direction_correct:
      actualDirection ===
      input.predicted_direction,

    base_range_hit:
      baseRangeHit,

    absolute_error_percent:
      absoluteErrorPercent,

    brier_score:
      brierScore,
  };
}


/* =========================================================
 * 45. TRACK RECORD CALIBRATION SCORE
 * ======================================================= */

/**
 * Converts average multiclass Brier score:
 *
 * 0 → 100
 * 2 → 0
 *
 *
 * This is a display-friendly calibration score.
 *
 * Raw Brier score remains the primary statistical metric.
 */
export function calculateTrackRecordCalibrationScore(
  averageBrierScore:
    number,
): number {
  return roundNumber(
    clampNumber(
      (
        1 -
        (
          averageBrierScore /
          2
        )
      ) *
        100,
      0,
      100,
    ),
    2,
  );
}


/* =========================================================
 * 46. TRACK RECORD GRADE
 * ======================================================= */

export function getInvestmentTrackRecordGrade(
  input: {
    evaluated_forecasts:
      number;

    directional_accuracy_percent:
      number | null;

    average_brier_score:
      number | null;
  },
): InvestmentTrackRecordGrade {
  /*
   * Too little history to make a meaningful statement.
   */
  if (
    input.evaluated_forecasts <
    10
  ) {
    return "insufficient";
  }


  if (
    input.directional_accuracy_percent ===
      null ||
    input.average_brier_score ===
      null
  ) {
    return "insufficient";
  }


  if (
    input.directional_accuracy_percent >=
      65 &&
    input.average_brier_score <=
      0.45
  ) {
    return "strong";
  }


  if (
    input.directional_accuracy_percent >=
      55 &&
    input.average_brier_score <=
      0.60
  ) {
    return "good";
  }


  if (
    input.directional_accuracy_percent >=
      45 &&
    input.average_brier_score <=
      0.80
  ) {
    return "developing";
  }


  return "weak";
}


/* =========================================================
 * 47. TRACK RECORD SUMMARY
 * ======================================================= */

export function summarizeInvestmentTrackRecord(
  outcomes:
    InvestmentTrackRecordOutcome[],
): InvestmentTrackRecordSummary {
  const valid =
    outcomes.filter(
      (
        outcome,
      ) =>
        Number.isFinite(
          outcome.absolute_error_percent,
        ) &&
        outcome.absolute_error_percent >=
          0 &&
        Number.isFinite(
          outcome.brier_score,
        ) &&
        outcome.brier_score >=
          0 &&
        outcome.brier_score <=
          2,
    );


  if (
    valid.length ===
    0
  ) {
    return {
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
        "insufficient",
    };
  }


  const directionalCorrect =
    valid.filter(
      (
        outcome,
      ) =>
        outcome.direction_correct,
    ).length;


  const rangeCorrect =
    valid.filter(
      (
        outcome,
      ) =>
        outcome.base_range_hit,
    ).length;


  const directionalAccuracy =
    roundNumber(
      (
        directionalCorrect /
        valid.length
      ) *
        100,
      2,
    );


  const rangeAccuracy =
    roundNumber(
      (
        rangeCorrect /
        valid.length
      ) *
        100,
      2,
    );


  const averageAbsoluteError =
    roundNumber(
      valid.reduce(
        (
          total,
          outcome,
        ) =>
          total +
          outcome.absolute_error_percent,
        0,
      ) /
        valid.length,
      2,
    );


  const averageBrier =
    roundNumber(
      valid.reduce(
        (
          total,
          outcome,
        ) =>
          total +
          outcome.brier_score,
        0,
      ) /
        valid.length,
      6,
    );


  const calibrationScore =
    calculateTrackRecordCalibrationScore(
      averageBrier,
    );


  const grade =
    getInvestmentTrackRecordGrade({
      evaluated_forecasts:
        valid.length,

      directional_accuracy_percent:
        directionalAccuracy,

      average_brier_score:
        averageBrier,
    });


  return {
    evaluated_forecasts:
      valid.length,

    directional_accuracy_percent:
      directionalAccuracy,

    base_range_accuracy_percent:
      rangeAccuracy,

    average_absolute_error_percent:
      averageAbsoluteError,

    average_brier_score:
      averageBrier,

    calibration_score:
      calibrationScore,

    grade,
  };
}


/* =========================================================
 * 48. POSITION FIT SCORE
 * ======================================================= */

/**
 * Simple personalized portfolio-fit helper.
 *
 * This does NOT say whether the company is good.
 *
 * It answers:
 *
 * "Would adding more of this asset make sense relative to the
 * user's own portfolio targets?"
 */
export function calculatePortfolioFitScore(
  input: {
    current_allocation_percent:
      number | null;

    preferred_max_allocation_percent:
      number | null;

    quantity:
      number;

    target_quantity:
      number | null;
  },
): number | null {
  let availableSignals =
    0;

  let total =
    0;


  /* -------------------------------------------------------
   * Allocation concentration
   * ---------------------------------------------------- */

  if (
    input.current_allocation_percent !==
      null &&
    input.preferred_max_allocation_percent !==
      null &&
    input.preferred_max_allocation_percent >
      0
  ) {
    availableSignals +=
      1;


    const ratio =
      input.current_allocation_percent /
      input.preferred_max_allocation_percent;


    if (
      ratio <=
      0.60
    ) {
      total +=
        90;
    } else if (
      ratio <=
      0.85
    ) {
      total +=
        75;
    } else if (
      ratio <=
      1
    ) {
      total +=
        55;
    } else if (
      ratio <=
      1.20
    ) {
      total +=
        30;
    } else {
      total +=
        10;
    }
  }


  /* -------------------------------------------------------
   * Quantity target progress
   * ---------------------------------------------------- */

  if (
    input.target_quantity !==
      null &&
    input.target_quantity >
      0
  ) {
    availableSignals +=
      1;


    const progress =
      input.quantity /
      input.target_quantity;


    if (
      progress <
      0.50
    ) {
      total +=
        90;
    } else if (
      progress <
      0.80
    ) {
      total +=
        75;
    } else if (
      progress <
      1
    ) {
      total +=
        55;
    } else if (
      progress <=
      1.10
    ) {
      total +=
        35;
    } else {
      total +=
        15;
    }
  }


  if (
    availableSignals ===
    0
  ) {
    return null;
  }


  return normalizeInvestmentScore(
    total /
      availableSignals,
  );
}


/* =========================================================
 * 49. STANCE LABEL
 * ======================================================= */

export function getInvestmentStanceLabel(
  stance:
    InvestmentIntelligenceStance,
): string {
  switch (
    stance
  ) {
    case "strong_bullish":
      return "إيجابي بقوة";

    case "bullish":
      return "إيجابي";

    case "neutral":
      return "محايد";

    case "bearish":
      return "سلبي";

    case "strong_bearish":
      return "سلبي بقوة";

    case "insufficient":
    default:
      return "بيانات غير كافية";
  }
}


/* =========================================================
 * 50. RECOMMENDATION LABEL
 * ======================================================= */

export function getInvestmentRecommendationLabel(
  recommendation:
    InvestmentIntelligenceRecommendation,
): string {
  switch (
    recommendation
  ) {
    case "accumulate":
      return "تجميع تدريجي";

    case "hold":
      return "احتفاظ";

    case "watch":
      return "مراقبة";

    case "avoid":
      return "تجنب حاليًا";

    case "insufficient":
    default:
      return "نحتاج بيانات أكثر";
  }
}


/* =========================================================
 * 51. FORECAST DIRECTION LABEL
 * ======================================================= */

export function getForecastDirectionLabel(
  direction:
    InvestmentForecastDirection,
): string {
  switch (
    direction
  ) {
    case "up":
      return "صاعد";

    case "flat":
      return "جانبي";

    case "down":
      return "هابط";
  }
}


/* =========================================================
 * 52. TRACK RECORD GRADE LABEL
 * ======================================================= */

export function getTrackRecordGradeLabel(
  grade:
    InvestmentTrackRecordGrade,
): string {
  switch (
    grade
  ) {
    case "strong":
      return "قوي";

    case "good":
      return "جيد";

    case "developing":
      return "قيد التطور";

    case "weak":
      return "ضعيف";

    case "insufficient":
    default:
      return "السجل غير كافٍ";
  }
}


/* =========================================================
 * 53. SAFETY CONTRACT
 * ======================================================= */

/**
 * LIFE Invest AI separates:
 *
 * FACTS
 *
 * market price
 * financial results
 * company filings
 * news
 * portfolio exposure
 *
 * from:
 *
 * INTERPRETATION
 *
 * fundamental score
 * technical score
 * sentiment score
 * macro score
 * forecast
 *
 *
 * and separates both from:
 *
 * EXECUTION
 *
 * buy
 * sell
 * transfer
 * broker order
 *
 *
 * Execution is outside this module entirely.
 */


/* =========================================================
 * 54. FORECAST CONTRACT
 * ======================================================= */

/**
 * A forecast is not:
 *
 * "the stock will definitely reach X"
 *
 *
 * A forecast is:
 *
 * reference price
 * +
 * defined horizon
 * +
 * up / flat / down probabilities
 * +
 * bull / base / bear ranges
 * +
 * confidence
 * +
 * invalidation level
 * +
 * timestamped thesis
 *
 *
 * Later:
 *
 * actual result
 *      ↓
 * deterministic evaluation
 *      ↓
 * Track Record
 */


/* =========================================================
 * 55. ACCURACY CONTRACT
 * ======================================================= */

/**
 * LIFE Invest AI may only advertise historical accuracy that
 * can be reproduced from stored immutable outcomes.
 *
 *
 * We measure:
 *
 * directional accuracy
 * base-range accuracy
 * absolute forecast error
 * Brier score
 *
 *
 * We do NOT allow:
 *
 * cherry-picked wins
 * deleted losing forecasts
 * edited historical forecasts
 * self-reported fake accuracy
 */


/* =========================================================
 * 56. TECHNICAL ANALYSIS CONTRACT
 * ======================================================= */

/**
 * Current deterministic technical engine uses:
 *
 * SMA 20
 * SMA 50
 * EMA 20
 * RSI 14
 * 20-period momentum
 * annualized volatility
 * max drawdown
 *
 *
 * Technical analysis is one component only.
 *
 * It never overrides:
 *
 * fundamentals
 * valuation
 * news
 * macro
 * portfolio concentration
 * risk
 */


/* =========================================================
 * 57. NO FALSE CERTAINTY
 * ======================================================= */

/**
 * No function in this module claims certainty about future
 * market prices.
 *
 *
 * Forecast quality is earned only through future observed
 * results.
 */


/* =========================================================
 * 58. FINAL LIFE INVEST AI RULE
 * ======================================================= */

/**
 * Evidence
 *      ↓
 * deterministic calculations
 *      ↓
 * bounded AI interpretation
 *      ↓
 * probability forecast
 *      ↓
 * immutable history
 *      ↓
 * future result
 *      ↓
 * objective grading
 *
 *
 * Every prediction can be audited.
 *
 * Every old prediction can be measured.
 *
 * The system must become better through evidence,
 * not through pretending to know the future.
 */