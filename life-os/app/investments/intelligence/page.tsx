import type {
  Metadata,
} from "next";

import Link from "next/link";

import {
  revalidatePath,
} from "next/cache";

import {
  redirect,
} from "next/navigation";

import {
  runInvestmentCommittee,
  InvestmentCommitteeError,
} from "@/ai/investment-intelligence";

import {
  AppShell,
} from "@/components/app-shell";

import {
  EmptyState,
} from "@/components/empty-state";

import {
  PageHeader,
} from "@/components/page-header";

import {
  StatCard,
  type StatCardTone,
} from "@/components/stat-card";

import {
  requireAuthenticatedIdentity,
} from "@/lib/auth";

import {
  getInvestmentSnapshot,
} from "@/lib/data";

import {
  calculateInvestmentTechnicalSnapshot,
  calculateTrackRecordCalibrationScore,
  getForecastDirectionLabel,
  getInvestmentRecommendationLabel,
  getInvestmentStanceLabel,
  getInvestmentTrackRecordGrade,
  getTrackRecordGradeLabel,
} from "@/lib/investment-intelligence";

import {
  createInvestmentAIAnalysisPackage,
  getInvestmentIntelligenceSnapshot,
  InvestmentIntelligenceDataError,
  requireInvestmentIntelligenceAsset,
  type InvestmentAIAnalysis,
  type InvestmentAIForecast,
} from "@/lib/investment-intelligence-data";

import {
  fetchInvestmentResearchData,
  InvestmentMarketDataError,
  type InvestmentMarketEvidence,
} from "@/lib/investment-market-data";

import {
  formatCurrency,
  formatDate,
  formatPercent,
  formatPrice,
  formatQuantity,
} from "@/lib/format";

import type {
  InvestmentAsset,
  JsonValue,
  UUID,
} from "@/lib/types";


/* =========================================================
 * LIFE OS
 * LIFE INVEST AI
 *
 * Investment Intelligence UI
 *
 * Simple outside.
 * Intelligent underneath.
 *
 *
 * User sees:
 *
 * portfolio
 * AI score
 * recommendation
 * forecasts
 * Track Record
 *
 *
 * Underneath:
 *
 * real market data
 * technical calculations
 * AI Investment Committee
 * deterministic score
 * immutable forecasts
 * objective historical grading
 *
 *
 * No trading authority.
 * ======================================================= */


/* =========================================================
 * 1. METADATA
 * ======================================================= */

export const metadata:
Metadata = {
  title:
    "LIFE Invest AI",
};


/* =========================================================
 * 2. PAGE PROPS
 * ======================================================= */

interface InvestmentIntelligencePageProps {
  searchParams?:
    Promise<{
      status?:
        string |
        string[] |
        undefined;
    }>;
}


/* =========================================================
 * 3. DISPLAY SCORE
 * ======================================================= */

function formatAIScore(
  value:
    number |
    null,
): string {
  if (
    value ===
    null
  ) {
    return "—";
  }


  return `${(
    value /
    10
  ).toFixed(1)}/10`;
}


/* =========================================================
 * 4. SCORE TONE
 * ======================================================= */

function getScoreTone(
  score:
    number |
    null,
): StatCardTone {
  if (
    score ===
    null
  ) {
    return "neutral";
  }


  if (
    score >=
    70
  ) {
    return "positive";
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
    return "warning";
  }


  return "negative";
}


/* =========================================================
 * 5. RECOMMENDATION BADGE
 * ======================================================= */

function getRecommendationBadgeClass(
  recommendation:
    InvestmentAIAnalysis[
      "recommendation"
    ],
): string {
  switch (
    recommendation
  ) {
    case "accumulate":
      return "badge badge--positive";

    case "hold":
      return "badge badge--accent";

    case "watch":
      return "badge badge--warning";

    case "avoid":
      return "badge badge--negative";

    case "insufficient":
    default:
      return "badge";
  }
}


/* =========================================================
 * 6. STANCE BADGE
 * ======================================================= */

function getStanceBadgeClass(
  stance:
    InvestmentAIAnalysis[
      "stance"
    ],
): string {
  switch (
    stance
  ) {
    case "strong_bullish":
    case "bullish":
      return "badge badge--positive";

    case "bearish":
    case "strong_bearish":
      return "badge badge--negative";

    case "neutral":
      return "badge badge--warning";

    case "insufficient":
    default:
      return "badge";
  }
}


/* =========================================================
 * 7. FORECAST BADGE
 * ======================================================= */

function getForecastBadgeClass(
  direction:
    InvestmentAIForecast[
      "direction"
    ],
): string {
  switch (
    direction
  ) {
    case "up":
      return "badge badge--positive";

    case "down":
      return "badge badge--negative";

    case "flat":
    default:
      return "badge badge--warning";
  }
}


/* =========================================================
 * 8. CARD STYLE
 * ======================================================= */

