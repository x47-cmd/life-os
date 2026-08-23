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
  requireAAL2Identity,
} from "@/lib/auth";

import {
  getDashboardSnapshot,
} from "@/lib/data";

import {
  formatCurrency,
} from "@/lib/format";


/* =========================================================
 * LIFE OS V2
 * HOME
 *
 * Purpose:
 *
 * The Home page should answer only:
 *
 * 1. وين أنا الحين؟
 * 2. شو أهم 3 أشياء؟
 * 3. شو الخطوة التالية؟
 *
 * It should NOT repeat every module in LIFE OS.
 * ======================================================= */


/* =========================================================
 * 1. METADATA
 * ======================================================= */

export const metadata: Metadata = {
  title: "الرئيسية",
};


/* =========================================================
 * 2. PRIORITY SOURCE
 * ======================================================= */

function getPrioritySourceLabel(
  source: string,
): string {
  switch (source) {
    case "finance":
    case "investment":
    case "investments":
      return "المال";

    case "goal":
    case "project":
    case "task":
      return "خططي";

    case "learning":
    case "career":
      return "التطوير";

    default:
      return "LIFE OS";
  }
}


/* =========================================================
 * 3. DATA PRESENCE
 * ======================================================= */

/**
 * V2 must distinguish between:
 *
 * 0 = real value
 *
 * and:
 *
 * data has never been entered.
 *
 * Until the dedicated onboarding state is added, we use the
 * presence of existing records as the safest V2 indicator.
 */
function hasCoreLifeData(
  dashboard:
    Awaited<
      ReturnType<
        typeof getDashboardSnapshot
      >
    >,
): boolean {
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


  return (
    finance.income_sources.length > 0 ||
    finance.budget_items.length > 0 ||
    finance.latest_monthly_snapshot !== null ||
    investments.active_asset_count > 0 ||
    goals.active_count > 0 ||
    goals.planned_count > 0 ||
    goals.paused_count > 0 ||
    goals.completed_count > 0 ||
    projects.active_count > 0 ||
    projects.planned_count > 0 ||
    projects.blocked_count > 0 ||
    projects.completed_count > 0 ||
    tasks.active_count > 0 ||
    tasks.pending_count > 0 ||
    tasks.completed_count > 0 ||
    learning.active_count > 0 ||
    learning.planned_count > 0 ||
    learning.completed_count > 0 ||
    learning.paused_count > 0
  );
}


/* =========================================================
 * 4. HOME PAGE
 * ======================================================= */

