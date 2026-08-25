import type {
  Metadata,
} from "next";

import Link from "next/link";

import {
  AppShell,
} from "@/components/app-shell";

import { DataEntryButton } from "@/components/data-entry/data-entry-button";

import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-table";

import {
  EmptyState,
} from "@/components/empty-state";

import {
  PageHeader,
} from "@/components/page-header";

import {
  StatCard,
} from "@/components/stat-card";

import {
  requireAuthenticatedIdentity,
} from "@/lib/auth";

import {
  getFinanceSnapshot,
  getInvestmentSnapshot,
} from "@/lib/data";

import {
  formatCurrency,
  formatDate,
  formatPercent,
  formatQuantity,
  formatSignedCurrency,
} from "@/lib/format";

import type {
  BudgetItem,
  FinanceSnapshot,
  IncomeSource,
  InvestmentPosition,
} from "@/lib/types";


/* =========================================================
 * LIFE OS V2
 * MONEY
 *
 * One primary money surface:
 *
 * Finance
 * +
 * Investments
 *
 *
 * This page answers:
 *
 * - كم يدخل؟
 * - وين يروح؟
 * - كم يتبقى؟
 * - كم قيمة المحفظة؟
 * - كم الربح / الخسارة؟
 * - كم هدف الاستثمار الشهري؟
 *
 *
 * Detailed investment management remains available at:
 *
 * /investments
 *
 * Simple outside.
 * Intelligent underneath.
 * ======================================================= */


/* =========================================================
 * 1. METADATA
 * ======================================================= */

export const metadata:
Metadata = {
  title:
    "المال",
};


/* =========================================================
 * 2. FREQUENCY LABEL
 * ======================================================= */

function getFrequencyLabel(
  frequency:
    string,
): string {
  switch (
    frequency
  ) {
    case "monthly":
      return "شهري";

    case "annual":
      return "سنوي";

    case "one_time":
      return "مرة واحدة";

    case "other":
      return "أخرى";

    default:
      return frequency;
  }
}


/* =========================================================
 * 3. BUDGET TYPE LABEL
 * ======================================================= */

function getBudgetTypeLabel(
  type:
    string,
): string {
  switch (
    type
  ) {
    case "expense":
      return "مصروف";

    case "saving":
      return "ادخار";

    case "investment":
      return "استثمار";

    case "debt":
      return "دين / التزام";

    default:
      return type;
  }
}


/* =========================================================
 * 4. BUDGET TYPE BADGE
 * ======================================================= */

function getBudgetTypeBadgeClass(
  type:
    string,
): string {
  switch (
    type
  ) {
    case "saving":
      return "badge badge--positive";

    case "investment":
      return "badge badge--accent";

    case "debt":
      return "badge badge--warning";

    case "expense":
    default:
      return "badge";
  }
}


/* =========================================================
 * 5. AVAILABLE MONEY TONE
 * ======================================================= */

function getAvailableTone(
  amount:
    number,
):
  | "positive"
  | "warning"
  | "negative"
  | "neutral" {
  if (
    amount <
    0
  ) {
    return "negative";
  }


  if (
    amount ===
    0
  ) {
    return "warning";
  }


  return "positive";
}


/* =========================================================
 * 6. GAIN / LOSS TONE
 * ======================================================= */

function getGainLossTone(
  amount:
    number,
):
  | "positive"
  | "negative"
  | "neutral" {
  if (
    amount >
    0
  ) {
    return "positive";
  }


  if (
    amount <
    0
  ) {
    return "negative";
  }


  return "neutral";
}


/* =========================================================
 * 7. GAIN / LOSS CLASS
 * ======================================================= */

function getGainLossClass(
  amount:
    number |
    null,
): string {
  if (
    amount ===
      null ||
    amount ===
      0
  ) {
    return "";
  }


  return amount >
    0
    ? "text-positive"
    : "text-negative";
}


/* =========================================================
 * 8. MONTHLY ALLOCATION PERCENT
 * ======================================================= */

function calculateAllocationPercent(
  amount:
    number,

  income:
    number,
): number {
  if (
    income <=
    0
  ) {
    return 0;
  }


  return Math.max(
    0,
    (
      amount /
      income
    ) *
      100,
  );
}


/* =========================================================
 * 9. MONTHLY EQUIVALENT
 * ======================================================= */

