import type {
  ReactNode,
} from "react";


/* =========================================================
 * 1. TYPES
 * ======================================================= */

export type StatCardTone =
  | "neutral"
  | "positive"
  | "warning"
  | "negative";


export interface StatCardProps {
  /**
   * Short label describing the metric.
   *
   * Examples:
   *
   * "الدخل الشهري"
   * "المتاح"
   * "قيمة المحفظة"
   * "المهام المتأخرة"
   */
  label: string;

  /**
   * Main displayed value.
   *
   * Prefer passing an already formatted value from
   * lib/format.ts.
   */
  value: ReactNode;

  /**
   * Optional short explanation below the value.
   */
  helper?: ReactNode;

  /**
   * Optional small icon or visual identifier.
   */
  icon?: ReactNode;

  /**
   * Semantic visual tone.
   *
   * The tone never changes the underlying value or meaning.
   */
  tone?: StatCardTone;
}


/* =========================================================
 * 2. VALID TONES
 * ======================================================= */

const VALID_TONES =
  new Set<StatCardTone>([
    "neutral",
    "positive",
    "warning",
    "negative",
  ]);


/* =========================================================
 * 3. NORMALIZE TONE
 * ======================================================= */

function normalizeTone(
  tone: StatCardTone,
): StatCardTone {
  return VALID_TONES.has(
    tone,
  )
    ? tone
    : "neutral";
}


/* =========================================================
 * 4. STAT CARD
 * ======================================================= */

export function StatCard({
  label,
  value,
  helper,
  icon,
  tone = "neutral",
}: StatCardProps) {
  const safeTone =
    normalizeTone(
      tone,
    );

  return (
    <article
      className={[
        "stat-card",
        `stat-card--${safeTone}`,
      ].join(" ")}
    >
      <div className="stat-card__header">
        <span className="stat-card__label">
          {label}
        </span>

        {icon ? (
          <span
            className="stat-card__icon"
            aria-hidden="true"
          >
            {icon}
          </span>
        ) : null}
      </div>

      <div className="stat-card__value">
        {value}
      </div>

      {helper ? (
        <div className="stat-card__helper">
          {helper}
        </div>
      ) : null}
    </article>
  );
}


/* =========================================================
 * 5. SERVER COMPONENT RULE
 * ======================================================= */

/**
 * StatCard remains a Server Component.
 *
 * It does not need:
 *
 * - useState
 * - useEffect
 * - browser APIs
 * - database access
 *
 * Pages calculate and format their values before passing them
 * to this presentational component.
 */


/* =========================================================
 * 6. FORMATTING RULE
 * ======================================================= */

/**
 * StatCard does NOT format:
 *
 * - currency
 * - percentages
 * - quantities
 * - dates
 *
 * Formatting belongs in:
 *
 * lib/format.ts
 *
 * Example:
 *
 * <StatCard
 *   label="المتاح"
 *   value={formatCurrency(amount)}
 * />
 *
 * This keeps financial presentation consistent across
 * LIFE OS.
 */


/* =========================================================
 * 7. TONE RULE
 * ======================================================= */

/**
 * Tone meanings:
 *
 * neutral
 *   Normal informational metric.
 *
 * positive
 *   Clearly favorable state.
 *
 * warning
 *   Needs attention but is not necessarily a problem.
 *
 * negative
 *   Clearly unfavorable or problematic state.
 *
 *
 * Do not use tone merely for decoration.
 *
 * Example:
 *
 * available_amount > 0
 *   may be positive
 *
 * available_amount < 0
 *   may be negative
 *
 * The page owns that deterministic decision.
 */


/* =========================================================
 * 8. ACCESSIBILITY RULE
 * ======================================================= */

/**
 * Color must never be the only way a user understands the
 * meaning of a metric.
 *
 * The label, value and optional helper text must make the
 * state understandable independently of visual tone.
 *
 * Decorative icons are hidden from assistive technology.
 */


/* =========================================================
 * 9. DASHBOARD DENSITY RULE
 * ======================================================= */

/**
 * LIFE OS should not become a wall of statistics.
 *
 * Stat cards are reserved for genuinely useful headline
 * metrics.
 *
 * Good:
 *
 * - monthly income
 * - available amount
 * - portfolio value
 * - active goals
 *
 * Avoid:
 *
 * - duplicating the same number in several cards
 * - displaying every database metric
 * - decorative statistics with no decision value
 */


/* =========================================================
 * 10. MOBILE RULE
 * ======================================================= */

/**
 * StatCard must remain readable in a single-column mobile
 * layout.
 *
 * Grid behavior, spacing, typography and responsive sizing
 * are centralized later in:
 *
 * app/globals.css
 */


/* =========================================================
 * 11. FINAL STAT CARD RULE
 * ======================================================= */

/**
 * One card.
 * One metric.
 * One clear meaning.
 *
 * No unnecessary complexity.
 *
 * Simple outside.
 * Intelligent underneath.
 */