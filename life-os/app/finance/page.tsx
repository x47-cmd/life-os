import type {
  Metadata,
} from "next";

import {
  AppShell,
} from "@/components/app-shell";

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
  requireAAL2Identity,
} from "@/lib/auth";

import {
  getFinanceSnapshot,
} from "@/lib/data";

import {
  formatCurrency,
  formatDate,
  formatPercent,
} from "@/lib/format";

import type {
  BudgetItem,
  FinanceSnapshot,
  IncomeSource,
} from "@/lib/types";


/* =========================================================
 * 1. METADATA
 * ======================================================= */

export const metadata: Metadata = {
  title:
    "المالية",
};


/* =========================================================
 * 2. FREQUENCY LABEL
 * ======================================================= */

function getFrequencyLabel(
  frequency: string,
): string {
  switch (frequency) {
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
  type: string,
): string {
  switch (type) {
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
  type: string,
): string {
  switch (type) {
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
 * 5. AVAILABILITY TONE
 * ======================================================= */

function getAvailableTone(
  amount: number,
):
  | "positive"
  | "warning"
  | "negative"
  | "neutral" {
  if (
    amount < 0
  ) {
    return "negative";
  }

  if (
    amount === 0
  ) {
    return "warning";
  }

  return "positive";
}


/* =========================================================
 * 6. MONTHLY ALLOCATION PERCENTAGE
 * ======================================================= */

function calculateAllocationPercent(
  amount: number,
  income: number,
): number {
  if (
    income <= 0
  ) {
    return 0;
  }

  return Math.max(
    0,
    (
      amount /
      income
    ) * 100,
  );
}


/* =========================================================
 * 7. MONTHLY EQUIVALENT FOR DISPLAY
 * ======================================================= */

/**
 * This mirrors the locked deterministic monthly planning
 * convention in lib/data.ts.
 *
 * monthly
 *   → full amount
 *
 * annual
 *   → amount / 12
 *
 * one_time / other
 *   → excluded from recurring monthly baseline
 */
function getMonthlyEquivalent(
  amount: number,
  frequency: string,
): number {
  switch (frequency) {
    case "monthly":
      return amount;

    case "annual":
      return amount / 12;

    case "one_time":
    case "other":
    default:
      return 0;
  }
}


/* =========================================================
 * 8. INCOME TABLE
 * ======================================================= */

function buildIncomeColumns(
  finance: FinanceSnapshot,
): readonly DataTableColumn<IncomeSource>[] {
  return [
    {
      key:
        "name",

      header:
        "مصدر الدخل",

      render:
        (item) => (
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
        (item) => (
          <span className="currency">
            {formatCurrency(
              item.amount,
              finance.currency,
            )}
          </span>
        ),
    },

    {
      key:
        "frequency",

      header:
        "التكرار",

      render:
        (item) => (
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
        (item) => (
          <span className="currency">
            {formatCurrency(
              getMonthlyEquivalent(
                item.amount,
                item.frequency,
              ),
              finance.currency,
            )}
          </span>
        ),
    },

    {
      key:
        "next",

      header:
        "الاستحقاق القادم",

      render:
        (item) =>
          item.next_expected_date
            ? formatDate(
                item.next_expected_date,
              )
            : "—",
    },
  ];
}


/* =========================================================
 * 9. BUDGET TABLE
 * ======================================================= */

function buildBudgetColumns(
  finance: FinanceSnapshot,
): readonly DataTableColumn<BudgetItem>[] {
  return [
    {
      key:
        "name",

      header:
        "البند",

      render:
        (item) => (
          <div>
            <strong>
              {item.name}
            </strong>

            {item.category ? (
              <div
                className="text-subtle text-small"
                style={{
                  marginTop:
                    "2px",
                }}
              >
                {item.category}
              </div>
            ) : null}
          </div>
        ),
    },

    {
      key:
        "type",

      header:
        "النوع",

      render:
        (item) => (
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
        (item) => (
          <span className="currency">
            {formatCurrency(
              item.amount,
              finance.currency,
            )}
          </span>
        ),
    },

    {
      key:
        "frequency",

      header:
        "التكرار",

      render:
        (item) => (
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
        (item) => (
          <span className="currency">
            {formatCurrency(
              getMonthlyEquivalent(
                item.amount,
                item.frequency,
              ),
              finance.currency,
            )}
          </span>
        ),
    },

    {
      key:
        "due",

      header:
        "يوم الاستحقاق",

      align:
        "center",

      render:
        (item) =>
          item.due_day !== null
            ? String(
                item.due_day,
              )
            : "—",
    },
  ];
}


/* =========================================================
 * 10. FINANCE PAGE
 * ======================================================= */

export default async function FinancePage() {
  await requireAAL2Identity();

  const finance =
    await getFinanceSnapshot();


  /* -------------------------------------------------------
   * Active records only for primary presentation
   * ---------------------------------------------------- */

  const activeIncomeSources =
    finance.income_sources.filter(
      (item) =>
        item.is_active,
    );

  const activeBudgetItems =
    finance.budget_items.filter(
      (item) =>
        item.is_active,
    );


  /* -------------------------------------------------------
   * Allocation percentages
   * ---------------------------------------------------- */

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


  return (
    <AppShell>
      <div className="page">

        {/* =================================================
         * HEADER
         * =============================================== */}

        <PageHeader
          eyebrow="Personal CFO"
          title="المالية"
          description="دخلك، توزيعك الشهري، وما يتبقى لك بعد كل الالتزامات."
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
                لا توجد لقطة شهرية محفوظة بعد
              </span>
            )
          }
        />


        {/* =================================================
         * CURRENT FINANCIAL STATE
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="finance-state-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="finance-state-title"
                className="section-title"
              >
                وضعك الشهري
              </h2>

              <p className="section-description">
                الصورة الأساسية بعد تحويل البنود المتكررة إلى مكافئ شهري.
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
              icon="↓"
            />


            <StatCard
              label="إجمالي التوزيعات"
              value={
                formatCurrency(
                  finance.monthly_allocations,
                  finance.currency,
                )
              }
              tone={
                totalAllocationPercent >
                100
                  ? "negative"
                  : totalAllocationPercent >=
                      90
                    ? "warning"
                    : "neutral"
              }
              helper={
                finance.monthly_income >
                0
                  ? `${formatPercent(totalAllocationPercent)} من الدخل`
                  : "لا يوجد دخل شهري محسوب."
              }
              icon="↔"
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
                  ? "التوزيع الشهري يحتاج مراجعة."
                  : "المتبقي بعد كل التوزيعات."
              }
              icon="="
            />


            <StatCard
              label="صندوق الطوارئ"
              value={
                formatCurrency(
                  finance
                    .emergency_fund_balance,
                  finance.currency,
                )
              }
              tone={
                finance
                  .emergency_fund_balance >
                0
                  ? "positive"
                  : "warning"
              }
              helper="الرصيد المسجل في آخر لقطة مالية."
              icon="◈"
            />

          </div>
        </section>


        {/* =================================================
         * MONTHLY ALLOCATION
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="finance-allocation-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="finance-allocation-title"
                className="section-title"
              >
                وين يروح الدخل؟
              </h2>

              <p className="section-description">
                أربع فئات فقط حتى تكون الخطة واضحة من أول نظرة.
              </p>
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
                {formatCurrency(
                  finance.monthly_expenses,
                  finance.currency,
                )}
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

              <div
                className="progress"
                style={{
                  marginTop:
                    "14px",
                }}
              >
                <div
                  className="progress__value"
                  style={{
                    width:
                      `${Math.min(
                        100,
                        expensePercent,
                      )}%`,
                  }}
                />
              </div>
            </article>


            <article className="card">
              <span className="text-subtle text-small">
                الادخار
              </span>

              <div
                className="currency font-bold text-positive"
                style={{
                  marginTop:
                    "8px",

                  fontSize:
                    "21px",
                }}
              >
                {formatCurrency(
                  finance.monthly_savings,
                  finance.currency,
                )}
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

              <div
                className="progress"
                style={{
                  marginTop:
                    "14px",
                }}
              >
                <div
                  className="progress__value"
                  style={{
                    width:
                      `${Math.min(
                        100,
                        savingPercent,
                      )}%`,
                  }}
                />
              </div>
            </article>


            <article className="card">
              <span className="text-subtle text-small">
                الاستثمار
              </span>

              <div
                className="currency font-bold text-accent"
                style={{
                  marginTop:
                    "8px",

                  fontSize:
                    "21px",
                }}
              >
                {formatCurrency(
                  finance
                    .monthly_investments,
                  finance.currency,
                )}
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

              <div
                className="progress"
                style={{
                  marginTop:
                    "14px",
                }}
              >
                <div
                  className="progress__value"
                  style={{
                    width:
                      `${Math.min(
                        100,
                        investmentPercent,
                      )}%`,
                  }}
                />
              </div>
            </article>


            <article className="card">
              <span className="text-subtle text-small">
                الدين والالتزامات
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
                {formatCurrency(
                  finance
                    .monthly_debt_payments,
                  finance.currency,
                )}
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

              <div
                className="progress"
                style={{
                  marginTop:
                    "14px",
                }}
              >
                <div
                  className="progress__value"
                  style={{
                    width:
                      `${Math.min(
                        100,
                        debtPercent,
                      )}%`,
                  }}
                />
              </div>
            </article>

          </div>
        </section>


        {/* =================================================
         * SAVINGS BALANCES
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="finance-balances-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="finance-balances-title"
                className="section-title"
              >
                أرصدة مهمة
              </h2>

              <p className="section-description">
                الأرصدة التي تحتاج متابعة مستقلة عن المصروف الشهري.
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
                    "24px",
                }}
              >
                {formatCurrency(
                  finance
                    .emergency_fund_balance,
                  finance.currency,
                )}
              </div>

              <p className="card__description">
                سيولة مخصصة للحالات غير المتوقعة، وليست للاستثمار أو المصروف العادي.
              </p>
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
                    "24px",
                }}
              >
                {formatCurrency(
                  finance
                    .travel_savings_balance,
                  finance.currency,
                )}
              </div>

              <p className="card__description">
                رصيد السفر المسجل في أحدث لقطة مالية.
              </p>
            </article>

          </div>
        </section>


        {/* =================================================
         * INCOME SOURCES
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="income-sources-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="income-sources-title"
                className="section-title"
              >
                مصادر الدخل
              </h2>

              <p className="section-description">
                المصادر النشطة التي يبني عليها LIFE OS خطتك الشهرية.
              </p>
            </div>
          </div>


          {activeIncomeSources.length > 0 ? (
            <DataTable
              rows={
                activeIncomeSources
              }
              columns={
                incomeColumns
              }
              getRowKey={
                (item) =>
                  item.id
              }
              caption="مصادر الدخل النشطة"
            />
          ) : (
            <EmptyState
              compact
              icon="↓"
              title="لا يوجد مصدر دخل نشط"
              description="لن يتمكن LIFE OS من بناء توزيع شهري مفيد قبل تسجيل مصدر دخل."
            />
          )}
        </section>


        {/* =================================================
         * MONTHLY PLAN
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="monthly-plan-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="monthly-plan-title"
                className="section-title"
              >
                خطة التوزيع
              </h2>

              <p className="section-description">
                المصاريف والادخار والاستثمار والالتزامات النشطة.
              </p>
            </div>
          </div>


          {activeBudgetItems.length > 0 ? (
            <DataTable
              rows={
                activeBudgetItems
              }
              columns={
                budgetColumns
              }
              getRowKey={
                (item) =>
                  item.id
              }
              caption="التوزيع المالي الشهري"
            />
          ) : (
            <EmptyState
              compact
              icon="↔"
              title="لا توجد خطة توزيع بعد"
              description="أضف البنود الأساسية ليحسب LIFE OS المبلغ المتاح شهريًا."
            />
          )}
        </section>


        {/* =================================================
         * FINANCIAL SIGNAL
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="financial-signal-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="financial-signal-title"
                className="section-title"
              >
                الإشارة الحالية
              </h2>
            </div>
          </div>


          {finance.monthly_income <= 0 ? (
            <div className="alert alert--warning">
              لا يوجد دخل شهري محسوب حاليًا، لذلك لا يمكن تقييم التوزيع المالي بشكل كامل.
            </div>
          ) : finance.available_amount < 0 ? (
            <div
              className="alert alert--negative"
              role="status"
            >
              التوزيعات الشهرية تتجاوز دخلك بمقدار{" "}
              <strong className="currency">
                {formatCurrency(
                  Math.abs(
                    finance.available_amount,
                  ),
                  finance.currency,
                )}
              </strong>
              . الأولوية الآن هي إعادة ترتيب الخطة قبل إضافة التزام جديد.
            </div>
          ) : totalAllocationPercent >= 90 ? (
            <div
              className="alert alert--warning"
              role="status"
            >
              معظم دخلك موزع حاليًا. لديك هامش شهري محدود، لذلك أي التزام جديد يحتاج مراجعة قبل اعتماده.
            </div>
          ) : (
            <div
              className="alert alert--positive"
              role="status"
            >
              الخطة الحالية تترك مبلغًا متاحًا قدره{" "}
              <strong className="currency">
                {formatCurrency(
                  finance.available_amount,
                  finance.currency,
                )}
              </strong>
              {" "}شهريًا بعد التوزيعات المسجلة.
            </div>
          )}
        </section>

      </div>
    </AppShell>
  );
}


/* =========================================================
 * 11. FINANCIAL SOURCE OF TRUTH
 * ======================================================= */

/**
 * FinancePage does NOT create the authoritative financial
 * snapshot.
 *
 * The source of truth is:
 *
 * lib/data.ts
 *      ↓
 * calculateFinanceTotals()
 *      ↓
 * calculateFinanceSnapshot()
 *
 * This page only presents those deterministic results.
 */


/* =========================================================
 * 12. AI RULE
 * ======================================================= */

/**
 * No AI call occurs when opening the Finance page.
 *
 * Finance must remain fully functional even when OpenAI is
 * unavailable.
 *
 * AI may later analyze this information through the
 * controlled Assistant / Decision Simulator boundaries.
 */


/* =========================================================
 * 13. MONTHLY PLANNING RULE
 * ======================================================= */

/**
 * Recurring baseline:
 *
 * monthly
 *   → full amount
 *
 * annual
 *   → monthly equivalent
 *
 * one_time
 *   → not treated as recurring monthly spending
 *
 * other
 *   → not guessed
 *
 * LIFE OS avoids inventing recurrence where none is known.
 */


/* =========================================================
 * 14. PERCENTAGE RULE
 * ======================================================= */

/**
 * Allocation percentages are simple deterministic display
 * calculations:
 *
 * monthly category amount
 * -----------------------
 * monthly income
 *
 * AI does not calculate these percentages.
 */


/* =========================================================
 * 15. SNAPSHOT RULE
 * ======================================================= */

/**
 * Emergency-fund and travel balances come from the latest
 * stored monthly snapshot when available.
 *
 * They are not inferred from:
 *
 * income
 * budget
 * AI
 *
 * because a monthly allocation is not the same thing as an
 * actual accumulated balance.
 */


/* =========================================================
 * 16. SECURITY RULE
 * ======================================================= */

/**
 * Server request
 *      ↓
 * requireAAL2Identity()
 *      ↓
 * getFinanceSnapshot()
 *      ↓
 * authenticated user identity
 *      ↓
 * PostgreSQL RLS
 *
 * No financial user_id is supplied by the browser.
 */


/* =========================================================
 * 17. PRIVACY RULE
 * ======================================================= */

/**
 * This page renders private financial information only after
 * the AAL2 server boundary succeeds.
 *
 * It does not send the financial snapshot to an external AI
 * provider merely because the page was opened.
 */


/* =========================================================
 * 18. FINAL FINANCE RULE
 * ======================================================= */

/**
 * Finance page should answer:
 *
 * How much comes in?
 * Where does it go?
 * What remains?
 * What am I saving?
 * What am I investing?
 * What am I paying toward debt?
 * What important cash balances do I have?
 *
 * Nothing more.
 *
 * Simple outside.
 * Intelligent underneath.
 */