function getMonthlyEquivalent(
  amount:
    number,

  frequency:
    string,
): number {
  switch (
    frequency
  ) {
    case "monthly":
      return amount;

    case "annual":
      return amount /
        12;

    case "one_time":
    case "other":
    default:
      return 0;
  }
}


/* =========================================================
 * 10. INCOME TABLE
 * ======================================================= */

function buildIncomeColumns(
  finance:
    FinanceSnapshot,
): readonly DataTableColumn<IncomeSource>[] {
  return [
    {
      key:
        "name",

      header:
        "مصدر الدخل",

      render:
        (
          item,
        ) => (
          <div>
            <strong>
              {item.name}
            </strong>

            {!item.is_active ? (
              <div
                className="text-subtle text-small"
                style={{
                  marginTop:
                    "2px",
                }}
              >
                غير نشط
              </div>
            ) : null}
          </div>
        ),
    },

    {
      key:
        "amount",

      header:
        "المبلغ",

      align:
        "end",

      render:
        (
          item,
        ) => (
          <span className="currency">
            {
              formatCurrency(
                item.amount,
                finance.currency,
              )
            }
          </span>
        ),
    },

    {
      key:
        "frequency",

      header:
        "التكرار",

      render:
        (
          item,
        ) => (
          <span className="badge">
            {
              getFrequencyLabel(
                item.frequency,
              )
            }
          </span>
        ),
    },

    {
      key:
        "monthly",

      header:
        "المكافئ الشهري",

      align:
        "end",

      render:
        (
          item,
        ) => (
          <span className="currency">
            {
              formatCurrency(
                getMonthlyEquivalent(
                  item.amount,
                  item.frequency,
                ),
                finance.currency,
              )
            }
          </span>
        ),
    },

    {
      key:
        "next",

      header:
        "القادم",

      render:
        (
          item,
        ) =>
          item.next_expected_date
            ? formatDate(
                item.next_expected_date,
              )
            : "—",
    },
  ];
}


/* =========================================================
 * 11. BUDGET TABLE
 * ======================================================= */

function buildBudgetColumns(
  finance:
    FinanceSnapshot,
): readonly DataTableColumn<BudgetItem>[] {
  return [
    {
      key:
        "name",

      header:
        "البند",

      render:
        (
          item,
        ) => (
          <div>
            <strong>
              {item.name}
            </strong>

            <div
              className="text-subtle text-small"
              style={{
                marginTop:
                  "2px",
              }}
            >
              {item.category}
            </div>
          </div>
        ),
    },

    {
      key:
        "type",

      header:
        "النوع",

      render:
        (
          item,
        ) => (
          <span
            className={
              getBudgetTypeBadgeClass(
                item.item_type,
              )
            }
          >
            {
              getBudgetTypeLabel(
                item.item_type,
              )
            }
          </span>
        ),
    },

    {
      key:
        "amount",

      header:
        "المبلغ",

      align:
        "end",

      render:
        (
          item,
        ) => (
          <span className="currency">
            {
              formatCurrency(
                item.amount,
                finance.currency,
              )
            }
          </span>
        ),
    },

    {
      key:
        "frequency",

      header:
        "التكرار",

      render:
        (
          item,
        ) => (
          <span className="badge">
            {
              getFrequencyLabel(
                item.frequency,
              )
            }
          </span>
        ),
    },

    {
      key:
        "monthly",

      header:
        "المكافئ الشهري",

      align:
        "end",

      render:
        (
          item,
        ) => (
          <span className="currency">
            {
              formatCurrency(
                getMonthlyEquivalent(
                  item.amount,
                  item.frequency,
                ),
                finance.currency,
              )
            }
          </span>
        ),
    },

    {
      key:
        "due",

      header:
        "الاستحقاق",

      align:
        "center",

      render:
        (
          item,
        ) =>
          item.due_day !==
          null
            ? String(
                item.due_day,
              )
            : "—",
    },
  ];
}


/* =========================================================
 * 12. INVESTMENT POSITION SORTING
 * ======================================================= */

function sortInvestmentPositions(
  positions:
    InvestmentPosition[],
): InvestmentPosition[] {
  return [
    ...positions,
  ].sort(
    (
      a,
      b,
    ) => {
      const aValue =
        a.estimated_value;

      const bValue =
        b.estimated_value;


      if (
        aValue ===
          null &&
        bValue ===
          null
      ) {
        return a.asset.ticker.localeCompare(
          b.asset.ticker,
        );
      }


      if (
        aValue ===
        null
      ) {
        return 1;
      }


      if (
        bValue ===
        null
      ) {
        return -1;
      }


      return (
        bValue -
        aValue
      );
    },
  );
}


