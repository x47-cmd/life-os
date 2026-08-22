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
  listCareerItems,
} from "@/lib/data";

import {
  formatDate,
} from "@/lib/format";


/* =========================================================
 * 1. METADATA
 * ======================================================= */

export const metadata: Metadata = {
  title:
    "المسار المهني",
};


/* =========================================================
 * 2. INFERRED ROW TYPE
 * ======================================================= */

/**
 * The page intentionally derives its row type directly from
 * the frozen data-access function.
 *
 * This keeps the presentation layer coupled to the actual
 * DAL contract rather than duplicating the database type.
 */
type CareerItem =
  Awaited<
    ReturnType<
      typeof listCareerItems
    >
  >[number];


/* =========================================================
 * 3. SAFE RECORD READER
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
 * 4. CAREER FIELD NORMALIZATION
 * ======================================================= */

function getTitle(
  item: CareerItem,
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
    "عنصر مهني"
  );
}


function getDescription(
  item: CareerItem,
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
  item: CareerItem,
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
  item: CareerItem,
): string {
  return (
    readString(
      item,
      "status",
    ) ??
    "active"
  );
}


function getPriority(
  item: CareerItem,
): string | null {
  return readString(
    item,
    "priority",
  );
}


function getOrganization(
  item: CareerItem,
): string | null {
  return (
    readString(
      item,
      "organization",
    ) ??
    readString(
      item,
      "company",
    ) ??
    readString(
      item,
      "provider",
    )
  );
}