const CARD_STYLE = {
  border:
    "1px solid rgba(128, 128, 128, 0.18)",

  borderRadius:
    "18px",

  padding:
    "20px",

  background:
    "rgba(255, 255, 255, 0.02)",
} as const;


/* =========================================================
 * 9. GRID STYLE
 * ======================================================= */

const GRID_STYLE = {
  display:
    "grid",

  gridTemplateColumns:
    "repeat(auto-fit, minmax(260px, 1fr))",

  gap:
    "16px",
} as const;


/* =========================================================
 * 10. SECTION STYLE
 * ======================================================= */

const SECTION_STYLE = {
  marginTop:
    "28px",
} as const;


/* =========================================================
 * 11. SECTION HEADER
 * ======================================================= */

function SectionHeader({
  title,
  description,
}: {
  title:
    string;

  description?:
    string;
}) {
  return (
    <div
      style={{
        marginBottom:
          "14px",
      }}
    >
      <h2
        style={{
          margin:
            0,

          fontSize:
            "1.1rem",
        }}
      >
        {title}
      </h2>

      {description ? (
        <p
          className="text-subtle"
          style={{
            margin:
              "5px 0 0",
          }}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}


/* =========================================================
 * 12. ACTION BUTTON STYLE
 * ======================================================= */

const ANALYZE_BUTTON_STYLE = {
  width:
    "100%",

  border:
    "0",

  borderRadius:
    "12px",

  padding:
    "11px 16px",

  font:
    "inherit",

  fontWeight:
    700,

  cursor:
    "pointer",

  background:
    "#111827",

  color:
    "#ffffff",
} as const;


/* =========================================================
 * 13. TECHNICAL EVIDENCE
 * ======================================================= */

function buildTechnicalEvidence(
  asset:
    InvestmentAsset,

  technical:
    ReturnType<
      typeof calculateInvestmentTechnicalSnapshot
    >,

  observedAt:
    string,
): InvestmentMarketEvidence {
  const value:
    JsonValue = {

      ticker:
        asset.ticker,

      data_points:
        technical.data_points,

      latest_date:
        technical.latest_date,

      latest_close:
        technical.latest_close,

      sma_20:
        technical.sma_20,

      sma_50:
        technical.sma_50,

      ema_20:
        technical.ema_20,

      rsi_14:
        technical.rsi_14,

      momentum_20_percent:
        technical.momentum_20_percent,

      annualized_volatility_percent:
        technical
          .annualized_volatility_percent,

      max_drawdown_percent:
        technical
          .max_drawdown_percent,

      technical_score:
        technical.technical_score,

      signal:
        technical.signal,
    };


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
      technical.technical_score ===
      null
        ? `تم تحليل ${technical.data_points} نقطة سعرية، ولكن البيانات غير كافية لإصدار Technical Score كامل.`
        : `تم تحليل ${technical.data_points} نقطة سعرية. Technical Score: ${technical.technical_score}. الإشارة: ${technical.signal}.`,

    value_json:
      value,
  };
}


/* =========================================================
 * 14. PORTFOLIO EVIDENCE
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
      allocationPercent ===
      null
        ? `الكمية الحالية ${asset.quantity}. لا يمكن حساب الوزن ضمن المحفظة الحالية بدون تحويل عملات موثوق.`
        : `الكمية الحالية ${asset.quantity}. الوزن الحالي في المحفظة ${allocationPercent.toFixed(2)}%.`,

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
        asset
          .monthly_contribution_target,
    },
  };
}


/* =========================================================
 * 15. ANALYSIS ERROR STATUS
 * ======================================================= */

function getAnalysisFailureStatus(
  error:
    unknown,
): string {
  if (
    error instanceof
    InvestmentMarketDataError
  ) {
    switch (
      error.code
    ) {
      case "CONFIGURATION_MISSING":
      case "UNAUTHORIZED":
      case "FORBIDDEN":
        return "market_configuration";

      case "RATE_LIMITED":
        return "rate_limited";

      case "DATA_NOT_FOUND":
      case "PRICE_HISTORY_UNAVAILABLE":
      case "INSTRUMENT_MISMATCH":
      case "CURRENCY_MISMATCH":
        return "market_data_unavailable";

      default:
        return "market_error";
    }
  }


  if (
    error instanceof
    InvestmentCommitteeError
  ) {
    switch (
      error.code
    ) {
      case "INSUFFICIENT_EVIDENCE":
        return "insufficient_evidence";

      case "OPENAI_UNAVAILABLE":
        return "ai_unavailable";

      case "INVALID_FORECAST":
      case "INVALID_RESPONSE":
      case "EMPTY_RESPONSE":
        return "ai_invalid";

      default:
        return "analysis_error";
    }
  }


  if (
    error instanceof
    InvestmentIntelligenceDataError
  ) {
    return "data_error";
  }


  return "analysis_error";
}


/* =========================================================
 * 16. SERVER ACTION
 * ======================================================= */

/**
 * User explicitly clicks:
 *
 * تحليل الآن
 *
 *
 * Nothing runs autonomously.
 */
async function analyzeInvestmentAssetAction(
  formData:
    FormData,
): Promise<void> {
  "use server";


  await requireAuthenticatedIdentity();


  const rawAssetId =
    formData.get(
      "asset_id",
    );


  if (
    typeof rawAssetId !==
      "string" ||
    rawAssetId
      .trim()
      .length ===
      0
  ) {
    redirect(
      "/investments/intelligence?status=invalid_asset",
    );
  }


  const assetId =
    rawAssetId.trim();


  try {

    /* -----------------------------------------------------
     * EXACT OWNED ASSET
     * -------------------------------------------------- */

    const asset =
      await requireInvestmentIntelligenceAsset(
        assetId,
      );


    if (
      !asset.is_active
    ) {
      redirect(
        "/investments/intelligence?status=inactive_asset",
      );
    }


    /* -----------------------------------------------------
     * CURRENT PORTFOLIO
     * -------------------------------------------------- */

    const portfolio =
      await getInvestmentSnapshot();


    const position =
      portfolio.positions.find(
        (
          item,
        ) =>
          item.asset.id ===
          asset.id,
      );


    const allocationPercent =
      position
        ?.allocation_percent ??
      null;


    /* -----------------------------------------------------
     * REAL MARKET DATA
     * -------------------------------------------------- */

    const marketData =
      await fetchInvestmentResearchData(
        asset,
      );


    /* -----------------------------------------------------
     * DETERMINISTIC TECHNICAL ENGINE
     * -------------------------------------------------- */

    const technical =
      calculateInvestmentTechnicalSnapshot(
        marketData.price_history,
      );


    /* -----------------------------------------------------
     * FULL AUDITABLE EVIDENCE
     * -------------------------------------------------- */

    const evidence:
      InvestmentMarketEvidence[] = [
        ...marketData.evidence,

        buildTechnicalEvidence(
          asset,
          technical,
          marketData.fetched_at,
        ),

        buildPortfolioEvidence(
          asset,
          allocationPercent,
          portfolio.currency,
          marketData.fetched_at,
        ),
      ];


    /* -----------------------------------------------------
     * INVESTMENT COMMITTEE AI
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
          technical,

        portfolio: {
          current_allocation_percent:
            allocationPercent,

          /*
           * LIFE OS currently has no authoritative personal
           * concentration ceiling.
           *
           * Never invent one.
           */
          preferred_max_allocation_percent:
            null,
        },

        evidence,
      });


    /* -----------------------------------------------------
     * APPEND-ONLY STORAGE
     * -------------------------------------------------- */

    await createInvestmentAIAnalysisPackage(
      committee.package_input,
    );

  } catch (
    error
  ) {
    const status =
      getAnalysisFailureStatus(
        error,
      );


    redirect(
      `/investments/intelligence?status=${status}`,
    );
  }


  /* -------------------------------------------------------
   * REFRESH PAGE
   * ---------------------------------------------------- */

  revalidatePath(
    "/investments/intelligence",
  );


  revalidatePath(
    "/investments",
  );


  revalidatePath(
    "/finance",
  );


  redirect(
    "/investments/intelligence?status=analysis_complete",
  );
}


