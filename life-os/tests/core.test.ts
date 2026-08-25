import {
  describe,
  expect,
  it,
} from "vitest";

import {
  AI_TOOL_NAMES,
  APPLICATION_SAFETY_DEFAULTS,
  APP_PHASE,
  APP_VERSION,
  DEFAULT_CURRENCY,
  DEFAULT_TIMEZONE,
  GROWTH_ROUTE,
  HOME_ROUTE,
  INVESTMENT_INTELLIGENCE_ANALYZE_API_ROUTE,
  INVESTMENT_INTELLIGENCE_TRACK_RECORD_API_ROUTE,
  LIFE_AI_ROUTE,
  LIFE_OS_INVESTMENT_INTELLIGENCE_TABLES,
  LIFE_OS_TABLES,
  LIFE_OS_TRAVEL_TABLES,
  MAX_DASHBOARD_PRIORITIES,
  MAX_DASHBOARD_TRIPS,
  MONEY_ROUTE,
  NAVIGATION_ITEMS,
  PLANS_ROUTE,
  PRIVATE_DOCUMENT_STORAGE_BUCKET,
  PROTECTED_ROUTES,
  REQUIRED_AUTHENTICATION_LEVEL,
  TRAVEL_ROUTE,
} from "@/lib/constants";

import {
  calculateFinanceTotals,
  calculateInvestmentSnapshot,
} from "@/lib/data";

import {
  calculateInvestmentBrierScore,
  calculateInvestmentIntelligenceScore,
  calculateInvestmentTechnicalSnapshot,
  calculatePortfolioFitScore,
  evaluateInvestmentForecast,
  getPrimaryForecastDirection,
  summarizeInvestmentTrackRecord,
  validateInvestmentForecast,
  type InvestmentForecastDraft,
  type InvestmentMarketPricePoint,
} from "@/lib/investment-intelligence";

import {
  formatCurrency,
  formatPercent,
  formatPrice,
  formatProgress,
  formatQuantity,
  formatSignedCurrency,
} from "@/lib/format";

import type {
  BudgetItem,
  IncomeSource,
  InvestmentAsset,
} from "@/lib/types";


/* =========================================================
 * LIFE OS V2
 * CORE TESTS
 *
 * Protects:
 *
 * - deterministic finance
 * - deterministic investments
 * - LIFE Invest AI deterministic calculations
 * - technical analysis calculations
 * - forecast validation
 * - forecast grading
 * - Brier score
 * - Track Record
 * - exactly six primary life areas
 * - Travel as a first-class V2 area
 * - mandatory AAL2 application contract
 * - complete database table registry
 * - AI execution boundaries
 * - autonomous execution disabled
 *
 *
 * Synthetic data only.
 *
 * No database.
 * No OpenAI.
 * No market API.
 * No production secrets.
 * ======================================================= */


/* =========================================================
 * 1. SYNTHETIC HELPERS
 * ======================================================= */

function income(
  overrides:
    Partial<IncomeSource> = {},
): IncomeSource {
  return {
    id:
      "11111111-1111-4111-8111-111111111111",

    user_id:
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",

    name:
      "Synthetic Salary",

    amount:
      12_000,

    frequency:
      "monthly",

    is_active:
      true,

    next_expected_date:
      null,

    notes:
      null,

    created_at:
      "2026-01-01T00:00:00.000Z",

    updated_at:
      "2026-01-01T00:00:00.000Z",

    ...overrides,
  } as IncomeSource;
}


function budget(
  overrides:
    Partial<BudgetItem> = {},
): BudgetItem {
  return {
    id:
      "22222222-2222-4222-8222-222222222222",

    user_id:
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",

    name:
      "Synthetic Expense",

    category:
      "other",

    item_type:
      "expense",

    amount:
      1_000,

    frequency:
      "monthly",

    due_day:
      null,

    is_active:
      true,

    notes:
      null,

    created_at:
      "2026-01-01T00:00:00.000Z",

    updated_at:
      "2026-01-01T00:00:00.000Z",

    ...overrides,
  } as BudgetItem;
}


function asset(
  overrides:
    Partial<InvestmentAsset> = {},
): InvestmentAsset {
  return {
    id:
      "33333333-3333-4333-8333-333333333333",

    user_id:
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",

    ticker:
      "TEST",

    name:
      "Synthetic Asset",

    market:
      "TEST",

    asset_type:
      "stock",

    currency:
      "AED",

    quantity:
      100,

    average_cost:
      10,

    reference_price:
      12,

    target_quantity:
      200,

    monthly_contribution_target:
      500,

    is_active:
      true,

    notes:
      null,

    created_at:
      "2026-01-01T00:00:00.000Z",

    updated_at:
      "2026-01-01T00:00:00.000Z",

    ...overrides,
  } as InvestmentAsset;
}


function createAscendingPriceSeries(
  count:
    number = 60,
): InvestmentMarketPricePoint[] {
  return Array.from(
    {
      length:
        count,
    },
    (
      _,
      index,
    ) => ({
      date:
        `2026-01-${String(
          index + 1,
        ).padStart(
          2,
          "0",
        )}`,

      close:
        index + 1,
    }),
  );
}


function validForecast(
  overrides:
    Partial<InvestmentForecastDraft> = {},
): InvestmentForecastDraft {
  return {
    horizon_days:
      30,

    target_date:
      "2026-09-24",

    reference_price:
      100,

    currency:
      "AED",

    up_probability:
      60,

    flat_probability:
      25,

    down_probability:
      15,

    direction:
      "up",

    flat_threshold_percent:
      1,

    bull_low:
      115,

    bull_high:
      130,

    base_low:
      105,

    base_high:
      112,

    bear_low:
      80,

    bear_high:
      95,

    invalidation_price:
      90,

    confidence:
      80,

    thesis:
      "Synthetic forecast for deterministic testing only.",

    ...overrides,
  };
}


/* =========================================================
 * 2. APPLICATION VERSION
 * ======================================================= */

