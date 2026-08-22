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
  listAuditLogs,
} from "@/lib/data";


/* =========================================================
 * 1. METADATA
 * ======================================================= */

export const metadata: Metadata = {
  title:
    "سجل التدقيق",
};


/* =========================================================
 * 2. INFERRED ROW TYPE
 * ======================================================= */

/**
 * Infer directly from the frozen DAL contract.
 *
 * This avoids duplicating the database shape inside the
 * presentation layer.
 */
type AuditLog =
  Awaited<
    ReturnType<
      typeof listAuditLogs
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


function readObject(
  value: unknown,
  key: string,
): Record<string, unknown> | null {
  if (
    !isRecord(
      value,
    )
  ) {
    return null;
  }

  const field =
    value[key];

  return isRecord(
    field,
  )
    ? field
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
    .toUpperCase()
    .replace(
      /[\s-]+/g,
      "_",
    );
}


/* =========================================================
 * 5. AUDIT FIELDS
 * ======================================================= */

function getId(
  item: AuditLog,
): string {
  return (
    readString(
      item,
      "id",
    ) ??
    "unknown"
  );
}


function getAction(
  item: AuditLog,
): string {
  return (
    readString(
      item,
      "action",
    ) ??
    "UNKNOWN"
  );
}


function getEntityType(
  item: AuditLog,
): string | null {
  return readString(
    item,
    "entity_type",
  );
}


function getEntityId(
  item: AuditLog,
): string | null {
  return readString(
    item,
    "entity_id",
  );
}


function getCreatedAt(
  item: AuditLog,
): string | null {
  return (
    readString(
      item,
      "created_at",
    ) ??
    readString(
      item,
      "occurred_at",
    )
  );
}


function getMetadata(
  item: AuditLog,
): Record<string, unknown> | null {
  return readObject(
    item,
    "metadata",
  );
}


/* =========================================================
 * 6. CATEGORY
 * ======================================================= */

type AuditCategory =
  | "auth"
  | "security"
  | "ai"
  | "settings"
  | "data"
  | "other";


function getCategory(
  action: string,
): AuditCategory {
  const normalized =
    normalizeValue(
      action,
    );

  if (
    normalized.startsWith(
      "AUTH_",
    ) ||
    normalized.includes(
      "LOGIN",
    ) ||
    normalized.includes(
      "LOGOUT",
    ) ||
    normalized.includes(
      "MFA",
    )
  ) {
    return "auth";
  }

  if (
    normalized.includes(
      "SECURITY",
    ) ||
    normalized.includes(
      "PERMISSION",
    ) ||
    normalized.includes(
      "ACCESS",
    )
  ) {
    return "security";
  }

  if (
    normalized.startsWith(
      "AI_",
    ) ||
    normalized.includes(
      "OPPORTUNITY",
    ) ||
    normalized.includes(
      "DECISION_SIMULATION",
    )
  ) {
    return "ai";
  }

  if (
    normalized.includes(
      "SETTING",
    ) ||
    normalized.includes(
      "PROFILE",
    )
  ) {
    return "settings";
  }

  if (
    normalized.includes(
      "CREATE",
    ) ||
    normalized.includes(
      "UPDATE",
    ) ||
    normalized.includes(
      "DELETE",
    ) ||
    normalized.includes(
      "INSERT",
    )
  ) {
    return "data";
  }

  return "other";
}


/* =========================================================
 * 7. CATEGORY LABEL
 * ======================================================= */

function getCategoryLabel(
  category: AuditCategory,
): string {
  switch (
    category
  ) {
    case "auth":
      return "المصادقة";

    case "security":
      return "الأمان";

    case "ai":
      return "الذكاء";

    case "settings":
      return "الإعدادات";

    case "data":
      return "البيانات";

    case "other":
    default:
      return "النظام";
  }
}


/* =========================================================
 * 8. CATEGORY BADGE
 * ======================================================= */

function getCategoryBadgeClass(
  category: AuditCategory,
): string {
  switch (
    category
  ) {
    case "auth":
    case "security":
      return "badge badge--positive";

    case "ai":
      return "badge badge--accent";

    case "settings":
      return "badge badge--warning";

    case "data":
    case "other":
    default:
      return "badge";
  }
}


/* =========================================================
 * 9. ACTION LABEL
 * ======================================================= */

