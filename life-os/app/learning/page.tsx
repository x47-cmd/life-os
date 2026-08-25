import type {
  Metadata,
} from "next";

import Link from "next/link";

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
  requireAuthenticatedIdentity,
} from "@/lib/auth";

import {
  listCareerItems,
  listLearningItems,
} from "@/lib/data";

import {
  formatDate,
  formatProgress,
} from "@/lib/format";


/* =========================================================
 * LIFE OS V2
 * GROWTH
 *
 * One primary development surface:
 *
 * Learning
 * +
 * Career
 *
 *
 * Learning:
 *      what am I learning?
 *
 * Career:
 *      where am I professionally and where am I going?
 *
 *
 * Detailed career management remains available at:
 *
 * /career
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
    "التطوير",
};


/* =========================================================
 * 2. INFERRED DATA TYPES
 * ======================================================= */

type LearningItem =
  Awaited<
    ReturnType<
      typeof listLearningItems
    >
  >[number];


type CareerItem =
  Awaited<
    ReturnType<
      typeof listCareerItems
    >
  >[number];


/* =========================================================
 * 3. SAFE RECORD HELPERS
 * ======================================================= */

function isRecord(
  value:
    unknown,
): value is Record<
  string,
  unknown
> {
  return (
    typeof value ===
      "object" &&
    value !==
      null &&
    !Array.isArray(
      value,
    )
  );
}


function readString(
  value:
    unknown,

  key:
    string,
): string | null {
  if (
    !isRecord(
      value,
    )
  ) {
    return null;
  }


  const field =
    value[
      key
    ];


  if (
    typeof field !==
    "string"
  ) {
    return null;
  }


  const normalized =
    field.trim();


  return normalized.length >
    0
    ? normalized
    : null;
}