describe(
  "LIFE OS V2 application identity",
  () => {
    it(
      "uses the final V2 phase",
      () => {
        expect(
          APP_PHASE,
        ).toBe(
          "V2",
        );
      },
    );


    it(
      "uses the final V2 version",
      () => {
        expect(
          APP_VERSION,
        ).toBe(
          "2.0.0",
        );
      },
    );


    it(
      "uses AED as the default currency",
      () => {
        expect(
          DEFAULT_CURRENCY,
        ).toBe(
          "AED",
        );
      },
    );


    it(
      "uses Dubai timezone as the default",
      () => {
        expect(
          DEFAULT_TIMEZONE,
        ).toBe(
          "Asia/Dubai",
        );
      },
    );
  },
);


/* =========================================================
 * 3. FINAL PRIMARY NAVIGATION
 * ======================================================= */

describe(
  "LIFE OS V2 primary navigation",
  () => {
    it(
      "contains exactly six primary destinations",
      () => {
        expect(
          NAVIGATION_ITEMS,
        ).toHaveLength(
          6,
        );
      },
    );


    it(
      "contains no duplicate primary routes",
      () => {
        const routes =
          NAVIGATION_ITEMS.map(
            (
              item,
            ) =>
              item.href,
          );


        expect(
          new Set(
            routes,
          ).size,
        ).toBe(
          routes.length,
        );
      },
    );


    it(
      "uses the final six labels in order",
      () => {
        expect(
          NAVIGATION_ITEMS.map(
            (
              item,
            ) =>
              item.label,
          ),
        ).toEqual([
          "الرئيسية",
          "المال",
          "خططي",
          "السفر",
          "التطوير",
          "LIFE AI",
        ]);
      },
    );


    it(
      "uses the final six routes in order",
      () => {
        expect(
          NAVIGATION_ITEMS.map(
            (
              item,
            ) =>
              item.href,
          ),
        ).toEqual([
          "/dashboard",
          "/finance",
          "/goals",
          "/travel",
          "/learning",
          "/assistant",
        ]);
      },
    );


    it(
      "keeps canonical route constants aligned",
      () => {
        expect(
          HOME_ROUTE,
        ).toBe(
          "/dashboard",
        );


        expect(
          MONEY_ROUTE,
        ).toBe(
          "/finance",
        );


        expect(
          PLANS_ROUTE,
        ).toBe(
          "/goals",
        );


        expect(
          TRAVEL_ROUTE,
        ).toBe(
          "/travel",
        );


        expect(
          GROWTH_ROUTE,
        ).toBe(
          "/learning",
        );


        expect(
          LIFE_AI_ROUTE,
        ).toBe(
          "/assistant",
        );
      },
    );
  },
);


/* =========================================================
 * 4. AUTHENTICATION CONTRACT
 * ======================================================= */

describe(
  "LIFE OS V2 authentication contract",
  () => {
    it(
      "requires AAL2 for private authenticated use",
      () => {
        expect(
          REQUIRED_AUTHENTICATION_LEVEL,
        ).toBe(
          "aal2",
        );
      },
    );


    it(
      "protects Travel",
      () => {
        expect(
          PROTECTED_ROUTES,
        ).toContain(
          "/travel",
        );
      },
    );


    it(
      "protects Investments",
      () => {
        expect(
          PROTECTED_ROUTES,
        ).toContain(
          "/investments",
        );
      },
    );


    it(
      "protects onboarding",
      () => {
        expect(
          PROTECTED_ROUTES,
        ).toContain(
          "/onboarding",
        );
      },
    );


    it(
      "protects every primary private destination",
      () => {
        for (
          const item of
            NAVIGATION_ITEMS
        ) {
          expect(
            PROTECTED_ROUTES,
          ).toContain(
            item.href,
          );
        }
      },
    );
  },
);


/* =========================================================
 * 5. DATABASE TABLE REGISTRY
 * ======================================================= */

describe(
  "LIFE OS table registry",
  () => {
    it(
      "contains the Universal Intake table",
      () => {
        expect(
          LIFE_OS_TABLES,
        ).toContain(
          "intake_items",
        );
      },
    );


    it(
      "contains the Travel trips table",
      () => {
        expect(
          LIFE_OS_TABLES,
        ).toContain(
          "trips",
        );
      },
    );


    it(
      "contains the private document metadata table",
      () => {
        expect(
          LIFE_OS_TABLES,
        ).toContain(
          "documents",
        );
      },
    );


    it(
      "contains all four LIFE Invest AI tables",
      () => {
        expect(
          LIFE_OS_TABLES,
        ).toContain(
          "investment_ai_analyses",
        );


        expect(
          LIFE_OS_TABLES,
        ).toContain(
          "investment_ai_evidence",
        );


        expect(
          LIFE_OS_TABLES,
        ).toContain(
          "investment_ai_forecasts",
        );


        expect(
          LIFE_OS_TABLES,
        ).toContain(
          "investment_ai_forecast_outcomes",
        );
      },
    );


    it(
      "contains all application tables without duplicates",
      () => {
        expect(
          LIFE_OS_TABLES,
        ).toHaveLength(
          21,
        );


        expect(
          new Set(
            LIFE_OS_TABLES,
          ).size,
        ).toBe(
          LIFE_OS_TABLES.length,
        );
      },
    );


    it(
      "keeps Travel domain tables explicit",
      () => {
        expect(
          LIFE_OS_TRAVEL_TABLES,
        ).toEqual([
          "trips",
          "documents",
        ]);
      },
    );


    it(
      "keeps Investment Intelligence tables explicit",
      () => {
        expect(
          LIFE_OS_INVESTMENT_INTELLIGENCE_TABLES,
        ).toEqual([
          "investment_ai_analyses",
          "investment_ai_evidence",
          "investment_ai_forecasts",
          "investment_ai_forecast_outcomes",
        ]);
      },
    );


    it(
      "does not treat the Track Record view as a table",
      () => {
        expect(
          LIFE_OS_TABLES,
        ).not.toContain(
          "investment_ai_track_record",
        );
      },
    );
  },
);