function getActionLabel(
  action: string,
): string {
  switch (
    normalizeValue(
      action,
    )
  ) {
    case "AUTH_LOGIN":
      return "تسجيل دخول";

    case "AUTH_LOGOUT":
      return "تسجيل خروج";

    case "MFA_ENROLLED":
      return "إعداد MFA";

    case "MFA_VERIFIED":
      return "تحقق MFA";

    case "AI_RECOMMENDATION":
      return "توصية AI";

    case "AI_DECISION_SIMULATION":
      return "محاكاة قرار";

    case "OPPORTUNITY_SEARCH":
      return "بحث فرصة";

    case "SETTING_CHANGED":
      return "تغيير إعداد";

    default:
      return action
        .replace(
          /_/g,
          " ",
        );
  }
}


/* =========================================================
 * 10. ENTITY LABEL
 * ======================================================= */

function getEntityLabel(
  entityType: string | null,
): string {
  if (
    !entityType
  ) {
    return "—";
  }

  switch (
    entityType
      .trim()
      .toLowerCase()
  ) {
    case "goal":
    case "goals":
      return "هدف";

    case "project":
    case "projects":
      return "مشروع";

    case "task":
    case "tasks":
      return "مهمة";

    case "learning_item":
    case "learning":
      return "تعلم";

    case "career_item":
    case "career":
      return "مهني";

    case "investment_asset":
    case "investment":
      return "استثمار";

    case "budget_item":
    case "finance":
      return "مالي";

    case "profile":
      return "الملف الشخصي";

    case "ai_recommendation":
      return "توصية AI";

    default:
      return entityType;
  }
}


/* =========================================================
 * 11. TIMESTAMP FORMAT
 * ======================================================= */

function formatTimestamp(
  value: string | null,
): string {
  if (
    !value
  ) {
    return "—";
  }

  const date =
    new Date(
      value,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "ar-AE-u-nu-latn",
    {
      dateStyle:
        "medium",

      timeStyle:
        "short",

      timeZone:
        "Asia/Dubai",
    },
  ).format(
    date,
  );
}


/* =========================================================
 * 12. SAFE METADATA SUMMARY
 * ======================================================= */

/**
 * Audit metadata is already validated before insertion.
 *
 * The UI still keeps presentation deliberately small and
 * avoids rendering a raw JSON dump.
 */
function summarizeMetadata(
  metadata:
    Record<string, unknown> | null,
): string {
  if (
    !metadata
  ) {
    return "—";
  }

  const entries =
    Object.entries(
      metadata,
    )
      .filter(
        ([
          ,
          value,
        ]) =>
          typeof value ===
            "string" ||
          typeof value ===
            "number" ||
          typeof value ===
            "boolean",
      )
      .slice(
        0,
        3,
      );

  if (
    entries.length ===
    0
  ) {
    return "—";
  }

  return entries
    .map(
      ([
        key,
        value,
      ]) =>
        `${key}: ${String(value)}`,
    )
    .join(
      " · ",
    );
}


/* =========================================================
 * 13. SORT
 * ======================================================= */

function sortNewestFirst(
  rows: AuditLog[],
): AuditLog[] {
  return [
    ...rows,
  ].sort(
    (
      a,
      b,
    ) => {
      const aDate =
        getCreatedAt(
          a,
        );

      const bDate =
        getCreatedAt(
          b,
        );

      if (
        !aDate &&
        !bDate
      ) {
        return 0;
      }

      if (
        !aDate
      ) {
        return 1;
      }

      if (
        !bDate
      ) {
        return -1;
      }

      return (
        new Date(
          bDate,
        ).getTime() -
        new Date(
          aDate,
        ).getTime()
      );
    },
  );
}


/* =========================================================
 * 14. TABLE COLUMNS
 * ======================================================= */