/* =========================================================
 * 13. INVESTMENT TABLE
 * ======================================================= */

function buildInvestmentColumns():
readonly DataTableColumn<InvestmentPosition>[] {
  return [
    {
      key:
        "asset",

      header:
        "الأصل",

      render:
        (
          position,
        ) => (
          <div>
            <strong className="ticker">
              {
                position
                  .asset
                  .ticker
              }
            </strong>

            <div
              className="text-subtle text-small"
              style={{
                marginTop:
                  "2px",
              }}
            >
              {
                position
                  .asset
                  .name
              }
            </div>
          </div>
        ),
    },

    {
      key:
        "quantity",

      header:
        "الكمية",

      align:
        "end",

      render:
        (
          position,
        ) => (
          <span className="number">
            {
              formatQuantity(
                position
                  .asset
                  .quantity,
              )
            }
          </span>
        ),
    },

    {
      key:
        "value",

      header:
        "القيمة",

      align:
        "end",

      render:
        (
          position,
        ) =>
          position
            .estimated_value !==
          null ? (
            <span className="currency">
              {
                formatCurrency(
                  position
                    .estimated_value,
                  position
                    .asset
                    .currency,
                )
              }
            </span>
          ) : (
            "—"
          ),
    },

    {
      key:
        "gain_loss",

      header:
        "الربح / الخسارة",

      align:
        "end",

      render:
        (
          position,
        ) => {
          if (
            position
              .estimated_gain_loss ===
            null
          ) {
            return "—";
          }


          return (
            <div
              className={
                getGainLossClass(
                  position
                    .estimated_gain_loss,
                )
              }
            >
              <strong className="currency">
                {
                  formatSignedCurrency(
                    position
                      .estimated_gain_loss,
                    position
                      .asset
                      .currency,
                  )
                }
              </strong>


              {position
                .estimated_gain_loss_percent !==
              null ? (
                <div
                  className="text-small"
                  style={{
                    marginTop:
                      "2px",
                  }}
                >
                  {
                    formatPercent(
                      position
                        .estimated_gain_loss_percent,
                    )
                  }
                </div>
              ) : null}
            </div>
          );
        },
    },

    {
      key:
        "allocation",

      header:
        "من المحفظة",

      align:
        "center",

      render:
        (
          position,
        ) =>
          position
            .allocation_percent !==
          null ? (
            <span className="percentage">
              {
                formatPercent(
                  position
                    .allocation_percent,
                )
              }
            </span>
          ) : (
            "—"
          ),
    },

    {
      key:
        "monthly_target",

      header:
        "الضخ الشهري",

      align:
        "end",

      render:
        (
          position,
        ) =>
          position
            .asset
            .monthly_contribution_target !==
          null ? (
            <span className="currency">
              {
                formatCurrency(
                  position
                    .asset
                    .monthly_contribution_target,
                  position
                    .asset
                    .currency,
                )
              }
            </span>
          ) : (
            "—"
          ),
    },
  ];
}


/* =========================================================
 * 14. PAGE
 * ======================================================= */