export default async function DashboardPage() {
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

  const learning =
    dashboard.learning;

  const latestRecommendation =
    dashboard.latest_ai_recommendation;


  const hasData =
    hasCoreLifeData(
      dashboard,
    );


  const activePlans =
    goals.active_count +
    goals.planned_count +
    projects.active_count +
    projects.planned_count;


  const activeGrowth =
    learning.active_count +
    learning.planned_count;


  return (
    <AppShell>
      <div className="page">

        {/* =================================================
         * PAGE HEADER
         * =============================================== */}

        <PageHeader
          eyebrow="LIFE OS"
          title="وين أنت الحين؟"
          description="أهم وضعك الحالي والخطوة التالية فقط."
          meta={
            <span>
              الشهر:{" "}
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
              ✦ اسأل LIFE AI
            </Link>
          }
        />


        {/* =================================================
         * FIRST-TIME / EMPTY HOME
         * =============================================== */}

        {!hasData ? (
          <section
            className="page-section"
            aria-labelledby="home-start-title"
          >
            <article
              className="card"
              style={{
                padding: "28px",
              }}
            >
              <div
                className="stack"
                style={{
                  maxWidth: "680px",
                }}
              >
                <div>
                  <span
                    className="badge badge--neutral"
                  >
                    بداية LIFE OS
                  </span>
                </div>

                <div>
                  <h2
                    id="home-start-title"
                    className="card__title"
                    style={{
                      fontSize: "24px",
                      marginBottom: "8px",
                    }}
                  >
                    خلنا نبني صورتك الحقيقية
                  </h2>

                  <p className="card__description">
                    ما عندي بيانات كافية عن المال،
                    الخطط، السفر أو التطوير حتى أعطيك
                    تحليلًا مفيدًا.
                  </p>
                </div>

                <div
                  className="inline"
                  style={{
                    marginTop: "4px",
                  }}
                >
                  <span
                    className="text-muted text-small"
                  >
                    الخطوة التالية في V2: الإضافة الذكية
                    — تكتب أو ترفع أي شيء وأنا أرتبه لك.
                  </span>
                </div>
              </div>
            </article>
          </section>
        ) : null}


        {/* =================================================
         * TOP 3
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="home-priorities-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="home-priorities-title"
                className="section-title"
              >
                أهم 3 الآن
              </h2>

              <p className="section-description">
                الأشياء التي تستحق انتباهك فعلًا.
              </p>
            </div>
          </div>


          {dashboard.top_priorities.length > 0 ? (
            <div className="priority-grid">
              {dashboard.top_priorities.map(
                (
                  priority,
                  index,
                ) => (
                  <PriorityCard
                    key={priority.id}
                    rank={index + 1}
                    title={priority.title}
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
              icon="◎"
              title={
                hasData
                  ? "ما عندك أولوية عاجلة الآن"
                  : "الأولويات بتظهر هنا"
              }
              description={
                hasData
                  ? "LIFE OS ما اكتشف شيئًا يحتاج تدخلك الآن."
                  : "بعد إضافة بياناتك، LIFE OS يختار لك أهم 3 أشياء تلقائيًا."
              }
            />
          )}
        </section>


        {/* =================================================
         * CURRENT LIFE SNAPSHOT
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="home-snapshot-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="home-snapshot-title"
                className="section-title"
              >
                لمحة سريعة
              </h2>

              <p className="section-description">
                أقل عدد ممكن من الأرقام.
              </p>
            </div>
          </div>


          <div className="grid grid--3">

            {/* =============================================
             * MONEY
             * =========================================== */}

            <Link
              href="/finance"
              className="card"
              style={{
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div className="space-between">
                <div>
                  <span
                    className="text-muted text-small"
                  >
                    المال
                  </span>

                  <h3
                    className="card__title"
                    style={{
                      marginTop: "6px",
                    }}
                  >
                    {finance.income_sources.length > 0 ||
                    finance.latest_monthly_snapshot !== null
                      ? formatCurrency(
                          finance.available_amount,
                          finance.currency,
                        )
                      : "غير مضاف"}
                  </h3>
                </div>

                <span
                  aria-hidden="true"
                  style={{
                    fontSize: "22px",
                  }}
                >
                  ◈
                </span>
              </div>


              <p
                className="card__description"
                style={{
                  marginTop: "10px",
                }}
              >
                {finance.income_sources.length > 0 ||
                finance.latest_monthly_snapshot !== null
                  ? "المتاح بعد التوزيعات الحالية."
                  : "أضف دخلك وتوزيعك الشهري."}
              </p>
            </Link>


            {/* =============================================
             * PLANS
             * =========================================== */}

            <Link
              href="/goals"
              className="card"
              style={{
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div className="space-between">
                <div>
                  <span
                    className="text-muted text-small"
                  >
                    خططي
                  </span>

                  <h3
                    className="card__title"
                    style={{
                      marginTop: "6px",
                    }}
                  >
                    {activePlans > 0
                      ? `${activePlans} نشطة`
                      : "لا توجد"}
                  </h3>
                </div>

                <span
                  aria-hidden="true"
                  style={{
                    fontSize: "22px",
                  }}
                >
                  ◎
                </span>
              </div>


              <p
                className="card__description"
                style={{
                  marginTop: "10px",
                }}
              >
                {activePlans > 0
                  ? "أهدافك ومشاريعك الحالية."
                  : "أضف أول هدف أو مشروع."}
              </p>
            </Link>


            {/* =============================================
             * TRAVEL
             * =========================================== */}

            <article className="card">
              <div className="space-between">
                <div>
                  <span
                    className="text-muted text-small"
                  >
                    السفر
                  </span>

                  <h3
                    className="card__title"
                    style={{
                      marginTop: "6px",
                    }}
                  >
                    قريبًا
                  </h3>
                </div>

                <span
                  aria-hidden="true"
                  style={{
                    fontSize: "22px",
                  }}
                >
                  ✈
                </span>
              </div>


              <p
                className="card__description"
                style={{
                  marginTop: "10px",
                }}
              >
                الرحلة القادمة، الميزانية والجاهزية.
              </p>
            </article>

          </div>
        </section>


        {/* =================================================
         * SECONDARY SNAPSHOT
         * =============================================== */}

        {hasData ? (
          <section
            className="page-section"
            aria-labelledby="home-secondary-title"
          >
            <div className="grid grid--2">

              {/* ===========================================
               * INVESTMENTS
               * ========================================= */}

              <Link
                href="/investments"
                className="card"
                style={{
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div className="space-between">
                  <div>
                    <span
                      className="text-muted text-small"
                    >
                      الاستثمارات
                    </span>

                    <h3
                      className="card__title"
                      style={{
                        marginTop: "6px",
                      }}
                    >
                      {investments.active_asset_count > 0
                        ? formatCurrency(
                            investments
                              .total_estimated_value,
                            investments.currency,
                          )
                        : "غير مضافة"}
                    </h3>
                  </div>

                  <span
                    aria-hidden="true"
                    style={{
                      fontSize: "22px",
                    }}
                  >
                    ↗
                  </span>
                </div>


                <p
                  className="card__description"
                  style={{
                    marginTop: "10px",
                  }}
                >
                  {investments.active_asset_count > 0
                    ? `${investments.active_asset_count} أصل نشط`
                    : "أضف المحفظة عندما تكون جاهزًا."}
                </p>
              </Link>


              {/* ===========================================
               * GROWTH
               * ========================================= */}

              <Link
                href="/learning"
                className="card"
                style={{
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div className="space-between">
                  <div>
                    <span
                      className="text-muted text-small"
                    >
                      التطوير
                    </span>

                    <h3
                      className="card__title"
                      style={{
                        marginTop: "6px",
                      }}
                    >
                      {activeGrowth > 0
                        ? `${activeGrowth} نشط`
                        : "لا يوجد"}
                    </h3>
                  </div>

                  <span
                    aria-hidden="true"
                    style={{
                      fontSize: "22px",
                    }}
                  >
                    ◉
                  </span>
                </div>


                <p
                  className="card__description"
                  style={{
                    marginTop: "10px",
                  }}
                >
                  الدراسة، الدورات والمسار المهني.
                </p>
              </Link>

            </div>
          </section>
        ) : null}


        {/* =================================================
         * LIFE AI
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="home-ai-title"
        >
          <article
            className="card"
            style={{
              padding: "24px",
            }}
          >
            <div className="space-between">
              <div
                style={{
                  maxWidth: "720px",
                }}
              >
                <span
                  className="text-muted text-small"
                >
                  ✦ من LIFE OS
                </span>

                <h2
                  id="home-ai-title"
                  className="card__title"
                  style={{
                    marginTop: "8px",
                  }}
                >
                  {latestRecommendation
                    ? latestRecommendation.title
                    : hasData
                      ? "وضعك واضح"
                      : "أحتاج بياناتك أولًا"}
                </h2>


                <p
                  className="card__description"
                  style={{
                    marginTop: "8px",
                  }}
                >
                  {latestRecommendation
                    ? latestRecommendation.recommendation
                    : hasData
                      ? "ما عندي توصية محفوظة تحتاج انتباهك الآن."
                      : "بعد الإعداد، أعطيك توصية قصيرة مرتبطة بوضعك الحقيقي بدل كلام عام."}
                </p>
              </div>


              <Link
                href="/assistant"
                className="button button--secondary button--small"
              >
                LIFE AI
              </Link>
            </div>
          </article>
        </section>


        {/* =================================================
         * V2 RULE
         * =============================================== */}

        <p
          className="text-muted text-small"
          style={{
            textAlign: "center",
            paddingBottom: "8px",
          }}
        >
          أقل معلومات ظاهرة. أكثر ذكاء تحتها.
        </p>

      </div>
    </AppShell>
  );
}