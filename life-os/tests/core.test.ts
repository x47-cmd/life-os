import {
  describe,
  expect,
  it,
} from "vitest";

import {
  AI_TOOL_NAMES,
  MAX_DASHBOARD_PRIORITIES,
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
 * 1. SYNTHETIC TEST HELPERS
 * ======================================================= */

/**
 * Tests use synthetic values only.
 *
 * No real LIFE OS financial information belongs in the test
 * suite or GitHub repository.
 */

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
      "test",

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
 * 2. FINANCE — BASIC MONTHLY TOTALS
 * ======================================================= */

describe(
  "finance calculations",
  () => {
    it(
      "calculates monthly income and allocations deterministically",
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
                item_type:
                  "expense",

                amount:
                  4_000,
              }),

              budget({
                id:
                  "22222222-2222-4222-8222-222222222223",

                name:
                  "Synthetic Saving",

                item_type:
                  "saving",

                amount:
                  2_000,
              }),

              budget({
                id:
                  "22222222-2222-4222-8222-222222222224",

                name:
                  "Synthetic Investment",

                item_type:
                  "investment",

                amount:
                  1_500,
              }),

              budget({
                id:
                  "22222222-2222-4222-8222-222222222225",

                name:
                  "Synthetic Debt",

                item_type:
                  "debt",

                amount:
                  2_500,
              }),
            ],
          );


        expect(
          result.monthly_income,
        ).toBe(
          12_000,
        );

        expect(
          result.monthly_expenses,
        ).toBe(
          4_000,
        );

        expect(
          result.monthly_savings,
        ).toBe(
          2_000,
        );

        expect(
          result.monthly_investments,
        ).toBe(
          1_500,
        );

        expect(
          result.monthly_debt_payments,
        ).toBe(
          2_500,
        );

        expect(
          result.monthly_allocations,
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


    /* =====================================================
     * 3. ANNUAL → MONTHLY
     * =================================================== */

    it(
      "converts annual recurring amounts to monthly equivalents",
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
          result.monthly_income,
        ).toBe(
          10_000,
        );

        expect(
          result.monthly_expenses,
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


    /* =====================================================
     * 4. INACTIVE RECORDS
     * =================================================== */

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
          result.monthly_income,
        ).toBe(
          10_000,
        );

        expect(
          result.monthly_expenses,
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


    /* =====================================================
     * 5. NON-RECURRING RECORDS
     * =================================================== */

    it(
      "does not silently treat one-time amounts as recurring monthly amounts",
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
          result.monthly_income,
        ).toBe(
          10_000,
        );

        expect(
          result.monthly_expenses,
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


    /* =====================================================
     * 6. NEGATIVE AVAILABLE CASH
     * =================================================== */

    it(
      "preserves a real monthly deficit instead of hiding it",
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
 * 7. INVESTMENT CALCULATIONS
 * ======================================================= */

describe(
  "investment calculations",
  () => {
    it(
      "calculates cost basis, estimated value and gain loss deterministically",
      () => {
        const result =
          calculateInvestmentSnapshot(
            [
              asset({
                quantity:
                  100,

                average_cost:
                  10,

                reference_price:
                  12,

                currency:
                  "AED",
              }),
            ],
          );


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


    /* =====================================================
     * 8. MONTHLY CONTRIBUTION TARGET
     * =================================================== */

    it(
      "sums active monthly contribution targets",
      () => {
        const result =
          calculateInvestmentSnapshot(
            [
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
            ],
          );


        expect(
          result.total_monthly_contribution_target,
        ).toBe(
          1_250,
        );
      },
    );


    /* =====================================================
     * 9. TARGET PROGRESS
     * =================================================== */

    it(
      "calculates quantity-target progress from stored values",
      () => {
        const result =
          calculateInvestmentSnapshot(
            [
              asset({
                quantity:
                  50,

                target_quantity:
                  200,
              }),
            ],
          );


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


    /* =====================================================
     * 10. MISSING REFERENCE PRICE
     * =================================================== */

    it(
      "does not invent a market value when the reference price is missing",
      () => {
        const result =
          calculateInvestmentSnapshot(
            [
              asset({
                reference_price:
                  null,
              }),
            ],
          );


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


    /* =====================================================
     * 11. CROSS-CURRENCY
     * =================================================== */

    it(
      "does not silently aggregate a foreign-currency position into the base-currency total",
      () => {
        const result =
          calculateInvestmentSnapshot(
            [
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
            ],
          );


        expect(
          result.currency,
        ).toBe(
          "AED",
        );


        /**
         * AED position:
         *
         * cost  = 100 × 10 = 1,000 AED
         * value = 100 × 12 = 1,200 AED
         *
         * USD position must stay individually visible but
         * must not be added as though USD == AED.
         */
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
 * 12. DASHBOARD PRIORITY LIMIT
 * ======================================================= */

describe(
  "dashboard limits",
  () => {
    it(
      "keeps the dashboard priority limit at exactly three",
      () => {
        expect(
          MAX_DASHBOARD_PRIORITIES,
        ).toBe(
          3,
        );
      },
    );
  },
);


/* =========================================================
 * 13. AI TOOL MANIFEST
 * ======================================================= */

describe(
  "AI tool manifest",
  () => {
    it(
      "contains exactly seven allow-listed LIFE OS tools",
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
      "does not expose obvious execution tools",
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
      },
    );
  },
);


/* =========================================================
 * 14. FORMAT DETERMINISM
 * ======================================================= */

describe(
  "formatting",
  () => {
    it(
      "formats identical financial input identically",
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
      "formats percentages and progress deterministically",
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
      "formats prices and quantities deterministically",
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
      "distinguishes positive and negative signed currency values",
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
 * 15. PURE-DETERMINISTIC RULE
 * ======================================================= */

describe(
  "deterministic core",
  () => {
    it(
      "returns the same finance result for the same input",
      () => {
        const incomeRows =
          [
            income(),
          ];

        const budgetRows =
          [
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
      "returns the same investment result for the same input",
      () => {
        const assets =
          [
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
 * 16. TEST ISOLATION RULE
 * ======================================================= */

/**
 * core.test.ts must never require:
 *
 * - a real Supabase database
 * - a real authenticated user
 * - OPENAI_API_KEY
 * - internet access
 * - production secrets
 *
 * Core business arithmetic must remain independently
 * testable.
 */


/* =========================================================
 * 17. SYNTHETIC DATA RULE
 * ======================================================= */

/**
 * All records above are synthetic.
 *
 * Never replace these values with:
 *
 * real salary
 * real loan balances
 * real portfolio holdings
 * real user identifiers
 * real personal records
 *
 * GitHub contains synthetic test data only.
 */


/* =========================================================
 * 18. FINANCIAL TEST RULE
 * ======================================================= */

/**
 * The tests protect important invariants:
 *
 * recurring arithmetic
 * inactive-record exclusion
 * annual normalization
 * real deficits
 * portfolio cost basis
 * reference valuation
 * target progress
 * currency isolation
 *
 * If one of these changes unexpectedly, CI must fail.
 */


/* =========================================================
 * 19. AI TEST RULE
 * ======================================================= */

/**
 * Core tests do not call an AI model.
 *
 * They verify the fixed allow-list boundary instead.
 *
 * AI quality may vary.
 *
 * Security boundaries and financial arithmetic must not.
 */


/* =========================================================
 * 20. FINAL CORE TEST RULE
 * ======================================================= */

/**
 * Same structured input
 *      ↓
 * Same deterministic calculation
 *      ↓
 * Same expected result
 *
 *
 * AI can explain the numbers.
 *
 * AI cannot redefine the numbers.
 */