const columns:
  readonly DataTableColumn<AuditLog>[] = [
    {
      key:
        "time",

      header:
        "الوقت",

      render:
        (item) => (
          <span className="text-small">
            {
              formatTimestamp(
                getCreatedAt(
                  item,
                ),
              )
            }
          </span>
        ),
    },

    {
      key:
        "category",

      header:
        "الفئة",

      render:
        (item) => {
          const category =
            getCategory(
              getAction(
                item,
              ),
            );

          return (
            <span
              className={
                getCategoryBadgeClass(
                  category,
                )
              }
            >
              {
                getCategoryLabel(
                  category,
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
        "الحدث",

      render:
        (item) => (
          <div>
            <strong>
              {
                getActionLabel(
                  getAction(
                    item,
                  ),
                )
              }
            </strong>

            <div
              className="text-subtle text-small ltr"
              style={{
                marginTop:
                  "2px",
              }}
            >
              {
                getAction(
                  item,
                )
              }
            </div>
          </div>
        ),
    },

    {
      key:
        "entity",

      header:
        "الكيان",

      render:
        (item) => {
          const entityType =
            getEntityType(
              item,
            );

          const entityId =
            getEntityId(
              item,
            );

          return (
            <div>
              <span>
                {
                  getEntityLabel(
                    entityType,
                  )
                }
              </span>

              {entityId ? (
                <div
                  className="text-subtle text-small ltr"
                  style={{
                    marginTop:
                      "2px",
                  }}
                >
                  {
                    entityId.slice(
                      0,
                      8,
                    )
                  }
                  …
                </div>
              ) : null}
            </div>
          );
        },
    },

    {
      key:
        "metadata",

      header:
        "تفاصيل آمنة",

      render:
        (item) => (
          <span className="text-muted text-small">
            {
              summarizeMetadata(
                getMetadata(
                  item,
                ),
              )
            }
          </span>
        ),
    },
  ];


/* =========================================================
 * 15. AUDIT PAGE
 * ======================================================= */

export default async function AuditPage() {
  await requireAAL2Identity();

  const rows =
    sortNewestFirst(
      await listAuditLogs(),
    );

  /**
   * V1 keeps the page intentionally bounded.
   *
   * The database remains the full append-only source of
   * truth. This view focuses on the newest 100 records.
   */
  const visibleRows =
    rows.slice(
      0,
      100,
    );


  /* -------------------------------------------------------
   * Counters
   * ---------------------------------------------------- */

  const authCount =
    visibleRows.filter(
      (item) =>
        getCategory(
          getAction(
            item,
          ),
        ) ===
        "auth",
    ).length;

  const securityCount =
    visibleRows.filter(
      (item) =>
        getCategory(
          getAction(
            item,
          ),
        ) ===
        "security",
    ).length;

  const aiCount =
    visibleRows.filter(
      (item) =>
        getCategory(
          getAction(
            item,
          ),
        ) ===
        "ai",
    ).length;


  return (
    <AppShell>
      <div className="page">

        {/* =================================================
         * HEADER
         * =============================================== */}

        <PageHeader
          eyebrow="Security & Accountability"
          title="سجل التدقيق"
          description="آخر الأحداث المهمة التي سجلها LIFE OS. هذا السجل للقراءة والمراجعة فقط."
          meta={
            <span>
              عرض آخر{" "}
              <strong className="number">
                {
                  visibleRows.length
                }
              </strong>
              {" "}حدث
            </span>
          }
        />


        {/* =================================================
         * APPEND-ONLY NOTICE
         * =============================================== */}

        <section className="page-section">
          <div
            className="alert"
            role="note"
          >
            سجل التدقيق <strong>Append-only</strong>: يمكن مراجعته، لكن LIFE OS لا يوفر من هذه الصفحة تعديلًا أو حذفًا لأحداث التدقيق.
          </div>
        </section>


        {/* =================================================
         * SUMMARY
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="audit-summary-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="audit-summary-title"
                className="section-title"
              >
                النظرة السريعة
              </h2>

              <p className="section-description">
                توزيع الأحداث الظاهرة حاليًا.
              </p>
            </div>
          </div>


          <div className="stats-grid">

            <StatCard
              label="الأحداث"
              value={
                String(
                  visibleRows.length,
                )
              }
              tone="neutral"
              icon="≡"
            />


            <StatCard
              label="المصادقة"
              value={
                String(
                  authCount,
                )
              }
              tone="positive"
              icon="✓"
            />


            <StatCard
              label="الأمان"
              value={
                String(
                  securityCount,
                )
              }
              tone={
                securityCount >
                0
                  ? "warning"
                  : "neutral"
              }
              icon="◇"
            />


            <StatCard
              label="AI"
              value={
                String(
                  aiCount,
                )
              }
              tone="neutral"
              icon="✦"
            />

          </div>
        </section>


        {/* =================================================
         * LOG
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="audit-log-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="audit-log-title"
                className="section-title"
              >
                الأحداث
              </h2>

              <p className="section-description">
                الأحدث أولًا. التفاصيل المعروضة مختصرة ولا تعرض أسرار المصادقة أو مفاتيح النظام.
              </p>
            </div>
          </div>


          {visibleRows.length >
          0 ? (
            <DataTable
              rows={
                visibleRows
              }
              columns={
                columns
              }
              getRowKey={
                (
                  item,
                  index,
                ) =>
                  getId(
                    item,
                  ) !==
                  "unknown"
                    ? getId(
                        item,
                      )
                    : `audit-${index}`
              }
              caption="آخر أحداث LIFE OS"
              compact
            />
          ) : (
            <EmptyState
              icon="≡"
              title="لا توجد أحداث تدقيق بعد"
              description="عندما يسجل LIFE OS حدثًا مهمًا أو عملية AI أو حدث مصادقة، سيظهر هنا."
            />
          )}
        </section>


        {/* =================================================
         * SECURITY EXPLANATION
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="audit-security-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="audit-security-title"
                className="section-title"
              >
                ماذا يسجل LIFE OS؟
              </h2>
            </div>
          </div>


          <div className="grid grid--2">

            <article className="card">
              <h3 className="card__title">
                يسجل
              </h3>

              <div
                className="stack stack--small"
                style={{
                  marginTop:
                    "16px",
                }}
              >
                <span className="text-muted text-small">
                  ✓ أحداث المصادقة المهمة
                </span>

                <span className="text-muted text-small">
                  ✓ التحقق من MFA
                </span>

                <span className="text-muted text-small">
                  ✓ عمليات AI المهمة
                </span>

                <span className="text-muted text-small">
                  ✓ بحث الفرص ومحاكاة القرارات
                </span>

                <span className="text-muted text-small">
                  ✓ التغييرات المهمة المدعومة في النظام
                </span>
              </div>
            </article>


            <article className="card">
              <h3 className="card__title">
                لا يسجل
              </h3>

              <div
                className="stack stack--small"
                style={{
                  marginTop:
                    "16px",
                }}
              >
                <span className="text-muted text-small">
                  ✕ كلمات المرور
                </span>

                <span className="text-muted text-small">
                  ✕ رموز TOTP
                </span>

                <span className="text-muted text-small">
                  ✕ مفاتيح API
                </span>

                <span className="text-muted text-small">
                  ✕ Auth tokens
                </span>

                <span className="text-muted text-small">
                  ✕ الأسرار أو بيانات اعتماد النظام
                </span>
              </div>
            </article>

          </div>
        </section>

      </div>
    </AppShell>
  );
}


/* =========================================================
 * 16. APPEND-ONLY RULE
 * ======================================================= */

/**
 * Audit logs are append-only application records.
 *
 * LIFE OS application code may:
 *
 * insert ✅
 * read   ✅
 *
 * It may not:
 *
 * update ❌
 * delete ❌
 *
 * Normal UI flows therefore cannot rewrite history.
 */


/* =========================================================
 * 17. METADATA RULE
 * ======================================================= */

/**
 * Audit metadata is validated before storage.
 *
 * Forbidden sensitive keys are rejected by the centralized
 * validation layer.
 *
 * This page additionally avoids displaying raw JSON blobs.
 */


/* =========================================================
 * 18. DISPLAY LIMIT RULE
 * ======================================================= */

/**
 * The database remains the complete source of truth.
 *
 * V1 displays:
 *
 * newest 100 records
 *
 * to keep the interface simple and prevent an ever-growing
 * audit history from making normal page rendering noisy.
 */


/* =========================================================
 * 19. AI AUDIT RULE
 * ======================================================= */

/**
 * Important AI workflows can leave a minimal audit event.
 *
 * Audit logging should record:
 *
 * what kind of workflow happened
 * when it happened
 * what entity was relevant when appropriate
 *
 * It should NOT copy complete prompts, complete personal
 * context or secrets into the audit trail.
 */


/* =========================================================
 * 20. SECURITY RULE
 * ======================================================= */

/**
 * Server request
 *      ↓
 * requireAAL2Identity()
 *      ↓
 * listAuditLogs()
 *      ↓
 * owner-restricted database access
 *      ↓
 * PostgreSQL RLS
 *
 * The browser never chooses which user's audit history to
 * retrieve.
 */


/* =========================================================
 * 21. FINAL AUDIT RULE
 * ======================================================= */

/**
 * Audit should answer:
 *
 * What happened?
 * When?
 * What part of LIFE OS was involved?
 * Was it Auth, Security, AI or Data?
 *
 * Without becoming:
 *
 * a secret store
 * a raw debug console
 * an editable history
 *
 * Simple outside.
 * Intelligent underneath.
 */