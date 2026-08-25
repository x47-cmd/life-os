import type {
  Metadata,
} from "next";

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
  requireAAL2Identity,
} from "@/lib/auth";

import {
  listGoals,
  listProjects,
} from "@/lib/data";

import {
  formatDate,
  formatProgress,
} from "@/lib/format";

import type {
  Goal,
  Project,
  UUID,
} from "@/lib/types";


/* =========================================================
 * 1. METADATA
 * ======================================================= */

export const metadata: Metadata = {
  title:
    "المشاريع",
};


/* =========================================================
 * 2. PRIORITY WEIGHT
 * ======================================================= */

function getPriorityWeight(
  priority: string,
): number {
  switch (priority) {
    case "high":
      return 3;

    case "medium":
      return 2;

    case "low":
      return 1;

    default:
      return 0;
  }
}


/* =========================================================
 * 3. STATUS WEIGHT
 * ======================================================= */

/**
 * Blocked projects intentionally appear first.
 *
 * A blocked project normally needs attention before a project
 * that is simply progressing normally.
 */
function getStatusWeight(
  status: string,
): number {
  switch (status) {
    case "blocked":
      return 5;

    case "active":
      return 4;

    case "planned":
      return 3;

    case "paused":
      return 2;

    case "completed":
      return 1;

    case "cancelled":
      return 0;

    default:
      return 0;
  }
}


/* =========================================================
 * 4. STATUS LABEL
 * ======================================================= */

function getProjectStatusLabel(
  status: string,
): string {
  switch (status) {
    case "active":
      return "نشط";

    case "blocked":
      return "متعطل";

    case "planned":
      return "مخطط";

    case "paused":
      return "متوقف مؤقتًا";

    case "completed":
      return "مكتمل";

    case "cancelled":
      return "ملغي";

    default:
      return status;
  }
}


/* =========================================================
 * 5. STATUS BADGE
 * ======================================================= */