/* =========================================================
 * 6. INVESTMENT INTELLIGENCE API ROUTES
 * ======================================================= */

describe(
  "LIFE Invest AI API routes",
  () => {
    it(
      "uses the canonical analyze route",
      () => {
        expect(
          INVESTMENT_INTELLIGENCE_ANALYZE_API_ROUTE,
        ).toBe(
          "/api/investment-intelligence/analyze",
        );
      },
    );


    it(
      "uses the canonical Track Record route",
      () => {
        expect(
          INVESTMENT_INTELLIGENCE_TRACK_RECORD_API_ROUTE,
        ).toBe(
          "/api/investment-intelligence/track-record",
        );
      },
    );
  },
);


/* =========================================================
 * 7. PRIVATE DOCUMENT CONFIGURATION
 * ======================================================= */

describe(
  "LIFE OS V2 private document configuration",
  () => {
    it(
      "uses the canonical private bucket",
      () => {
        expect(
          PRIVATE_DOCUMENT_STORAGE_BUCKET,
        ).toBe(
          "life-os-private-documents",
        );
      },
    );


    it(
      "does not name the private bucket public",
      () => {
        expect(
          PRIVATE_DOCUMENT_STORAGE_BUCKET
            .toLowerCase(),
        ).not.toContain(
          "public",
        );
      },
    );
  },
);


/* =========================================================
 * 8. DASHBOARD LIMITS
 * ======================================================= */

describe(
  "LIFE OS V2 dashboard limits",
  () => {
    it(
      "keeps exactly three primary priorities",
      () => {
        expect(
          MAX_DASHBOARD_PRIORITIES,
        ).toBe(
          3,
        );
      },
    );


    it(
      "keeps Travel dashboard lists intentionally bounded",
      () => {
        expect(
          MAX_DASHBOARD_TRIPS,
        ).toBe(
          5,
        );
      },
    );
  },
);


/* =========================================================
 * 9. FINANCE CALCULATIONS
 * ======================================================= */

describe(
  "finance calculations",
  () => {
    it(
      "calculates monthly allocations deterministically",
      () => {
        const result =
          calculateFinanceTotals(
            [
              income({
                amount:
                  12_000,
              }),
            ],

            [
              budget({
                amount:
                  4_000,

                item_type:
                  "expense",
              }),

              budget({
                id:
                  "22222222-2222-4222-8222-222222222223",

                name:
                  "Synthetic Saving",

                amount:
                  2_000,

                item_type:
                  "saving",
              }),

              budget({
                id:
                  "22222222-2222-4222-8222-222222222224",

                name:
                  "Synthetic Investment",

                amount:
                  1_500,

                item_type:
                  "investment",
              }),

              budget({
                id:
                  "22222222-2222-4222-8222-222222222225",

                name:
                  "Synthetic Debt",

                amount:
                  2_500,

                item_type:
                  "debt",
              }),
            ],
          );


        expect(
          result.total_income,
        ).toBe(
          12_000,
        );


        expect(
          result.total_expenses,
        ).toBe(
          4_000,
        );


        expect(
          result.total_savings,
        ).toBe(
          2_000,
        );


        expect(
          result.total_investments,
        ).toBe(
          1_500,
        );


        expect(
          result.total_debt_payments,
        ).toBe(
          2_500,
        );


        expect(
          result.total_allocations,
        ).toBe(
          10_000,
        );


        expect(
          result.available_amount,
        ).toBe(
          2_000,
        );
      },
    );


    it(
      "converts annual recurring values to monthly equivalents",
      () => {
        const result =
          calculateFinanceTotals(
            [
              income({
                amount:
                  120_000,

                frequency:
                  "annual",
              }),
            ],

            [
              budget({
                amount:
                  12_000,

                frequency:
                  "annual",
              }),
            ],
          );


        expect(
          result.total_income,
        ).toBe(
          10_000,
        );


        expect(
          result.total_expenses,
        ).toBe(
          1_000,
        );


        expect(
          result.available_amount,
        ).toBe(
          9_000,
        );
      },
    );


    it(
      "ignores inactive finance records",
      () => {
        const result =
          calculateFinanceTotals(
            [
              income({
                amount:
                  10_000,
              }),

              income({
                id:
                  "11111111-1111-4111-8111-111111111112",

                amount:
                  999_999,

                is_active:
                  false,
              }),
            ],

            [
              budget({
                amount:
                  2_000,
              }),

              budget({
                id:
                  "22222222-2222-4222-8222-222222222226",

                amount:
                  999_999,

                is_active:
                  false,
              }),
            ],
          );


        expect(
          result.total_income,
        ).toBe(
          10_000,
        );


        expect(
          result.total_expenses,
        ).toBe(
          2_000,
        );


        expect(
          result.available_amount,
        ).toBe(
          8_000,
        );
      },
    );


    it(
      "does not silently make one-time values recurring",
      () => {
        const result =
          calculateFinanceTotals(
            [
              income({
                amount:
                  10_000,
              }),

              income({
                id:
                  "11111111-1111-4111-8111-111111111113",

                amount:
                  50_000,

                frequency:
                  "one_time",
              }),
            ],

            [
              budget({
                amount:
                  2_000,
              }),

              budget({
                id:
                  "22222222-2222-4222-8222-222222222227",

                amount:
                  30_000,

                frequency:
                  "one_time",
              }),
            ],
          );


        expect(
          result.total_income,
        ).toBe(
          10_000,
        );


        expect(
          result.total_expenses,
        ).toBe(
          2_000,
        );


        expect(
          result.available_amount,
        ).toBe(
          8_000,
        );
      },
    );


    it(
      "preserves a real negative monthly balance",
      () => {
        const result =
          calculateFinanceTotals(
            [
              income({
                amount:
                  5_000,
              }),
            ],

            [
              budget({
                amount:
                  6_500,
              }),
            ],
          );


        expect(
          result.available_amount,
        ).toBe(
          -1_500,
        );
      },
    );
  },
);


