import type {
  ReactNode,
} from "react";


/* =========================================================
 * 1. PROPS
 * ======================================================= */

export interface PageHeaderProps {
  /**
   * Main page title.
   */
  title: string;

  /**
   * Short supporting description.
   *
   * Keep this concise. LIFE OS pages should not begin with
   * long explanatory text.
   */
  description?: string | null;

  /**
   * Small optional context shown above the title.
   *
   * Examples:
   *
   * "هذا الشهر"
   * "المسار المهني"
   * "نظرة عامة"
   */
  eyebrow?: string | null;

  /**
   * Optional compact contextual information displayed below
   * the description.
   *
   * Examples:
   *
   * last update
   * selected period
   * status
   */
  meta?: ReactNode;

  /**
   * Optional primary page action.
   *
   * Examples:
   *
   * Add Goal
   * Add Task
   * Run Analysis
   *
   * The action itself is supplied by the page.
   */
  action?: ReactNode;
}


/* =========================================================
 * 2. PAGE HEADER
 * ======================================================= */

export function PageHeader({
  title,
  description = null,
  eyebrow = null,
  meta,
  action,
}: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="page-header__main">

        {/* ===============================================
         * TEXT
         * ============================================= */}

        <div className="page-header__content">
          {eyebrow ? (
            <p className="page-header__eyebrow">
              {eyebrow}
            </p>
          ) : null}

          <h1 className="page-header__title">
            {title}
          </h1>

          {description ? (
            <p className="page-header__description">
              {description}
            </p>
          ) : null}

          {meta ? (
            <div className="page-header__meta">
              {meta}
            </div>
          ) : null}
        </div>


        {/* ===============================================
         * ACTION
         * ============================================= */}

        {action ? (
          <div className="page-header__action">
            {action}
          </div>
        ) : null}
      </div>
    </header>
  );
}


/* =========================================================
 * 3. SERVER COMPONENT RULE
 * ======================================================= */

/**
 * PageHeader remains a Server Component.
 *
 * It has no:
 *
 * - local state
 * - browser APIs
 * - database access
 * - authentication logic
 *
 * Interactive controls may still be passed through the
 * `action` slot as isolated Client Components when needed.
 */


/* =========================================================
 * 4. TITLE HIERARCHY
 * ======================================================= */

/**
 * Each primary LIFE OS page should normally contain exactly
 * one PageHeader.
 *
 * PageHeader provides:
 *
 * <h1>
 *
 * Individual sections inside that page should then use:
 *
 * <h2>
 * <h3>
 *
 * as appropriate.
 *
 * This creates a predictable accessibility hierarchy.
 */


/* =========================================================
 * 5. CONTENT RULE
 * ======================================================= */

/**
 * Good:
 *
 * title:
 *   "المالية"
 *
 * description:
 *   "دخلك، التزاماتك، وما يتبقى لك هذا الشهر."
 *
 *
 * Avoid:
 *
 * long introductions
 * motivational paragraphs
 * duplicated statistics
 * unnecessary explanations
 *
 * Detailed information belongs in the page content.
 */


/* =========================================================
 * 6. ACTION RULE
 * ======================================================= */

/**
 * A page should normally expose no more than one primary
 * action in its header.
 *
 * Examples:
 *
 * Goals:
 *   + هدف جديد
 *
 * Tasks:
 *   + مهمة جديدة
 *
 * Assistant:
 *   no action required
 *
 * This keeps the interface focused.
 */


/* =========================================================
 * 7. MOBILE RULE
 * ======================================================= */

/**
 * On narrow screens:
 *
 * Title/content
 *      ↓
 * Action
 *
 * rather than forcing both onto one horizontal row.
 *
 * Exact responsive behavior is defined later in:
 *
 * app/globals.css
 */


/* =========================================================
 * 8. FINAL PAGE HEADER RULE
 * ======================================================= */

/**
 * PageHeader answers:
 *
 * What page is this?
 * What is this page for?
 * Is there one obvious action?
 *
 * Nothing more.
 *
 * Simple outside.
 * Intelligent underneath.
 */