function readNumber(
  value:
    unknown,

  key:
    string,
): number | null {
  if (
    !isRecord(
      value,
    )
  ) {
    return null;
  }


  const field =
    value[
      key
    ];


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
  value:
    string,
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
 * 5. PRIORITY WEIGHT
 * ======================================================= */

function getPriorityWeight(
  priority:
    string |
    null,
): number {
  if (
    !priority
  ) {
    return 0;
  }


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


/* =========================================================
 * 6. DATE COMPARISON
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
 * 7. LEARNING FIELD READERS
 * ======================================================= */

function getLearningTitle(
  item:
    LearningItem,
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


function getLearningProvider(
  item:
    LearningItem,
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


function getLearningDescription(
  item:
    LearningItem,
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


function getLearningType(
  item:
    LearningItem,
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
    "other"
  );
}


function getLearningStatus(
  item:
    LearningItem,
): string {
  return (
    readString(
      item,
      "status",
    ) ??
    "planned"
  );
}


function getLearningPriority(
  item:
    LearningItem,
): string | null {
  return readString(
    item,
    "priority",
  );
}


function getLearningNextAction(
  item:
    LearningItem,
): string | null {
  return readString(
    item,
    "next_action",
  );
}


function getLearningDate(
  item:
    LearningItem,
): string | null {
  return (
    readString(
      item,
      "target_date",
    ) ??
    readString(
      item,
      "completed_date",
    ) ??
    readString(
      item,
      "start_date",
    )
  );
}


function getLearningProgress(
  item:
    LearningItem,
): number {
  const progress =
    readNumber(
      item,
      "progress_percent",
    ) ??
    readNumber(
      item,
      "progress",
    ) ??
    0;


  return Math.min(
    100,
    Math.max(
      0,
      progress,
    ),
  );
}


/* =========================================================
 * 8. LEARNING GROUP
 * ======================================================= */

type LearningGroup =
  | "course"
  | "certification"
  | "academic"
  | "program"
  | "other";


function getLearningGroup(
  item:
    LearningItem,
): LearningGroup {
  switch (
    normalizeValue(
      getLearningType(
        item,
      ),
    )
  ) {
    case "course":
    case "learning_path":
    case "training":
      return "course";


    case "certification":
    case "certificate":
    case "credential":
    case "exam":
      return "certification";


    case "masters":
    case "master":
    case "degree":
    case "university_program":
    case "university":
      return "academic";


    case "program":
    case "academy":
    case "bootcamp":
      return "program";


    default:
      return "other";
  }
}


/* =========================================================
 * 9. LEARNING TYPE LABEL
 * ======================================================= */

function getLearningTypeLabel(
  item:
    LearningItem,
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

    case "academic":
      return "تعليم أكاديمي";

    case "program":
      return "برنامج";

    case "other":
    default:
      return "تعلم";
  }
}


/* =========================================================
 * 10. LEARNING TYPE BADGE
 * ======================================================= */

function getLearningTypeBadgeClass(
  item:
    LearningItem,
): string {
  switch (
    getLearningGroup(
      item,
    )
  ) {
    case "certification":
      return "badge badge--positive";

    case "academic":
      return "badge badge--accent";

    case "program":
      return "badge badge--warning";

    case "course":
    case "other":
    default:
      return "badge";
  }
}


/* =========================================================
 * 11. LEARNING STATUS
 * ======================================================= */

function getLearningStatusLabel(
  status:
    string,
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

    case "dropped":
    case "cancelled":
      return "متوقف";

    default:
      return status;
  }
}


function getLearningStatusBadgeClass(
  status:
    string,
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

    case "dropped":
    case "cancelled":
      return "badge badge--negative";

    default:
      return "badge";
  }
}


/* =========================================================
 * 12. LEARNING STATUS PREDICATES
 * ======================================================= */

function isLearningActive(
  item:
    LearningItem,
): boolean {
  const status =
    normalizeValue(
      getLearningStatus(
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


function isLearningPlanned(
  item:
    LearningItem,
): boolean {
  const status =
    normalizeValue(
      getLearningStatus(
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


function isLearningCompleted(
  item:
    LearningItem,
): boolean {
  const status =
    normalizeValue(
      getLearningStatus(
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


/* =========================================================
 * 13. SORT LEARNING
 * ======================================================= */

function getLearningStatusWeight(
  item:
    LearningItem,
): number {
  const status =
    normalizeValue(
      getLearningStatus(
        item,
      ),
    );


  switch (
    status
  ) {
    case "active":
    case "in_progress":
      return 5;

    case "planned":
    case "not_started":
      return 4;

    case "paused":
      return 3;

    case "completed":
    case "passed":
      return 2;

    case "dropped":
    case "cancelled":
      return 1;

    default:
      return 0;
  }
}


function sortLearningItems(
  items:
    LearningItem[],
): LearningItem[] {
  return [
    ...items,
  ].sort(
    (
      a,
      b,
    ) => {
      const statusDifference =
        getLearningStatusWeight(
          b,
        ) -
        getLearningStatusWeight(
          a,
        );


      if (
        statusDifference !==
        0
      ) {
        return statusDifference;
      }


      const priorityDifference =
        getPriorityWeight(
          getLearningPriority(
            b,
          ),
        ) -
        getPriorityWeight(
          getLearningPriority(
            a,
          ),
        );


      if (
        priorityDifference !==
        0
      ) {
        return priorityDifference;
      }


      return compareDates(
        getLearningDate(
          a,
        ),
        getLearningDate(
          b,
        ),
      );
    },
  );
}


/* =========================================================
 * 14. CAREER FIELD READERS
 * ======================================================= */

function getCareerTitle(
  item:
    CareerItem,
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


function getCareerDescription(
  item:
    CareerItem,
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


function getCareerType(
  item:
    CareerItem,
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
    "other"
  );
}


function getCareerStatus(
  item:
    CareerItem,
): string {
  return (
    readString(
      item,
      "status",
    ) ??
    "active"
  );
}


function getCareerPriority(
  item:
    CareerItem,
): string | null {
  return readString(
    item,
    "priority",
  );
}


function getCareerDate(
  item:
    CareerItem,
): string | null {
  return (
    readString(
      item,
      "target_date",
    ) ??
    readString(
      item,
      "event_date",
    ) ??
    readString(
      item,
      "achievement_date",
    ) ??
    readString(
      item,
      "start_date",
    )
  );
}


function getCareerNextAction(
  item:
    CareerItem,
): string | null {
  return readString(
    item,
    "next_action",
  );
}


/* =========================================================
 * 15. CAREER GROUP
 * ======================================================= */

type CareerGroup =
  | "current"
  | "target"
  | "skill"
  | "achievement"
  | "milestone"
  | "gap"
  | "other";


function getCareerGroup(
  item:
    CareerItem,
): CareerGroup {
  switch (
    normalizeValue(
      getCareerType(
        item,
      ),
    )
  ) {
    case "current_role":
    case "current_position":
    case "role":
      return "current";


    case "target_role":
    case "target_position":
    case "career_target":
      return "target";


    case "skill":
    case "capability":
    case "competency":
      return "skill";


    case "achievement":
    case "award":
      return "achievement";


    case "milestone":
      return "milestone";


    case "gap":
    case "skill_gap":
    case "development_gap":
      return "gap";


    default:
      return "other";
  }
}


/* =========================================================
 * 16. CAREER TYPE LABEL
 * ======================================================= */

function getCareerTypeLabel(
  item:
    CareerItem,
): string {
  switch (
    getCareerGroup(
      item,
    )
  ) {
    case "current":
      return "الوضع الحالي";

    case "target":
      return "هدف مهني";

    case "skill":
      return "مهارة";

    case "achievement":
      return "إنجاز";

    case "milestone":
      return "مرحلة مهنية";

    case "gap":
      return "فجوة تطوير";

    case "other":
    default:
      return "مهني";
  }
}


/* =========================================================
 * 17. CAREER TYPE BADGE
 * ======================================================= */

function getCareerTypeBadgeClass(
  item:
    CareerItem,
): string {
  switch (
    getCareerGroup(
      item,
    )
  ) {
    case "achievement":
    case "milestone":
      return "badge badge--positive";

    case "target":
      return "badge badge--accent";

    case "gap":
      return "badge badge--warning";

    case "current":
    case "skill":
    case "other":
    default:
      return "badge";
  }
}


/* =========================================================
 * 18. CAREER STATUS
 * ======================================================= */

function getCareerStatusLabel(
  status:
    string,
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

    case "archived":
      return "مؤرشف";

    case "cancelled":
      return "ملغي";

    default:
      return status;
  }
}


function getCareerStatusBadgeClass(
  status:
    string,
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

    case "planned":
    case "paused":
      return "badge badge--warning";

    case "cancelled":
      return "badge badge--negative";

    default:
      return "badge";
  }
}


/* =========================================================
 * 19. ACTIVE CAREER ITEM
 * ======================================================= */

function isCareerActive(
  item:
    CareerItem,
): boolean {
  const status =
    normalizeValue(
      getCareerStatus(
        item,
      ),
    );


  return ![
    "completed",
    "achieved",
    "archived",
    "cancelled",
  ].includes(
    status,
  );
}


/* =========================================================
 * 20. CAREER ACHIEVEMENT
 * ======================================================= */

function isCareerAchievement(
  item:
    CareerItem,
): boolean {
  const group =
    getCareerGroup(
      item,
    );


  return (
    group ===
      "achievement" ||
    group ===
      "milestone"
  );
}


/* =========================================================
 * 21. CAREER SORTING
 * ======================================================= */

function getCareerStatusWeight(
  item:
    CareerItem,
): number {
  const status =
    normalizeValue(
      getCareerStatus(
        item,
      ),
    );


  switch (
    status
  ) {
    case "active":
    case "in_progress":
      return 5;

    case "planned":
      return 4;

    case "paused":
      return 3;

    case "completed":
    case "achieved":
      return 2;

    case "archived":
    case "cancelled":
      return 1;

    default:
      return 0;
  }
}


function sortCareerItems(
  items:
    CareerItem[],
): CareerItem[] {
  return [
    ...items,
  ].sort(
    (
      a,
      b,
    ) => {
      const statusDifference =
        getCareerStatusWeight(
          b,
        ) -
        getCareerStatusWeight(
          a,
        );


      if (
        statusDifference !==
        0
      ) {
        return statusDifference;
      }


      const priorityDifference =
        getPriorityWeight(
          getCareerPriority(
            b,
          ),
        ) -
        getPriorityWeight(
          getCareerPriority(
            a,
          ),
        );


      if (
        priorityDifference !==
        0
      ) {
        return priorityDifference;
      }


      return compareDates(
        getCareerDate(
          a,
        ),
        getCareerDate(
          b,
        ),
      );
    },
  );
}


/* =========================================================
 * 22. PRIORITY LABEL
 * ======================================================= */

function getPriorityLabel(
  priority:
    string |
    null,
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
 * 23. ACTIVE LEARNING CARD
 * ======================================================= */

function LearningCard({
  item,
}: {
  item:
    LearningItem;
}) {
  const progress =
    getLearningProgress(
      item,
    );


  const provider =
    getLearningProvider(
      item,
    );


  const description =
    getLearningDescription(
      item,
    );


  const nextAction =
    getLearningNextAction(
      item,
    );


  const date =
    getLearningDate(
      item,
    );


  return (
    <article className="card">
      <div className="space-between">
        <div>
          <div className="inline">
            <span
              className={
                getLearningTypeBadgeClass(
                  item,
                )
              }
            >
              {
                getLearningTypeLabel(
                  item,
                )
              }
            </span>


            <span
              className={
                getLearningStatusBadgeClass(
                  getLearningStatus(
                    item,
                  ),
                )
              }
            >
              {
                getLearningStatusLabel(
                  getLearningStatus(
                    item,
                  ),
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
              getLearningTitle(
                item,
              )
            }
          </h3>


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
 * 24. CAREER CARD
 * ======================================================= */

function CareerCard({
  item,
}: {
  item:
    CareerItem;
}) {
  const description =
    getCareerDescription(
      item,
    );


  const nextAction =
    getCareerNextAction(
      item,
    );


  const date =
    getCareerDate(
      item,
    );


  return (
    <article className="card">
      <div className="inline">
        <span
          className={
            getCareerTypeBadgeClass(
              item,
            )
          }
        >
          {
            getCareerTypeLabel(
              item,
            )
          }
        </span>


        <span
          className={
            getCareerStatusBadgeClass(
              getCareerStatus(
                item,
              ),
            )
          }
        >
          {
            getCareerStatusLabel(
              getCareerStatus(
                item,
              ),
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
          getCareerTitle(
            item,
          )
        }
      </h3>


      {description ? (
        <p className="card__description">
          {description}
        </p>
      ) : null}


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
                التاريخ
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
 * 25. LEARNING TABLE
 * ======================================================= */

const learningColumns:
readonly DataTableColumn<LearningItem>[] = [
  {
    key:
      "title",

    header:
      "التعلم",

    render:
      (
        item,
      ) => (
        <div>
          <strong>
            {
              getLearningTitle(
                item,
              )
            }
          </strong>


          {getLearningProvider(
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
                getLearningProvider(
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
      (
        item,
      ) => (
        <span
          className={
            getLearningTypeBadgeClass(
              item,
            )
          }
        >
          {
            getLearningTypeLabel(
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
      (
        item,
      ) => (
        <span
          className={
            getLearningStatusBadgeClass(
              getLearningStatus(
                item,
              ),
            )
          }
        >
          {
            getLearningStatusLabel(
              getLearningStatus(
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
      (
        item,
      ) =>
        getPriorityLabel(
          getLearningPriority(
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
      (
        item,
      ) => (
        <span className="percentage">
          {
            formatProgress(
              getLearningProgress(
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
      (
        item,
      ) => {
        const date =
          getLearningDate(
            item,
          );


        return date
          ? formatDate(
              date,
            )
          : "—";
      },
  },
];


/* =========================================================
 * 26. CAREER TABLE
 * ======================================================= */

const careerColumns:
readonly DataTableColumn<CareerItem>[] = [
  {
    key:
      "title",

    header:
      "المسار المهني",

    render:
      (
        item,
      ) => (
        <strong>
          {
            getCareerTitle(
              item,
            )
          }
        </strong>
      ),
  },


  {
    key:
      "type",

    header:
      "النوع",

    render:
      (
        item,
      ) => (
        <span
          className={
            getCareerTypeBadgeClass(
              item,
            )
          }
        >
          {
            getCareerTypeLabel(
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
      (
        item,
      ) => (
        <span
          className={
            getCareerStatusBadgeClass(
              getCareerStatus(
                item,
              ),
            )
          }
        >
          {
            getCareerStatusLabel(
              getCareerStatus(
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
      (
        item,
      ) =>
        getPriorityLabel(
          getCareerPriority(
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
      (
        item,
      ) => {
        const date =
          getCareerDate(
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
      "next",

    header:
      "الخطوة التالية",

    render:
      (
        item,
      ) =>
        getCareerNextAction(
          item,
        ) ??
        "—",
  },
];


/* =========================================================
 * 27. PAGE
 * ======================================================= */

export default async function LearningPage() {
  await requireAuthenticatedIdentity();


  const [
    learningRows,
    careerRows,
  ] =
    await Promise.all([
      listLearningItems(),

      listCareerItems(),
    ]);


  const learningItems =
    sortLearningItems(
      learningRows,
    );


  const careerItems =
    sortCareerItems(
      careerRows,
    );


  const activeLearning =
    learningItems.filter(
      isLearningActive,
    );


  const plannedLearning =
    learningItems.filter(
      isLearningPlanned,
    );


  const completedLearning =
    learningItems.filter(
      isLearningCompleted,
    );


  const activeCareer =
    careerItems.filter(
      isCareerActive,
    );


  const achievements =
    careerItems.filter(
      isCareerAchievement,
    );


  const currentCareerFocus =
    activeCareer.filter(
      (
        item,
      ) => {
        const group =
          getCareerGroup(
            item,
          );


        return (
          group ===
            "current" ||
          group ===
            "target" ||
          group ===
            "gap" ||
          group ===
            "skill"
        );
      },
    );


  return (
    <AppShell>
      <div className="page">

        {/* =================================================
         * HEADER
         * =============================================== */}

        <PageHeader
          eyebrow="Growth OS"
          title="التطوير"
          description="تعليمك، مهاراتك ومسارك المهني في مكان واحد."
          meta={
            <span>
              {
                activeLearning.length
              }{" "}
              تعلم جاري •{" "}
              {
                activeCareer.length
              }{" "}
              عنصر مهني حالي
            </span>
          }
          action={
            <Link
              href="/career"
              className="button button--secondary"
            >
              تفاصيل المسار المهني
            </Link>
          }
        />


        {/* =================================================
         * SUMMARY
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="growth-summary-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="growth-summary-title"
                className="section-title"
              >
                وضع التطوير
              </h2>


              <p className="section-description">
                أهم ما تحتاج تعرفه عن تطورك الآن.
              </p>
            </div>
          </div>


          <div className="stats-grid">
            <StatCard
              label="تعلم جاري"
              value={
                String(
                  activeLearning.length,
                )
              }
              tone={
                activeLearning.length >
                0
                  ? "positive"
                  : "neutral"
              }
              helper="دورات، شهادات أو دراسة نشطة."
              icon="▶"
            />


            <StatCard
              label="تعلم مخطط"
              value={
                String(
                  plannedLearning.length,
                )
              }
              tone="neutral"
              helper="العناصر القادمة بعد الحالي."
              icon="+"
            />


            <StatCard
              label="مسار مهني حالي"
              value={
                String(
                  activeCareer.length,
                )
              }
              tone={
                activeCareer.length >
                0
                  ? "positive"
                  : "neutral"
              }
              helper="أدوار، أهداف، مهارات وفجوات تطوير."
              icon="◇"
            />


            <StatCard
              label="إنجازات"
              value={
                String(
                  achievements.length,
                )
              }
              tone="positive"
              helper={`${completedLearning.length} عنصر تعلم مكتمل`}
              icon="✓"
            />
          </div>
        </section>


        {/* =================================================
         * ACTIVE LEARNING
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
                أتعلم الآن
              </h2>


              <p className="section-description">
                ركز على الجاري قبل إضافة التزامات تعليمية جديدة.
              </p>
            </div>
          </div>


          {activeLearning.length >
          0 ? (
            <div className="grid grid--2">
              {activeLearning.map(
                (
                  item,
                  index,
                ) => (
                  <LearningCard
                    key={
                      readString(
                        item,
                        "id",
                      ) ??
                      `learning-${index}`
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
              compact
              icon="▶"
              title="لا يوجد تعلم نشط"
              description="استخدم زر + لإضافة الدورة أو الشهادة أو البرنامج الذي تعمل عليه الآن."
            />
          )}
        </section>


        {/* =================================================
         * CAREER FOCUS
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="career-focus-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="career-focus-title"
                className="section-title"
              >
                المسار المهني
              </h2>


              <p className="section-description">
                وضعك الحالي، هدفك المهني والمهارات التي تحتاج تطويرها.
              </p>
            </div>


            <Link
              href="/career"
              className="button button--secondary button--small"
            >
              فتح التفاصيل
            </Link>
          </div>


          {currentCareerFocus.length >
          0 ? (
            <div className="grid grid--2">
              {currentCareerFocus.map(
                (
                  item,
                  index,
                ) => (
                  <CareerCard
                    key={
                      readString(
                        item,
                        "id",
                      ) ??
                      `career-${index}`
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
              compact
              icon="◇"
              title="لا توجد أولويات مهنية حالية"
              description="أضف دورك الحالي، هدفك المهني أو مهارة تريد تطويرها من زر +."
            />
          )}
        </section>


        {/* =================================================
         * ALL LEARNING
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
                الجاري والمخطط والمكتمل في قائمة واحدة.
              </p>
            </div>
          </div>


          {learningItems.length >
          0 ? (
            <DataTable
              rows={
                learningItems
              }
              columns={
                learningColumns
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
                  `learning-row-${index}`
              }
              caption="عناصر التعلم والتطوير"
            />
          ) : (
            <EmptyState
              compact
              icon="◉"
              title="لا توجد عناصر تعلم"
              description="الدورات، الشهادات والبرامج التعليمية بتظهر هنا."
            />
          )}
        </section>


        {/* =================================================
         * ALL CAREER
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="all-career-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="all-career-title"
                className="section-title"
              >
                كل المسار المهني
              </h2>


              <p className="section-description">
                الأدوار، الأهداف المهنية، المهارات والإنجازات.
              </p>
            </div>
          </div>


          {careerItems.length >
          0 ? (
            <DataTable
              rows={
                careerItems
              }
              columns={
                careerColumns
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
                  `career-row-${index}`
              }
              caption="عناصر المسار المهني"
            />
          ) : (
            <EmptyState
              compact
              icon="◇"
              title="لا توجد بيانات مهنية"
              description="أضف دورك، هدفك المهني، مهارة أو إنجاز من زر +."
            />
          )}
        </section>


        {/* =================================================
         * PRINCIPLE
         * =============================================== */}

        <section className="page-section">
          <div
            className="alert"
            role="note"
          >
            LIFE OS يجمع التعليم والمسار المهني تحت «التطوير»، لكن يحتفظ بكل نوع منفصل تحت النظام حتى تكون البيانات دقيقة.
          </div>
        </section>

      </div>
      <section className="page-section"><div className="card" style={{ display: "flex", flexWrap: "wrap", gap: ".65rem" }}><DataEntryButton kind="learning" /><DataEntryButton kind="career" /></div></section>
    </AppShell>
  );
}


/* =========================================================
 * 28. FINAL GROWTH CONTRACT
 * ======================================================= */

/**
 * /learning is the primary V2 Growth page.
 *
 *
 * It combines:
 *
 * Learning
 * +
 * Career
 */


/* =========================================================
 * 29. LEARNING CONTRACT
 * ======================================================= */

/**
 * Learning includes:
 *
 * courses
 * certifications
 * learning paths
 * master's
 * university programs
 * other structured learning
 */


/* =========================================================
 * 30. CAREER CONTRACT
 * ======================================================= */

/**
 * Career includes:
 *
 * current role
 * target role
 * skill
 * achievement
 * milestone
 * development gap
 */


/* =========================================================
 * 31. DETAILED CAREER PAGE
 * ======================================================= */

/**
 * /career remains available as a secondary detailed page.
 *
 *
 * It is not a seventh top-level navigation destination.
 */


/* =========================================================
 * 32. DATA TRUTH
 * ======================================================= */

/**
 * LIFE OS does not silently modify:
 *
 * course progress
 * career status
 * career goals
 * skill ratings
 * completion dates
 *
 *
 * All displayed state comes from stored records.
 */


/* =========================================================
 * 33. FINAL LIFE OS V2 RULE
 * ======================================================= */

/**
 * User thinks:
 *
 * "تطوري"
 *
 *
 * LIFE OS handles the internal distinction between:
 *
 * learning
 * and
 * career
 *
 *
 * Simple outside.
 * Intelligent underneath.
 */