/* =========================================================
 * 10. INVESTMENT CALCULATIONS
 * ======================================================= */

describe(
  "investment calculations",
  () => {
    it(
      "calculates cost basis value and gain loss deterministically",
      () => {
        const result =
          calculateInvestmentSnapshot([
            asset({
              quantity:
                100,

              average_cost:
                10,

              reference_price:
                12,
            }),
          ]);


        expect(
          result.currency,
        ).toBe(
          "AED",
        );


        expect(
          result.total_cost_basis,
        ).toBe(
          1_000,
        );


        expect(
          result.total_estimated_value,
        ).toBe(
          1_200,
        );


        expect(
          result.total_estimated_gain_loss,
        ).toBe(
          200,
        );


        expect(
          result.active_asset_count,
        ).toBe(
          1,
        );
      },
    );


    it(
      "sums active monthly contribution targets only",
      () => {
        const result =
          calculateInvestmentSnapshot([
            asset({
              monthly_contribution_target:
                500,
            }),

            asset({
              id:
                "33333333-3333-4333-8333-333333333334",

              ticker:
                "TEST2",

              monthly_contribution_target:
                750,
            }),

            asset({
              id:
                "33333333-3333-4333-8333-333333333335",

              ticker:
                "OFF",

              monthly_contribution_target:
                10_000,

              is_active:
                false,
            }),
          ]);


        expect(
          result
            .total_monthly_contribution_target,
        ).toBe(
          1_250,
        );
      },
    );


    it(
      "calculates target quantity progress from stored values",
      () => {
        const result =
          calculateInvestmentSnapshot([
            asset({
              quantity:
                50,

              target_quantity:
                200,
            }),
          ]);


        expect(
          result.positions,
        ).toHaveLength(
          1,
        );


        expect(
          result.positions[0]
            ?.target_progress_percent,
        ).toBe(
          25,
        );
      },
    );


    it(
      "does not invent market value without reference price",
      () => {
        const result =
          calculateInvestmentSnapshot([
            asset({
              reference_price:
                null,
            }),
          ]);


        expect(
          result.positions[0]
            ?.estimated_value,
        ).toBeNull();


        expect(
          result.positions[0]
            ?.estimated_gain_loss,
        ).toBeNull();
      },
    );


    it(
      "does not silently combine foreign currency as AED",
      () => {
        const result =
          calculateInvestmentSnapshot([
            asset({
              id:
                "33333333-3333-4333-8333-333333333336",

              ticker:
                "AEDTEST",

              currency:
                "AED",

              quantity:
                100,

              average_cost:
                10,

              reference_price:
                12,
            }),

            asset({
              id:
                "33333333-3333-4333-8333-333333333337",

              ticker:
                "USDTEST",

              currency:
                "USD",

              quantity:
                100,

              average_cost:
                10,

              reference_price:
                12,
            }),
          ]);


        expect(
          result.currency,
        ).toBe(
          "AED",
        );


        expect(
          result.total_cost_basis,
        ).toBe(
          1_000,
        );


        expect(
          result.total_estimated_value,
        ).toBe(
          1_200,
        );


        expect(
          result.positions,
        ).toHaveLength(
          2,
        );
      },
    );
  },
);


/* =========================================================
 * 11. LIFE INVEST AI SCORE ENGINE
 * ======================================================= */

describe(
  "LIFE Invest AI deterministic score engine",
  () => {
    it(
      "calculates the final score without AI authority",
      () => {
        const result =
          calculateInvestmentIntelligenceScore({
            fundamental_score:
              80,

            technical_score:
              70,

            sentiment_score:
              60,

            macro_score:
              65,

            portfolio_fit_score:
              75,

            risk_score:
              30,

            has_position:
              true,
          });


        expect(
          result.data_status,
        ).toBe(
          "sufficient",
        );


        expect(
          result.data_quality_score,
        ).toBe(
          100,
        );


        expect(
          result.overall_score,
        ).toBe(
          72.03,
        );


        expect(
          result.stance,
        ).toBe(
          "bullish",
        );


        expect(
          result.recommendation,
        ).toBe(
          "accumulate",
        );


        expect(
          result.confidence,
        ).toBeLessThanOrEqual(
          95,
        );
      },
    );


    it(
      "refuses to create an overall score from insufficient evidence",
      () => {
        const result =
          calculateInvestmentIntelligenceScore({
            fundamental_score:
              null,

            technical_score:
              70,

            sentiment_score:
              null,

            macro_score:
              null,

            portfolio_fit_score:
              null,

            risk_score:
              null,

            has_position:
              true,
          });


        expect(
          result.data_quality_score,
        ).toBe(
          20,
        );


        expect(
          result.data_status,
        ).toBe(
          "insufficient",
        );


        expect(
          result.overall_score,
        ).toBeNull();


        expect(
          result.stance,
        ).toBe(
          "insufficient",
        );


        expect(
          result.recommendation,
        ).toBe(
          "insufficient",
        );
      },
    );


    it(
      "does not treat missing components as zero",
      () => {
        const partial =
          calculateInvestmentIntelligenceScore({
            fundamental_score:
              80,

            technical_score:
              80,

            sentiment_score:
              null,

            macro_score:
              80,

            portfolio_fit_score:
              null,

            risk_score:
              20,

            has_position:
              false,
          });


        expect(
          partial.overall_score,
        ).not.toBe(
          0,
        );


        expect(
          partial.missing_components,
        ).toContain(
          "sentiment",
        );


        expect(
          partial.missing_components,
        ).toContain(
          "portfolio_fit",
        );
      },
    );
  },
);


/* =========================================================
 * 12. PORTFOLIO FIT ENGINE
 * ======================================================= */

