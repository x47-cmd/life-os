import type {
  ReactNode,
} from "react";


/* =========================================================
 * 1. TYPES
 * ======================================================= */

export type DataTableAlignment =
  | "start"
  | "center"
  | "end";


export interface DataTableColumn<T> {
  /**
   * Stable column identifier.
   */
  key: string;

  /**
   * Column heading.
   */
  header: string;

  /**
   * Render only the information required for this column.
   */
  render: (
    row: T,
    index: number,
  ) => ReactNode;

  /**
   * Optional semantic alignment.
   *
   * "start" follows RTL/LTR direction automatically.
   */
  align?: DataTableAlignment;

  /**
   * Optional accessibility label when the visual heading is
   * intentionally very short.
   */
  ariaLabel?: string;
}


export interface DataTableProps<T> {
  /**
   * Table data.
   */
  rows: readonly T[];

  /**
   * Explicit column definitions.
   */
  columns:
    readonly DataTableColumn<T>[];

  /**
   * Stable React key for each row.
   *
   * Never use sensitive information such as email,
   * authentication tokens or private notes as a key.
   */
  getRowKey: (
    row: T,
    index: number,
  ) => string;

  /**
   * Optional accessible table caption.
   */
  caption?: string | null;

  /**
   * Text displayed when there are no rows.
   */
  emptyMessage?: string;

  /**
   * Compact spacing for dense but still readable datasets.
   */
  compact?: boolean;
}


/* =========================================================
 * 2. ALIGNMENT CLASS
 * ======================================================= */

function getAlignmentClass(
  align:
    DataTableAlignment =
      "start",
): string {
  switch (align) {
    case "center":
      return "data-table__cell--center";

    case "end":
      return "data-table__cell--end";

    case "start":
    default:
      return "data-table__cell--start";
  }
}


/* =========================================================
 * 3. DATA TABLE
 * ======================================================= */

export function DataTable<T>({
  rows,
  columns,
  getRowKey,
  caption = null,
  emptyMessage =
    "لا توجد بيانات حاليًا.",
  compact = false,
}: DataTableProps<T>) {

  /* -------------------------------------------------------
   * Empty state
   * ---------------------------------------------------- */

  if (
    rows.length === 0
  ) {
    return (
      <div
        className="data-table-empty"
        role="status"
      >
        <p className="data-table-empty__text">
          {emptyMessage}
        </p>
      </div>
    );
  }


  /* -------------------------------------------------------
   * Table
   * ---------------------------------------------------- */

  return (
    <div
      className={[
        "data-table-wrapper",
        compact
          ? "data-table-wrapper--compact"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        className="data-table-scroll"
        tabIndex={0}
        role="region"
        aria-label={
          caption ??
          "جدول بيانات"
        }
      >
        <table className="data-table">
          {caption ? (
            <caption className="data-table__caption">
              {caption}
            </caption>
          ) : null}


          {/* ===============================================
           * HEAD
           * ============================================= */}

          <thead className="data-table__head">
            <tr>
              {columns.map(
                (column) => (
                  <th
                    key={
                      column.key
                    }
                    scope="col"
                    className={[
                      "data-table__header",
                      getAlignmentClass(
                        column.align,
                      ),
                    ].join(" ")}
                    aria-label={
                      column.ariaLabel
                    }
                  >
                    {column.header}
                  </th>
                ),
              )}
            </tr>
          </thead>


          {/* ===============================================
           * BODY
           * ============================================= */}

          <tbody className="data-table__body">
            {rows.map(
              (
                row,
                rowIndex,
              ) => {
                const rowKey =
                  getRowKey(
                    row,
                    rowIndex,
                  );

                return (
                  <tr
                    key={
                      rowKey
                    }
                    className="data-table__row"
                  >
                    {columns.map(
                      (
                        column,
                      ) => (
                        <td
                          key={
                            column.key
                          }
                          className={[
                            "data-table__cell",
                            getAlignmentClass(
                              column.align,
                            ),
                          ].join(" ")}
                        >
                          {column.render(
                            row,
                            rowIndex,
                          )}
                        </td>
                      ),
                    )}
                  </tr>
                );
              },
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


/* =========================================================
 * 4. SERVER COMPONENT RULE
 * ======================================================= */

/**
 * DataTable remains a Server Component.
 *
 * It does not require:
 *
 * - useState
 * - useEffect
 * - browser APIs
 * - database access
 *
 * Interactive actions may be rendered inside a column using
 * a small isolated Client Component when needed.
 */


/* =========================================================
 * 5. DATA RESPONSIBILITY RULE
 * ======================================================= */

/**
 * DataTable displays data.
 *
 * It does NOT:
 *
 * - query Supabase
 * - calculate financial totals
 * - calculate investment returns
 * - rank priorities
 * - call AI
 * - authorize records
 *
 * Those responsibilities remain outside the presentation
 * component.
 */


/* =========================================================
 * 6. FORMATTING RULE
 * ======================================================= */

/**
 * Values should normally be formatted before rendering.
 *
 * Examples:
 *
 * Currency:
 *   formatCurrency(...)
 *
 * Percentage:
 *   formatPercent(...)
 *
 * Date:
 *   formatDate(...)
 *
 * Quantity:
 *   formatQuantity(...)
 *
 * using:
 *
 * lib/format.ts
 *
 * This keeps every LIFE OS page visually consistent.
 */


/* =========================================================
 * 7. MOBILE SAFETY
 * ======================================================= */

/**
 * Some datasets genuinely need multiple columns.
 *
 * On narrow screens the table is placed inside a controlled
 * horizontal scrolling region rather than:
 *
 * - shrinking text until unreadable
 * - breaking columns unpredictably
 * - overflowing the complete page
 *
 * Exact behavior is defined later in:
 *
 * app/globals.css
 */


/* =========================================================
 * 8. RTL RULE
 * ======================================================= */

/**
 * Alignment uses semantic:
 *
 * start
 * center
 * end
 *
 * rather than hard-coded left/right.
 *
 * Therefore the same component works correctly with the
 * Arabic RTL interface.
 */


/* =========================================================
 * 9. ACCESSIBILITY RULE
 * ======================================================= */

/**
 * Accessibility features include:
 *
 * - semantic <table>
 * - <thead> / <tbody>
 * - column headers with scope="col"
 * - optional caption
 * - keyboard-focusable overflow region
 *
 * Users must be able to understand the data without relying
 * on color alone.
 */


/* =========================================================
 * 10. TABLE DENSITY RULE
 * ======================================================= */

/**
 * LIFE OS tables should contain only useful columns.
 *
 * Good:
 *
 * Investment:
 * ticker | quantity | value | gain/loss
 *
 * Task:
 * task | priority | due date | status
 *
 *
 * Avoid exposing every database column simply because it
 * exists.
 *
 * Internal fields such as:
 *
 * user_id
 * created_at
 * updated_at
 *
 * normally do not belong in user-facing tables.
 */


/* =========================================================
 * 11. SECURITY RULE
 * ======================================================= */

/**
 * This component must never receive:
 *
 * - passwords
 * - OTP values
 * - authentication tokens
 * - API keys
 * - cookies
 * - service-role credentials
 *
 * Presentation components are never a secure place for
 * secrets.
 */


/* =========================================================
 * 12. FINAL TABLE RULE
 * ======================================================= */

/**
 * LIFE OS tables should answer:
 *
 * What do I need to compare?
 *
 * Nothing more.
 *
 * Clear columns.
 * Clear values.
 * Minimal noise.
 *
 * Simple outside.
 * Intelligent underneath.
 */