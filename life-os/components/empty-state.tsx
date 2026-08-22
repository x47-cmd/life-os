import type {
  ReactNode,
} from "react";


/* =========================================================
 * 1. PROPS
 * ======================================================= */

export interface EmptyStateProps {
  /**
   * Main empty-state title.
   *
   * Examples:
   *
   * "لا توجد أهداف بعد"
   * "لا توجد مهام"
   * "لا توجد استثمارات مسجلة"
   */
  title: string;

  /**
   * Short explanation of what the user can do next.
   */
  description?: string | null;

  /**
   * Optional decorative icon.
   *
   * Keep icons simple and secondary to the message.
   */
  icon?: ReactNode;

  /**
   * Optional single primary action.
   *
   * Examples:
   *
   * + هدف جديد
   * + مهمة جديدة
   * إضافة استثمار
   */
  action?: ReactNode;

  /**
   * Optional compact mode for use inside cards or tables.
   */
  compact?: boolean;
}


/* =========================================================
 * 2. EMPTY STATE
 * ======================================================= */

export function EmptyState({
  title,
  description = null,
  icon,
  action,
  compact = false,
}: EmptyStateProps) {
  return (
    <section
      className={[
        "empty-state",
        compact
          ? "empty-state--compact"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-live="polite"
    >
      {icon ? (
        <div
          className="empty-state__icon"
          aria-hidden="true"
        >
          {icon}
        </div>
      ) : null}

      <div className="empty-state__content">
        <h2 className="empty-state__title">
          {title}
        </h2>

        {description ? (
          <p className="empty-state__description">
            {description}
          </p>
        ) : null}
      </div>

      {action ? (
        <div className="empty-state__action">
          {action}
        </div>
      ) : null}
    </section>
  );
}


/* =========================================================
 * 3. SERVER COMPONENT RULE
 * ======================================================= */

/**
 * EmptyState remains a Server Component.
 *
 * It contains no:
 *
 * - local state
 * - effects
 * - browser APIs
 * - database access
 * - AI access
 *
 * Interactive actions may still be passed in as isolated
 * Client Components when required.
 */


/* =========================================================
 * 4. EMPTY STATE PURPOSE
 * ======================================================= */

/**
 * An empty state should explain:
 *
 * What is missing?
 *      ↓
 * Why the page looks empty
 *
 * What can I do?
 *      ↓
 * One clear next action
 *
 *
 * It should NOT feel like:
 *
 * - an error
 * - a warning
 * - a system failure
 *
 * unless the page genuinely represents one of those states.
 */


/* =========================================================
 * 5. CONTENT RULE
 * ======================================================= */

/**
 * Good:
 *
 * title:
 *   "لا توجد أهداف بعد"
 *
 * description:
 *   "أضف أول هدف ليبدأ LIFE OS بمتابعة تقدمك."
 *
 * action:
 *   "+ هدف جديد"
 *
 *
 * Avoid:
 *
 * long paragraphs
 * multiple competing actions
 * motivational filler
 * unnecessary technical explanations
 */


/* =========================================================
 * 6. ACTION RULE
 * ======================================================= */

/**
 * Empty states should normally contain:
 *
 * 0 or 1 primary action.
 *
 * Not:
 *
 * 3 buttons
 * 5 links
 * multiple decisions
 *
 * The objective is to make the next step obvious.
 */


/* =========================================================
 * 7. ICON RULE
 * ======================================================= */

/**
 * Icons are optional.
 *
 * They are decorative only and therefore receive:
 *
 * aria-hidden="true"
 *
 * Meaning must always remain understandable from the text.
 */


/* =========================================================
 * 8. COMPACT MODE
 * ======================================================= */

/**
 * compact=false
 *
 * Suitable for a primary page empty state.
 *
 *
 * compact=true
 *
 * Suitable for:
 *
 * - dashboard sections
 * - cards
 * - tables
 * - smaller content regions
 *
 * Exact spacing is defined in:
 *
 * app/globals.css
 */


/* =========================================================
 * 9. SECURITY RULE
 * ======================================================= */

/**
 * EmptyState must never reveal internal failure details.
 *
 * Avoid displaying:
 *
 * - database error messages
 * - stack traces
 * - authentication internals
 * - API errors
 * - provider details
 * - secrets
 *
 * Technical failures should be transformed into safe
 * user-facing messages by the responsible application layer.
 */


/* =========================================================
 * 10. FINAL EMPTY STATE RULE
 * ======================================================= */

/**
 * Empty does not mean broken.
 *
 * LIFE OS should make empty screens feel intentional:
 *
 * Clear state
 *      ↓
 * Short explanation
 *      ↓
 * One obvious next step
 *
 * Simple outside.
 * Intelligent underneath.
 */