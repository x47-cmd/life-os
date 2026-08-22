import type {
  ReactNode,
} from "react";


/* =========================================================
 * 1. TYPES
 * ======================================================= */

export type PriorityCardLevel =
  | "high"
  | "medium"
  | "low";


export interface PriorityCardProps {
  /**
   * Priority position on the dashboard.
   *
   * LIFE OS normally displays:
   *
   * 1
   * 2
   * 3
   */
  rank?: number | null;

  /**
   * Main priority title.
   */
  title: string;

  /**
   * Short explanation of why this matters.
   */
  description?: string | null;

  /**
   * The practical next step.
   */
  nextAction?: string | null;

  /**
   * Semantic priority level.
   */
  priority?: PriorityCardLevel;

  /**
   * Optional source label.
   *
   * Examples:
   *
   * "المالية"
   * "مشروع"
   * "هدف"
   * "مهمة"
   * "التعلم"
   */
  sourceLabel?: string | null;

  /**
   * Optional compact contextual information.
   *
   * Examples:
   *
   * due date
   * target date
   * project status
   */
  meta?: ReactNode;
}


/* =========================================================
 * 2. PRIORITY LABELS
 * ======================================================= */

const PRIORITY_LABELS:
  Record<
    PriorityCardLevel,
    string
  > = {
    high:
      "عالية",

    medium:
      "متوسطة",

    low:
      "منخفضة",
  };


/* =========================================================
 * 3. RANK NORMALIZATION
 * ======================================================= */

function normalizeRank(
  rank: number | null | undefined,
): number | null {
  if (
    rank === null ||
    rank === undefined
  ) {
    return null;
  }

  if (
    !Number.isInteger(rank) ||
    rank < 1 ||
    rank > 3
  ) {
    return null;
  }

  return rank;
}


/* =========================================================
 * 4. PRIORITY CARD
 * ======================================================= */

export function PriorityCard({
  rank,
  title,
  description = null,
  nextAction = null,
  priority = "medium",
  sourceLabel = null,
  meta,
}: PriorityCardProps) {
  const safeRank =
    normalizeRank(
      rank,
    );

  return (
    <article
      className={[
        "priority-card",
        `priority-card--${priority}`,
      ].join(" ")}
    >
      <div className="priority-card__header">

        <div className="priority-card__identity">
          {safeRank !== null ? (
            <span
              className="priority-card__rank"
              aria-label={
                `الأولوية رقم ${safeRank}`
              }
            >
              {safeRank}
            </span>
          ) : null}

          <div className="priority-card__heading">
            {sourceLabel ? (
              <span className="priority-card__source">
                {sourceLabel}
              </span>
            ) : null}

            <h2 className="priority-card__title">
              {title}
            </h2>
          </div>
        </div>


        <span
          className={[
            "priority-card__level",
            `priority-card__level--${priority}`,
          ].join(" ")}
        >
          {
            PRIORITY_LABELS[
              priority
            ]
          }
        </span>
      </div>


      {/* ===================================================
       * WHY IT MATTERS
       * ================================================= */}

      {description ? (
        <p className="priority-card__description">
          {description}
        </p>
      ) : null}


      {/* ===================================================
       * NEXT ACTION
       * ================================================= */}

      {nextAction ? (
        <div className="priority-card__next">
          <span className="priority-card__next-label">
            الخطوة التالية
          </span>

          <p className="priority-card__next-value">
            {nextAction}
          </p>
        </div>
      ) : null}


      {/* ===================================================
       * META
       * ================================================= */}

      {meta ? (
        <div className="priority-card__meta">
          {meta}
        </div>
      ) : null}
    </article>
  );
}


/* =========================================================
 * 5. SERVER COMPONENT RULE
 * ======================================================= */

/**
 * PriorityCard remains a Server Component.
 *
 * It does not contain:
 *
 * - state
 * - effects
 * - browser APIs
 * - database access
 * - OpenAI calls
 *
 * The Dashboard determines the priorities before passing
 * them into this component.
 */


/* =========================================================
 * 6. PRIORITY ENGINE RULE
 * ======================================================= */

/**
 * This component does NOT decide what is important.
 *
 * Priority selection belongs to LIFE OS logic.
 *
 * Current deterministic Dashboard priority engine considers:
 *
 * - financial pressure
 * - overdue tasks
 * - high-priority tasks
 * - blocked projects
 * - high-priority projects
 * - high-priority goals
 * - high-priority learning
 *
 * AI may later add advice, but the visual component itself
 * never ranks personal decisions.
 */


/* =========================================================
 * 7. TOP THREE RULE
 * ======================================================= */

/**
 * LIFE OS Dashboard should normally show a maximum of:
 *
 * 3 priorities
 *
 * Not:
 *
 * 8
 * 12
 * 20
 *
 * If everything is a priority, nothing is a priority.
 *
 * The Dashboard data layer already enforces the top-three
 * principle.
 */


/* =========================================================
 * 8. CONTENT RULE
 * ======================================================= */

/**
 * Each priority should answer:
 *
 * What?
 *      → title
 *
 * Why?
 *      → description
 *
 * What next?
 *      → nextAction
 *
 *
 * Good example:
 *
 * title:
 *   "راجع التوزيع المالي"
 *
 * description:
 *   "التوزيعات الشهرية تتجاوز الدخل."
 *
 * nextAction:
 *   "خفض أو إعادة ترتيب أحد البنود."
 *
 *
 * Avoid:
 *
 * long paragraphs
 * generic motivation
 * repeated statistics
 * unnecessary explanation
 */


/* =========================================================
 * 9. PRIORITY LEVEL RULE
 * ======================================================= */

/**
 * high
 *   Requires meaningful attention.
 *
 * medium
 *   Important but not immediately critical.
 *
 * low
 *   Useful to remember, but not urgent.
 *
 * Visual tone should support this hierarchy without turning
 * the interface into an aggressive red/yellow dashboard.
 */


/* =========================================================
 * 10. ACCESSIBILITY RULE
 * ======================================================= */

/**
 * Priority meaning must never depend on color alone.
 *
 * The card displays the textual Arabic priority label:
 *
 * عالية
 * متوسطة
 * منخفضة
 *
 * Rank is also exposed through an accessible label.
 */


/* =========================================================
 * 11. MOBILE RULE
 * ======================================================= */

/**
 * On iPhone:
 *
 * rank + title
 *      ↓
 * short reason
 *      ↓
 * next action
 *
 * No horizontal layout should be required to understand the
 * priority.
 *
 * Responsive styling is defined later in:
 *
 * app/globals.css
 */


/* =========================================================
 * 12. FINAL PRIORITY CARD RULE
 * ======================================================= */

/**
 * LIFE OS should not merely tell the owner what exists.
 *
 * It should make clear:
 *
 * What matters now?
 * Why?
 * What should happen next?
 *
 *
 * Maximum:
 *
 * Top 3.
 *
 * Simple outside.
 * Intelligent underneath.
 */