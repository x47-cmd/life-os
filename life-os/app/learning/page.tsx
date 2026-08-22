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
  requireAAL2Identity,
} from "@/lib/auth";

import {
  listLearningItems,
} from "@/lib/data";

import {
  formatDate,
  formatProgress,
} from "@/lib/format";


/* =========================================================
 * 1. METADATA
 * ======================================================= */

export const metadata: Metadata = {
  title:
    "التعلم والتعليم",
};


/* =========================================================
 * 2. INFERRED ROW TYPE
 * ======================================================= */

type LearningItem =
  Awaited<
    ReturnType<
      typeof listLearningItems
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


function readNumber(
  value: unknown,
  key: string,
): number | null {
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
    typeof field ===
      "number" &&
    Number.isFinite(
      field,
    )
  ) {
    return field;
  }

  if (
    typeof field ===
      "string" &&
    field.trim().length >
      0
  ) {
    const parsed =
      Number(
        field,
      );

    if (
      Number.isFinite(
        parsed,
      )
    ) {
      return parsed;
    }
  }

  return null;
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
 * 5. ITEM FIELDS
 * ======================================================= */

function getTitle(
  item: LearningItem,
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
    "عنصر تعليمي"
  );
}


function getProvider(
  item: LearningItem,
): string | null {
  return (
    readString(
      item,
      "provider",
    ) ??
    readString(
      item,
      "institution",
    ) ??
    readString(
      item,
      "organization",
    )
  );
}


function getDescription(
  item: LearningItem,
): string | null {
  return (
    readString(
      item,
      "description",
    ) ??
    readString(
      item,
      "notes",
    )
  );
}


function getItemType(
  item: LearningItem,
): string {
  return (
    readString(
      item,
      "item_type",
    ) ??
    readString(
      item,
      "type",
    ) ??
    readString(
      item,
      "category",
    ) ??
    "other"
  );
}


function getStatus(
  item: LearningItem,
): string {
  return (
    readString(
      item,
      "status",
    ) ??
    "planned"
  );
}


function getPriority(
  item: LearningItem,
): string | null {
  return readString(
    item,
    "priority",
  );
}


function getNextAction(
  item: LearningItem,
): string | null {
  return readString(
    item,
    "next_action",
  );
}


function getRelevantDate(
  item: LearningItem,
): string | null {
  return (
    readString(
      item,
      "target_date",
    ) ??
    readString(
      item,
      "end_date",
    ) ??
    readString(
      item,
      "completed_at",
    ) ??
    readString(
      item,
      "start_date",
    )
  );
}


function getProgress(
  item: LearningItem,
): number {
  const value =
    readNumber(
      item,
      "progress_percent",
    ) ??
    readNumber(
      item,
      "progress",
    ) ??
    readNumber(
      item,
      "completion_percent",
    ) ??
    0;

  return Math.min(
    100,
    Math.max(
      0,
      value,
    ),
  );
}


/* =========================================================
 * 6. LEARNING TYPE
 * ======================================================= */

type LearningGroup =
  | "course"
  | "certification"
  | "degree"
  | "program"
  | "other";


function getLearningGroup(
  item: LearningItem,
): LearningGroup {
  const type =
    normalizeValue(
      getItemType(
        item,
      ),
    );

  switch (type) {
    case "course":
    case "learning_path":
    case "training":
      return "course";

    case "certification":
    case "certificate":
    case "credential":
    case "exam":
      return "certification";

    case "degree":
    case "masters":
    case "master":
    case "master_degree":
    case "university":
    case "education":
      return "degree";

    case "program":
    case "professional_program":
    case "academy":
    case "bootcamp":
      return "program";

    default:
      return "other";
  }
}


/* =========================================================
 * 7. TYPE LABEL
 * ======================================================= */

function getTypeLabel(
  item: LearningItem,
): string {
  switch (
    getLearningGroup(
      item,
    )
  ) {
    case "course":
      return "دورة";

    case "certification":
      return "شهادة";

    case "degree":
      return "تعليم أكاديمي";

    case "program":
      return "برنامج";

    case "other":
    default:
      return "تعلم";
  }
}


/* =========================================================
 * 8. TYPE BADGE
 * ======================================================= */

