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
  getCurrentISODate,
  listGoals,
  listProjects,
  listTasks,
} from "@/lib/data";

import {
  formatDate,
} from "@/lib/format";


/* =========================================================
 * 1. METADATA
 * ======================================================= */

export const metadata: Metadata = {
  title:
    "المهام",
};


/* =========================================================
 * 2. INFERRED TYPES
 * ======================================================= */

type Task =
  Awaited<
    ReturnType<
      typeof listTasks
    >
  >[number];

type Goal =
  Awaited<
    ReturnType<
      typeof listGoals
    >
  >[number];

type Project =
  Awaited<
    ReturnType<
      typeof listProjects
    >
  >[number];


/* =========================================================
 * 3. SAFE RECORD READERS
 * ======================================================= */

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value ===
      "object" &&
    value !== null &&
    !Array.isArray(
      value,
    )
  );
}


function readString(
  value: unknown,
  key: string,
): string | null {
  if (
    !isRecord(
      value,
    )
  ) {
    return null;
  }

  const field =
    value[key];

  if (
    typeof field !==
      "string"
  ) {
    return null;
  }

  const trimmed =
    field.trim();

  return trimmed.length >
    0
    ? trimmed
    : null;
}


/* =========================================================
 * 4. NORMALIZATION
 * ======================================================= */

function normalizeValue(
  value: string,
): string {
  return value
    .trim()
    .toLowerCase()
    .replace(
      /[\s-]+/g,
      "_",
    );
}


/* =========================================================
 * 5. TASK FIELDS
 * ======================================================= */

function getTaskTitle(
  task: Task,
): string {
  return (
    readString(
      task,
      "title",
    ) ??
    readString(
      task,
      "name",
    ) ??
    "مهمة"
  );
}


function getTaskDescription(
  task: Task,
): string | null {
  return (
    readString(
      task,
      "description",
    ) ??
    readString(
      task,
      "notes",
    )
  );
}


function getTaskStatus(
  task: Task,
): string {
  return (
    readString(
      task,
      "status",
    ) ??
    "pending"
  );
}


function getTaskPriority(
  task: Task,
): string {
  return (
    readString(
      task,
      "priority",
    ) ??
    "medium"
  );
}


function getTaskDueDate(
  task: Task,
): string | null {
  return (
    readString(
      task,
      "due_date",
    ) ??
    readString(
      task,
      "target_date",
    )
  );
}


function getTaskNextAction(
  task: Task,
): string | null {
  return (
    readString(
      task,
      "next_action",
    ) ??
    readString(
      task,
      "action",
    )
  );
}


function getTaskGoalId(
  task: Task,
): string | null {
  return (
    readString(
      task,
      "goal_id",
    ) ??
    readString(
      task,
      "related_goal_id",
    )
  );
}


function getTaskProjectId(
  task: Task,
): string | null {
  return (
    readString(
      task,
      "project_id",
    ) ??
    readString(
      task,
      "related_project_id",
    )
  );
}


/* =========================================================
 * 6. RELATED ENTITY HELPERS
 * ======================================================= */

function getEntityId(
  item: Goal | Project,
): string | null {
  return readString(
    item,
    "id",
  );
}


function getEntityTitle(
  item: Goal | Project,
): string {
  return (
    readString(
      item,
      "title",
    ) ??
    readString(
      item,
      "name",
    ) ??
    "غير مسمى"
  );
}


function buildLookup(
  items:
    Array<Goal | Project>,
): Map<string, string> {
  const lookup =
    new Map<string, string>();

  for (
    const item of items
  ) {
    const id =
      getEntityId(
        item,
      );

    if (
      !id
    ) {
      continue;
    }

    lookup.set(
      id,
      getEntityTitle(
        item,
      ),
    );
  }

  return lookup;
}


/* =========================================================
 * 7. STATUS HELPERS
 * ======================================================= */

function isCompleted(
  task: Task,
): boolean {
  const status =
    normalizeValue(
      getTaskStatus(
        task,
      ),
    );

  return (
    status ===
      "completed" ||
    status ===
      "done"
  );
}


function isCancelled(
  task: Task,
): boolean {
  return (
    normalizeValue(
      getTaskStatus(
        task,
      ),
    ) ===
    "cancelled"
  );
}


function isActive(
  task: Task,
): boolean {
  return (
    !isCompleted(
      task,
    ) &&
    !isCancelled(
      task,
    )
  );
}