/* =========================================================
 * 17. STATUS MESSAGE
 * ======================================================= */

function getStatusMessage(
  status:
    string |
    null,
): {
  text:
    string;

  tone:
    "positive" |
    "warning" |
    "negative";
} | null {
  switch (
    status
  ) {
    case "analysis_complete":
      return {
        text:
          "تم التحليل وحفظ التوقعات بنجاح.",

        tone:
          "positive",
      };


    case "market_configuration":
      return {
        text:
          "مزود بيانات السوق يحتاج إعداد قبل تشغيل التحليل.",

        tone:
          "warning",
      };


    case "rate_limited":
      return {
        text:
          "مزود السوق وصل حد الطلبات مؤقتًا. جرّب لاحقًا.",

        tone:
          "warning",
      };


    case "market_data_unavailable":
      return {
        text:
          "ما حصلنا بيانات سوق كافية لهذا الأصل حاليًا.",

        tone:
          "warning",
      };


    case "insufficient_evidence":
      return {
        text:
          "الأدلة الحالية غير كافية لإصدار تحليل موثوق.",

        tone:
          "warning",
      };


    case "ai_unavailable":
      return {
        text:
          "LIFE Invest AI غير متاح مؤقتًا.",

        tone:
          "warning",
      };


    case "inactive_asset":
      return {
        text:
          "هذا الأصل غير نشط في المحفظة.",

        tone:
          "warning",
      };


    case "invalid_asset":
      return {
        text:
          "الأصل المحدد غير صالح.",

        tone:
          "negative",
      };


    case "ai_invalid":
    case "market_error":
    case "data_error":
    case "analysis_error":
      return {
        text:
          "تعذر إكمال التحليل بأمان. لم يتم إنشاء توصية غير موثوقة.",

        tone:
          "negative",
      };


    default:
      return null;
  }
}