export default async function FinancePage() {
  await requireAuthenticatedIdentity();


  const [
    finance,
    investments,
  ] =
    await Promise.all([
      getFinanceSnapshot(),

      getInvestmentSnapshot(),
    ]);


  const activeIncomeSources =
    finance
      .income_sources
      .filter(
        (
          item,
        ) =>
          item.is_active,
      );


  const activeBudgetItems =
    finance
      .budget_items
      .filter(
        (
          item,
        ) =>
          item.is_active,
      );


  const activeInvestmentPositions =
    sortInvestmentPositions(
      investments
        .positions
        .filter(
          (
            position,
          ) =>
            position
              .asset
              .is_active,
        ),
    );


  const expensePercent =
    calculateAllocationPercent(
      finance.monthly_expenses,
      finance.monthly_income,
    );


  const savingPercent =
    calculateAllocationPercent(
      finance.monthly_savings,
      finance.monthly_income,
    );


  const investmentPercent =
    calculateAllocationPercent(
      finance.monthly_investments,
      finance.monthly_income,
    );


  const debtPercent =
    calculateAllocationPercent(
      finance.monthly_debt_payments,
      finance.monthly_income,
    );


  const totalAllocationPercent =
    calculateAllocationPercent(
      finance.monthly_allocations,
      finance.monthly_income,
    );


  const incomeColumns =
    buildIncomeColumns(
      finance,
    );


  const budgetColumns =
    buildBudgetColumns(
      finance,
    );


  const investmentColumns =
    buildInvestmentColumns();


  return (
    <AppShell>
      <div className="page">

        {/* =================================================
         * HEADER
         * =============================================== */}

        <PageHeader
          eyebrow="Personal CFO"
          title="المال"
          description="دخلك، التزاماتك، ادخارك واستثماراتك في مكان واحد."
          meta={
            finance
              .latest_monthly_snapshot ? (
              <span>
                آخر لقطة مالية:{" "}
                <span className="ltr">
                  {
                    finance
                      .latest_monthly_snapshot
                      .month
                  }
                </span>
              </span>
            ) : (
              <span>
                العملة الأساسية:{" "}
                <strong className="ltr">
                  {finance.currency}
                </strong>
              </span>
            )
          }
          action={
            <Link
              href="/investments"
              className="button button--secondary"
            >
              تفاصيل الاستثمارات
            </Link>
          }
        />


        {/* =================================================
         * MONEY AT A GLANCE
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="money-overview-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="money-overview-title"
                className="section-title"
              >
                وضعك المالي
              </h2>


              <p className="section-description">
                أهم أربع أرقام فقط.
              </p>
            </div>
          </div>


          <div className="stats-grid">
            <StatCard
              label="الدخل الشهري"
              value={
                formatCurrency(
                  finance.monthly_income,
                  finance.currency,
                )
              }
              tone="neutral"
              helper="الدخل المتكرر المحسوب شهريًا."
              icon="↓"
            />


            <StatCard
              label="المتاح"
              value={
                formatCurrency(
                  finance.available_amount,
                  finance.currency,
                )
              }
              tone={
                getAvailableTone(
                  finance.available_amount,
                )
              }
              helper={
                finance.available_amount <
                0
                  ? "التوزيع الشهري أعلى من الدخل."
                  : "المتبقي بعد كل التوزيعات."
              }
              icon="="
            />


            <StatCard
              label="قيمة المحفظة"
              value={
                formatCurrency(
                  investments
                    .total_estimated_value,
                  investments.currency,
                )
              }
              tone="neutral"
              helper={`${activeInvestmentPositions.length} أصل استثماري نشط`}
              icon="↗"
            />


            <StatCard
              label="ربح / خسارة المحفظة"
              value={
                formatSignedCurrency(
                  investments
                    .total_estimated_gain_loss,
                  investments.currency,
                )
              }
              tone={
                getGainLossTone(
                  investments
                    .total_estimated_gain_loss,
                )
              }
              helper="تقديري حسب الأسعار المرجعية المسجلة."
              icon="◈"
            />
          </div>
        </section>


        {/* =================================================
         * MONTHLY ALLOCATION
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="money-allocation-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="money-allocation-title"
                className="section-title"
              >
                وين يروح الدخل؟
              </h2>


              <p className="section-description">
                توزيعك الشهري الأساسي.
              </p>
            </div>


            <div>
              <span
                className={
                  totalAllocationPercent >
                  100
                    ? "badge badge--negative"
                    : totalAllocationPercent >=
                        90
                      ? "badge badge--warning"
                      : "badge badge--positive"
                }
              >
                {
                  formatPercent(
                    totalAllocationPercent,
                  )
                }{" "}
                من الدخل
              </span>
            </div>
          </div>


          <div className="grid grid--4">

            <article className="card">
              <span className="text-subtle text-small">
                المصاريف
              </span>


              <div
                className="currency font-bold"
                style={{
                  marginTop:
                    "8px",

                  fontSize:
                    "21px",
                }}
              >
                {
                  formatCurrency(
                    finance.monthly_expenses,
                    finance.currency,
                  )
                }
              </div>


              <div
                className="text-muted text-small"
                style={{
                  marginTop:
                    "4px",
                }}
              >
                {
                  formatPercent(
                    expensePercent,
                  )
                }{" "}
                من الدخل
              </div>
            </article>


            <article className="card">
              <span className="text-subtle text-small">
                الادخار
              </span>


              <div
                className="currency font-bold"
                style={{
                  marginTop:
                    "8px",

                  fontSize:
                    "21px",
                }}
              >
                {
                  formatCurrency(
                    finance.monthly_savings,
                    finance.currency,
                  )
                }
              </div>


              <div
                className="text-muted text-small"
                style={{
                  marginTop:
                    "4px",
                }}
              >
                {
                  formatPercent(
                    savingPercent,
                  )
                }{" "}
                من الدخل
              </div>
            </article>


            <article className="card">
              <span className="text-subtle text-small">
                الاستثمار
              </span>


              <div
                className="currency font-bold"
                style={{
                  marginTop:
                    "8px",

                  fontSize:
                    "21px",
                }}
              >
                {
                  formatCurrency(
                    finance.monthly_investments,
                    finance.currency,
                  )
                }
              </div>


              <div
                className="text-muted text-small"
                style={{
                  marginTop:
                    "4px",
                }}
              >
                {
                  formatPercent(
                    investmentPercent,
                  )
                }{" "}
                من الدخل
              </div>
            </article>


            <article className="card">
              <span className="text-subtle text-small">
                الديون والالتزامات
              </span>


              <div
                className="currency font-bold"
                style={{
                  marginTop:
                    "8px",

                  fontSize:
                    "21px",
                }}
              >
                {
                  formatCurrency(
                    finance.monthly_debt_payments,
                    finance.currency,
                  )
                }
              </div>


              <div
                className="text-muted text-small"
                style={{
                  marginTop:
                    "4px",
                }}
              >
                {
                  formatPercent(
                    debtPercent,
                  )
                }{" "}
                من الدخل
              </div>
            </article>

          </div>
        </section>


        {/* =================================================
         * SAVINGS BALANCES
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="money-savings-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="money-savings-title"
                className="section-title"
              >
                الأرصدة المحفوظة
              </h2>


              <p className="section-description">
                آخر أرصدة مسجلة في الخطة المالية.
              </p>
            </div>
          </div>


          <div className="grid grid--2">
            <article className="card">
              <span className="text-subtle text-small">
                صندوق الطوارئ
              </span>


              <div
                className="currency font-bold"
                style={{
                  marginTop:
                    "8px",

                  fontSize:
                    "22px",
                }}
              >
                {
                  formatCurrency(
                    finance
                      .emergency_fund_balance,
                    finance.currency,
                  )
                }
              </div>
            </article>


            <article className="card">
              <span className="text-subtle text-small">
                توفير السفر
              </span>


              <div
                className="currency font-bold"
                style={{
                  marginTop:
                    "8px",

                  fontSize:
                    "22px",
                }}
              >
                {
                  formatCurrency(
                    finance
                      .travel_savings_balance,
                    finance.currency,
                  )
                }
              </div>
            </article>
          </div>
        </section>


        {/* =================================================
         * INVESTMENTS
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="money-investments-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="money-investments-title"
                className="section-title"
              >
                الاستثمارات
              </h2>


              <p className="section-description">
                المحفظة جزء من مالك، مب نظام منفصل.
              </p>
            </div>


            <Link
              href="/investments"
              className="button button--secondary button--small"
            >
              فتح التفاصيل
            </Link>
          </div>


          <div
            className="grid grid--3"
            style={{
              marginBottom:
                "18px",
            }}
          >
            <article className="card">
              <span className="text-subtle text-small">
                أساس التكلفة
              </span>


              <div
                className="currency font-bold"
                style={{
                  marginTop:
                    "8px",

                  fontSize:
                    "21px",
                }}
              >
                {
                  formatCurrency(
                    investments
                      .total_cost_basis,
                    investments.currency,
                  )
                }
              </div>
            </article>


            <article className="card">
              <span className="text-subtle text-small">
                القيمة التقديرية
              </span>


              <div
                className="currency font-bold"
                style={{
                  marginTop:
                    "8px",

                  fontSize:
                    "21px",
                }}
              >
                {
                  formatCurrency(
                    investments
                      .total_estimated_value,
                    investments.currency,
                  )
                }
              </div>
            </article>


            <article className="card">
              <span className="text-subtle text-small">
                هدف الضخ الشهري
              </span>


              <div
                className="currency font-bold"
                style={{
                  marginTop:
                    "8px",

                  fontSize:
                    "21px",
                }}
              >
                {
                  formatCurrency(
                    investments
                      .total_monthly_contribution_target,
                    investments.currency,
                  )
                }
              </div>
            </article>
          </div>


          {activeInvestmentPositions.length >
          0 ? (
            <DataTable
              rows={
                activeInvestmentPositions
              }
              columns={
                investmentColumns
              }
              getRowKey={
                (
                  position,
                ) =>
                  position
                    .asset
                    .id
              }
              caption="الأصول الاستثمارية النشطة"
            />
          ) : (
            <EmptyState
              compact
              icon="↗"
              title="لا توجد استثمارات مسجلة"
              description="عندما تضيف أول أصل استثماري، تظهر المحفظة هنا تلقائيًا."
            />
          )}
        </section>


        {/* =================================================
         * INCOME SOURCES
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="money-income-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="money-income-title"
                className="section-title"
              >
                مصادر الدخل
              </h2>


              <p className="section-description">
                مصادر الدخل النشطة التي يعتمد عليها حسابك الشهري.
              </p>
            </div>
          </div>


          {activeIncomeSources.length >
          0 ? (
            <DataTable
              rows={
                activeIncomeSources
              }
              columns={
                incomeColumns
              }
              getRowKey={
                (
                  item,
                ) =>
                  item.id
              }
              caption="مصادر الدخل النشطة"
            />
          ) : (
            <EmptyState
              compact
              icon="↓"
              title="لا توجد مصادر دخل"
              description="أضف دخلك من زر + حتى يبدأ LIFE OS بحساب وضعك المالي."
            />
          )}
        </section>


        {/* =================================================
         * MONTHLY ITEMS
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="money-budget-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="money-budget-title"
                className="section-title"
              >
                التوزيع الشهري
              </h2>


              <p className="section-description">
                المصاريف، الادخار، الاستثمار والديون المسجلة.
              </p>
            </div>
          </div>


          {activeBudgetItems.length >
          0 ? (
            <DataTable
              rows={
                activeBudgetItems
              }
              columns={
                budgetColumns
              }
              getRowKey={
                (
                  item,
                ) =>
                  item.id
              }
              caption="بنود التوزيع المالي النشطة"
            />
          ) : (
            <EmptyState
              compact
              icon="◈"
              title="لا توجد توزيعات شهرية"
              description="أضف مصروفًا، ادخارًا، استثمارًا أو التزامًا من زر +."
            />
          )}
        </section>


        {/* =================================================
         * INVESTMENT SAFETY
         * =============================================== */}

        <section className="page-section">
          <div
            className="alert"
            role="note"
          >
            LIFE OS يتابع ويحسب ويقترح فقط. ما ينفذ شراء أو بيع ولا يرسل أوامر للوسيط المالي.
          </div>
        </section>

      </div>
      <section className="page-section"><div className="section-header"><div className="section-header__content"><h2 className="section-title">إضافة بيانات مالية</h2></div></div><div className="card" style={{ display: "flex", flexWrap: "wrap", gap: ".65rem" }}><DataEntryButton kind="income" /><DataEntryButton kind="budget" /><DataEntryButton kind="investment_asset" /></div></section>
    </AppShell>
  );
}