function getRelevantDate(
  item: CareerItem,
): string | null {
  return (
    readString(
      item,
      "target_date",
    ) ??
    readString(
      item,
      "achievement_date",
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


function getNextAction(
  item: CareerItem,
): string | null {
  return readString(
    item,
    "next_action",
  );
}


/* =========================================================
 * 5. NORMALIZATION
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
 * 6. CAREER GROUP
 * ======================================================= */

type CareerGroup =
  | "current"
  | "target"
  | "skill"
  | "gap"
  | "achievement"
  | "other";


function getCareerGroup(
  item: CareerItem,
): CareerGroup {
  const type =
    normalizeValue(
      getItemType(
        item,
      ),
    );

  switch (type) {
    case "current_role":
    case "current_position":
    case "role":
    case "experience":
    case "job":
      return "current";

    case "target_role":
    case "target_position":
    case "career_target":
    case "target_job":
      return "target";

    case "skill":
    case "capability":
    case "competency":
      return "skill";

    case "skill_gap":
    case "gap":
    case "development_gap":
      return "gap";

    case "achievement":
    case "milestone":
    case "award":
      return "achievement";

    default:
      return "other";
  }
}


/* =========================================================
 * 7. TYPE LABEL
 * ======================================================= */

function getTypeLabel(
  item: CareerItem,
): string {
  const group =
    getCareerGroup(
      item,
    );

  switch (group) {
    case "current":
      return "الوضع الحالي";

    case "target":
      return "هدف مهني";

    case "skill":
      return "مهارة";

    case "gap":
      return "فجوة تطوير";

    case "achievement":
      return "إنجاز";

    case "other":
    default:
      return "مهني";
  }
}


/* =========================================================
 * 8. TYPE BADGE
 * ======================================================= */

function getTypeBadgeClass(
  item: CareerItem,
): string {
  const group =
    getCareerGroup(
      item,
    );

  switch (group) {
    case "achievement":
      return "badge badge--positive";

    case "target":
      return "badge badge--accent";

    case "gap":
      return "badge badge--warning";

    default:
      return "badge";
  }
}


/* =========================================================
 * 9. STATUS LABEL
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
      return "نشط";

    case "planned":
      return "مخطط";

    case "completed":
    case "achieved":
      return "مكتمل";

    case "paused":
      return "متوقف مؤقتًا";

    case "cancelled":
      return "ملغي";

    case "archived":
      return "مؤرشف";

    default:
      return status;
  }
}


/* =========================================================
 * 10. STATUS BADGE
 * ======================================================= */

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
    case "achieved":
      return "badge badge--positive";

    case "paused":
    case "planned":
      return "badge badge--warning";

    case "cancelled":
      return "badge badge--negative";

    default:
      return "badge";
  }
}


/* =========================================================
 * 11. PRIORITY LABEL
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
 * 12. ACTIVE ITEM
 * ======================================================= */

function isActiveCareerItem(
  item: CareerItem,
): boolean {
  const status =
    normalizeValue(
      getStatus(
        item,
      ),
    );

  return ![
    "completed",
    "achieved",
    "cancelled",
    "archived",
  ].includes(
    status,
  );
}


/* =========================================================
 * 13. CAREER FOCUS CARD
 * ======================================================= */

function CareerFocusCard({
  item,
}: {
  item: CareerItem;
}) {
  const description =
    getDescription(
      item,
    );

  const organization =
    getOrganization(
      item,
    );

  const nextAction =
    getNextAction(
      item,
    );

  const relevantDate =
    getRelevantDate(
      item,
    );

  return (
    <article className="card">

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
          {
            getStatusLabel(
              getStatus(
                item,
              ),
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
        {
          getTitle(
            item,
          )
        }
      </h2>


      {organization ? (
        <p
          className="text-muted text-small"
          style={{
            margin:
              "5px 0 0",
          }}
        >
          {organization}
        </p>
      ) : null}


      {description ? (
        <p className="card__description">
          {description}
        </p>
      ) : null}


      {(nextAction ||
        relevantDate) ? (
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


          {relevantDate ? (
            <div className="space-between">
              <span className="text-muted text-small">
                التاريخ
              </span>

              <strong>
                {
                  formatDate(
                    relevantDate,
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
 * 14. TABLE COLUMNS
 * ======================================================= */

const columns:
  readonly DataTableColumn<CareerItem>[] = [
    {
      key:
        "title",

      header:
        "العنصر",

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

            {getOrganization(
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
                  getOrganization(
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
        "date",

      header:
        "التاريخ",

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
 * 15. CAREER PAGE
 * ======================================================= */

export default async function CareerPage() {
  await requireAAL2Identity();

  const careerItems =
    await listCareerItems();


  /* -------------------------------------------------------
   * Groups
   * ---------------------------------------------------- */

  const currentItems =
    careerItems.filter(
      (item) =>
        getCareerGroup(
          item,
        ) ===
        "current",
    );

  const targetItems =
    careerItems.filter(
      (item) =>
        getCareerGroup(
          item,
        ) ===
        "target",
    );

  const skillItems =
    careerItems.filter(
      (item) =>
        getCareerGroup(
          item,
        ) ===
        "skill",
    );

  const gapItems =
    careerItems.filter(
      (item) =>
        getCareerGroup(
          item,
        ) ===
        "gap",
    );

  const achievementItems =
    careerItems.filter(
      (item) =>
        getCareerGroup(
          item,
        ) ===
        "achievement",
    );


  const activeItems =
    careerItems.filter(
      isActiveCareerItem,
    );


  /* -------------------------------------------------------
   * Focus items
   * ---------------------------------------------------- */

  const focusItems =
    [
      ...targetItems,
      ...gapItems,
      ...currentItems,
    ]
      .filter(
        isActiveCareerItem,
      )
      .slice(
        0,
        6,
      );


  return (
    <AppShell>
      <div className="page">

        {/* =================================================
         * HEADER
         * =============================================== */}

        <PageHeader
          eyebrow="المسار المهني"
          title="وين أنت مهنيًا؟"
          description="وضعك الحالي، الاتجاه القادم، الفجوات التي تحتاج تطويرها، والإنجازات التي تبني مسارك."
          action={
            <Link
              href="/assistant"
              className="button button--secondary"
            >
              حلّل مساري
            </Link>
          }
        />


        {/* =================================================
         * SUMMARY
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="career-summary-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="career-summary-title"
                className="section-title"
              >
                الصورة المهنية
              </h2>

              <p className="section-description">
                أهم المؤشرات فقط، بدون تحويل الصفحة إلى سجل وظيفي طويل.
              </p>
            </div>
          </div>


          <div className="stats-grid">

            <StatCard
              label="عناصر نشطة"
              value={
                String(
                  activeItems.length,
                )
              }
              tone="neutral"
              icon="◫"
            />


            <StatCard
              label="أهداف مهنية"
              value={
                String(
                  targetItems.length,
                )
              }
              tone="positive"
              icon="◎"
            />


            <StatCard
              label="فجوات تطوير"
              value={
                String(
                  gapItems.filter(
                    isActiveCareerItem,
                  ).length,
                )
              }
              tone={
                gapItems.filter(
                  isActiveCareerItem,
                ).length > 0
                  ? "warning"
                  : "positive"
              }
              helper={
                gapItems.filter(
                  isActiveCareerItem,
                ).length > 0
                  ? "هذه أهم نقاط التحسين."
                  : "لا توجد فجوة نشطة مسجلة."
              }
              icon="!"
            />


            <StatCard
              label="إنجازات"
              value={
                String(
                  achievementItems.length,
                )
              }
              tone="positive"
              icon="✓"
            />

          </div>
        </section>


        {/* =================================================
         * CURRENT DIRECTION
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="career-direction-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="career-direction-title"
                className="section-title"
              >
                الاتجاه الحالي
              </h2>

              <p className="section-description">
                أين أنت، أين تريد أن تصل، وما الذي يحتاج انتباهك قبل ذلك.
              </p>
            </div>
          </div>


          {focusItems.length > 0 ? (
            <div className="grid grid--2">
              {focusItems.map(
                (
                  item,
                  index,
                ) => (
                  <CareerFocusCard
                    key={
                      readString(
                        item,
                        "id",
                      ) ??
                      `career-focus-${index}`
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
              icon="◎"
              title="لا يوجد اتجاه مهني مسجل بعد"
              description="عندما تسجل وضعك الحالي أو الوظيفة المستهدفة أو فجوة تطوير، ستظهر هنا مباشرة."
            />
          )}
        </section>


        {/* =================================================
         * SKILLS + GAPS
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="career-development-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="career-development-title"
                className="section-title"
              >
                التطوير
              </h2>

              <p className="section-description">
                المهارات التي تملكها مقابل الأشياء التي ما زالت تحتاج تطويرًا.
              </p>
            </div>
          </div>


          {(skillItems.length >
              0 ||
            gapItems.length >
              0) ? (
            <div className="grid grid--2">

              <article className="card">
                <h3 className="card__title">
                  المهارات
                </h3>

                <p className="card__description">
                  القدرات المهنية المسجلة في LIFE OS.
                </p>

                <div
                  className="inline"
                  style={{
                    marginTop:
                      "16px",
                  }}
                >
                  {skillItems.length >
                  0 ? (
                    skillItems
                      .slice(
                        0,
                        12,
                      )
                      .map(
                        (
                          item,
                          index,
                        ) => (
                          <span
                            key={
                              readString(
                                item,
                                "id",
                              ) ??
                              `skill-${index}`
                            }
                            className="badge badge--positive"
                          >
                            {
                              getTitle(
                                item,
                              )
                            }
                          </span>
                        ),
                      )
                  ) : (
                    <span className="text-muted text-small">
                      لا توجد مهارات مسجلة.
                    </span>
                  )}
                </div>
              </article>


              <article className="card">
                <h3 className="card__title">
                  الفجوات
                </h3>

                <p className="card__description">
                  ما يستحق التطوير لأنه يؤثر على خطوتك المهنية القادمة.
                </p>

                <div
                  className="stack stack--small"
                  style={{
                    marginTop:
                      "16px",
                  }}
                >
                  {gapItems.length >
                  0 ? (
                    gapItems
                      .filter(
                        isActiveCareerItem,
                      )
                      .slice(
                        0,
                        8,
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
                              `gap-${index}`
                            }
                            className="space-between"
                          >
                            <span className="text-muted text-small">
                              {
                                getTitle(
                                  item,
                                )
                              }
                            </span>

                            <span className="badge badge--warning">
                              تطوير
                            </span>
                          </div>
                        ),
                      )
                  ) : (
                    <span className="text-muted text-small">
                      لا توجد فجوات تطوير مسجلة.
                    </span>
                  )}
                </div>
              </article>

            </div>
          ) : (
            <EmptyState
              compact
              icon="+"
              title="لا توجد بيانات تطوير مهني"
              description="المهارات والفجوات المسجلة ستظهر هنا حتى تعرف ما الذي يستحق وقتك."
            />
          )}
        </section>


        {/* =================================================
         * ACHIEVEMENTS
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="career-achievements-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="career-achievements-title"
                className="section-title"
              >
                الإنجازات
              </h2>

              <p className="section-description">
                الأشياء التي تستحق أن تبقى في ذاكرتك المهنية والسيرة الذاتية.
              </p>
            </div>
          </div>


          {achievementItems.length >
          0 ? (
            <div className="grid grid--2">
              {achievementItems
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
                        `achievement-${index}`
                      }
                      className="card"
                    >
                      <span className="badge badge--positive">
                        إنجاز
                      </span>

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

                      {getDescription(
                        item,
                      ) ? (
                        <p className="card__description">
                          {
                            getDescription(
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
              title="لا توجد إنجازات مسجلة بعد"
              description="أي إنجاز مهني مهم يمكن الاحتفاظ به هنا ليبقى جاهزًا للتقييم والسيرة الذاتية."
            />
          )}
        </section>


        {/* =================================================
         * OPPORTUNITIES
         * =============================================== */}

        <section className="page-section">
          <article className="card">
            <div className="space-between">
              <div>
                <h2 className="card__title">
                  الخطوة القادمة
                </h2>

                <p className="card__description">
                  استخدم بحث الفرص داخل LIFE OS لمقارنة الفرص الجديدة بمسارك وأهدافك الحالية.
                </p>
              </div>

              <Link
                href="/assistant"
                className="button button--primary button--small"
              >
                ابحث عن فرصة
              </Link>
            </div>
          </article>
        </section>


        {/* =================================================
         * ALL CAREER RECORDS
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="career-records-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="career-records-title"
                className="section-title"
              >
                السجل المهني
              </h2>

              <p className="section-description">
                كل العناصر المهنية المسجلة في مكان واحد.
              </p>
            </div>
          </div>


          <DataTable
            rows={
              careerItems
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
                `career-${index}`
            }
            caption="السجل المهني في LIFE OS"
            emptyMessage="لا توجد بيانات مهنية مسجلة حاليًا."
          />
        </section>

      </div>
    </AppShell>
  );
}


/* =========================================================
 * 16. CAREER MODEL
 * ======================================================= */

/**
 * LIFE OS treats career information as a connected path:
 *
 * Current position
 *      ↓
 * Target direction
 *      ↓
 * Required skills
 *      ↓
 * Development gaps
 *      ↓
 * Actions
 *      ↓
 * Achievements
 */


/* =========================================================
 * 17. ACHIEVEMENT RULE
 * ======================================================= */

/**
 * Important achievements should remain structured career
 * records.
 *
 * This allows future LIFE OS versions to reuse them for:
 *
 * - CV updates
 * - performance reviews
 * - promotion preparation
 * - job applications
 *
 * without storing a raw CV document in GitHub.
 */


/* =========================================================
 * 18. OPPORTUNITY RULE
 * ======================================================= */

/**
 * Career opportunities are not automatically accepted.
 *
 * LIFE OS may:
 *
 * search
 * compare
 * score
 * recommend
 *
 * but the user decides whether an opportunity should become
 * part of the career plan.
 */


/* =========================================================
 * 19. AI RULE
 * ======================================================= */

/**
 * Opening this page does not send career records to OpenAI.
 *
 * AI receives only minimized career context when the user
 * explicitly invokes an AI workflow.
 */


/* =========================================================
 * 20. SECURITY RULE
 * ======================================================= */

/**
 * Server request
 *      ↓
 * requireAAL2Identity()
 *      ↓
 * listCareerItems()
 *      ↓
 * authenticated user ownership
 *      ↓
 * PostgreSQL RLS
 *
 * Career data remains private to the authenticated owner.
 */


/* =========================================================
 * 21. FINAL CAREER RULE
 * ======================================================= */

/**
 * Career page should answer:
 *
 * Where am I?
 * Where am I going?
 * What am I good at?
 * What is missing?
 * What have I achieved?
 * What deserves my attention next?
 *
 * Simple outside.
 * Intelligent underneath.
 */