/* =========================================================
 * 18. BEST ANALYSIS
 * ======================================================= */

function getBestCurrentAnalysis(
  analyses:
    InvestmentAIAnalysis[],
): InvestmentAIAnalysis | null {
  return [
    ...analyses,
  ]
    .filter(
      (
        analysis,
      ) =>
        analysis.overall_score !==
        null,
    )
    .sort(
      (
        a,
        b,
      ) =>
        (
          b.overall_score ??
          -1
        ) -
        (
          a.overall_score ??
          -1
        ),
    )[0] ??
    null;
}


/* =========================================================
 * 19. LATEST ANALYSIS LOOKUP
 * ======================================================= */

function buildLatestAnalysisMap(
  analyses:
    InvestmentAIAnalysis[],
): Map<
  UUID,
  InvestmentAIAnalysis
> {
  const map =
    new Map<
      UUID,
      InvestmentAIAnalysis
    >();


  for (
    const analysis of
      analyses
  ) {
    if (
      !analysis.asset_id
    ) {
      continue;
    }


    if (
      !map.has(
        analysis.asset_id,
      )
    ) {
      map.set(
        analysis.asset_id,
        analysis,
      );
    }
  }


  return map;
}


/* =========================================================
 * 20. ASSET LOOKUP
 * ======================================================= */