/* =========================================================
 * 15. FINAL MONEY CONTRACT
 * ======================================================= */

/**
 * /finance is the primary V2 Money page.
 *
 *
 * It combines:
 *
 * Finance
 * +
 * Investments
 *
 *
 * User no longer needs two top-level destinations to answer:
 *
 * "شو وضعي المالي؟"
 */


/* =========================================================
 * 16. DETAILED INVESTMENTS
 * ======================================================= */

/**
 * /investments remains available as a detailed secondary
 * view.
 *
 *
 * It can continue to show:
 *
 * reference prices
 * average cost
 * target quantities
 * transactions
 * allocation detail
 *
 *
 * without cluttering the primary Money page.
 */


/* =========================================================
 * 17. FINANCIAL TRUTH
 * ======================================================= */

/**
 * All values on this page come from deterministic database
 * snapshots.
 *
 *
 * AI does NOT calculate:
 *
 * monthly income
 * monthly allocations
 * available amount
 * portfolio value
 * portfolio gain/loss
 */


/* =========================================================
 * 18. INVESTMENT SAFETY
 * ======================================================= */

/**
 * LIFE OS may:
 *
 * read
 * calculate
 * analyze
 * recommend
 *
 *
 * LIFE OS does NOT:
 *
 * buy
 * sell
 * submit broker orders
 * silently rebalance
 */


/* =========================================================
 * 19. FINAL LIFE OS V2 RULE
 * ======================================================= */

/**
 * Money is one life area.
 *
 * Database tables may remain separate underneath.
 *
 *
 * Simple outside.
 * Intelligent underneath.
 */