function getProjectStatusBadgeClass(
  status: string,
): string {
  switch (status) {
    case "active":
      return "badge badge--accent";

    case "blocked":
      return "badge badge--negative";

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


/* =========================================================
 * 6. PRIORITY LABEL
 * ======================================================= */

function getPriorityLabel(
  priority: string,
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


/* =========================================================
 * 7. PRIORITY BADGE
 * ======================================================= */

function getPriorityBadgeClass(
  priority: string,
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
 * 8. CATEGORY LABEL
 * ======================================================= */

function getCategoryLabel(
  category: string,
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

    case "technology":
      return "التقنية";

    case "personal":
      return "شخصي";

    case "other":
      return "أخرى";

    default:
      return category;
  }
}


/* =========================================================
 * 9. DATE COMPARISON
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


/* =========================================================
 * 10. SORT PROJECTS
 * ======================================================= */

function sortProjects(
  projects: Project[],
): Project[] {
  return [
    ...projects,
  ].sort(
    (
      a,
      b,
    ) => {
      const statusDifference =
        getStatusWeight(
          b.status,
        ) -
        getStatusWeight(
          a.status,
        );

      if (
        statusDifference !==
        0
      ) {
        return statusDifference;
      }

      const priorityDifference =
        getPriorityWeight(
          b.priority,
        ) -
        getPriorityWeight(
          a.priority,
        );

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
 * 11. GOAL LOOKUP
 * ======================================================= */

function buildGoalLookup(
  goals: Goal[],
): Map<UUID, string> {
  return new Map(
    goals.map(
      (goal) => [
        goal.id,
        goal.title,
      ],
    ),
  );
}


function getLinkedGoalTitle(
  project: Project,
  goals:
    Map<UUID, string>,
): string | null {
  if (
    !project.goal_id
  ) {
    return null;
  }

  return (
    goals.get(
      project.goal_id,
    ) ??
    null
  );
}


/* =========================================================
 * 12. PROJECT CARD
 * ======================================================= */

function ProjectCard({
  project,
  linkedGoal,
}: {
  project: Project;
  linkedGoal: string | null;
}) {
  const progress =
    Math.min(
      100,
      Math.max(
        0,
        project.progress_percent,
      ),
    );

  return (
    <article className="card">

      {/* ===============================================
       * HEADER
       * ============================================= */}

      <div className="space-between">
        <div>
          <div className="inline">
            <span
              className={
                getProjectStatusBadgeClass(
                  project.status,
                )
              }
            >
              {
                getProjectStatusLabel(
                  project.status,
                )
              }
            </span>

            <span
              className={
                getPriorityBadgeClass(
                  project.priority,
                )
              }
            >
              {
                getPriorityLabel(
                  project.priority,
                )
              }
            </span>

            <span className="badge">
              {
                getCategoryLabel(
                  project.category,
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
            {project.title}
          </h2>


          {project.description ? (
            <p className="card__description">
              {
                project.description
              }
            </p>
          ) : null}
        </div>


        <strong className="percentage">
          {
            formatProgress(
              progress,
            )
          }
        </strong>
      </div>


      {/* ===============================================
       * PROGRESS
       * ============================================= */}

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


      {/* ===============================================
       * PROJECT DETAILS
       * ============================================= */}

      <div
        className="stack stack--small"
        style={{
          marginTop:
            "18px",
        }}
      >

        <div className="space-between">
          <span className="text-muted text-small">
            الهدف المرتبط
          </span>

          <strong>
            {
              linkedGoal ??
              "غير مرتبط بهدف"
            }
          </strong>
        </div>


        <div className="space-between">
          <span className="text-muted text-small">
            الموعد المستهدف
          </span>

          <strong>
            {project.target_date
              ? formatDate(
                  project.target_date,
                )
              : "غير محدد"}
          </strong>
        </div>


        <div className="space-between">
          <span className="text-muted text-small">
            الخطوة التالية
          </span>

          <strong>
            {
              project.next_action ??
              "لا توجد خطوة محددة"
            }
          </strong>
        </div>

      </div>
    </article>
  );
}


/* =========================================================
 * 13. TABLE COLUMNS
 * ======================================================= */

function buildColumns(
  goals:
    Map<UUID, string>,
): readonly DataTableColumn<Project>[] {
  return [
    {
      key:
        "title",

      header:
        "المشروع",

      render:
        (project) => (
          <div>
            <strong>
              {
                project.title
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
                getCategoryLabel(
                  project.category,
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
        (project) => (
          <span
            className={
              getProjectStatusBadgeClass(
                project.status,
              )
            }
          >
            {
              getProjectStatusLabel(
                project.status,
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
        (project) => (
          <span
            className={
              getPriorityBadgeClass(
                project.priority,
              )
            }
          >
            {
              getPriorityLabel(
                project.priority,
              )
            }
          </span>
        ),
    },

    {
      key:
        "goal",

      header:
        "الهدف المرتبط",

      render:
        (project) =>
          getLinkedGoalTitle(
            project,
            goals,
          ) ??
          "—",
    },

    {
      key:
        "progress",

      header:
        "التقدم",

      align:
        "center",

      render:
        (project) => (
          <span className="percentage">
            {
              formatProgress(
                project.progress_percent,
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
        (project) =>
          project.target_date
            ? formatDate(
                project.target_date,
              )
            : "—",
    },

    {
      key:
        "next_action",

      header:
        "الخطوة التالية",

      render:
        (project) =>
          project.next_action ??
          "—",
    },
  ];
}


/* =========================================================
 * 14. PROJECTS PAGE
 * ======================================================= */

export default async function ProjectsPage() {
  await requireAAL2Identity();

  const [
    projectRows,
    goals,
  ] =
    await Promise.all([
      listProjects(),
      listGoals(),
    ]);

  const projects =
    sortProjects(
      projectRows,
    );

  const goalLookup =
    buildGoalLookup(
      goals,
    );


  /* -------------------------------------------------------
   * Status groups
   * ---------------------------------------------------- */

  const blockedProjects =
    projects.filter(
      (project) =>
        project.status ===
        "blocked",
    );

  const activeProjects =
    projects.filter(
      (project) =>
        project.status ===
        "active",
    );

  const plannedCount =
    projects.filter(
      (project) =>
        project.status ===
        "planned",
    ).length;

  const completedCount =
    projects.filter(
      (project) =>
        project.status ===
        "completed",
    ).length;


  const columns =
    buildColumns(
      goalLookup,
    );


  return (
    <AppShell>
      <div className="page">

        {/* =================================================
         * HEADER
         * =============================================== */}

        <PageHeader
          eyebrow="التنفيذ"
          title="المشاريع"
          description="الأعمال المنظمة التي تحوّل أهدافك إلى تقدم فعلي."
        />


        {/* =================================================
         * SUMMARY
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="projects-summary-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="projects-summary-title"
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
                  activeProjects.length,
                )
              }
              tone="positive"
              icon="◫"
            />

            <StatCard
              label="متعطلة"
              value={
                String(
                  blockedProjects.length,
                )
              }
              tone={
                blockedProjects.length >
                0
                  ? "negative"
                  : "positive"
              }
              helper={
                blockedProjects.length >
                0
                  ? "تحتاج قرارًا أو إجراءً."
                  : "لا توجد مشاريع متعطلة."
              }
              icon="!"
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
         * BLOCKED PROJECTS
         * =============================================== */}

        {blockedProjects.length > 0 ? (
          <section
            className="page-section"
            aria-labelledby="blocked-projects-title"
          >
            <div className="section-header">
              <div className="section-header__content">
                <h2
                  id="blocked-projects-title"
                  className="section-title"
                >
                  تحتاج انتباهك
                </h2>

                <p className="section-description">
                  المشاريع المتعطلة تظهر أولًا لأنها تحتاج قرارًا قبل الاستمرار.
                </p>
              </div>
            </div>


            <div className="grid grid--2">
              {blockedProjects.map(
                (project) => (
                  <ProjectCard
                    key={
                      project.id
                    }
                    project={
                      project
                    }
                    linkedGoal={
                      getLinkedGoalTitle(
                        project,
                        goalLookup,
                      )
                    }
                  />
                ),
              )}
            </div>
          </section>
        ) : null}


        {/* =================================================
         * ACTIVE PROJECTS
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="active-projects-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="active-projects-title"
                className="section-title"
              >
                المشاريع النشطة
              </h2>

              <p className="section-description">
                ما الذي يتحرك فعليًا الآن، وما الخطوة التالية؟
              </p>
            </div>
          </div>


          {activeProjects.length > 0 ? (
            <div className="grid grid--2">
              {activeProjects.map(
                (project) => (
                  <ProjectCard
                    key={
                      project.id
                    }
                    project={
                      project
                    }
                    linkedGoal={
                      getLinkedGoalTitle(
                        project,
                        goalLookup,
                      )
                    }
                  />
                ),
              )}
            </div>
          ) : (
            <EmptyState
              icon="◫"
              title="لا توجد مشاريع نشطة"
              description="عندما يبدأ مشروع فعلي، سيظهر هنا مع التقدم والهدف المرتبط والخطوة التالية."
            />
          )}
        </section>


        {/* =================================================
         * ALL PROJECTS
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="all-projects-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="all-projects-title"
                className="section-title"
              >
                كل المشاريع
              </h2>

              <p className="section-description">
                المتعطلة أولًا، ثم النشطة والمخططة والمكتملة.
              </p>
            </div>
          </div>


          <DataTable
            rows={
              projects
            }
            columns={
              columns
            }
            getRowKey={
              (project) =>
                project.id
            }
            caption="مشاريع LIFE OS"
            emptyMessage="لا توجد مشاريع مسجلة حاليًا."
          />
        </section>

      </div>
      <section className="page-section"><div className="card"><DataEntryButton kind="project" /></div></section>
    </AppShell>
  );
}


/* =========================================================
 * 15. GOAL VS PROJECT RULE
 * ======================================================= */

/**
 * Goal:
 *
 * Desired outcome.
 *
 * Example:
 *
 * "الوصول إلى منصب إداري"
 *
 *
 * Project:
 *
 * Organized body of work that moves toward an outcome.
 *
 * Example:
 *
 * "خطة التطوير المهني 2026–2027"
 *
 *
 * Task:
 *
 * Individual executable action.
 *
 * Example:
 *
 * "إكمال الشهادة الحالية"
 */


/* =========================================================
 * 16. BLOCKED-FIRST RULE
 * ======================================================= */

/**
 * A blocked project receives higher visual and sorting
 * priority than a normally active project.
 *
 * LIFE OS should expose friction rather than hiding it inside
 * a long project list.
 */


/* =========================================================
 * 17. RELATIONSHIP RULE
 * ======================================================= */

/**
 * Project → Goal relationship is read using:
 *
 * project.goal_id
 *
 * and resolved against the authenticated owner's goals.
 *
 * The page never trusts a browser-provided goal title.
 */


/* =========================================================
 * 18. PROGRESS RULE
 * ======================================================= */

/**
 * Project progress is stored application data.
 *
 * This page:
 *
 * - displays it
 * - formats it
 * - visually clamps the progress bar
 *
 * It does not allow AI to invent or modify completion
 * percentages.
 */


/* =========================================================
 * 19. SECURITY RULE
 * ======================================================= */

/**
 * Server request
 *      ↓
 * requireAAL2Identity()
 *      ↓
 * listProjects() + listGoals()
 *      ↓
 * authenticated user ownership
 *      ↓
 * PostgreSQL RLS
 *
 * No user_id is accepted from browser input.
 */


/* =========================================================
 * 20. FINAL PROJECT RULE
 * ======================================================= */

/**
 * Projects page should answer:
 *
 * What am I working on?
 * What is blocked?
 * What goal does it support?
 * How far has it moved?
 * What happens next?
 *
 * Nothing more.
 *
 * Simple outside.
 * Intelligent underneath.
 */
