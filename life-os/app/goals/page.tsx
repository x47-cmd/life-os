import type {
  Metadata,
} from "next";

import Link from "next/link";

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
  requireAuthenticatedIdentity,
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
 * LIFE OS V2
 * PLANS
 *
 * One primary planning surface:
 *
 * Goals
 * +
 * Projects
 *
 *
 * Goal:
 *      where am I going?
 *
 * Project:
 *      what am I building / executing?
 *
 *
 * Detailed project management remains available at:
 *
 * /projects
 *
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
    "خططي",
};


/* =========================================================
 * 2. PRIORITY WEIGHT
 * ======================================================= */

function getPriorityWeight(
  priority:
    string,
): number {
  switch (
    priority
  ) {
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
 * 3. GOAL STATUS WEIGHT
 * ======================================================= */

function getGoalStatusWeight(
  status:
    Goal["status"],
): number {
  switch (
    status
  ) {
    case "active":
      return 5;

    case "planned":
      return 4;

    case "paused":
      return 3;

    case "completed":
      return 2;

    case "cancelled":
      return 1;

    default:
      return 0;
  }
}


/* =========================================================
 * 4. PROJECT STATUS WEIGHT
 * ======================================================= */

/**
 * Blocked projects intentionally appear before normal active
 * projects because they usually require attention.
 */
function getProjectStatusWeight(
  status:
    Project["status"],
): number {
  switch (
    status
  ) {
    case "blocked":
      return 6;

    case "active":
      return 5;

    case "planned":
      return 4;

    case "paused":
      return 3;

    case "completed":
      return 2;

    case "cancelled":
      return 1;

    default:
      return 0;
  }
}


/* =========================================================
 * 5. DATE COMPARISON
 * ======================================================= */

function compareDates(
  a:
    string |
    null,

  b:
    string |
    null,
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
 * 6. SORT GOALS
 * ======================================================= */

function sortGoals(
  goals:
    Goal[],
): Goal[] {
  return [
    ...goals,
  ].sort(
    (
      a,
      b,
    ) => {
      const statusDifference =
        getGoalStatusWeight(
          b.status,
        ) -
        getGoalStatusWeight(
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
 * 7. SORT PROJECTS
 * ======================================================= */

function sortProjects(
  projects:
    Project[],
): Project[] {
  return [
    ...projects,
  ].sort(
    (
      a,
      b,
    ) => {
      const statusDifference =
        getProjectStatusWeight(
          b.status,
        ) -
        getProjectStatusWeight(
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
 * 8. GOAL STATUS LABEL
 * ======================================================= */

function getGoalStatusLabel(
  status:
    Goal["status"],
): string {
  switch (
    status
  ) {
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


/* =========================================================
 * 9. GOAL STATUS BADGE
 * ======================================================= */

function getGoalStatusBadgeClass(
  status:
    Goal["status"],
): string {
  switch (
    status
  ) {
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


/* =========================================================
 * 10. PROJECT STATUS LABEL
 * ======================================================= */

function getProjectStatusLabel(
  status:
    Project["status"],
): string {
  switch (
    status
  ) {
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
      return "غير معروف";
  }
}


/* =========================================================
 * 11. PROJECT STATUS BADGE
 * ======================================================= */

function getProjectStatusBadgeClass(
  status:
    Project["status"],
): string {
  switch (
    status
  ) {
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
 * 12. PRIORITY LABEL
 * ======================================================= */

function getPriorityLabel(
  priority:
    string,
): string {
  switch (
    priority
  ) {
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
 * 13. PRIORITY BADGE
 * ======================================================= */

function getPriorityBadgeClass(
  priority:
    string,
): string {
  switch (
    priority
  ) {
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
 * 14. CATEGORY LABEL
 * ======================================================= */

function getCategoryLabel(
  category:
    string,
): string {
  switch (
    category
  ) {
    case "finance":
      return "المال";

    case "investments":
      return "الاستثمارات";

    case "career":
      return "المسار المهني";

    case "learning":
      return "التعلم";

    case "education":
      return "التعليم";

    case "business":
      return "البزنس";

    case "travel":
      return "السفر";

    case "fitness":
      return "اللياقة";

    case "personal":
      return "شخصي";

    case "ai":
      return "الذكاء الاصطناعي";

    case "technology":
      return "التقنية";

    case "other":
      return "أخرى";

    default:
      return category;
  }
}


/* =========================================================
 * 15. GOAL LOOKUP
 * ======================================================= */

function buildGoalLookup(
  goals:
    Goal[],
): Map<UUID, string> {
  return new Map(
    goals.map(
      (
        goal,
      ) => [
        goal.id,
        goal.title,
      ],
    ),
  );
}


/* =========================================================
 * 16. LINKED GOAL
 * ======================================================= */

function getLinkedGoalTitle(
  project:
    Project,

  goalLookup:
    Map<UUID, string>,
): string | null {
  if (
    !project.goal_id
  ) {
    return null;
  }


  return (
    goalLookup.get(
      project.goal_id,
    ) ??
    null
  );
}


/* =========================================================
 * 17. GOAL CARD
 * ======================================================= */

function GoalCard({
  goal,
}: {
  goal:
    Goal;
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


          <h3
            className="card__title"
            style={{
              marginTop:
                "12px",
            }}
          >
            {goal.title}
          </h3>


          {goal.description ? (
            <p className="card__description">
              {goal.description}
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
            {
              goal.next_action ??
              "لا توجد خطوة محددة"
            }
          </strong>
        </div>
      </div>
    </article>
  );
}


/* =========================================================
 * 18. PROJECT CARD
 * ======================================================= */

function ProjectCard({
  project,
  linkedGoal,
}: {
  project:
    Project;

  linkedGoal:
    string |
    null;
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


          <h3
            className="card__title"
            style={{
              marginTop:
                "12px",
            }}
          >
            {project.title}
          </h3>


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
 * 19. GOAL TABLE
 * ======================================================= */

const goalColumns:
readonly DataTableColumn<Goal>[] = [
  {
    key:
      "title",

    header:
      "الهدف",

    render:
      (
        goal,
      ) => (
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
      (
        goal,
      ) => (
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
      (
        goal,
      ) => (
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
      (
        goal,
      ) => (
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
      (
        goal,
      ) =>
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
      (
        goal,
      ) =>
        goal.next_action ??
        "—",
  },
];


/* =========================================================
 * 20. PROJECT TABLE
 * ======================================================= */

function buildProjectColumns(
  goalLookup:
    Map<UUID, string>,
):
readonly DataTableColumn<Project>[] {
  return [
    {
      key:
        "title",

      header:
        "المشروع",

      render:
        (
          project,
        ) => (
          <div>
            <strong>
              {project.title}
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
        (
          project,
        ) => (
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
        "goal",

      header:
        "الهدف المرتبط",

      render:
        (
          project,
        ) =>
          getLinkedGoalTitle(
            project,
            goalLookup,
          ) ??
          "—",
    },

    {
      key:
        "priority",

      header:
        "الأولوية",

      render:
        (
          project,
        ) => (
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
        "progress",

      header:
        "التقدم",

      align:
        "center",

      render:
        (
          project,
        ) => (
          <span className="percentage">
            {
              formatProgress(
                project
                  .progress_percent,
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
        (
          project,
        ) =>
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
        (
          project,
        ) =>
          project.next_action ??
          "—",
    },
  ];
}


/* =========================================================
 * 21. PAGE
 * ======================================================= */

export default async function GoalsPage() {
  await requireAuthenticatedIdentity();


  const [
    goalRows,
    projectRows,
  ] =
    await Promise.all([
      listGoals(),

      listProjects(),
    ]);


  const goals =
    sortGoals(
      goalRows,
    );


  const projects =
    sortProjects(
      projectRows,
    );


  const goalLookup =
    buildGoalLookup(
      goals,
    );


  const activeGoals =
    goals.filter(
      (
        goal,
      ) =>
        goal.status ===
        "active",
    );


  const plannedGoals =
    goals.filter(
      (
        goal,
      ) =>
        goal.status ===
        "planned",
    );


  const activeProjects =
    projects.filter(
      (
        project,
      ) =>
        project.status ===
        "active",
    );


  const plannedProjects =
    projects.filter(
      (
        project,
      ) =>
        project.status ===
        "planned",
    );


  const blockedProjects =
    projects.filter(
      (
        project,
      ) =>
        project.status ===
        "blocked",
    );


  const completedGoals =
    goals.filter(
      (
        goal,
      ) =>
        goal.status ===
        "completed",
    );


  const completedProjects =
    projects.filter(
      (
        project,
      ) =>
        project.status ===
        "completed",
    );


  const currentGoals =
    goals.filter(
      (
        goal,
      ) =>
        goal.status ===
          "active" ||
        goal.status ===
          "planned",
    );


  const currentProjects =
    projects.filter(
      (
        project,
      ) =>
        project.status ===
          "blocked" ||
        project.status ===
          "active" ||
        project.status ===
          "planned",
    );


  const projectColumns =
    buildProjectColumns(
      goalLookup,
    );


  const activePlanCount =
    activeGoals.length +
    plannedGoals.length +
    activeProjects.length +
    plannedProjects.length;


  const completedPlanCount =
    completedGoals.length +
    completedProjects.length;


  return (
    <AppShell>
      <div className="page">

        {/* =================================================
         * HEADER
         * =============================================== */}

        <PageHeader
          eyebrow="Plans OS"
          title="خططي"
          description="أهدافك تحدد الاتجاه، ومشاريعك تحوّلها إلى تنفيذ."
          meta={
            <span>
              {
                activePlanCount
              }{" "}
              هدف أو مشروع حالي
            </span>
          }
          action={
            <Link
              href="/projects"
              className="button button--secondary"
            >
              تفاصيل المشاريع
            </Link>
          }
        />


        {/* =================================================
         * SUMMARY
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="plans-summary-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="plans-summary-title"
                className="section-title"
              >
                وضع خططك
              </h2>


              <p className="section-description">
                أقل عدد من الأرقام حتى تعرف وين تركّز.
              </p>
            </div>
          </div>


          <div className="stats-grid">
            <StatCard
              label="الأهداف الحالية"
              value={
                String(
                  activeGoals.length +
                  plannedGoals.length,
                )
              }
              tone="neutral"
              helper={`${activeGoals.length} نشط • ${plannedGoals.length} مخطط`}
              icon="◎"
            />


            <StatCard
              label="المشاريع الحالية"
              value={
                String(
                  activeProjects.length +
                  plannedProjects.length,
                )
              }
              tone="neutral"
              helper={`${activeProjects.length} نشط • ${plannedProjects.length} مخطط`}
              icon="▣"
            />


            <StatCard
              label="المشاريع المتعطلة"
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
                  ? "تحتاج انتباه قبل فتح أعمال جديدة."
                  : "ما عندك مشروع متعطل."
              }
              icon="!"
            />


            <StatCard
              label="المكتمل"
              value={
                String(
                  completedPlanCount,
                )
              }
              tone="positive"
              helper={`${completedGoals.length} هدف • ${completedProjects.length} مشروع`}
              icon="✓"
            />
          </div>
        </section>


        {/* =================================================
         * BLOCKED PROJECTS
         * =============================================== */}

        {blockedProjects.length >
        0 ? (
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
                  يحتاج انتباهك
                </h2>


                <p className="section-description">
                  المشاريع المتعطلة تظهر أولًا لأنها قد تمنع تقدم خططك.
                </p>
              </div>
            </div>


            <div className="grid grid--2">
              {blockedProjects.map(
                (
                  project,
                ) => (
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
         * CURRENT GOALS
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="current-goals-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="current-goals-title"
                className="section-title"
              >
                أهدافي الحالية
              </h2>


              <p className="section-description">
                الأشياء التي تريد الوصول لها الآن أو تخطط لها.
              </p>
            </div>
          </div>


          {currentGoals.length >
          0 ? (
            <div className="grid grid--2">
              {currentGoals.map(
                (
                  goal,
                ) => (
                  <GoalCard
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
              compact
              icon="◎"
              title="لا توجد أهداف حالية"
              description="استخدم زر + لإضافة هدف جديد إلى LIFE OS."
            />
          )}
        </section>


        {/* =================================================
         * CURRENT PROJECTS
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="current-projects-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="current-projects-title"
                className="section-title"
              >
                مشاريعي الحالية
              </h2>


              <p className="section-description">
                التنفيذ الفعلي الذي يحرك أهدافك إلى الأمام.
              </p>
            </div>


            <Link
              href="/projects"
              className="button button--secondary button--small"
            >
              فتح التفاصيل
            </Link>
          </div>


          {currentProjects.length >
          0 ? (
            <div className="grid grid--2">
              {currentProjects.map(
                (
                  project,
                ) => (
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
              compact
              icon="▣"
              title="لا توجد مشاريع حالية"
              description="استخدم زر + لإضافة أول مشروع."
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
                النشطة والمخططة والمتوقفة والمكتملة.
              </p>
            </div>
          </div>


          {goals.length >
          0 ? (
            <DataTable
              rows={
                goals
              }
              columns={
                goalColumns
              }
              getRowKey={
                (
                  goal,
                ) =>
                  goal.id
              }
              caption="جميع أهداف LIFE OS"
            />
          ) : (
            <EmptyState
              compact
              title="لا توجد أهداف"
              description="أهدافك بتظهر هنا بعد إضافتها."
              icon="◎"
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
                المشاريع المتعطلة أولًا، بعدها النشطة والمخططة.
              </p>
            </div>
          </div>


          {projects.length >
          0 ? (
            <DataTable
              rows={
                projects
              }
              columns={
                projectColumns
              }
              getRowKey={
                (
                  project,
                ) =>
                  project.id
              }
              caption="جميع مشاريع LIFE OS"
            />
          ) : (
            <EmptyState
              compact
              title="لا توجد مشاريع"
              description="مشاريعك بتظهر هنا بعد إضافتها."
              icon="▣"
            />
          )}
        </section>

      </div>
    </AppShell>
  );
}


/* =========================================================
 * 22. FINAL PLANS CONTRACT
 * ======================================================= */

/**
 * /goals is the primary V2 Plans page.
 *
 *
 * It combines:
 *
 * Goals
 * +
 * Projects
 *
 *
 * The user sees:
 *
 * direction
 * +
 * execution
 *
 * in one place.
 */


/* =========================================================
 * 23. GOAL VS PROJECT
 * ======================================================= */

/**
 * Goal:
 *
 * desired outcome
 *
 *
 * Project:
 *
 * organized execution toward an outcome
 *
 *
 * LIFE OS keeps both domain models separate underneath while
 * presenting them as one life area.
 */


/* =========================================================
 * 24. BLOCKED PROJECT RULE
 * ======================================================= */

/**
 * Blocked projects receive visual priority.
 *
 *
 * They are not hidden under general project lists because a
 * blocked project normally requires a decision or action.
 */


/* =========================================================
 * 25. DETAILED PROJECT PAGE
 * ======================================================= */

/**
 * /projects remains available as a secondary detailed view.
 *
 *
 * It is not a seventh top-level navigation area.
 */


/* =========================================================
 * 26. DATA TRUTH
 * ======================================================= */

/**
 * Progress, status, priority and dates come from stored LIFE
 * OS facts.
 *
 *
 * AI does not silently change:
 *
 * goal progress
 * project progress
 * project status
 * priority
 * deadlines
 */


/* =========================================================
 * 27. FINAL LIFE OS V2 RULE
 * ======================================================= */

/**
 * User thinks:
 *
 * "خططي"
 *
 *
 * not:
 *
 * "أي جدول قاعدة بيانات أفتح؟"
 *
 *
 * Simple outside.
 * Intelligent underneath.
 */