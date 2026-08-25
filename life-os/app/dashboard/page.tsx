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
  requireAuthenticatedIdentity,
} from "@/lib/auth";

import {
  getDashboardSnapshot,
} from "@/lib/data";

import {
  formatCurrency,
  formatDate,
  formatPercent,
} from "@/lib/format";

import {
  getTravelSnapshot,
} from "@/lib/travel-data";


/* =========================================================
 * LIFE OS V2
 * FINAL HOME
 *
 * Home answers only:
 *
 * 1. وين أنا الحين؟
 * 2. شو أهم 3 أشياء؟
 * 3. شو أهم وضعي في:
 *
 *    المال
 *    خططي
 *    السفر
 *    التطوير
 *
 * 4. شو توصية LIFE OS الحالية؟
 *
 *
 * Home does NOT become a second copy of every module.
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
    "الرئيسية",
};


/* =========================================================
 * 2. PRIORITY SOURCE LABEL
 * ======================================================= */

function getPrioritySourceLabel(
  source:
    string,
): string {
  switch (
    source
  ) {
    case "finance":
    case "investment":
    case "investments":
      return "المال";


    case "goal":
    case "project":
    case "task":
      return "خططي";


    case "travel":
    case "trip":
      return "السفر";


    case "learning":
    case "career":
      return "التطوير";


    default:
      return "LIFE OS";
  }
}


/* =========================================================
 * 3. CORE DATA PRESENCE
 * ======================================================= */

/**
 * Zero is a valid real value.
 *
 * Therefore the Home page does not decide whether data exists
 * by checking whether a monetary value is greater than zero.
 *
 * It checks whether domain records actually exist.
 */
function hasCoreLifeData(
  dashboard:
    Awaited<
      ReturnType<
        typeof getDashboardSnapshot
      >
    >,

  travel:
    Awaited<
      ReturnType<
        typeof getTravelSnapshot
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
    finance.income_sources.length >
      0 ||
    finance.budget_items.length >
      0 ||
    finance.latest_monthly_snapshot !==
      null ||
    investments.active_asset_count >
      0 ||
    goals.active_count >
      0 ||
    goals.planned_count >
      0 ||
    goals.paused_count >
      0 ||
    goals.completed_count >
      0 ||
    projects.active_count >
      0 ||
    projects.planned_count >
      0 ||
    projects.blocked_count >
      0 ||
    projects.completed_count >
      0 ||
    tasks.active_count >
      0 ||
    tasks.pending_count >
      0 ||
    tasks.completed_count >
      0 ||
    learning.active_count >
      0 ||
    learning.planned_count >
      0 ||
    learning.completed_count >
      0 ||
    learning.paused_count >
      0 ||
    travel.upcoming_trips.length >
      0 ||
    travel.active_trips.length >
      0 ||
    travel.completed_trip_count >
      0 ||
    travel.document_count >
      0
  );
}


/* =========================================================
 * 4. TRAVEL DATE LABEL
 * ======================================================= */

function getTravelDateLabel(
  startDate:
    string |
    null,

  endDate:
    string |
    null,
): string {
  if (
    !startDate &&
    !endDate
  ) {
    return "التاريخ غير محدد";
  }


  if (
    startDate &&
    !endDate
  ) {
    return `من ${formatDate(
      startDate,
    )}`;
  }


  if (
    !startDate &&
    endDate
  ) {
    return `حتى ${formatDate(
      endDate,
    )}`;
  }


  return `${formatDate(
    startDate,
  )} — ${formatDate(
    endDate,
  )}`;
}


/* =========================================================
 * 5. HOME PAGE
 * ======================================================= */

