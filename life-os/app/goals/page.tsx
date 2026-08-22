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
  listGoals,
} from "@/lib/data";

import {
  formatDate,
  formatProgress,
} from "@/lib/format";

import type {
  Goal,
} from "@/lib/types";


/* =========================================================
 * 1. METADATA
 * ======================================================= */

export const metadata: Metadata = {
  title:
    "الأهداف",
};


/* =========================================================
 * 2. PRIORITY WEIGHT
 * ======================================================= */

const PRIORITY_WEIGHT = {
  high: 3,
  medium: 2,
  low: 1,
} as const;


/* =========================================================
 * 3. STATUS WEIGHT
 * ======================================================= */

const STATUS_WEIGHT = {
  active: 4,
  planned: 3,
  paused: 2,
  completed: 1,
  cancelled: 0,
} as const;


/* =========================================================
 * 4. LABEL HELPERS
 * ======================================================= */

function getGoalStatusLabel(
  status: Goal["status"],
): string {
  switch (status) {
    case "active":
      return "نشط";

    case "planned":
      return "مخطط";

    case "paused":
      return "متوقف مؤقتًا";

    case "completed":
      return "مكتمل";

    case "cancelled":
      return "ملغي";

    default:
      return "غير معروف";
  }
}


function getGoalStatusBadgeClass(
  status: Goal["status"],
): string {
  switch (status) {
    case "active":
      return "badge badge--accent";

    case "completed":
      return "badge badge--positive";

    case "paused":
      return "badge badge--warning";

    case "cancelled":
      return "badge badge--negative";

    case "planned":
    default:
      return "badge";
  }
}


function getPriorityLabel(
  priority: Goal["priority"],
): string {
  switch (priority) {
    case "high":
      return "عالية";

    case "medium":
      return "متوسطة";

    case "low":
      return "منخفضة";

    default:
      return "غير محددة";
  }
}


function getPriorityBadgeClass(
  priority: Goal["priority"],
): string {
  switch (priority) {
    case "high":
      return "badge badge--negative";

    case "medium":
      return "badge badge--warning";

    case "low":
    default:
      return "badge";
  }
}


/* =========================================================
 * 5. CATEGORY LABEL
 * ======================================================= */

function getCategoryLabel(
  category: Goal["category"],
): string {
  switch (category) {
    case "finance":
      return "المالية";

    case "investments":
      return "الاستثمارات";

    case "career":
      return "المسار المهني";

    case "learning":
      return "التعلم";

    case "education":
      return "التعليم";

    case "travel":
      return "السفر";

    case "fitness":
      return "اللياقة";

    case "business":
      return "البزنس";

    case "personal":
      return "شخصي";

    case "other":
    default:
      return "أخرى";
  }
}


/* =========================================================
 * 6. SORTING
 * ======================================================= */

function compareDates(
  a: string | null,
  b: string | null,
): number {
  if (
    a === null &&
    b === null
  ) {
    return 0;
  }

  if (
    a === null
  ) {
    return 1;
  }

  if (
    b === null
  ) {
    return -1;
  }

  return a.localeCompare(
    b,
  );
}


function sortGoals(
  goals: Goal[],
): Goal[] {
  return [
    ...goals,
  ].sort(
    (
      a,
      b,
    ) => {
      const statusDifference =
        STATUS_WEIGHT[
          b.status
        ] -
        STATUS_WEIGHT[
          a.status
        ];

      if (
        statusDifference !==
        0
      ) {
        return statusDifference;
      }

      const priorityDifference =
        PRIORITY_WEIGHT[
          b.priority
        ] -
        PRIORITY_WEIGHT[
          a.priority
        ];

      if (
        priorityDifference !==
        0
      ) {
        return priorityDifference;
      }

      return compareDates(
        a.target_date,
        b.target_date,
      );
    },
  );
}


/* =========================================================
 * 7. ACTIVE GOAL CARD
 * ======================================================= */

