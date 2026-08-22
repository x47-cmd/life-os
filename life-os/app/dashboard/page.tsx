import type {
  Metadata,
} from "next";

import Link from "next/link";

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
  PriorityCard,
} from "@/components/priority-card";

import {
  StatCard,
} from "@/components/stat-card";

import {
  requireAAL2Identity,
} from "@/lib/auth";

import {
  getDashboardSnapshot,
} from "@/lib/data";

import {
  formatCurrency,
} from "@/lib/format";


/* =========================================================
 * 1. METADATA
 * ======================================================= */

export const metadata: Metadata = {
  title:
    "الرئيسية",
};


/* =========================================================
 * 2. PRIORITY SOURCE LABEL
 * ======================================================= */

function getPrioritySourceLabel(
  source: string,
): string {
  switch (source) {
    case "finance":
      return "المالية";

    case "investment":
    case "investments":
      return "الاستثمارات";

    case "goal":
      return "هدف";

    case "project":
      return "مشروع";

    case "task":
      return "مهمة";

    case "learning":
      return "التعلم";

    case "career":
      return "المسار المهني";

    default:
      return "LIFE OS";
  }
}


/* =========================================================
 * 3. FINANCE TONE
 * ======================================================= */

function getAvailableAmountTone(
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
 * 4. PORTFOLIO TONE
 * ======================================================= */

function getPortfolioTone(
  gainLoss: number,
):
  | "positive"
  | "negative"
  | "neutral" {
  if (
    gainLoss > 0
  ) {
    return "positive";
  }

  if (
    gainLoss < 0
  ) {
    return "negative";
  }

  return "neutral";
}


/* =========================================================
 * 5. DASHBOARD PAGE
 * ======================================================= */

export default async function DashboardPage() {
  /**
   * Explicit page-level protection.
   *
   * Data functions enforce AAL2 as well, but the page guard
   * gives the user the correct authentication redirect
   * behavior before private content is rendered.
   */
  await requireAAL2Identity();

  const dashboard =
    await getDashboardSnapshot();

  const finance =
    dashboard.finance;

  const investments =
    dashboard.investments;

  const goals =
    dashboard.goals;

  const projects =
    dashboard.projects;

  const tasks =
    dashboard.tasks;

  const learning =
    dashboard.learning;

  const latestRecommendation =
    dashboard
      .latest_ai_recommendation;


  return (
    <AppShell>
      <div className="page">

        {/* =================================================
         * PAGE HEADER
         * =============================================== */}

        <PageHeader
          eyebrow="نظرة عامة"
          title="وين أنت الحين؟"
          description="أهم وضعك الحالي، أولوياتك، والخطوة التالية."
          meta={
            <span>
              الشهر الحالي:{" "}
              <span className="ltr">
                {dashboard.month}
              </span>
            </span>
          }
          action={
            <Link
              href="/assistant"
              className="button button--primary"
            >
              اسأل LIFE OS
            </Link>
          }
        />


        {/* =================================================
         * HEADLINE STATE
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="dashboard-state-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="dashboard-state-title"
                className="section-title"
              >
                وضعك الحالي
              </h2>

              <p className="section-description">
                الأرقام الأساسية فقط التي تحتاجها لاتخاذ قرار.
              </p>
            </div>
          </div>


          <div className="stats-grid">

            <StatCard
              label="المتاح شهريًا"
              value={
                formatCurrency(
                  finance.available_amount,
                  finance.currency,
                )
              }
              tone={
                getAvailableAmountTone(
                  finance.available_amount,
                )
              }
              helper={
                finance.available_amount < 0
                  ? "التوزيعات الحالية تتجاوز الدخل."
                  : "بعد المصاريف والتوفير والاستثمار والالتزامات."
              }
              icon="↔"
            />


            <StatCard
              label="قيمة الاستثمارات"
              value={
                formatCurrency(
                  investments
                    .total_estimated_value,
                  investments.currency,
                )
              }
              tone={
                getPortfolioTone(
                  investments
                    .total_estimated_gain_loss,
                )
              }
              helper={
                investments.active_asset_count > 0
                  ? `${investments.active_asset_count} أصل نشط`
                  : "لا توجد أصول نشطة بعد."
              }
              icon="↗"
            />


            <StatCard
              label="الأهداف النشطة"
              value={
                String(
                  goals.active_count,
                )
              }
              tone="neutral"
              helper={
                goals.paused_count > 0
                  ? `${goals.paused_count} هدف متوقف مؤقتًا`
                  : "ركز على الأهداف الحالية قبل إضافة المزيد."
              }
              icon="◎"
            />


            <StatCard
              label="المهام المتأخرة"
              value={
                String(
                  tasks.overdue_count,
                )
              }
              tone={
                tasks.overdue_count > 0
                  ? "warning"
                  : "positive"
              }
              helper={
                tasks.overdue_count > 0
                  ? "تحتاج مراجعة قبل إضافة مهام جديدة."
                  : "لا توجد مهام متأخرة حاليًا."
              }
              icon="✓"
            />

          </div>
        </section>


        {/* =================================================
         * TOP 3 PRIORITIES
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="dashboard-priorities-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="dashboard-priorities-title"
                className="section-title"
              >
                أهم 3 أولويات
              </h2>

              <p className="section-description">
                الأشياء التي تستحق انتباهك الآن، وليس كل ما هو موجود.
              </p>
            </div>
          </div>


          {dashboard
            .top_priorities
            .length > 0 ? (
            <div className="priority-grid">
              {dashboard
                .top_priorities
                .map(
                  (
                    priority,
                    index,
                  ) => (
                    <PriorityCard
                      key={
                        priority.id
                      }
                      rank={
                        index + 1
                      }
                      title={
                        priority.title
                      }
                      description={
                        priority.description
                      }
                      nextAction={
                        priority.next_action
                      }
                      priority={
                        priority.priority
                      }
                      sourceLabel={
                        getPrioritySourceLabel(
                          priority.source,
                        )
                      }
                      meta={
                        priority.target_date ? (
                          <span>
                            المستهدف:{" "}
                            <span className="ltr">
                              {
                                priority
                                  .target_date
                              }
                            </span>
                          </span>
                        ) : null
                      }
                    />
                  ),
                )}
            </div>
          ) : (
            <EmptyState
              compact
              icon="✓"
              title="لا توجد أولوية عاجلة الآن"
              description="وضعك الحالي لا يحتوي على مشكلة أو مهمة عالية الأولوية تحتاج الظهور هنا."
            />
          )}
        </section>


        {/* =================================================
         * LIFE AREAS
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="dashboard-areas-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="dashboard-areas-title"
                className="section-title"
              >
                الصورة العامة
              </h2>

              <p className="section-description">
                ملخص سريع بدون فتح كل قسم.
              </p>
            </div>
          </div>


          <div className="grid grid--2">

            {/* =============================================
             * FINANCE
             * =========================================== */}

            <article className="card">
              <div className="space-between">
                <div>
                  <h3 className="card__title">
                    المالية
                  </h3>

                  <p className="card__description">
                    الدخل والتوزيع الشهري.
                  </p>
                </div>

                <Link
                  href="/finance"
                  className="button button--ghost button--small"
                >
                  فتح
                </Link>
              </div>

              <div
                className="stack stack--small"
                style={{
                  marginTop:
                    "18px",
                }}
              >
                <div className="space-between">
                  <span className="text-muted text-small">
                    الدخل الشهري
                  </span>

                  <strong className="currency">
                    {formatCurrency(
                      finance.monthly_income,
                      finance.currency,
                    )}
                  </strong>
                </div>

                <div className="space-between">
                  <span className="text-muted text-small">
                    التوزيعات
                  </span>

                  <strong className="currency">
                    {formatCurrency(
                      finance
                        .monthly_allocations,
                      finance.currency,
                    )}
                  </strong>
                </div>

                <div className="space-between">
                  <span className="text-muted text-small">
                    صندوق الطوارئ
                  </span>

                  <strong className="currency">
                    {formatCurrency(
                      finance
                        .emergency_fund_balance,
                      finance.currency,
                    )}
                  </strong>
                </div>

                <div className="space-between">
                  <span className="text-muted text-small">
                    توفير السفر
                  </span>

                  <strong className="currency">
                    {formatCurrency(
                      finance
                        .travel_savings_balance,
                      finance.currency,
                    )}
                  </strong>
                </div>
              </div>
            </article>


            {/* =============================================
             * INVESTMENTS
             * =========================================== */}

            <article className="card">
              <div className="space-between">
                <div>
                  <h3 className="card__title">
                    الاستثمارات
                  </h3>

                  <p className="card__description">
                    وضع المحفظة وخطة الضخ.
                  </p>
                </div>

                <Link
                  href="/investments"
                  className="button button--ghost button--small"
                >
                  فتح
                </Link>
              </div>

              <div
                className="stack stack--small"
                style={{
                  marginTop:
                    "18px",
                }}
              >
                <div className="space-between">
                  <span className="text-muted text-small">
                    التكلفة
                  </span>

                  <strong className="currency">
                    {formatCurrency(
                      investments
                        .total_cost_basis,
                      investments.currency,
                    )}
                  </strong>
                </div>

                <div className="space-between">
                  <span className="text-muted text-small">
                    القيمة التقديرية
                  </span>

                  <strong className="currency">
                    {formatCurrency(
                      investments
                        .total_estimated_value,
                      investments.currency,
                    )}
                  </strong>
                </div>

                <div className="space-between">
                  <span className="text-muted text-small">
                    الربح / الخسارة
                  </span>

                  <strong
                    className={[
                      "currency",
                      investments
                        .total_estimated_gain_loss >
                      0
                        ? "text-positive"
                        : investments
                              .total_estimated_gain_loss <
                            0
                          ? "text-negative"
                          : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {formatCurrency(
                      investments
                        .total_estimated_gain_loss,
                      investments.currency,
                    )}
                  </strong>
                </div>

                <div className="space-between">
                  <span className="text-muted text-small">
                    هدف الاستثمار الشهري
                  </span>

                  <strong className="currency">
                    {formatCurrency(
                      investments
                        .total_monthly_contribution_target,
                      investments.currency,
                    )}
                  </strong>
                </div>
              </div>
            </article>


            {/* =============================================
             * GOALS + PROJECTS
             * =========================================== */}

            <article className="card">
              <div className="space-between">
                <div>
                  <h3 className="card__title">
                    الأهداف والمشاريع
                  </h3>

                  <p className="card__description">
                    هل الأشياء المهمة تتحرك؟
                  </p>
                </div>

                <Link
                  href="/goals"
                  className="button button--ghost button--small"
                >
                  الأهداف
                </Link>
              </div>

              <div
                className="stack stack--small"
                style={{
                  marginTop:
                    "18px",
                }}
              >
                <div className="space-between">
                  <span className="text-muted text-small">
                    أهداف نشطة
                  </span>

                  <strong>
                    {
                      goals.active_count
                    }
                  </strong>
                </div>

                <div className="space-between">
                  <span className="text-muted text-small">
                    مشاريع نشطة
                  </span>

                  <strong>
                    {
                      projects.active_count
                    }
                  </strong>
                </div>

                <div className="space-between">
                  <span className="text-muted text-small">
                    مشاريع متعطلة
                  </span>

                  <strong
                    className={
                      projects.blocked_count >
                      0
                        ? "text-warning"
                        : undefined
                    }
                  >
                    {
                      projects.blocked_count
                    }
                  </strong>
                </div>

                <div className="space-between">
                  <span className="text-muted text-small">
                    أهداف مكتملة
                  </span>

                  <strong>
                    {
                      goals.completed_count
                    }
                  </strong>
                </div>
              </div>

              <div
                className="inline"
                style={{
                  marginTop:
                    "16px",
                }}
              >
                <Link
                  href="/projects"
                  className="button button--secondary button--small"
                >
                  فتح المشاريع
                </Link>
              </div>
            </article>


            {/* =============================================
             * TASKS + LEARNING
             * =========================================== */}

            <article className="card">
              <div className="space-between">
                <div>
                  <h3 className="card__title">
                    التنفيذ والتعلم
                  </h3>

                  <p className="card__description">
                    ما الذي تعمل عليه فعليًا؟
                  </p>
                </div>

                <Link
                  href="/tasks"
                  className="button button--ghost button--small"
                >
                  المهام
                </Link>
              </div>

              <div
                className="stack stack--small"
                style={{
                  marginTop:
                    "18px",
                }}
              >
                <div className="space-between">
                  <span className="text-muted text-small">
                    مهام نشطة
                  </span>

                  <strong>
                    {
                      tasks.active_count
                    }
                  </strong>
                </div>

                <div className="space-between">
                  <span className="text-muted text-small">
                    مهام معلقة
                  </span>

                  <strong>
                    {
                      tasks.pending_count
                    }
                  </strong>
                </div>

                <div className="space-between">
                  <span className="text-muted text-small">
                    تعلم نشط
                  </span>

                  <strong>
                    {
                      learning.active_count
                    }
                  </strong>
                </div>

                <div className="space-between">
                  <span className="text-muted text-small">
                    تعلم مكتمل
                  </span>

                  <strong>
                    {
                      learning.completed_count
                    }
                  </strong>
                </div>
              </div>

              <div
                className="inline"
                style={{
                  marginTop:
                    "16px",
                }}
              >
                <Link
                  href="/learning"
                  className="button button--secondary button--small"
                >
                  فتح التعلم
                </Link>
              </div>
            </article>

          </div>
        </section>


        {/* =================================================
         * LATEST AI RECOMMENDATION
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="dashboard-ai-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="dashboard-ai-title"
                className="section-title"
              >
                من LIFE OS
              </h2>

              <p className="section-description">
                آخر توصية مهمة محفوظة لك.
              </p>
            </div>
          </div>


          {latestRecommendation ? (
            <article className="ai-panel">
              <div className="ai-response">

                <div className="ai-response__section">
                  <span className="ai-response__label">
                    التوصية
                  </span>

                  <h3
                    className="card__title"
                    style={{
                      margin:
                        0,
                    }}
                  >
                    {
                      latestRecommendation
                        .title
                    }
                  </h3>
                </div>


                <div className="ai-response__section">
                  <span className="ai-response__label">
                    ماذا يقترح؟
                  </span>

                  <p className="ai-response__text">
                    {
                      latestRecommendation
                        .recommendation
                    }
                  </p>
                </div>


                <div>
                  <Link
                    href="/assistant"
                    className="button button--secondary button--small"
                  >
                    ناقشها مع LIFE OS
                  </Link>
                </div>

              </div>
            </article>
          ) : (
            <EmptyState
              compact
              icon="✦"
              title="لا توجد توصية محفوظة حاليًا"
              description="استخدم المساعد عندما تحتاج تحليلًا أو قرارًا، وليس لمجرد ملء الصفحة بالتوصيات."
              action={
                <Link
                  href="/assistant"
                  className="button button--secondary button--small"
                >
                  فتح المساعد
                </Link>
              }
            />
          )}
        </section>

      </div>
    </AppShell>
  );
}


/* =========================================================
 * 6. DASHBOARD PRINCIPLE
 * ======================================================= */

/**
 * Dashboard does NOT attempt to show the whole LIFE OS
 * database.
 *
 * It deliberately prioritizes:
 *
 * 1. Current state
 * 2. Top 3 priorities
 * 3. Major life areas
 * 4. One useful AI recommendation
 */


/* =========================================================
 * 7. FINANCIAL AUTHORITY
 * ======================================================= */

/**
 * This page never calculates financial values itself.
 *
 * All values come from:
 *
 * lib/data.ts
 *
 * and are only formatted here with:
 *
 * lib/format.ts
 *
 * AI never becomes the source of financial truth.
 */


/* =========================================================
 * 8. INVESTMENT RULE
 * ======================================================= */

/**
 * Portfolio values displayed here use the deterministic
 * InvestmentSnapshot.
 *
 * Cross-currency positions are not silently combined without
 * an FX engine.
 *
 * The dashboard therefore displays the portfolio currency
 * defined by the snapshot rather than inventing conversions.
 */


/* =========================================================
 * 9. PRIORITY RULE
 * ======================================================= */

/**
 * Maximum dashboard priorities:
 *
 * 3
 *
 * Priority selection is performed by the deterministic LIFE
 * OS priority engine before this page renders.
 *
 * This component does not create or reorder priorities.
 */


/* =========================================================
 * 10. SECURITY RULE
 * ======================================================= */

/**
 * Protected page flow:
 *
 * Server request
 *      ↓
 * requireAAL2Identity()
 *      ↓
 * getDashboardSnapshot()
 *      ↓
 * authenticated data layer
 *      ↓
 * PostgreSQL RLS
 *      ↓
 * render
 *
 * No private data is fetched from the browser.
 */


/* =========================================================
 * 11. MOBILE RULE
 * ======================================================= */

/**
 * On iPhone:
 *
 * headline metrics
 *      ↓
 * priorities
 *      ↓
 * life areas
 *      ↓
 * AI recommendation
 *
 * grids collapse into a single readable column through the
 * locked global design system.
 */


/* =========================================================
 * 12. FINAL DASHBOARD RULE
 * ======================================================= */

/**
 * LIFE OS Dashboard should answer:
 *
 * Where am I?
 * What matters?
 * What should I do next?
 *
 * If a number does not help answer one of those questions,
 * it probably does not belong here.
 *
 * Simple outside.
 * Intelligent underneath.
 */