describe(
  "LIFE Invest AI portfolio fit engine",
  () => {
    it(
      "scores an underweight position higher than an overweight position",
      () => {
        const underweight =
          calculatePortfolioFitScore({
            current_allocation_percent:
              5,

            preferred_max_allocation_percent:
              10,

            quantity:
              50,

            target_quantity:
              100,
          });


        const overweight =
          calculatePortfolioFitScore({
            current_allocation_percent:
              15,

            preferred_max_allocation_percent:
              10,

            quantity:
              120,

            target_quantity:
              100,
          });


        expect(
          underweight,
        ).toBe(
          82.5,
        );


        expect(
          overweight,
        ).toBe(
          12.5,
        );


        expect(
          underweight,
        ).toBeGreaterThan(
          overweight ?? 0,
        );
      },
    );


    it(
      "returns null when portfolio targets are unavailable",
      () => {
        expect(
          calculatePortfolioFitScore({
            current_allocation_percent:
              null,

            preferred_max_allocation_percent:
              null,

            quantity:
              100,

            target_quantity:
              null,
          }),
        ).toBeNull();
      },
    );
  },
);


/* =========================================================
 * 13. TECHNICAL ANALYSIS ENGINE
 * ======================================================= */

describe(
  "LIFE Invest AI technical engine",
  () => {
    it(
      "requires enough observations before issuing a technical score",
      () => {
        const result =
          calculateInvestmentTechnicalSnapshot(
            createAscendingPriceSeries(
              10,
            ),
          );


        expect(
          result.data_points,
        ).toBe(
          10,
        );


        expect(
          result.technical_score,
        ).toBeNull();


        expect(
          result.signal,
        ).toBe(
          "insufficient",
        );
      },
    );


    it(
      "calculates deterministic indicators from price history",
      () => {
        const result =
          calculateInvestmentTechnicalSnapshot(
            createAscendingPriceSeries(
              60,
            ),
          );


        expect(
          result.data_points,
        ).toBe(
          60,
        );


        expect(
          result.latest_close,
        ).toBe(
          60,
        );


        expect(
          result.sma_20,
        ).toBe(
          50.5,
        );


        expect(
          result.sma_50,
        ).toBe(
          35.5,
        );


        expect(
          result.ema_20,
        ).toBe(
          50.5,
        );


        expect(
          result.rsi_14,
        ).toBe(
          100,
        );


        expect(
          result.momentum_20_percent,
        ).toBe(
          50,
        );


        expect(
          result.max_drawdown_percent,
        ).toBe(
          0,
        );


        expect(
          result.technical_score,
        ).toBe(
          79,
        );


        expect(
          result.signal,
        ).toBe(
          "bullish",
        );
      },
    );


    it(
      "returns identical technical output for identical prices",
      () => {
        const prices =
          createAscendingPriceSeries(
            60,
          );


        const first =
          calculateInvestmentTechnicalSnapshot(
            prices,
          );


        const second =
          calculateInvestmentTechnicalSnapshot(
            prices,
          );


        expect(
          second,
        ).toEqual(
          first,
        );
      },
    );
  },
);


/* =========================================================
 * 14. FORECAST DIRECTION
 * ======================================================= */

describe(
  "LIFE Invest AI forecast direction",
  () => {
    it(
      "uses the highest probability as the primary direction",
      () => {
        expect(
          getPrimaryForecastDirection({
            up_probability:
              60,

            flat_probability:
              25,

            down_probability:
              15,
          }),
        ).toBe(
          "up",
        );


        expect(
          getPrimaryForecastDirection({
            up_probability:
              20,

            flat_probability:
              25,

            down_probability:
              55,
          }),
        ).toBe(
          "down",
        );
      },
    );


    it(
      "uses flat as the conservative deterministic tie breaker",
      () => {
        expect(
          getPrimaryForecastDirection({
            up_probability:
              40,

            flat_probability:
              40,

            down_probability:
              20,
          }),
        ).toBe(
          "flat",
        );
      },
    );
  },
);


/* =========================================================
 * 15. FORECAST VALIDATION
 * ======================================================= */

describe(
  "LIFE Invest AI forecast validation",
  () => {
    it(
      "accepts a logically consistent probabilistic forecast",
      () => {
        const result =
          validateInvestmentForecast(
            validForecast(),
          );


        expect(
          result.valid,
        ).toBe(
          true,
        );


        expect(
          result.errors,
        ).toHaveLength(
          0,
        );


        expect(
          result.primary_direction,
        ).toBe(
          "up",
        );


        expect(
          result.probability_total,
        ).toBe(
          100,
        );


        expect(
          result.base_midpoint,
        ).toBe(
          108.5,
        );


        expect(
          result.expected_return_mid_percent,
        ).toBe(
          8.5,
        );
      },
    );


    it(
      "rejects probabilities that do not total 100",
      () => {
        const result =
          validateInvestmentForecast(
            validForecast({
              up_probability:
                60,

              flat_probability:
                30,

              down_probability:
                20,
            }),
          );


        expect(
          result.valid,
        ).toBe(
          false,
        );


        expect(
          result.probability_total,
        ).toBe(
          110,
        );


        expect(
          result.errors.length,
        ).toBeGreaterThan(
          0,
        );
      },
    );


    it(
      "rejects a declared direction that disagrees with probabilities",
      () => {
        const result =
          validateInvestmentForecast(
            validForecast({
              direction:
                "down",
            }),
          );


        expect(
          result.valid,
        ).toBe(
          false,
        );


        expect(
          result.primary_direction,
        ).toBe(
          "up",
        );
      },
    );


    it(
      "rejects invalid scenario ranges",
      () => {
        const result =
          validateInvestmentForecast(
            validForecast({
              bull_low:
                130,

              bull_high:
                120,
            }),
          );


        expect(
          result.valid,
        ).toBe(
          false,
        );
      },
    );
  },
);


/* =========================================================
 * 16. BRIER SCORE
 * ======================================================= */