function ActiveGoalCard({
  goal,
}: {
  goal: Goal;
}) {
  const progress =
    Math.min(
      100,
      Math.max(
        0,
        goal.progress_percent,
      ),
    );

  return (
    <article className="card">
      <div className="space-between">
        <div>
          <div className="inline">
            <span
              className={
                getPriorityBadgeClass(
                  goal.priority,
                )
              }
            >
              {
                getPriorityLabel(
                  goal.priority,
                )
              }
            </span>

            <span className="badge">
              {
                getCategoryLabel(
                  goal.category,
                )
              }
            </span>
          </div>

          <h2
            className="card__title"
            style={{
              marginTop:
                "12px",
            }}
          >
            {goal.title}
          </h2>

          {goal.description ? (
            <p className="card__description">
              {goal.description}
            </p>
          ) : null}
        </div>

        <strong className="percentage">
          {formatProgress(
            progress,
          )}
        </strong>
      </div>


      <div
        className="progress"
        style={{
          marginTop:
            "18px",
        }}
        aria-label={
          `التقدم ${formatProgress(progress)}`
        }
      >
        <div
          className="progress__value"
          style={{
            width:
              `${progress}%`,
          }}
        />
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
            الموعد المستهدف
          </span>

          <strong>
            {goal.target_date
              ? formatDate(
                  goal.target_date,
                )
              : "غير محدد"}
          </strong>
        </div>


        <div className="space-between">
          <span className="text-muted text-small">
            الخطوة التالية
          </span>

          <strong>
            {goal.next_action ??
              "لا توجد خطوة محددة"}
          </strong>
        </div>
      </div>
    </article>
  );
}


/* =========================================================
 * 8. TABLE COLUMNS
 * ======================================================= */

const columns:
  readonly DataTableColumn<Goal>[] = [
    {
      key:
        "title",

      header:
        "الهدف",

      render:
        (goal) => (
          <div>
            <strong>
              {goal.title}
            </strong>

            <div
              className="text-subtle text-small"
              style={{
                marginTop:
                  "2px",
              }}
            >
              {
                getCategoryLabel(
                  goal.category,
                )
              }
            </div>
          </div>
        ),
    },

    {
      key:
        "status",

      header:
        "الحالة",

      render:
        (goal) => (
          <span
            className={
              getGoalStatusBadgeClass(
                goal.status,
              )
            }
          >
            {
              getGoalStatusLabel(
                goal.status,
              )
            }
          </span>
        ),
    },

    {
      key:
        "priority",

      header:
        "الأولوية",

      render:
        (goal) => (
          <span
            className={
              getPriorityBadgeClass(
                goal.priority,
              )
            }
          >
            {
              getPriorityLabel(
                goal.priority,
              )
            }
          </span>
        ),
    },

    {
      key:
        "progress",

      header:
        "التقدم",

      align:
        "center",

      render:
        (goal) => (
          <span className="percentage">
            {
              formatProgress(
                goal.progress_percent,
              )
            }
          </span>
        ),
    },

    {
      key:
        "target_date",

      header:
        "الموعد",

      render:
        (goal) =>
          goal.target_date
            ? formatDate(
                goal.target_date,
              )
            : "—",
    },

    {
      key:
        "next_action",

      header:
        "الخطوة التالية",

      render:
        (goal) =>
          goal.next_action ??
          "—",
    },
  ];


/* =========================================================
 * 9. GOALS PAGE
 * ======================================================= */