export default async function DashboardPage() {
  /*
   * Final V2 authentication boundary.
   *
   * Password-authenticated verified identity is sufficient.
   */
  await requireAuthenticatedIdentity();


  /*
   * Dashboard and Travel are independent read models.
   *
   * Load them concurrently.
   */
  const [
    dashboard,
    travel,
  ] =
    await Promise.all([
      getDashboardSnapshot(),

      getTravelSnapshot(),
    ]);


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
    dashboard
      .latest_ai_recommendation;


  const hasData =
    hasCoreLifeData(
      dashboard,
      travel,
    );


  const activePlans =
    goals.active_count +
    goals.planned_count +
    projects.active_count +
    projects.planned_count;


  const activeGrowth =
    learning.active_count +
    learning.planned_count;


  /*
   * Current active trip has priority.
   *
   * Otherwise use the next planned/booked trip.
   */
  const focusTrip =
    travel.active_trips[0] ??
    travel.next_trip ??
    null;


  const moneyHasData =
    finance.income_sources.length >
      0 ||
    finance.budget_items.length >
      0 ||
    finance.latest_monthly_snapshot !==
      null ||
    investments.active_asset_count >
      0;


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
         * FIRST-TIME STATE
         * =============================================== */}

        {!hasData ? (
          <section
            className="page-section"
            aria-labelledby="home-start-title"
          >
            <article
              className="card"
              style={{
                padding:
                  "28px",
              }}
            >
              <div
                className="stack"
                style={{
                  maxWidth:
                    "680px",
                }}
              >
                <div>
                  <span className="badge badge--neutral">
                    بداية LIFE OS
                  </span>
                </div>


                <div>
                  <h2
                    id="home-start-title"
                    className="card__title"
                    style={{
                      fontSize:
                        "24px",

                      marginBottom:
                        "8px",
                    }}
                  >
                    خلنا نبني صورتك الحقيقية
                  </h2>


                  <p className="card__description">
                    ما عندي بيانات كافية عن المال،
                    الخطط، السفر أو التطوير حتى أعطيك
                    صورة مفيدة.
                  </p>
                </div>


                <div
                  className="inline"
                  style={{
                    marginTop:
                      "4px",
                  }}
                >
                  <span className="text-muted text-small">
                    استخدم زر + واكتب أي معلومة أو ارفع PDF،
                    وLIFE OS بيجهز لك القيم للمراجعة قبل الحفظ.
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


          {dashboard
            .top_priorities
            .length >
          0 ? (
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
                        index +
                        1
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
              icon="◎"
              title={
                hasData
                  ? "ما عندك أولوية عاجلة الآن"
                  : "الأولويات بتظهر هنا"
              }
              description={
                hasData
                  ? "LIFE OS ما عنده أولوية محفوظة تحتاج تدخلك الآن."
                  : "بعد إضافة بياناتك، أهم الأولويات بتظهر هنا."
              }
            />
          )}
        </section>


        {/* =================================================
         * FOUR LIFE AREAS
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
                أهم أربع مناطق في حياتك من أول نظرة.
              </p>
            </div>
          </div>


          <div className="grid grid--2">

            {/* =============================================
             * MONEY
             * =========================================== */}

            <Link
              href="/finance"
              className="card"
              style={{
                textDecoration:
                  "none",

                color:
                  "inherit",
              }}
            >
              <div className="space-between">
                <div>
                  <span className="text-muted text-small">
                    المال
                  </span>


                  <h3
                    className="card__title"
                    style={{
                      marginTop:
                        "6px",
                    }}
                  >
                    {moneyHasData
                      ? formatCurrency(
                          finance
                            .available_amount,
                          finance.currency,
                        )
                      : "غير مضاف"}
                  </h3>
                </div>


                <span
                  aria-hidden="true"
                  style={{
                    fontSize:
                      "22px",
                  }}
                >
                  ◈
                </span>
              </div>


              <p
                className="card__description"
                style={{
                  marginTop:
                    "10px",
                }}
              >
                {moneyHasData
                  ? investments.active_asset_count >
                    0
                    ? `المتاح بعد التوزيعات • ${investments.active_asset_count} أصل استثماري`
                    : "المتاح بعد التوزيعات الحالية."
                  : "دخلك، التزاماتك واستثماراتك في مكان واحد."}
              </p>
            </Link>


            {/* =============================================
             * PLANS
             * =========================================== */}

            <Link
              href="/goals"
              className="card"
              style={{
                textDecoration:
                  "none",

                color:
                  "inherit",
              }}
            >
              <div className="space-between">
                <div>
                  <span className="text-muted text-small">
                    خططي
                  </span>


                  <h3
                    className="card__title"
                    style={{
                      marginTop:
                        "6px",
                    }}
                  >
                    {activePlans >
                    0
                      ? `${activePlans} نشطة`
                      : "لا توجد"}
                  </h3>
                </div>


                <span
                  aria-hidden="true"
                  style={{
                    fontSize:
                      "22px",
                  }}
                >
                  ◎
                </span>
              </div>


              <p
                className="card__description"
                style={{
                  marginTop:
                    "10px",
                }}
              >
                {activePlans >
                0
                  ? `${goals.active_count + goals.planned_count} هدف • ${projects.active_count + projects.planned_count} مشروع`
                  : "أهدافك ومشاريعك الحالية بتظهر هنا."}
              </p>
            </Link>


            {/* =============================================
             * TRAVEL
             * =========================================== */}

            <Link
              href="/travel"
              className="card"
              style={{
                textDecoration:
                  "none",

                color:
                  "inherit",
              }}
            >
              <div className="space-between">
                <div>
                  <span className="text-muted text-small">
                    السفر
                  </span>


                  <h3
                    className="card__title"
                    style={{
                      marginTop:
                        "6px",
                    }}
                  >
                    {focusTrip
                      ? focusTrip.destination
                      : "لا توجد رحلة"}
                  </h3>
                </div>


                <span
                  aria-hidden="true"
                  style={{
                    fontSize:
                      "22px",
                  }}
                >
                  ✈
                </span>
              </div>


              {focusTrip ? (
                <>
                  <div
                    style={{
                      marginTop:
                        "12px",
                    }}
                  >
                    <div className="space-between">
                      <span className="text-muted text-small">
                        الجاهزية
                      </span>

                      <strong>
                        {
                          formatPercent(
                            focusTrip
                              .readiness_percent,
                          )
                        }
                      </strong>
                    </div>


                    <progress
                      value={
                        focusTrip
                          .readiness_percent
                      }
                      max={100}
                      aria-label={`جاهزية الرحلة ${focusTrip.readiness_percent}%`}
                      style={{
                        width:
                          "100%",

                        height:
                          "8px",

                        marginTop:
                          "6px",
                      }}
                    />
                  </div>


                  <p
                    className="card__description"
                    style={{
                      marginTop:
                        "10px",
                    }}
                  >
                    {
                      getTravelDateLabel(
                        focusTrip.start_date,
                        focusTrip.end_date,
                      )
                    }
                  </p>
                </>
              ) : (
                <p
                  className="card__description"
                  style={{
                    marginTop:
                      "10px",
                  }}
                >
                  أضف وجهتك أو ارفع برنامج الرحلة PDF.
                </p>
              )}
            </Link>


            {/* =============================================
             * GROWTH
             * =========================================== */}

            <Link
              href="/learning"
              className="card"
              style={{
                textDecoration:
                  "none",

                color:
                  "inherit",
              }}
            >
              <div className="space-between">
                <div>
                  <span className="text-muted text-small">
                    التطوير
                  </span>


                  <h3
                    className="card__title"
                    style={{
                      marginTop:
                        "6px",
                    }}
                  >
                    {activeGrowth >
                    0
                      ? `${activeGrowth} نشط`
                      : "لا يوجد"}
                  </h3>
                </div>


                <span
                  aria-hidden="true"
                  style={{
                    fontSize:
                      "22px",
                  }}
                >
                  ◉
                </span>
              </div>


              <p
                className="card__description"
                style={{
                  marginTop:
                    "10px",
                }}
              >
                {activeGrowth >
                0
                  ? "الدراسة، الدورات والمسار المهني."
                  : "تعليمك وتطورك المهني في مكان واحد."}
              </p>
            </Link>

          </div>
        </section>


        {/* =================================================
         * NEXT TRIP DETAIL
         * =============================================== */}

        {focusTrip ? (
          <section
            className="page-section"
            aria-labelledby="home-travel-title"
          >
            <div className="section-header">
              <div className="section-header__content">
                <h2
                  id="home-travel-title"
                  className="section-title"
                >
                  الرحلة القادمة
                </h2>


                <p className="section-description">
                  أهم شيء تحتاج تعرفه قبل السفر.
                </p>
              </div>


              <Link
                href="/travel"
                className="button button--secondary button--small"
              >
                فتح السفر
              </Link>
            </div>


            <article className="card">
              <div className="space-between">
                <div>
                  <span className="badge">
                    {
                      focusTrip.status ===
                        "active"
                        ? "جارية الآن"
                        : focusTrip.status ===
                            "booked"
                          ? "محجوزة"
                          : "مخطط لها"
                    }
                  </span>


                  <h3
                    className="card__title"
                    style={{
                      marginTop:
                        "12px",

                      marginBottom:
                        "4px",
                    }}
                  >
                    {focusTrip.title}
                  </h3>


                  <p
                    className="card__description"
                    style={{
                      margin:
                        0,
                    }}
                  >
                    ✈ {focusTrip.destination}
                  </p>
                </div>


                <div
                  style={{
                    textAlign:
                      "end",
                  }}
                >
                  <span className="text-muted text-small">
                    الجاهزية
                  </span>


                  <div
                    style={{
                      marginTop:
                        "4px",

                      fontSize:
                        "24px",

                      fontWeight:
                        700,
                    }}
                  >
                    {
                      formatPercent(
                        focusTrip
                          .readiness_percent,
                      )
                    }
                  </div>
                </div>
              </div>


              <div
                className="grid grid--2"
                style={{
                  marginTop:
                    "20px",
                }}
              >
                <div>
                  <div className="text-subtle text-small">
                    التاريخ
                  </div>

                  <strong>
                    {
                      getTravelDateLabel(
                        focusTrip.start_date,
                        focusTrip.end_date,
                      )
                    }
                  </strong>
                </div>


                <div>
                  <div className="text-subtle text-small">
                    الميزانية
                  </div>

                  <strong className="currency">
                    {focusTrip.budget_total !==
                    null
                      ? formatCurrency(
                          focusTrip
                            .budget_total,
                          focusTrip.currency,
                        )
                      : "غير محددة"}
                  </strong>
                </div>
              </div>
            </article>
          </section>
        ) : null}


        {/* =================================================
         * LIFE OS RECOMMENDATION
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="home-ai-title"
        >
          <article
            className="card"
            style={{
              padding:
                "24px",
            }}
          >
            <div className="space-between">
              <div
                style={{
                  maxWidth:
                    "720px",
                }}
              >
                <span className="text-muted text-small">
                  ✦ توصية LIFE OS
                </span>


                <h2
                  id="home-ai-title"
                  className="card__title"
                  style={{
                    marginTop:
                      "8px",
                  }}
                >
                  {latestRecommendation
                    ? latestRecommendation.title
                    : hasData
                      ? "ما عندك توصية عاجلة الآن"
                      : "أحتاج بياناتك أولًا"}
                </h2>


                <p
                  className="card__description"
                  style={{
                    marginTop:
                      "8px",
                  }}
                >
                  {latestRecommendation
                    ? latestRecommendation
                        .recommendation
                    : hasData
                      ? "LIFE OS ما عنده توصية محفوظة تحتاج انتباهك الآن."
                      : "بعد إضافة بياناتك، تظهر هنا توصية واحدة مرتبطة بوضعك الحقيقي."}
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
         * HOME PRINCIPLE
         * =============================================== */}

        <p
          className="text-muted text-small"
          style={{
            textAlign:
              "center",

            paddingBottom:
              "8px",
          }}
        >
          أقل معلومات ظاهرة. أكثر ذكاء تحتها.
        </p>

      </div>
    </AppShell>
  );
}


