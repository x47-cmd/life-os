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
  LIFE_AI_ROUTE,
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
 * FINAL CORE TESTS
 *
 * Protects:
 *
 * - deterministic finance
 * - deterministic investments
 * - exactly six primary life areas
 * - Travel as a first-class V2 area
 * - AAL1 application contract
 * - complete V2 table registry
 * - protected Travel / onboarding routes
 * - AI allow-list boundaries
 * - autonomous execution disabled
 *
 *
 * Synthetic data only.
 *
 * No database.
 * No OpenAI.
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
      "requires AAL1 for ordinary authenticated use",
      () => {
        expect(
          REQUIRED_AUTHENTICATION_LEVEL,
        ).toBe(
          "aal1",
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
 * 5. V2 TABLE REGISTRY
 * ======================================================= */

describe(
  "LIFE OS V2 table registry",
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
      "contains all V2 application tables without duplicates",
      () => {
        expect(
          LIFE_OS_TABLES,
        ).toHaveLength(
          17,
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
  },
);


/* =========================================================
 * 6. PRIVATE DOCUMENT CONFIGURATION
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
 * 7. DASHBOARD LIMITS
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
 * 8. FINANCE CALCULATIONS
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
 * 9. INVESTMENT CALCULATIONS
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
 * 10. AI TOOL MANIFEST
 * ======================================================= */

describe(
  "LIFE AI tool manifest",
  () => {
    it(
      "contains exactly seven allow-listed tools",
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
 * 11. APPLICATION SAFETY DEFAULTS
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
  },
);


/* =========================================================
 * 12. FORMAT DETERMINISM
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
 * 13. PURE DETERMINISM
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
  },
);


/* =========================================================
 * 14. FINAL V2 PRODUCT CONTRACT
 * ======================================================= */

describe(
  "LIFE OS V2 final product contract",
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
 * 15. TEST ISOLATION
 * ======================================================= */

/**
 * core.test.ts must never require:
 *
 * real Supabase database
 * authenticated production user
 * OpenAI API key
 * internet access
 * production secrets
 * private PDF
 *
 *
 * Core product invariants must remain testable offline.
 */


/* =========================================================
 * 16. SYNTHETIC DATA
 * ======================================================= */

/**
 * All financial and investment values in this file are
 * synthetic.
 *
 *
 * Never put:
 *
 * real salary
 * real loan
 * real portfolio
 * real user ID
 * real travel documents
 *
 * into GitHub tests.
 */


/* =========================================================
 * 17. FINANCIAL TRUTH RULE
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
 * 18. PRODUCT STRUCTURE RULE
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
 *      → Finance + Investments
 *
 * خططي
 *      → Goals + Projects
 *
 * التطوير
 *      → Learning + Career
 */


/* =========================================================
 * 19. AUTH RULE
 * ======================================================= */

/**
 * Ordinary LIFE OS V2 access:
 *
 * verified authenticated session
 *      ↓
 * AAL1
 *      ↓
 * private application
 *
 *
 * TOTP remains optional hardening.
 */


/* =========================================================
 * 20. TRAVEL RULE
 * ======================================================= */

/**
 * Travel V2 requires:
 *
 * /travel
 * trips
 * documents
 * private document bucket
 * protected authentication route
 *
 *
 * Travel is no longer a placeholder.
 */


/* =========================================================
 * 21. FINAL CORE RULE
 * ======================================================= */

/**
 * Same structured input
 *      ↓
 * same deterministic calculation
 *      ↓
 * same expected result
 *
 *
 * Product architecture is also fixed:
 *
 * six primary areas
 * AAL1
 * private Travel
 * deterministic execution
 * no autonomous AI writes
 *
 *
 * Simple outside.
 * Intelligent underneath.
 * Private by default.
 */