export default async function GoalsPage() {
  await requireAAL2Identity();

  const goals =
    sortGoals(
      await listGoals(),
    );

  const activeGoals =
    goals.filter(
      (goal) =>
        goal.status ===
        "active",
    );

  const plannedCount =
    goals.filter(
      (goal) =>
        goal.status ===
        "planned",
    ).length;

  const pausedCount =
    goals.filter(
      (goal) =>
        goal.status ===
        "paused",
    ).length;

  const completedCount =
    goals.filter(
      (goal) =>
        goal.status ===
        "completed",
    ).length;


  return (
    <AppShell>
      <div className="page">

        {/* =================================================
         * HEADER
         * =============================================== */}

        <PageHeader
          eyebrow="الاتجاه"
          title="الأهداف"
          description="الأهداف التي تحدد أين تريد أن تصل، وما الخطوة التالية لكل هدف."
        />


        {/* =================================================
         * SUMMARY
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="goal-summary-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="goal-summary-title"
                className="section-title"
              >
                الحالة
              </h2>
            </div>
          </div>


          <div className="stats-grid">
            <StatCard
              label="نشطة"
              value={
                String(
                  activeGoals.length,
                )
              }
              tone="positive"
              icon="◎"
            />

            <StatCard
              label="مخططة"
              value={
                String(
                  plannedCount,
                )
              }
              tone="neutral"
              icon="＋"
            />

            <StatCard
              label="متوقفة مؤقتًا"
              value={
                String(
                  pausedCount,
                )
              }
              tone={
                pausedCount > 0
                  ? "warning"
                  : "neutral"
              }
              icon="Ⅱ"
            />

            <StatCard
              label="مكتملة"
              value={
                String(
                  completedCount,
                )
              }
              tone="positive"
              icon="✓"
            />
          </div>
        </section>


        {/* =================================================
         * ACTIVE GOALS
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="active-goals-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="active-goals-title"
                className="section-title"
              >
                الأهداف النشطة
              </h2>

              <p className="section-description">
                ركز على ما تعمل عليه الآن قبل فتح أهداف جديدة.
              </p>
            </div>
          </div>


          {activeGoals.length > 0 ? (
            <div className="grid grid--2">
              {activeGoals.map(
                (goal) => (
                  <ActiveGoalCard
                    key={
                      goal.id
                    }
                    goal={
                      goal
                    }
                  />
                ),
              )}
            </div>
          ) : (
            <EmptyState
              icon="◎"
              title="لا توجد أهداف نشطة"
              description="عندما تحدد هدفًا نشطًا، سيظهر هنا مع نسبة التقدم والخطوة التالية."
            />
          )}
        </section>


        {/* =================================================
         * ALL GOALS
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="all-goals-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="all-goals-title"
                className="section-title"
              >
                كل الأهداف
              </h2>

              <p className="section-description">
                النشطة أولًا، ثم المخططة والمتوقفة والمكتملة.
              </p>
            </div>
          </div>


          <DataTable
            rows={
              goals
            }
            columns={
              columns
            }
            getRowKey={
              (goal) =>
                goal.id
            }
            caption="أهداف LIFE OS"
            emptyMessage="لا توجد أهداف مسجلة حاليًا."
          />
        </section>

      </div>
    </AppShell>
  );
}


/* =========================================================
 * 10. PAGE RESPONSIBILITY
 * ======================================================= */

/**
 * Goals describe desired outcomes.
 *
 * They are not:
 *
 * - detailed project plans
 * - task lists
 * - AI recommendations
 *
 * Execution details belong in Projects and Tasks.
 */


/* =========================================================
 * 11. ACTIVE-FIRST RULE
 * ======================================================= */

/**
 * LIFE OS intentionally places active goals first.
 *
 * The user should see:
 *
 * Goal
 *      ↓
 * Progress
 *      ↓
 * Target date
 *      ↓
 * Next action
 *
 * before historical or future goals.
 */


/* =========================================================
 * 12. PROGRESS RULE
 * ======================================================= */

/**
 * progress_percent is stored and calculated outside the
 * presentation component.
 *
 * The page only:
 *
 * - clamps the visual progress bar to 0–100
 * - formats the displayed percentage
 *
 * It does not invent progress.
 */


/* =========================================================
 * 13. SECURITY RULE
 * ======================================================= */

/**
 * Server request
 *      ↓
 * requireAAL2Identity()
 *      ↓
 * listGoals()
 *      ↓
 * authenticated user_id
 *      ↓
 * PostgreSQL RLS
 *
 * No user identifier comes from browser input.
 */


/* =========================================================
 * 14. SIMPLICITY RULE
 * ======================================================= */

/**
 * The Goals page should answer:
 *
 * What am I trying to achieve?
 * How far have I progressed?
 * When do I want it?
 * What do I do next?
 *
 * Nothing more.
 *
 * Simple outside.
 * Intelligent underneath.
 */