describe(
  "LIFE Invest AI Brier score",
  () => {
    it(
      "returns zero for a perfect probability forecast",
      () => {
        expect(
          calculateInvestmentBrierScore({
            up_probability:
              100,

            flat_probability:
              0,

            down_probability:
              0,

            actual_direction:
              "up",
          }),
        ).toBe(
          0,
        );
      },
    );


    it(
      "calculates multiclass Brier score deterministically",
      () => {
        expect(
          calculateInvestmentBrierScore({
            up_probability:
              60,

            flat_probability:
              25,

            down_probability:
              15,

            actual_direction:
              "up",
          }),
        ).toBe(
          0.245,
        );
      },
    );
  },
);


/* =========================================================
 * 17. FORECAST EVALUATION
 * ======================================================= */

describe(
  "LIFE Invest AI forecast evaluation",
  () => {
    it(
      "grades an expired forecast from observed market facts",
      () => {
        const result =
          evaluateInvestmentForecast({
            reference_price:
              100,

            actual_price:
              110,

            flat_threshold_percent:
              1,

            predicted_direction:
              "up",

            up_probability:
              60,

            flat_probability:
              25,

            down_probability:
              15,

            base_low:
              105,

            base_high:
              112,
          });


        expect(
          result.actual_change_percent,
        ).toBe(
          10,
        );


        expect(
          result.actual_direction,
        ).toBe(
          "up",
        );


        expect(
          result.direction_correct,
        ).toBe(
          true,
        );


        expect(
          result.base_range_hit,
        ).toBe(
          true,
        );


        expect(
          result.absolute_error_percent,
        ).toBe(
          1.5,
        );


        expect(
          result.brier_score,
        ).toBe(
          0.245,
        );
      },
    );


    it(
      "preserves an incorrect prediction as incorrect",
      () => {
        const result =
          evaluateInvestmentForecast({
            reference_price:
              100,

            actual_price:
              90,

            flat_threshold_percent:
              1,

            predicted_direction:
              "up",

            up_probability:
              70,

            flat_probability:
              20,

            down_probability:
              10,

            base_low:
              105,

            base_high:
              115,
          });


        expect(
          result.actual_direction,
        ).toBe(
          "down",
        );


        expect(
          result.direction_correct,
        ).toBe(
          false,
        );


        expect(
          result.base_range_hit,
        ).toBe(
          false,
        );


        expect(
          result.brier_score,
        ).toBeGreaterThan(
          0,
        );
      },
    );
  },
);


/* =========================================================
 * 18. TRACK RECORD
 * ======================================================= */

describe(
  "LIFE Invest AI Track Record",
  () => {
    it(
      "does not grade a tiny sample as strong",
      () => {
        const result =
          summarizeInvestmentTrackRecord([
            {
              direction_correct:
                true,

              base_range_hit:
                true,

              absolute_error_percent:
                1,

              brier_score:
                0.2,
            },
          ]);


        expect(
          result.evaluated_forecasts,
        ).toBe(
          1,
        );


        expect(
          result.grade,
        ).toBe(
          "insufficient",
        );
      },
    );


    it(
      "calculates historical performance from stored outcomes",
      () => {
        const outcomes =
          Array.from(
            {
              length:
                10,
            },
            (
              _,
              index,
            ) => ({
              direction_correct:
                index <
                7,

              base_range_hit:
                index <
                7,

              absolute_error_percent:
                2,

              brier_score:
                0.3,
            }),
          );


        const result =
          summarizeInvestmentTrackRecord(
            outcomes,
          );


        expect(
          result.evaluated_forecasts,
        ).toBe(
          10,
        );


        expect(
          result.directional_accuracy_percent,
        ).toBe(
          70,
        );


        expect(
          result.base_range_accuracy_percent,
        ).toBe(
          70,
        );


        expect(
          result.average_absolute_error_percent,
        ).toBe(
          2,
        );


        expect(
          result.average_brier_score,
        ).toBe(
          0.3,
        );


        expect(
          result.calibration_score,
        ).toBe(
          85,
        );


        expect(
          result.grade,
        ).toBe(
          "strong",
        );
      },
    );


    it(
      "returns an empty Track Record when nothing is evaluated",
      () => {
        const result =
          summarizeInvestmentTrackRecord(
            [],
          );


        expect(
          result.evaluated_forecasts,
        ).toBe(
          0,
        );


        expect(
          result.directional_accuracy_percent,
        ).toBeNull();


        expect(
          result.grade,
        ).toBe(
          "insufficient",
        );
      },
    );
  },
);


/* =========================================================
 * 19. AI TOOL MANIFEST
 * ======================================================= */

describe(
  "LIFE AI tool manifest",
  () => {
    it(
      "contains exactly seven allow-listed Chief of Staff tools",
      () => {
        expect(
          AI_TOOL_NAMES,
        ).toHaveLength(
          7,
        );


        expect(
          new Set(
            AI_TOOL_NAMES,
          ).size,
        ).toBe(
          7,
        );
      },
    );


    it(
      "does not add LIFE Invest AI as an execution tool",
      () => {
        const names =
          AI_TOOL_NAMES
            .join(
              " ",
            )
            .toLowerCase();


        expect(
          names,
        ).not.toContain(
          "investment_intelligence",
        );


        expect(
          names,
        ).not.toContain(
          "broker",
        );
      },
    );


    it(
      "does not expose arbitrary execution tools",
      () => {
        const names =
          AI_TOOL_NAMES
            .join(
              " ",
            )
            .toLowerCase();


        expect(
          names,
        ).not.toContain(
          "shell",
        );


        expect(
          names,
        ).not.toContain(
          "sql",
        );


        expect(
          names,
        ).not.toContain(
          "transfer",
        );


        expect(
          names,
        ).not.toContain(
          "buy_stock",
        );


        expect(
          names,
        ).not.toContain(
          "sell_stock",
        );


        expect(
          names,
        ).not.toContain(
          "send_email",
        );


        expect(
          names,
        ).not.toContain(
          "upload_document",
        );
      },
    );
  },
);


/* =========================================================
 * 20. APPLICATION SAFETY DEFAULTS
 * ======================================================= */