function getTypeBadgeClass(
  item: LearningItem,
): string {
  switch (
    getLearningGroup(
      item,
    )
  ) {
    case "certification":
      return "badge badge--positive";

    case "degree":
      return "badge badge--accent";

    case "program":
      return "badge badge--warning";

    default:
      return "badge";
  }
}


/* =========================================================
 * 9. STATUS HELPERS
 * ======================================================= */

function getStatusLabel(
  status: string,
): string {
  switch (
    normalizeValue(
      status,
    )
  ) {
    case "active":
    case "in_progress":
      return "جاري";

    case "planned":
    case "not_started":
      return "مخطط";

    case "completed":
    case "passed":
      return "مكتمل";

    case "paused":
      return "متوقف مؤقتًا";

    case "cancelled":
      return "ملغي";

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
    case "passed":
      return "badge badge--positive";

    case "paused":
      return "badge badge--warning";

    case "cancelled":
      return "badge badge--negative";

    default:
      return "badge";
  }
}


/* =========================================================
 * 10. PRIORITY
 * ======================================================= */

function getPriorityLabel(
  priority: string | null,
): string {
  if (
    !priority
  ) {
    return "—";
  }

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


/* =========================================================
 * 11. STATUS PREDICATES
 * ======================================================= */

function isActive(
  item: LearningItem,
): boolean {
  const status =
    normalizeValue(
      getStatus(
        item,
      ),
    );

  return (
    status ===
      "active" ||
    status ===
      "in_progress"
  );
}


function isPlanned(
  item: LearningItem,
): boolean {
  const status =
    normalizeValue(
      getStatus(
        item,
      ),
    );

  return (
    status ===
      "planned" ||
    status ===
      "not_started"
  );
}


function isCompleted(
  item: LearningItem,
): boolean {
  const status =
    normalizeValue(
      getStatus(
        item,
      ),
    );

  return (
    status ===
      "completed" ||
    status ===
      "passed"
  );
}


function isPaused(
  item: LearningItem,
): boolean {
  return (
    normalizeValue(
      getStatus(
        item,
      ),
    ) ===
    "paused"
  );
}


/* =========================================================
 * 12. ACTIVE LEARNING CARD
 * ======================================================= */

function ActiveLearningCard({
  item,
}: {
  item: LearningItem;
}) {
  const progress =
    getProgress(
      item,
    );

  const provider =
    getProvider(
      item,
    );

  const description =
    getDescription(
      item,
    );

  const nextAction =
    getNextAction(
      item,
    );

  const date =
    getRelevantDate(
      item,
    );

  return (
    <article className="card">

      <div className="space-between">
        <div>
          <div className="inline">
            <span
              className={
                getTypeBadgeClass(
                  item,
                )
              }
            >
              {
                getTypeLabel(
                  item,
                )
              }
            </span>

            <span
              className={
                getStatusBadgeClass(
                  getStatus(
                    item,
                  ),
                )
              }
            >
              جاري
            </span>
          </div>


          <h2
            className="card__title"
            style={{
              marginTop:
                "12px",
            }}
          >
            {
              getTitle(
                item,
              )
            }
          </h2>


          {provider ? (
            <p
              className="text-muted text-small"
              style={{
                margin:
                  "5px 0 0",
              }}
            >
              {provider}
            </p>
          ) : null}


          {description ? (
            <p className="card__description">
              {description}
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


      {(nextAction ||
        date) ? (
        <div
          className="stack stack--small"
          style={{
            marginTop:
              "18px",
          }}
        >

          {nextAction ? (
            <div>
              <span className="text-subtle text-small">
                الخطوة التالية
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


          {date ? (
            <div className="space-between">
              <span className="text-muted text-small">
                الموعد
              </span>

              <strong>
                {
                  formatDate(
                    date,
                  )
                }
              </strong>
            </div>
          ) : null}

        </div>
      ) : null}
    </article>
  );
}


/* =========================================================
 * 13. TABLE COLUMNS
 * ======================================================= */

const columns:
  readonly DataTableColumn<LearningItem>[] = [
    {
      key:
        "title",

      header:
        "التعلم",

      render:
        (item) => (
          <div>
            <strong>
              {
                getTitle(
                  item,
                )
              }
            </strong>

            {getProvider(
              item,
            ) ? (
              <div
                className="text-subtle text-small"
                style={{
                  marginTop:
                    "2px",
                }}
              >
                {
                  getProvider(
                    item,
                  )
                }
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
              getTypeBadgeClass(
                item,
              )
            }
          >
            {
              getTypeLabel(
                item,
              )
            }
          </span>
        ),
    },

    {
      key:
        "status",

      header:
        "الحالة",

      render:
        (item) => (
          <span
            className={
              getStatusBadgeClass(
                getStatus(
                  item,
                ),
              )
            }
          >
            {
              getStatusLabel(
                getStatus(
                  item,
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
        (item) =>
          getPriorityLabel(
            getPriority(
              item,
            ),
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
        (item) => (
          <span className="percentage">
            {
              formatProgress(
                getProgress(
                  item,
                ),
              )
            }
          </span>
        ),
    },

    {
      key:
        "date",

      header:
        "الموعد",

      render:
        (item) => {
          const date =
            getRelevantDate(
              item,
            );

          return date
            ? formatDate(
                date,
              )
            : "—";
        },
    },

    {
      key:
        "next_action",

      header:
        "الخطوة التالية",

      render:
        (item) =>
          getNextAction(
            item,
          ) ??
          "—",
    },
  ];


/* =========================================================
 * 14. LEARNING PAGE
 * ======================================================= */

export default async function LearningPage() {
  await requireAAL2Identity();

  const learningItems =
    await listLearningItems();


  /* -------------------------------------------------------
   * Main groups
   * ---------------------------------------------------- */

  const activeItems =
    learningItems.filter(
      isActive,
    );

  const plannedItems =
    learningItems.filter(
      isPlanned,
    );

  const completedItems =
    learningItems.filter(
      isCompleted,
    );

  const pausedItems =
    learningItems.filter(
      isPaused,
    );


  /* -------------------------------------------------------
   * Learning categories
   * ---------------------------------------------------- */

  const certificationCount =
    learningItems.filter(
      (item) =>
        getLearningGroup(
          item,
        ) ===
        "certification",
    ).length;

  const academicCount =
    learningItems.filter(
      (item) =>
        getLearningGroup(
          item,
        ) ===
        "degree",
    ).length;


  return (
    <AppShell>
      <div className="page">

        {/* =================================================
         * HEADER
         * =============================================== */}

        <PageHeader
          eyebrow="التطوير"
          title="التعلم والتعليم"
          description="ما الذي تتعلمه الآن، ماذا أنجزت، وما الذي يستحق أن يأتي بعده."
          action={
            <Link
              href="/assistant"
              className="button button--secondary"
            >
              ابحث عن فرصة تعلم
            </Link>
          }
        />


        {/* =================================================
         * SUMMARY
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="learning-summary-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="learning-summary-title"
                className="section-title"
              >
                وضع التعلم
              </h2>

              <p className="section-description">
                ركز على ما يجري الآن قبل إضافة شيء جديد.
              </p>
            </div>
          </div>


          <div className="stats-grid">

            <StatCard
              label="جاري الآن"
              value={
                String(
                  activeItems.length,
                )
              }
              tone={
                activeItems.length >
                0
                  ? "positive"
                  : "neutral"
              }
              icon="▶"
            />


            <StatCard
              label="مخطط"
              value={
                String(
                  plannedItems.length,
                )
              }
              tone="neutral"
              icon="+"
            />


            <StatCard
              label="مكتمل"
              value={
                String(
                  completedItems.length,
                )
              }
              tone="positive"
              icon="✓"
            />


            <StatCard
              label="متوقف مؤقتًا"
              value={
                String(
                  pausedItems.length,
                )
              }
              tone={
                pausedItems.length >
                0
                  ? "warning"
                  : "neutral"
              }
              icon="Ⅱ"
            />

          </div>
        </section>


        {/* =================================================
         * ACTIVE NOW
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="active-learning-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="active-learning-title"
                className="section-title"
              >
                ماذا تدرس الآن؟
              </h2>

              <p className="section-description">
                العناصر التي تحتاج وقتك واهتمامك حاليًا.
              </p>
            </div>
          </div>


          {activeItems.length > 0 ? (
            <div className="grid grid--2">
              {activeItems.map(
                (
                  item,
                  index,
                ) => (
                  <ActiveLearningCard
                    key={
                      readString(
                        item,
                        "id",
                      ) ??
                      `active-learning-${index}`
                    }
                    item={
                      item
                    }
                  />
                ),
              )}
            </div>
          ) : (
            <EmptyState
              icon="▶"
              title="لا يوجد تعلم نشط حاليًا"
              description="عندما تبدأ دورة أو شهادة أو برنامجًا تعليميًا، سيظهر هنا مع التقدم والخطوة التالية."
            />
          )}
        </section>


        {/* =================================================
         * LEARNING PIPELINE
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="learning-plan-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="learning-plan-title"
                className="section-title"
              >
                الخطة التعليمية
              </h2>

              <p className="section-description">
                لا تبدأ كل شيء معًا؛ اعرف ما هو الحالي وما هو التالي.
              </p>
            </div>
          </div>


          <div className="grid grid--2">

            <article className="card">
              <h3 className="card__title">
                التالي
              </h3>

              <p className="card__description">
                أول العناصر المخططة التي تنتظر دورها.
              </p>


              <div
                className="stack stack--small"
                style={{
                  marginTop:
                    "16px",
                }}
              >
                {plannedItems.length >
                0 ? (
                  plannedItems
                    .slice(
                      0,
                      5,
                    )
                    .map(
                      (
                        item,
                        index,
                      ) => (
                        <div
                          key={
                            readString(
                              item,
                              "id",
                            ) ??
                            `planned-learning-${index}`
                          }
                          className="space-between"
                        >
                          <div>
                            <strong className="text-small">
                              {
                                getTitle(
                                  item,
                                )
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
                                getTypeLabel(
                                  item,
                                )
                              }
                            </div>
                          </div>

                          <span
                            className={
                              getTypeBadgeClass(
                                item,
                              )
                            }
                          >
                            مخطط
                          </span>
                        </div>
                      ),
                    )
                ) : (
                  <span className="text-muted text-small">
                    لا توجد عناصر مخططة حاليًا.
                  </span>
                )}
              </div>
            </article>


            <article className="card">
              <h3 className="card__title">
                تركيبة التعلم
              </h3>

              <p className="card__description">
                صورة سريعة عن نوع التطوير المسجل.
              </p>


              <div
                className="stack stack--small"
                style={{
                  marginTop:
                    "16px",
                }}
              >
                <div className="space-between">
                  <span className="text-muted text-small">
                    شهادات
                  </span>

                  <strong>
                    {
                      certificationCount
                    }
                  </strong>
                </div>

                <div className="space-between">
                  <span className="text-muted text-small">
                    تعليم أكاديمي
                  </span>

                  <strong>
                    {
                      academicCount
                    }
                  </strong>
                </div>

                <div className="space-between">
                  <span className="text-muted text-small">
                    إجمالي العناصر
                  </span>

                  <strong>
                    {
                      learningItems.length
                    }
                  </strong>
                </div>

                <div className="space-between">
                  <span className="text-muted text-small">
                    مكتمل
                  </span>

                  <strong className="text-positive">
                    {
                      completedItems.length
                    }
                  </strong>
                </div>
              </div>
            </article>

          </div>
        </section>


        {/* =================================================
         * COMPLETED
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="completed-learning-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="completed-learning-title"
                className="section-title"
              >
                الإنجازات التعليمية
              </h2>

              <p className="section-description">
                ما أنجزته فعلًا ويستحق البقاء في سجلك المهني.
              </p>
            </div>
          </div>


          {completedItems.length > 0 ? (
            <div className="grid grid--2">
              {completedItems
                .slice(
                  0,
                  6,
                )
                .map(
                  (
                    item,
                    index,
                  ) => (
                    <article
                      key={
                        readString(
                          item,
                          "id",
                        ) ??
                        `completed-learning-${index}`
                      }
                      className="card"
                    >
                      <div className="inline">
                        <span className="badge badge--positive">
                          مكتمل
                        </span>

                        <span
                          className={
                            getTypeBadgeClass(
                              item,
                            )
                          }
                        >
                          {
                            getTypeLabel(
                              item,
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
                        {
                          getTitle(
                            item,
                          )
                        }
                      </h3>


                      {getProvider(
                        item,
                      ) ? (
                        <p className="card__description">
                          {
                            getProvider(
                              item,
                            )
                          }
                        </p>
                      ) : null}


                      {getRelevantDate(
                        item,
                      ) ? (
                        <div
                          className="text-subtle text-small"
                          style={{
                            marginTop:
                              "14px",
                          }}
                        >
                          {
                            formatDate(
                              getRelevantDate(
                                item,
                              )!,
                            )
                          }
                        </div>
                      ) : null}
                    </article>
                  ),
                )}
            </div>
          ) : (
            <EmptyState
              compact
              icon="✓"
              title="لا توجد إنجازات تعليمية مسجلة بعد"
              description="عند إكمال دورة أو شهادة أو برنامج، سيظهر هنا ضمن سجلك التعليمي."
            />
          )}
        </section>


        {/* =================================================
         * OPPORTUNITY SEARCH
         * =============================================== */}

        <section className="page-section">
          <article className="card">
            <div className="space-between">
              <div>
                <h2 className="card__title">
                  قبل إضافة دورة جديدة
                </h2>

                <p className="card__description">
                  خل LIFE OS يقارنها بمسارك المهني، أهدافك، وما تدرسه حاليًا قبل ما تضيف التزام جديد.
                </p>
              </div>

              <Link
                href="/assistant"
                className="button button--primary button--small"
              >
                قيّم فرصة جديدة
              </Link>
            </div>
          </article>
        </section>


        {/* =================================================
         * ALL LEARNING ITEMS
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="all-learning-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="all-learning-title"
                className="section-title"
              >
                كل التعلم
              </h2>

              <p className="section-description">
                السجل الكامل للدورات والشهادات والبرامج والتعليم الأكاديمي.
              </p>
            </div>
          </div>


          <DataTable
            rows={
              learningItems
            }
            columns={
              columns
            }
            getRowKey={
              (
                item,
                index,
              ) =>
                readString(
                  item,
                  "id",
                ) ??
                `learning-${index}`
            }
            caption="سجل التعلم والتعليم في LIFE OS"
            emptyMessage="لا توجد عناصر تعليمية مسجلة حاليًا."
          />
        </section>

      </div>
    </AppShell>
  );
}


/* =========================================================
 * 15. LEARNING PRINCIPLE
 * ======================================================= */

/**
 * LIFE OS does not optimize for:
 *
 * more certificates
 *
 * It optimizes for:
 *
 * useful learning
 *      ↓
 * stronger capability
 *      ↓
 * progress toward real goals
 */


/* =========================================================
 * 16. CURRENT-FIRST RULE
 * ======================================================= */

/**
 * Active learning appears before future learning.
 *
 * The interface should encourage finishing useful work before
 * continuously adding new courses and certifications.
 */


/* =========================================================
 * 17. CAREER ALIGNMENT RULE
 * ======================================================= */

/**
 * Learning and Career are separate domains but are meant to
 * reinforce each other.
 *
 * Future AI analysis may compare:
 *
 * career target
 *      ↓
 * skills required
 *      ↓
 * current learning
 *      ↓
 * remaining gaps
 *
 * without altering records autonomously.
 */


/* =========================================================
 * 18. OPPORTUNITY RULE
 * ======================================================= */

/**
 * Opportunity Search may research:
 *
 * courses
 * certifications
 * education
 * professional programs
 *
 * It may:
 *
 * search ✅
 * compare ✅
 * score ✅
 * recommend ✅
 *
 * It may not automatically enroll or purchase anything.
 */


/* =========================================================
 * 19. AI RULE
 * ======================================================= */

/**
 * Simply opening Learning does not send educational records
 * to OpenAI.
 *
 * AI receives minimized learning context only when an
 * explicit AI workflow requires it.
 */


/* =========================================================
 * 20. SECURITY RULE
 * ======================================================= */

/**
 * Server request
 *      ↓
 * requireAAL2Identity()
 *      ↓
 * listLearningItems()
 *      ↓
 * authenticated ownership
 *      ↓
 * PostgreSQL RLS
 *
 * No user_id is accepted from browser input.
 */


/* =========================================================
 * 21. FINAL LEARNING RULE
 * ======================================================= */

/**
 * Learning page should answer:
 *
 * What am I studying now?
 * How far have I progressed?
 * What comes next?
 * What have I completed?
 * Is my learning focused or scattered?
 *
 * Simple outside.
 * Intelligent underneath.
 */