function buildAssetMap(
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
 * 21. TRACK RECORD VIEW
 * ======================================================= */

function TrackRecordSection({
  trackRecord,
}: {
  trackRecord:
    Awaited<
      ReturnType<
        typeof getInvestmentIntelligenceSnapshot
      >
    >[
      "track_record"
    ];
}) {
  if (
    !trackRecord ||
    trackRecord.evaluated_forecasts ===
      0
  ) {
    return (
      <EmptyState
        compact
        title="السجل يبدأ من أول توقع مكتمل"
        description="بعد انتهاء أول Forecast وتسجيل السعر الفعلي، يبدأ LIFE OS بقياس الدقة تلقائيًا."
      />
    );
  }


  const grade =
    getInvestmentTrackRecordGrade({
      evaluated_forecasts:
        trackRecord.evaluated_forecasts,

      directional_accuracy_percent:
        trackRecord
          .directional_accuracy_percent,

      average_brier_score:
        trackRecord
          .average_brier_score,
    });


  const calibration =
    trackRecord.average_brier_score ===
    null
      ? null
      : calculateTrackRecordCalibrationScore(
          trackRecord.average_brier_score,
        );


  return (
    <div style={GRID_STYLE}>
      <StatCard
        label="التوقعات المقيمة"
        value={
          trackRecord
            .evaluated_forecasts
        }
        helper={
          trackRecord.evaluated_forecasts <
          10
            ? "العينة ما زالت صغيرة"
            : "سجل قابل للقياس"
        }
      />

      <StatCard
        label="دقة الاتجاه"
        value={
          trackRecord
            .directional_accuracy_percent ===
          null
            ? "—"
            : formatPercent(
                trackRecord
                  .directional_accuracy_percent,
              )
        }
        tone={
          trackRecord
            .directional_accuracy_percent !==
            null &&
          trackRecord
            .directional_accuracy_percent >=
            55
            ? "positive"
            : "neutral"
        }
      />

      <StatCard
        label="دقة النطاق"
        value={
          trackRecord
            .base_range_accuracy_percent ===
          null
            ? "—"
            : formatPercent(
                trackRecord
                  .base_range_accuracy_percent,
              )
        }
      />

      <StatCard
        label="معايرة الاحتمالات"
        value={
          calibration ===
          null
            ? "—"
            : formatPercent(
                calibration,
              )
        }
        helper={
          getTrackRecordGradeLabel(
            grade,
          )
        }
      />
    </div>
  );
}


/* =========================================================
 * 22. FORECAST CARD
 * ======================================================= */

function ForecastCard({
  forecast,
  asset,
}: {
  forecast:
    InvestmentAIForecast;

  asset:
    InvestmentAsset |
    undefined;
}) {
  return (
    <article style={CARD_STYLE}>
      <div
        style={{
          display:
            "flex",

          justifyContent:
            "space-between",

          gap:
            "12px",

          alignItems:
            "flex-start",
        }}
      >
        <div>
          <strong className="ticker">
            {
              asset
                ?.ticker ??
              "—"
            }
          </strong>

          <div
            className="text-subtle text-small"
            style={{
              marginTop:
                "3px",
            }}
          >
            {
              forecast.horizon_days
            } يوم
          </div>
        </div>

        <span
          className={
            getForecastBadgeClass(
              forecast.direction,
            )
          }
        >
          {
            getForecastDirectionLabel(
              forecast.direction,
            )
          }
        </span>
      </div>

      <div
        style={{
          marginTop:
            "18px",

          display:
            "grid",

          gridTemplateColumns:
            "repeat(3, 1fr)",

          gap:
            "8px",
        }}
      >
        <div>
          <div className="text-subtle text-small">
            صعود
          </div>

          <strong>
            {
              formatPercent(
                forecast
                  .up_probability,
              )
            }
          </strong>
        </div>

        <div>
          <div className="text-subtle text-small">
            جانبي
          </div>

          <strong>
            {
              formatPercent(
                forecast
                  .flat_probability,
              )
            }
          </strong>
        </div>

        <div>
          <div className="text-subtle text-small">
            هبوط
          </div>

          <strong>
            {
              formatPercent(
                forecast
                  .down_probability,
              )
            }
          </strong>
        </div>
      </div>

      <div
        style={{
          marginTop:
            "18px",

          paddingTop:
            "14px",

          borderTop:
            "1px solid rgba(128, 128, 128, 0.15)",
        }}
      >
        <div
          className="text-subtle text-small"
        >
          Base Case
        </div>

        <strong>
          {
            formatCurrency(
              forecast.base_low,
              forecast.currency,
            )
          }
          {" – "}
          {
            formatCurrency(
              forecast.base_high,
              forecast.currency,
            )
          }
        </strong>
      </div>

      <div
        style={{
          marginTop:
            "12px",
        }}
      >
        <span className="text-subtle text-small">
          العائد المتوقع بمنتصف النطاق
        </span>

        <div>
          <strong>
            {
              formatPercent(
                forecast
                  .expected_return_mid_percent,
              )
            }
          </strong>
        </div>
      </div>

      <div
        style={{
          marginTop:
            "12px",
        }}
      >
        <span className="text-subtle text-small">
          تاريخ التقييم
        </span>

        <div>
          {
            formatDate(
              forecast.target_date,
            )
          }
        </div>
      </div>

      <p
        className="text-subtle text-small"
        style={{
          margin:
            "14px 0 0",

          lineHeight:
            1.7,
        }}
      >
        {forecast.thesis}
      </p>
    </article>
  );
}


/* =========================================================
 * 23. ASSET INTELLIGENCE CARD
 * ======================================================= */

function AssetIntelligenceCard({
  asset,
  analysis,
}: {
  asset:
    InvestmentAsset;

  analysis:
    InvestmentAIAnalysis |
    null;
}) {
  return (
    <article style={CARD_STYLE}>
      <div
        style={{
          display:
            "flex",

          justifyContent:
            "space-between",

          gap:
            "12px",

          alignItems:
            "flex-start",
        }}
      >
        <div>
          <strong
            className="ticker"
            style={{
              fontSize:
                "1.1rem",
            }}
          >
            {asset.ticker}
          </strong>

          <div
            className="text-subtle text-small"
            style={{
              marginTop:
                "3px",
            }}
          >
            {asset.name}
          </div>

          <div
            className="text-subtle text-small"
            style={{
              marginTop:
                "3px",
            }}
          >
            {asset.market}
          </div>
        </div>

        {analysis ? (
          <span
            className={
              getRecommendationBadgeClass(
                analysis.recommendation,
              )
            }
          >
            {
              getInvestmentRecommendationLabel(
                analysis.recommendation,
              )
            }
          </span>
        ) : (
          <span className="badge">
            غير محلل
          </span>
        )}
      </div>

      <div
        style={{
          marginTop:
            "20px",

          display:
            "flex",

          justifyContent:
            "space-between",

          gap:
            "16px",
        }}
      >
        <div>
          <div className="text-subtle text-small">
            LIFE Score
          </div>

          <strong
            style={{
              fontSize:
                "1.4rem",
            }}
          >
            {
              formatAIScore(
                analysis
                  ?.overall_score ??
                null,
              )
            }
          </strong>
        </div>

        <div
          style={{
            textAlign:
              "end",
          }}
        >
          <div className="text-subtle text-small">
            الثقة
          </div>

          <strong>
            {
              analysis
                ? formatPercent(
                    analysis.confidence,
                  )
                : "—"
            }
          </strong>
        </div>
      </div>

      {analysis ? (
        <>
          <div
            style={{
              marginTop:
                "14px",
            }}
          >
            <span
              className={
                getStanceBadgeClass(
                  analysis.stance,
                )
              }
            >
              {
                getInvestmentStanceLabel(
                  analysis.stance,
                )
              }
            </span>
          </div>

          <p
            style={{
              margin:
                "14px 0 0",

              lineHeight:
                1.7,
            }}
          >
            {analysis.summary}
          </p>

          <div
            className="text-subtle text-small"
            style={{
              marginTop:
                "12px",
            }}
          >
            آخر تحليل:{" "}
            {
              formatDate(
                analysis.as_of,
              )
            }
          </div>
        </>
      ) : (
        <p
          className="text-subtle"
          style={{
            margin:
              "14px 0 0",

            lineHeight:
              1.7,
          }}
        >
          شغّل أول تحليل عشان يبدأ LIFE Invest AI يبني رأيه وسجل توقعاته.
        </p>
      )}

      <div
        style={{
          marginTop:
            "18px",

          paddingTop:
            "16px",

          borderTop:
            "1px solid rgba(128, 128, 128, 0.15)",
        }}
      >
        <div
          style={{
            display:
              "flex",

            justifyContent:
              "space-between",

            gap:
              "12px",

            marginBottom:
              "12px",
          }}
        >
          <span className="text-subtle text-small">
            الكمية
          </span>

          <strong>
            {
              formatQuantity(
                asset.quantity,
              )
            }
          </strong>
        </div>

        <div
          style={{
            display:
              "flex",

            justifyContent:
              "space-between",

            gap:
              "12px",

            marginBottom:
              "12px",
          }}
        >
          <span className="text-subtle text-small">
            متوسط التكلفة
          </span>

          <strong>
            {
              formatPrice(
                asset.average_cost,
              )
            }
          </strong>
        </div>

        <form
          action={
            analyzeInvestmentAssetAction
          }
        >
          <input
            type="hidden"
            name="asset_id"
            value={asset.id}
          />

          <button
            type="submit"
            style={
              ANALYZE_BUTTON_STYLE
            }
          >
            {
              analysis
                ? "تحديث التحليل"
                : "تحليل الآن"
            }
          </button>
        </form>
      </div>
    </article>
  );
}


/* =========================================================
 * 24. MAIN PAGE
 * ======================================================= */

export default async function InvestmentIntelligencePage({
  searchParams,
}: InvestmentIntelligencePageProps) {

  /* -------------------------------------------------------
   * AUTH
   * ---------------------------------------------------- */

  await requireAuthenticatedIdentity();


  /* -------------------------------------------------------
   * QUERY STATUS
   * ---------------------------------------------------- */

  const params =
    searchParams
      ? await searchParams
      : {};


  const rawStatus =
    params.status;


  const status =
    typeof rawStatus ===
    "string"
      ? rawStatus
      : null;


  const statusMessage =
    getStatusMessage(
      status,
    );


  /* -------------------------------------------------------
   * DATA
   * ---------------------------------------------------- */

  const snapshot =
    await getInvestmentIntelligenceSnapshot();


  const latestAnalysisMap =
    buildLatestAnalysisMap(
      snapshot.latest_analyses,
    );


  const assetMap =
    buildAssetMap(
      snapshot.assets,
    );


  const bestAnalysis =
    getBestCurrentAnalysis(
      snapshot.latest_analyses,
    );


  const bestAsset =
    bestAnalysis
      ?.asset_id
      ? assetMap.get(
          bestAnalysis.asset_id,
        )
      : undefined;


  const analyzedAssetCount =
    new Set(
      snapshot.latest_analyses
        .map(
          (
            analysis,
          ) =>
            analysis.asset_id,
        )
        .filter(
          (
            assetId,
          ): assetId is UUID =>
            assetId !==
            null,
        ),
    ).size;


  /* -------------------------------------------------------
   * TRACK RECORD HEADLINE
   * ---------------------------------------------------- */

  const directionalAccuracy =
    snapshot.track_record
      ?.directional_accuracy_percent ??
    null;


  /* -------------------------------------------------------
   * RENDER
   * ---------------------------------------------------- */

  return (
    <AppShell>

      <PageHeader
        eyebrow="الاستثمارات"
        title="LIFE Invest AI"
        description="محلل استثماري شخصي يجمع السوق، الأرقام، الشارت، الأخبار ومحفظتك — ثم يسجل توقعاته ويحاسب نفسه عليها."
        action={
          <Link
            href="/investments"
            style={{
              textDecoration:
                "none",
            }}
          >
            ← المحفظة
          </Link>
        }
      />


      {/* ===================================================
       * STATUS
       * ================================================= */}

      {statusMessage ? (
        <div
          className={[
            "badge",
            statusMessage.tone ===
              "positive"
              ? "badge--positive"
              : statusMessage.tone ===
                  "warning"
                ? "badge--warning"
                : "badge--negative",
          ].join(" ")}
          style={{
            display:
              "block",

            width:
              "100%",

            padding:
              "12px 14px",

            marginBottom:
              "22px",

            whiteSpace:
              "normal",
          }}
        >
          {
            statusMessage.text
          }
        </div>
      ) : null}


      {/* ===================================================
       * HEADLINE
       * ================================================= */}

      <div style={GRID_STYLE}>

        <StatCard
          label="أفضل فرصة حاليًا"
          value={
            bestAsset
              ?.ticker ??
            "—"
          }
          helper={
            bestAnalysis
              ? getInvestmentRecommendationLabel(
                  bestAnalysis
                    .recommendation,
                )
              : "ابدأ أول تحليل"
          }
          tone={
            getScoreTone(
              bestAnalysis
                ?.overall_score ??
              null,
            )
          }
        />

        <StatCard
          label="أفضل LIFE Score"
          value={
            formatAIScore(
              bestAnalysis
                ?.overall_score ??
              null,
            )
          }
          helper={
            bestAnalysis
              ? getInvestmentStanceLabel(
                  bestAnalysis.stance,
                )
              : "لا توجد تحليلات بعد"
          }
          tone={
            getScoreTone(
              bestAnalysis
                ?.overall_score ??
              null,
            )
          }
        />

        <StatCard
          label="دقة الاتجاه"
          value={
            directionalAccuracy ===
            null
              ? "—"
              : formatPercent(
                  directionalAccuracy,
                )
          }
          helper={
            snapshot.track_record
              ?.evaluated_forecasts
              ? `${snapshot.track_record.evaluated_forecasts} توقع مقيم`
              : "يبدأ القياس بعد انتهاء التوقعات"
          }
        />

        <StatCard
          label="التوقعات المفتوحة"
          value={
            snapshot
              .open_forecasts
              .length
          }
          helper={
            `${analyzedAssetCount} أصل محلل`
          }
        />

      </div>


      {/* ===================================================
       * ASSETS
       * ================================================= */}

      <section style={SECTION_STYLE}>
        <SectionHeader
          title="محفظتي × LIFE Invest AI"
          description="اختر أي أصل لتشغيل تحليل جديد. ما يتم شراء أو بيع أي شيء."
        />

        {snapshot.assets.length ===
        0 ? (
          <EmptyState
            title="ما عندك استثمارات مسجلة"
            description="أضف أصولك أولًا من صفحة الاستثمارات."
            action={
              <Link href="/investments">
                فتح الاستثمارات
              </Link>
            }
          />
        ) : (
          <div style={GRID_STYLE}>
            {
              snapshot.assets.map(
                (
                  asset,
                ) => (
                  <AssetIntelligenceCard
                    key={asset.id}
                    asset={asset}
                    analysis={
                      latestAnalysisMap.get(
                        asset.id,
                      ) ??
                      null
                    }
                  />
                ),
              )
            }
          </div>
        )}
      </section>


      {/* ===================================================
       * TRACK RECORD
       * ================================================= */}

      <section style={SECTION_STYLE}>
        <SectionHeader
          title="Track Record"
          description="الأداء الحقيقي للتوقعات القديمة — بدون حذف الخسائر أو تعديل الماضي."
        />

        <TrackRecordSection
          trackRecord={
            snapshot.track_record
          }
        />
      </section>


      {/* ===================================================
       * ACTIVE FORECASTS
       * ================================================= */}

      <section style={SECTION_STYLE}>
        <SectionHeader
          title="التوقعات المفتوحة"
          description="كل توقع محفوظ بتاريخ صدوره ويظل ثابتًا حتى موعد تقييمه."
        />

        {snapshot
          .open_forecasts
          .length ===
        0 ? (
          <EmptyState
            compact
            title="ما عندنا توقعات مفتوحة بعد"
            description="شغّل تحليل على أحد أصولك ليتم إنشاء توقعات احتمالية."
          />
        ) : (
          <div style={GRID_STYLE}>
            {
              snapshot
                .open_forecasts
                .map(
                  (
                    forecast,
                  ) => (
                    <ForecastCard
                      key={
                        forecast.id
                      }
                      forecast={
                        forecast
                      }
                      asset={
                        assetMap.get(
                          forecast
                            .asset_id,
                        )
                      }
                    />
                  ),
                )
            }
          </div>
        )}
      </section>


      {/* ===================================================
       * LATEST RESULTS
       * ================================================= */}

      <section style={SECTION_STYLE}>
        <SectionHeader
          title="آخر النتائج"
          description="كيف كان توقع LIFE Invest AI مقارنة بالسعر الحقيقي؟"
        />

        {snapshot
          .recent_outcomes
          .length ===
        0 ? (
          <EmptyState
            compact
            title="لسه ما انتهى أي Forecast"
            description="عقب انتهاء أول فترة توقع، يبدأ هنا سجل الصح والخطأ."
          />
        ) : (
          <div style={GRID_STYLE}>
            {
              snapshot
                .recent_outcomes
                .slice(
                  0,
                  6,
                )
                .map(
                  (
                    outcome,
                  ) => (
                    <article
                      key={
                        outcome.id
                      }
                      style={
                        CARD_STYLE
                      }
                    >
                      <div
                        style={{
                          display:
                            "flex",

                          justifyContent:
                            "space-between",

                          gap:
                            "12px",
                        }}
                      >
                        <strong>
                          {
                            outcome
                              .direction_correct
                              ? "الاتجاه صحيح ✓"
                              : "الاتجاه غير صحيح"
                          }
                        </strong>

                        <span
                          className={
                            outcome
                              .direction_correct
                              ? "badge badge--positive"
                              : "badge badge--negative"
                          }
                        >
                          {
                            outcome
                              .actual_direction
                          }
                        </span>
                      </div>

                      <div
                        style={{
                          marginTop:
                            "16px",
                        }}
                      >
                        <div
                          className="text-subtle text-small"
                        >
                          الحركة الفعلية
                        </div>

                        <strong>
                          {
                            formatPercent(
                              outcome
                                .actual_change_percent,
                            )
                          }
                        </strong>
                      </div>

                      <div
                        style={{
                          marginTop:
                            "12px",
                        }}
                      >
                        <div
                          className="text-subtle text-small"
                        >
                          خطأ التوقع
                        </div>

                        <strong>
                          {
                            formatPercent(
                              outcome
                                .absolute_error_percent,
                            )
                          }
                        </strong>
                      </div>

                      <div
                        style={{
                          marginTop:
                            "12px",
                        }}
                      >
                        <div
                          className="text-subtle text-small"
                        >
                          Base Range
                        </div>

                        <strong>
                          {
                            outcome
                              .base_range_hit
                              ? "داخل النطاق ✓"
                              : "خارج النطاق"
                          }
                        </strong>
                      </div>

                      <div
                        style={{
                          marginTop:
                            "12px",
                        }}
                      >
                        <div
                          className="text-subtle text-small"
                        >
                          Brier Score
                        </div>

                        <strong>
                          {
                            outcome
                              .brier_score
                          }
                        </strong>
                      </div>
                    </article>
                  ),
                )
            }
          </div>
        )}
      </section>


      {/* ===================================================
       * METHODOLOGY
       * ================================================= */}

      <section
        style={{
          ...SECTION_STYLE,
          ...CARD_STYLE,
        }}
      >
        <SectionHeader
          title="كيف LIFE Invest AI يفكر؟"
        />

        <div
          style={{
            display:
              "grid",

            gap:
              "8px",
          }}
        >
          <div>
            بيانات السوق الحقيقية
          </div>

          <div>
            ↓
          </div>

          <div>
            Fundamental + Technical + News + Macro
          </div>

          <div>
            ↓
          </div>

          <div>
            Portfolio Fit + Risk
          </div>

          <div>
            ↓
          </div>

          <div>
            Investment Committee AI
          </div>

          <div>
            ↓
          </div>

          <div>
            LIFE Score + احتمالات Bull / Base / Bear
          </div>

          <div>
            ↓
          </div>

          <div>
            توقع محفوظ لا يتغير
          </div>

          <div>
            ↓
          </div>

          <strong>
            Track Record حقيقي
          </strong>
        </div>

        <p
          className="text-subtle text-small"
          style={{
            margin:
              "18px 0 0",

            lineHeight:
              1.7,
          }}
        >
          LIFE Invest AI أداة تحليل ومساندة قرار فقط. ما عنده أي صلاحية شراء أو بيع أو تنفيذ أوامر استثمارية.
        </p>
      </section>

    </AppShell>
  );
}


/* =========================================================
 * 25. EXPLICIT ACTION RULE
 * ======================================================= */

/**
 * Analysis starts only when:
 *
 * user clicks:
 *
 * تحليل الآن
 *
 *
 * No background autonomous analysis is introduced here.
 */


/* =========================================================
 * 26. UI RULE
 * ======================================================= */

/**
 * The normal Investments page remains the primary portfolio
 * page.
 *
 *
 * LIFE Invest AI is an optional intelligence layer.
 *
 *
 * It does not replace:
 *
 * portfolio holdings
 * transactions
 * cost basis
 * investment plan
 */


/* =========================================================
 * 27. ACCURACY RULE
 * ======================================================= */

/**
 * UI never displays:
 *
 * "95% AI accuracy"
 *
 * unless immutable historical outcomes mathematically produce
 * that number.
 */


/* =========================================================
 * 28. RECOMMENDATION RULE
 * ======================================================= */

/**
 * Recommendation is displayed as:
 *
 * accumulate
 * hold
 * watch
 * avoid
 *
 *
 * It is advisory only.
 *
 * No button on this page performs:
 *
 * buy
 * sell
 * transfer
 */


/* =========================================================
 * 29. FINAL LIFE INVEST AI UI
 * ======================================================= */

/**
 * Portfolio
 *      ↓
 * Analyze
 *      ↓
 * Evidence
 *      ↓
 * LIFE Score
 *      ↓
 * Recommendation
 *      ↓
 * Probability Forecast
 *      ↓
 * Immutable history
 *      ↓
 * Track Record
 *
 *
 * Simple outside.
 *
 * Intelligent underneath.
 */