describe(
  "LIFE OS V2 safety defaults",
  () => {
    it(
      "keeps public registration disabled",
      () => {
        expect(
          APPLICATION_SAFETY_DEFAULTS
            .publicRegistrationEnabled,
        ).toBe(
          false,
        );
      },
    );


    it(
      "keeps autonomous financial execution disabled",
      () => {
        expect(
          APPLICATION_SAFETY_DEFAULTS
            .autonomousFinancialExecution,
        ).toBe(
          false,
        );
      },
    );


    it(
      "keeps arbitrary SQL disabled",
      () => {
        expect(
          APPLICATION_SAFETY_DEFAULTS
            .arbitrarySqlEnabled,
        ).toBe(
          false,
        );
      },
    );


    it(
      "keeps shell execution disabled",
      () => {
        expect(
          APPLICATION_SAFETY_DEFAULTS
            .shellExecutionEnabled,
        ).toBe(
          false,
        );
      },
    );


    it(
      "keeps broker execution disabled",
      () => {
        expect(
          APPLICATION_SAFETY_DEFAULTS
            .brokerExecution,
        ).toBe(
          false,
        );
      },
    );


    it(
      "keeps direct AI database write authority disabled",
      () => {
        expect(
          APPLICATION_SAFETY_DEFAULTS
            .aiDatabaseWriteAuthority,
        ).toBe(
          false,
        );
      },
    );


    it(
      "keeps public document storage disabled",
      () => {
        expect(
          APPLICATION_SAFETY_DEFAULTS
            .publicDocumentStorage,
        ).toBe(
          false,
        );
      },
    );


    it(
      "keeps autonomous intake execution disabled",
      () => {
        expect(
          APPLICATION_SAFETY_DEFAULTS
            .autonomousIntakeExecution,
        ).toBe(
          false,
        );
      },
    );


    it(
      "keeps autonomous investment analysis disabled",
      () => {
        expect(
          APPLICATION_SAFETY_DEFAULTS
            .autonomousInvestmentAnalysis,
        ).toBe(
          false,
        );
      },
    );


    it(
      "keeps autonomous historical outcome mutation disabled",
      () => {
        expect(
          APPLICATION_SAFETY_DEFAULTS
            .autonomousInvestmentOutcomeMutation,
        ).toBe(
          false,
        );
      },
    );
  },
);


/* =========================================================
 * 21. FORMAT DETERMINISM
 * ======================================================= */

describe(
  "formatting",
  () => {
    it(
      "formats identical currency input identically",
      () => {
        const first =
          formatCurrency(
            12_345.67,
            "AED",
          );


        const second =
          formatCurrency(
            12_345.67,
            "AED",
          );


        expect(
          first,
        ).toBe(
          second,
        );


        expect(
          first.length,
        ).toBeGreaterThan(
          0,
        );
      },
    );


    it(
      "formats percentage deterministically",
      () => {
        expect(
          formatPercent(
            25,
          ),
        ).toBe(
          formatPercent(
            25,
          ),
        );
      },
    );


    it(
      "formats progress deterministically",
      () => {
        expect(
          formatProgress(
            75,
          ),
        ).toBe(
          formatProgress(
            75,
          ),
        );
      },
    );


    it(
      "formats prices deterministically",
      () => {
        expect(
          formatPrice(
            12.345678,
          ),
        ).toBe(
          formatPrice(
            12.345678,
          ),
        );
      },
    );


    it(
      "formats quantities deterministically",
      () => {
        expect(
          formatQuantity(
            123.456789,
          ),
        ).toBe(
          formatQuantity(
            123.456789,
          ),
        );
      },
    );


    it(
      "distinguishes positive and negative signed currency",
      () => {
        const positive =
          formatSignedCurrency(
            500,
            "AED",
          );


        const negative =
          formatSignedCurrency(
            -500,
            "AED",
          );


        expect(
          positive,
        ).not.toBe(
          negative,
        );
      },
    );
  },
);


/* =========================================================
 * 22. PURE DETERMINISM
 * ======================================================= */

describe(
  "deterministic LIFE OS core",
  () => {
    it(
      "returns identical finance result for identical input",
      () => {
        const incomeRows = [
          income(),
        ];


        const budgetRows = [
          budget(),
        ];


        const first =
          calculateFinanceTotals(
            incomeRows,
            budgetRows,
          );


        const second =
          calculateFinanceTotals(
            incomeRows,
            budgetRows,
          );


        expect(
          second,
        ).toEqual(
          first,
        );
      },
    );


    it(
      "returns identical investment result for identical input",
      () => {
        const assets = [
          asset(),
        ];


        const first =
          calculateInvestmentSnapshot(
            assets,
          );


        const second =
          calculateInvestmentSnapshot(
            assets,
          );


        expect(
          second,
        ).toEqual(
          first,
        );
      },
    );


    it(
      "returns identical LIFE Invest AI score for identical input",
      () => {
        const input = {
          fundamental_score:
            75,

          technical_score:
            70,

          sentiment_score:
            60,

          macro_score:
            65,

          portfolio_fit_score:
            80,

          risk_score:
            35,

          has_position:
            true,
        };


        const first =
          calculateInvestmentIntelligenceScore(
            input,
          );


        const second =
          calculateInvestmentIntelligenceScore(
            input,
          );


        expect(
          second,
        ).toEqual(
          first,
        );
      },
    );


    it(
      "returns identical forecast evaluation for identical facts",
      () => {
        const input = {
          reference_price:
            100,

          actual_price:
            110,

          flat_threshold_percent:
            1,

          predicted_direction:
            "up" as const,

          up_probability:
            60,

          flat_probability:
            25,

          down_probability:
            15,

          base_low:
            105,

          base_high:
            112,
        };


        expect(
          evaluateInvestmentForecast(
            input,
          ),
        ).toEqual(
          evaluateInvestmentForecast(
            input,
          ),
        );
      },
    );
  },
);


/* =========================================================
 * 23. FINAL PRODUCT CONTRACT
 * ======================================================= */