/* =========================================================
 * 6. FINAL HOME CONTRACT
 * ======================================================= */

/**
 * Home contains:
 *
 * Top 3
 *
 * money snapshot
 * plans snapshot
 * travel snapshot
 * growth snapshot
 *
 * one focused upcoming/active trip
 *
 * one LIFE OS recommendation
 *
 *
 * It does NOT duplicate:
 *
 * full Finance
 * full Investments
 * full Goals
 * full Projects
 * full Travel OS
 * full Learning
 * full Career
 */


/* =========================================================
 * 7. TRAVEL HOME RULE
 * ======================================================= */

/**
 * Travel is now live on Home.
 *
 *
 * Home reads:
 *
 * active trip
 *      or
 * next planned/booked trip
 *
 *
 * It displays:
 *
 * destination
 * dates
 * readiness
 * budget
 *
 *
 * Full details remain in:
 *
 * /travel
 */


/* =========================================================
 * 8. DATA TRUTH RULE
 * ======================================================= */

/**
 * Home displays database facts only.
 *
 *
 * It does not ask AI to calculate:
 *
 * available money
 * active plan count
 * Travel readiness
 * Travel budget
 *
 *
 * AI recommendations remain a separate explicit read model.
 */


/* =========================================================
 * 9. FINAL LIFE OS V2 RULE
 * ======================================================= */

/**
 * The Home screen should answer:
 *
 * What matters?
 * What's next?
 *
 *
 * without making the user inspect the whole system.
 *
 *
 * Simple outside.
 * Intelligent underneath.
 */