function isInProgress(
  task: Task,
): boolean {
  const status =
    normalizeValue(
      getTaskStatus(
        task,
      ),
    );

  return (
    status ===
      "in_progress" ||
    status ===
      "active"
  );
}


/* =========================================================
 * 8. DATE HELPERS
 * ======================================================= */

function isOverdue(
  task: Task,
  today: string,
): boolean {
  if (
    !isActive(
      task,
    )
  ) {
    return false;
  }

  const dueDate =
    getTaskDueDate(
      task,
    );

  if (
    !dueDate
  ) {
    return false;
  }

  return (
    dueDate <
    today
  );
}


function isDueToday(
  task: Task,
  today: string,
): boolean {
  return (
    isActive(
      task,
    ) &&
    getTaskDueDate(
      task,
    ) ===
      today
  );
}


function isUpcoming(
  task: Task,
  today: string,
): boolean {
  const dueDate =
    getTaskDueDate(
      task,
    );

  return (
    isActive(
      task,
    ) &&
    dueDate !==
      null &&
    dueDate >
      today
  );
}


/* =========================================================
 * 9. PRIORITY HELPERS
 * ======================================================= */

function getPriorityWeight(
  priority: string,
): number {
  switch (
    normalizeValue(
      priority,
    )
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


function getPriorityLabel(
  priority: string,
): string {
  switch (
    normalizeValue(
      priority,
    )
  ) {
    case "high":
      return "عالية";

    case "medium":
      return "متوسطة";

    case "low":
      return "منخفضة";

    default:
      return priority;
  }
}


function getPriorityBadgeClass(
  priority: string,
): string {
  switch (
    normalizeValue(
      priority,
    )
  ) {
    case "high":
      return "badge badge--negative";

    case "medium":
      return "badge badge--warning";

    default:
      return "badge";
  }
}


/* =========================================================
 * 10. STATUS LABEL
 * ======================================================= */

function getStatusLabel(
  status: string,
): string {
  switch (
    normalizeValue(
      status,
    )
  ) {
    case "pending":
    case "planned":
      return "معلقة";

    case "active":
    case "in_progress":
      return "جارية";

    case "completed":
    case "done":
      return "مكتملة";

    case "cancelled":
      return "ملغية";

    case "blocked":
      return "متعطلة";

    default:
      return status;
  }
}


function getStatusBadgeClass(
  status: string,
): string {
  switch (
    normalizeValue(
      status,
    )
  ) {
    case "active":
    case "in_progress":
      return "badge badge--accent";

    case "completed":
    case "done":
      return "badge badge--positive";

    case "blocked":
      return "badge badge--negative";

    case "cancelled":
      return "badge badge--negative";

    case "pending":
    case "planned":
    default:
      return "badge";
  }
}


/* =========================================================
 * 11. TASK SORTING
 * ======================================================= */

function sortTasks(
  tasks: Task[],
  today: string,
): Task[] {
  return [
    ...tasks,
  ].sort(
    (
      a,
      b,
    ) => {
      /* ---------------------------------------------------
       * Completed / cancelled go last
       * ------------------------------------------------ */

      const aInactive =
        isCompleted(
          a,
        ) ||
        isCancelled(
          a,
        );

      const bInactive =
        isCompleted(
          b,
        ) ||
        isCancelled(
          b,
        );

      if (
        aInactive !==
        bInactive
      ) {
        return aInactive
          ? 1
          : -1;
      }


      /* ---------------------------------------------------
       * Overdue first
       * ------------------------------------------------ */

      const aOverdue =
        isOverdue(
          a,
          today,
        );

      const bOverdue =
        isOverdue(
          b,
          today,
        );

      if (
        aOverdue !==
        bOverdue
      ) {
        return aOverdue
          ? -1
          : 1;
      }


      /* ---------------------------------------------------
       * Due today
       * ------------------------------------------------ */

      const aToday =
        isDueToday(
          a,
          today,
        );

      const bToday =
        isDueToday(
          b,
          today,
        );

      if (
        aToday !==
        bToday
      ) {
        return aToday
          ? -1
          : 1;
      }


      /* ---------------------------------------------------
       * Priority
       * ------------------------------------------------ */

      const priorityDifference =
        getPriorityWeight(
          getTaskPriority(
            b,
          ),
        ) -
        getPriorityWeight(
          getTaskPriority(
            a,
          ),
        );

      if (
        priorityDifference !==
        0
      ) {
        return priorityDifference;
      }


      /* ---------------------------------------------------
       * Earliest known due date
       * ------------------------------------------------ */

      const aDate =
        getTaskDueDate(
          a,
        );

      const bDate =
        getTaskDueDate(
          b,
        );

      if (
        aDate &&
        bDate
      ) {
        return aDate.localeCompare(
          bDate,
        );
      }

      if (
        aDate
      ) {
        return -1;
      }

      if (
        bDate
      ) {
        return 1;
      }

      return 0;
    },
  );
}


/* =========================================================
 * 12. TASK CARD
 * ======================================================= */

function TaskCard({
  task,
  today,
  goals,
  projects,
}: {
  task: Task;
  today: string;
  goals: Map<string, string>;
  projects: Map<string, string>;
}) {
  const dueDate =
    getTaskDueDate(
      task,
    );

  const goalId =
    getTaskGoalId(
      task,
    );

  const projectId =
    getTaskProjectId(
      task,
    );

  const linkedGoal =
    goalId
      ? goals.get(
          goalId,
        ) ?? null
      : null;

  const linkedProject =
    projectId
      ? projects.get(
          projectId,
        ) ?? null
      : null;

  const description =
    getTaskDescription(
      task,
    );

  const nextAction =
    getTaskNextAction(
      task,
    );

  const overdue =
    isOverdue(
      task,
      today,
    );

  const dueToday =
    isDueToday(
      task,
      today,
    );

  return (
    <article className="card">

      <div className="space-between">
        <div className="inline">
          <span
            className={
              getPriorityBadgeClass(
                getTaskPriority(
                  task,
                ),
              )
            }
          >
            {
              getPriorityLabel(
                getTaskPriority(
                  task,
                ),
              )
            }
          </span>

          {overdue ? (
            <span className="badge badge--negative">
              متأخرة
            </span>
          ) : dueToday ? (
            <span className="badge badge--warning">
              اليوم
            </span>
          ) : (
            <span
              className={
                getStatusBadgeClass(
                  getTaskStatus(
                    task,
                  ),
                )
              }
            >
              {
                getStatusLabel(
                  getTaskStatus(
                    task,
                  ),
                )
              }
            </span>
          )}
        </div>

        {dueDate ? (
          <span
            className={
              overdue
                ? "text-negative text-small"
                : "text-subtle text-small"
            }
          >
            {
              formatDate(
                dueDate,
              )
            }
          </span>
        ) : null}
      </div>


      <h2
        className="card__title"
        style={{
          marginTop:
            "12px",
        }}
      >
        {
          getTaskTitle(
            task,
          )
        }
      </h2>


      {description ? (
        <p className="card__description">
          {description}
        </p>
      ) : null}


      {(linkedProject ||
        linkedGoal) ? (
        <div
          className="stack stack--small"
          style={{
            marginTop:
              "16px",
          }}
        >
          {linkedProject ? (
            <div className="space-between">
              <span className="text-muted text-small">
                المشروع
              </span>

              <strong className="text-small">
                {linkedProject}
              </strong>
            </div>
          ) : null}

          {linkedGoal ? (
            <div className="space-between">
              <span className="text-muted text-small">
                الهدف
              </span>

              <strong className="text-small">
                {linkedGoal}
              </strong>
            </div>
          ) : null}
        </div>
      ) : null}


      {nextAction ? (
        <div
          style={{
            marginTop:
              "16px",
          }}
        >
          <span className="text-subtle text-small">
            الإجراء
          </span>

          <p
            className="font-semibold"
            style={{
              margin:
                "3px 0 0",
            }}
          >
            {nextAction}
          </p>
        </div>
      ) : null}

    </article>
  );
}


/* =========================================================
 * 13. TABLE COLUMNS
 * ======================================================= */

function buildColumns(
  today: string,
  goals: Map<string, string>,
  projects: Map<string, string>,
): readonly DataTableColumn<Task>[] {
  return [
    {
      key:
        "task",

      header:
        "المهمة",

      render:
        (task) => (
          <div>
            <strong>
              {
                getTaskTitle(
                  task,
                )
              }
            </strong>

            {isOverdue(
              task,
              today,
            ) ? (
              <div
                className="text-negative text-small"
                style={{
                  marginTop:
                    "2px",
                }}
              >
                متأخرة
              </div>
            ) : null}
          </div>
        ),
    },

    {
      key:
        "status",

      header:
        "الحالة",

      render:
        (task) => (
          <span
            className={
              getStatusBadgeClass(
                getTaskStatus(
                  task,
                ),
              )
            }
          >
            {
              getStatusLabel(
                getTaskStatus(
                  task,
                ),
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
        (task) => (
          <span
            className={
              getPriorityBadgeClass(
                getTaskPriority(
                  task,
                ),
              )
            }
          >
            {
              getPriorityLabel(
                getTaskPriority(
                  task,
                ),
              )
            }
          </span>
        ),
    },

    {
      key:
        "project",

      header:
        "المشروع",

      render:
        (task) => {
          const id =
            getTaskProjectId(
              task,
            );

          return id
            ? projects.get(
                id,
              ) ??
                "—"
            : "—";
        },
    },

    {
      key:
        "goal",

      header:
        "الهدف",

      render:
        (task) => {
          const id =
            getTaskGoalId(
              task,
            );

          return id
            ? goals.get(
                id,
              ) ??
                "—"
            : "—";
        },
    },

    {
      key:
        "due_date",

      header:
        "الموعد",

      render:
        (task) => {
          const dueDate =
            getTaskDueDate(
              task,
            );

          if (
            !dueDate
          ) {
            return "—";
          }

          return (
            <span
              className={
                isOverdue(
                  task,
                  today,
                )
                  ? "text-negative"
                  : undefined
              }
            >
              {
                formatDate(
                  dueDate,
                )
              }
            </span>
          );
        },
    },

    {
      key:
        "action",

      header:
        "الإجراء",

      render:
        (task) =>
          getTaskNextAction(
            task,
          ) ??
          "—",
    },
  ];
}


/* =========================================================
 * 14. TASKS PAGE
 * ======================================================= */

export default async function TasksPage() {
  await requireAAL2Identity();

  const today =
    getCurrentISODate();

  const [
    taskRows,
    goals,
    projects,
  ] =
    await Promise.all([
      listTasks(),
      listGoals(),
      listProjects(),
    ]);


  /* -------------------------------------------------------
   * Related-record lookup
   * ---------------------------------------------------- */

  const goalLookup =
    buildLookup(
      goals,
    );

  const projectLookup =
    buildLookup(
      projects,
    );


  /* -------------------------------------------------------
   * Deterministic sorting
   * ---------------------------------------------------- */

  const tasks =
    sortTasks(
      taskRows,
      today,
    );


  /* -------------------------------------------------------
   * Main groups
   * ---------------------------------------------------- */

  const overdueTasks =
    tasks.filter(
      (task) =>
        isOverdue(
          task,
          today,
        ),
    );

  const todayTasks =
    tasks.filter(
      (task) =>
        isDueToday(
          task,
          today,
        ),
    );

  const inProgressTasks =
    tasks.filter(
      (task) =>
        isActive(
          task,
        ) &&
        isInProgress(
          task,
        ) &&
        !isOverdue(
          task,
          today,
        ) &&
        !isDueToday(
          task,
          today,
        ),
    );

  const upcomingTasks =
    tasks.filter(
      (task) =>
        isUpcoming(
          task,
          today,
        ),
    );

  const activeTasks =
    tasks.filter(
      isActive,
    );

  const completedTasks =
    tasks.filter(
      isCompleted,
    );


  const columns =
    buildColumns(
      today,
      goalLookup,
      projectLookup,
    );


  return (
    <AppShell>
      <div className="page">

        {/* =================================================
         * HEADER
         * =============================================== */}

        <PageHeader
          eyebrow="التنفيذ"
          title="شو لازم تسوي الحين؟"
          description="المهام التي تحتاج تنفيذًا فعليًا، مرتبة حسب الوقت والأولوية."
          meta={
            <span>
              اليوم:{" "}
              <span className="ltr">
                {today}
              </span>
            </span>
          }
        />


        {/* =================================================
         * SUMMARY
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="tasks-summary-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="tasks-summary-title"
                className="section-title"
              >
                وضع التنفيذ
              </h2>

              <p className="section-description">
                المتأخر واليوم أهم من حجم قائمة المهام بالكامل.
              </p>
            </div>
          </div>


          <div className="stats-grid">

            <StatCard
              label="متأخرة"
              value={
                String(
                  overdueTasks.length,
                )
              }
              tone={
                overdueTasks.length >
                0
                  ? "negative"
                  : "positive"
              }
              helper={
                overdueTasks.length >
                0
                  ? "هذه أول أولوية للمراجعة."
                  : "لا توجد مهام متأخرة."
              }
              icon="!"
            />


            <StatCard
              label="اليوم"
              value={
                String(
                  todayTasks.length,
                )
              }
              tone={
                todayTasks.length >
                0
                  ? "warning"
                  : "neutral"
              }
              icon="•"
            />


            <StatCard
              label="نشطة"
              value={
                String(
                  activeTasks.length,
                )
              }
              tone="neutral"
              icon="▶"
            />


            <StatCard
              label="مكتملة"
              value={
                String(
                  completedTasks.length,
                )
              }
              tone="positive"
              icon="✓"
            />

          </div>
        </section>


        {/* =================================================
         * OVERDUE
         * =============================================== */}

        {overdueTasks.length >
        0 ? (
          <section
            className="page-section"
            aria-labelledby="overdue-tasks-title"
          >
            <div className="section-header">
              <div className="section-header__content">
                <h2
                  id="overdue-tasks-title"
                  className="section-title"
                >
                  تحتاج انتباهك أولًا
                </h2>

                <p className="section-description">
                  مهام تجاوزت موعدها وما زالت غير مكتملة.
                </p>
              </div>
            </div>


            <div className="grid grid--2">
              {overdueTasks.map(
                (
                  task,
                  index,
                ) => (
                  <TaskCard
                    key={
                      readString(
                        task,
                        "id",
                      ) ??
                      `overdue-${index}`
                    }
                    task={
                      task
                    }
                    today={
                      today
                    }
                    goals={
                      goalLookup
                    }
                    projects={
                      projectLookup
                    }
                  />
                ),
              )}
            </div>
          </section>
        ) : null}


        {/* =================================================
         * TODAY
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="today-tasks-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="today-tasks-title"
                className="section-title"
              >
                اليوم
              </h2>

              <p className="section-description">
                ما يستحق التنفيذ الآن بدون تشتيت ببقية القائمة.
              </p>
            </div>
          </div>


          {todayTasks.length >
          0 ? (
            <div className="grid grid--2">
              {todayTasks.map(
                (
                  task,
                  index,
                ) => (
                  <TaskCard
                    key={
                      readString(
                        task,
                        "id",
                      ) ??
                      `today-${index}`
                    }
                    task={
                      task
                    }
                    today={
                      today
                    }
                    goals={
                      goalLookup
                    }
                    projects={
                      projectLookup
                    }
                  />
                ),
              )}
            </div>
          ) : (
            <EmptyState
              compact
              icon="✓"
              title="لا توجد مهمة مستحقة اليوم"
              description="راجع المتأخر أولًا، وبعده المهام الجارية والقادمة."
            />
          )}
        </section>


        {/* =================================================
         * IN PROGRESS
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="progress-tasks-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="progress-tasks-title"
                className="section-title"
              >
                جاري العمل عليها
              </h2>

              <p className="section-description">
                مهام بدأت بالفعل ولم تصل إلى موعدها النهائي بعد.
              </p>
            </div>
          </div>


          {inProgressTasks.length >
          0 ? (
            <div className="grid grid--2">
              {inProgressTasks
                .slice(
                  0,
                  6,
                )
                .map(
                  (
                    task,
                    index,
                  ) => (
                    <TaskCard
                      key={
                        readString(
                          task,
                          "id",
                        ) ??
                        `progress-${index}`
                      }
                      task={
                        task
                      }
                      today={
                        today
                      }
                      goals={
                        goalLookup
                      }
                      projects={
                        projectLookup
                      }
                    />
                  ),
                )}
            </div>
          ) : (
            <EmptyState
              compact
              icon="▶"
              title="لا توجد مهام جارية حاليًا"
              description="المهام التي تبدأ تنفيذها ستظهر هنا حتى تكتمل."
            />
          )}
        </section>


        {/* =================================================
         * UPCOMING
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="upcoming-tasks-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="upcoming-tasks-title"
                className="section-title"
              >
                القادم
              </h2>

              <p className="section-description">
                أقرب المهام القادمة، حتى تعرف ما ينتظرك بدون أن تبدأ كل شيء الآن.
              </p>
            </div>
          </div>


          {upcomingTasks.length >
          0 ? (
            <div className="grid grid--2">
              {upcomingTasks
                .slice(
                  0,
                  6,
                )
                .map(
                  (
                    task,
                    index,
                  ) => (
                    <TaskCard
                      key={
                        readString(
                          task,
                          "id",
                        ) ??
                        `upcoming-${index}`
                      }
                      task={
                        task
                      }
                      today={
                        today
                      }
                      goals={
                        goalLookup
                      }
                      projects={
                        projectLookup
                      }
                    />
                  ),
                )}
            </div>
          ) : (
            <EmptyState
              compact
              icon="→"
              title="لا توجد مهام قادمة بموعد محدد"
              description="المهام القادمة ذات الموعد ستظهر هنا تلقائيًا."
            />
          )}
        </section>


        {/* =================================================
         * ALL TASKS
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="all-tasks-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="all-tasks-title"
                className="section-title"
              >
                كل المهام
              </h2>

              <p className="section-description">
                السجل الكامل، مع المتأخر أولًا والمكتمل في النهاية.
              </p>
            </div>
          </div>


          <DataTable
            rows={
              tasks
            }
            columns={
              columns
            }
            getRowKey={
              (
                task,
                index,
              ) =>
                readString(
                  task,
                  "id",
                ) ??
                `task-${index}`
            }
            caption="مهام LIFE OS"
            emptyMessage="لا توجد مهام مسجلة حاليًا."
          />
        </section>

      </div>
      <section className="page-section"><div className="card"><DataEntryButton kind="task" /></div></section>
    </AppShell>
  );
}


/* =========================================================
 * 15. TASK HIERARCHY
 * ======================================================= */

/**
 * LIFE OS execution hierarchy:
 *
 * Goal
 *      ↓
 * Project
 *      ↓
 * Task
 *
 *
 * Goal:
 * where you want to arrive.
 *
 * Project:
 * organized work that moves toward the goal.
 *
 * Task:
 * the concrete action that can actually be executed.
 */


/* =========================================================
 * 16. OVERDUE-FIRST RULE
 * ======================================================= */

/**
 * Overdue work is intentionally surfaced before normal work.
 *
 * LIFE OS should not hide unfinished commitments inside a
 * large to-do list.
 */


/* =========================================================
 * 17. TODAY RULE
 * ======================================================= */

/**
 * Tasks due today are separated from future work.
 *
 * This reduces cognitive load and makes the page answer:
 *
 * "What should I do now?"
 *
 * rather than:
 *
 * "What have I ever written down?"
 */


/* =========================================================
 * 18. DATE RULE
 * ======================================================= */

/**
 * The page receives today's ISO date from:
 *
 * lib/data.ts → getCurrentISODate()
 *
 * instead of trusting a browser-provided date.
 *
 * Sorting and overdue detection are deterministic.
 */


/* =========================================================
 * 19. RELATIONSHIP RULE
 * ======================================================= */

/**
 * Tasks may relate to:
 *
 * Goal
 * Project
 *
 * Relationship labels are resolved from authenticated
 * owner records.
 *
 * The browser does not provide trusted relationship names.
 */


/* =========================================================
 * 20. AI RULE
 * ======================================================= */

/**
 * Opening Tasks does not invoke OpenAI.
 *
 * AI may analyze task context only through explicit,
 * minimized AI workflows.
 *
 * It does not silently mark work complete or change dates.
 */


/* =========================================================
 * 21. SECURITY RULE
 * ======================================================= */

/**
 * Server request
 *      ↓
 * requireAAL2Identity()
 *      ↓
 * listTasks()
 * listGoals()
 * listProjects()
 *      ↓
 * authenticated ownership
 *      ↓
 * PostgreSQL RLS
 *
 * No user_id comes from the browser.
 */


/* =========================================================
 * 22. FINAL TASK RULE
 * ======================================================= */

/**
 * Tasks page should answer:
 *
 * What is overdue?
 * What do I need to do today?
 * What am I already working on?
 * What is coming next?
 * What goal/project does this support?
 *
 * Nothing more.
 *
 * Simple outside.
 * Intelligent underneath.
 */