describe(
  "LIFE OS final product contract",
  () => {
    it(
      "treats Travel as a first class life area",
      () => {
        const travel =
          NAVIGATION_ITEMS.find(
            (
              item,
            ) =>
              item.href ===
              "/travel",
          );


        expect(
          travel,
        ).toBeDefined();


        expect(
          travel?.label,
        ).toBe(
          "السفر",
        );
      },
    );


    it(
      "does not expose investments as a seventh primary area",
      () => {
        expect(
          NAVIGATION_ITEMS.some(
            (
              item,
            ) =>
              String(
                item.href,
              ) ===
              "/investments",
          ),
        ).toBe(
          false,
        );
      },
    );


    it(
      "does not expose LIFE Invest AI as a seventh primary area",
      () => {
        expect(
          NAVIGATION_ITEMS.some(
            (
              item,
            ) =>
              String(
                item.href,
              ) ===
              "/investments/intelligence",
          ),
        ).toBe(
          false,
        );
      },
    );


    it(
      "does not expose projects as a seventh primary area",
      () => {
        expect(
          NAVIGATION_ITEMS.some(
            (
              item,
            ) =>
              String(
                item.href,
              ) ===
              "/projects",
          ),
        ).toBe(
          false,
        );
      },
    );


    it(
      "does not expose career as a seventh primary area",
      () => {
        expect(
          NAVIGATION_ITEMS.some(
            (
              item,
            ) =>
              String(
                item.href,
              ) ===
              "/career",
          ),
        ).toBe(
          false,
        );
      },
    );
  },
);


/* =========================================================
 * 24. INVESTMENT INTELLIGENCE TEST ISOLATION
 * ======================================================= */

/**
 * LIFE Invest AI deterministic tests MUST remain runnable
 * without:
 *
 * Twelve Data
 * OpenAI
 * Supabase
 * browser authentication
 * internet access
 *
 *
 * Why?
 *
 * Technical calculations
 * scoring
 * forecast validation
 * Brier score
 * Track Record arithmetic
 *
 * are LIFE OS-owned deterministic logic.
 */


/* =========================================================
 * 25. SYNTHETIC DATA
 * ======================================================= */

/**
 * All financial, investment and market values in this file
 * are synthetic.
 *
 *
 * Never put:
 *
 * real salary
 * real loan
 * real portfolio
 * real ticker holdings
 * real market predictions
 * real user ID
 *
 * into GitHub tests.
 */


/* =========================================================
 * 26. INVESTMENT SCORE AUTHORITY
 * ======================================================= */

/**
 * LIFE Invest AI may interpret evidence.
 *
 *
 * It may NOT directly define:
 *
 * overall_score
 * stance
 * final recommendation
 * final confidence
 *
 *
 * These tests protect the deterministic engine that owns
 * those values.
 */


/* =========================================================
 * 27. FORECAST AUTHORITY
 * ======================================================= */

/**
 * Forecast:
 *
 * probabilities
 * +
 * scenarios
 * +
 * reference price
 * +
 * horizon
 *
 *      ↓
 *
 * deterministic validation
 *
 *
 * Future actual result:
 *
 *      ↓
 *
 * deterministic evaluation
 *
 *
 * AI does not grade itself.
 */


/* =========================================================
 * 28. TRACK RECORD RULE
 * ======================================================= */

/**
 * Track Record measures:
 *
 * directional accuracy
 * base-range accuracy
 * absolute error
 * Brier score
 * probability calibration
 *
 *
 * Small samples remain:
 *
 * insufficient
 *
 *
 * Historical performance must never be confused with a
 * guarantee of future performance.
 */


/* =========================================================
 * 29. FINANCIAL TRUTH RULE
 * ======================================================= */

/**
 * LIFE OS core calculations remain deterministic.
 *
 *
 * AI may:
 *
 * explain
 * summarize
 * recommend
 *
 *
 * AI may not redefine:
 *
 * income
 * expenses
 * available amount
 * investment cost basis
 * investment value
 * investment gain/loss
 */


/* =========================================================
 * 30. PRODUCT STRUCTURE RULE
 * ======================================================= */

/**
 * Exactly six primary areas:
 *
 * الرئيسية
 * المال
 * خططي
 * السفر
 * التطوير
 * LIFE AI
 *
 *
 * Underneath:
 *
 * المال
 *      → Finance
 *      → Investments
 *          → LIFE Invest AI
 *
 * خططي
 *      → Goals + Projects
 *
 * التطوير
 *      → Learning + Career
 */


/* =========================================================
 * 31. AUTH RULE
 * ======================================================= */

/**
 * Ordinary LIFE OS V2 access:
 *
 * verified authenticated session
 *      ↓
 * Mandatory AAL2
 *      ↓
 * private application
 *
 *
 * TOTP verification is required before private access.
 */


/* =========================================================
 * 32. LIFE INVEST AI SAFETY RULE
 * ======================================================= */

/**
 * LIFE Invest AI can:
 *
 * analyze ✅
 * compare ✅
 * score ✅
 * forecast probabilistically ✅
 * record historical accuracy ✅
 *
 *
 * LIFE Invest AI cannot:
 *
 * buy ❌
 * sell ❌
 * place broker orders ❌
 * transfer money ❌
 * rewrite losing forecasts ❌
 * claim unmeasured accuracy ❌
 */


/* =========================================================
 * 33. FINAL CORE RULE
 * ======================================================= */

/**
 * Same structured input
 *      ↓
 * same deterministic calculation
 *      ↓
 * same expected result
 *
 *
 * Investment intelligence:
 *
 * market evidence
 *      ↓
 * deterministic metrics
 *      ↓
 * bounded AI interpretation
 *      ↓
 * deterministic score
 *      ↓
 * probabilistic forecast
 *      ↓
 * immutable history
 *      ↓
 * objective grading
 *
 *
 * Simple outside.
 * Intelligent underneath.
 * Measurable by default.
 * Private by default.
 */
