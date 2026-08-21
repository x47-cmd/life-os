import {
  APP_LOCALE,
  CURRENCY_DISPLAY_OPTIONS,
  DATE_DISPLAY_OPTIONS,
  DATE_TIME_DISPLAY_OPTIONS,
  DEFAULT_CURRENCY,
  DEFAULT_TIMEZONE,
  PERCENT_DISPLAY_OPTIONS,
  PROGRESS_MAX,
  PROGRESS_MIN,
} from "@/lib/constants";
import type {
  CurrencyCode,
  ISODate,
  ISODateTime,
  Nullable,
} from "@/lib/types";
/* =========================================================
 * 1. DISPLAY LOCALE
 * ======================================================= */
/**
 * LIFE OS uses an Arabic interface while keeping financial
 * and numeric values in familiar Latin digits.
 *
 * Example:
 *
 * 25,000
 *
 * instead of locale-dependent digit glyphs.
 */
const DISPLAY_LOCALE = `${APP_LOCALE}-u-nu-latn`;
/* =========================================================
 * 2. INTERNAL HELPERS
 * ======================================================= */
function isFiniteNumber(
  value: number,
): boolean {
  return Number.isFinite(value);
}
function parseDateOnly(
  value: ISODate,
): Date | null {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(
    Date.UTC(
      year,
      month - 1,
      day,
      12,
      0,
      0,
    ),
  );
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}
function parseDateTime(
  value: ISODateTime,
): Date | null {
  const date = new Date(value);
  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null;
  }
  return date;
}
function normalizeNegativeZero(
  value: number,
): number {
  return Object.is(value, -0)
    ? 0
    : value;
}
/* =========================================================
 * 3. GENERIC NUMBER
 * ======================================================= */
export function formatNumber(
  value: number,
  options: Intl.NumberFormatOptions = {},
): string {
  if (!isFiniteNumber(value)) {
    return "—";
  }
  return new Intl.NumberFormat(
    DISPLAY_LOCALE,
    options,
  ).format(
    normalizeNegativeZero(value),
  );
}
/* =========================================================
 * 4. INTEGER
 * ======================================================= */
export function formatInteger(
  value: number,
): string {
  return formatNumber(
    value,
    {
      maximumFractionDigits: 0,
    },
  );
}
/* =========================================================
 * 5. CURRENCY
 * ======================================================= */
export function formatCurrency(
  value: number,
  currency: CurrencyCode = DEFAULT_CURRENCY,
): string {
  if (!isFiniteNumber(value)) {
    return "—";
  }
  return new Intl.NumberFormat(
    DISPLAY_LOCALE,
    {
      ...CURRENCY_DISPLAY_OPTIONS,
      currency,
    },
  ).format(
    normalizeNegativeZero(value),
  );
}
/* =========================================================
 * 6. SIGNED CURRENCY
 * ======================================================= */
export function formatSignedCurrency(
  value: number,
  currency: CurrencyCode = DEFAULT_CURRENCY,
): string {
  if (!isFiniteNumber(value)) {
    return "—";
  }
  const normalized =
    normalizeNegativeZero(value);
  const formatted =
    formatCurrency(
      Math.abs(normalized),
      currency,
    );
  if (normalized > 0) {
    return `+${formatted}`;
  }
  if (normalized < 0) {
    return `-${formatted}`;
  }
  return formatted;
}
/* =========================================================
 * 7. COMPACT CURRENCY
 * ======================================================= */
export function formatCompactCurrency(
  value: number,
  currency: CurrencyCode = DEFAULT_CURRENCY,
): string {
  if (!isFiniteNumber(value)) {
    return "—";
  }
  return new Intl.NumberFormat(
    DISPLAY_LOCALE,
    {
      style: "currency",
      currency,
      currencyDisplay: "symbol",
      notation: "compact",
      compactDisplay: "short",
      maximumFractionDigits: 1,
    },
  ).format(
    normalizeNegativeZero(value),
  );
}
/* =========================================================
 * 8. INVESTMENT PRICE
 * ======================================================= */
export function formatPrice(
  value: number,
  currency: CurrencyCode = DEFAULT_CURRENCY,
): string {
  if (!isFiniteNumber(value)) {
    return "—";
  }
  return new Intl.NumberFormat(
    DISPLAY_LOCALE,
    {
      style: "currency",
      currency,
      currencyDisplay: "symbol",
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    },
  ).format(
    normalizeNegativeZero(value),
  );
}
/* =========================================================
 * 9. INVESTMENT QUANTITY
 * ======================================================= */
export function formatQuantity(
  value: number,
): string {
  return formatNumber(
    value,
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 8,
    },
  );
}
/* =========================================================
 * 10. PERCENT
 * ======================================================= */
/**
 * Input is already expressed as a percentage.
 *
 * Examples:
 *
 * 27   -> 27%
 * 5.5  -> 5.5%
 *
 * Do not pass 0.27 when you mean 27%.
 */
export function formatPercent(
  value: number,
): string {
  if (!isFiniteNumber(value)) {
    return "—";
  }
  return `${formatNumber(
    normalizeNegativeZero(value),
    PERCENT_DISPLAY_OPTIONS,
  )}%`;
}
/* =========================================================
 * 11. SIGNED PERCENT
 * ======================================================= */
export function formatSignedPercent(
  value: number,
): string {
  if (!isFiniteNumber(value)) {
    return "—";
  }
  const normalized =
    normalizeNegativeZero(value);
  const formatted =
    formatPercent(
      Math.abs(normalized),
    );
  if (normalized > 0) {
    return `+${formatted}`;
  }
  if (normalized < 0) {
    return `-${formatted}`;
  }
  return formatted;
}
/* =========================================================
 * 12. RATIO AS PERCENT
 * ======================================================= */
/**
 * Converts a decimal ratio to a percentage.
 *
 * Examples:
 *
 * 0.25 -> 25%
 * 1    -> 100%
 */
export function formatRatioAsPercent(
  value: number,
): string {
  if (!isFiniteNumber(value)) {
    return "—";
  }
  return formatPercent(
    value * 100,
  );
}
/* =========================================================
 * 13. PROGRESS
 * ======================================================= */
export function clampProgress(
  value: number,
): number {
  if (!isFiniteNumber(value)) {
    return PROGRESS_MIN;
  }
  return Math.min(
    PROGRESS_MAX,
    Math.max(
      PROGRESS_MIN,
      Math.round(value),
    ),
  );
}
export function formatProgress(
  value: number,
): string {
  return formatPercent(
    clampProgress(value),
  );
}
/* =========================================================
 * 14. DATE
 * ======================================================= */
export function formatDate(
  value: Nullable<ISODate>,
): string {
  if (!value) {
    return "—";
  }
  const date =
    parseDateOnly(value);
  if (!date) {
    return "—";
  }
  return new Intl.DateTimeFormat(
    DISPLAY_LOCALE,
    {
      ...DATE_DISPLAY_OPTIONS,
      timeZone: DEFAULT_TIMEZONE,
    },
  ).format(date);
}
/* =========================================================
 * 15. DATE + TIME
 * ======================================================= */
export function formatDateTime(
  value: Nullable<ISODateTime>,
): string {
  if (!value) {
    return "—";
  }
  const date =
    parseDateTime(value);
  if (!date) {
    return "—";
  }
  return new Intl.DateTimeFormat(
    DISPLAY_LOCALE,
    {
      ...DATE_TIME_DISPLAY_OPTIONS,
      timeZone: DEFAULT_TIMEZONE,
    },
  ).format(date);
}
/* =========================================================
 * 16. MONTH
 * ======================================================= */
export function formatMonth(
  value: Nullable<ISODate>,
): string {
  if (!value) {
    return "—";
  }
  const date =
    parseDateOnly(value);
  if (!date) {
    return "—";
  }
  return new Intl.DateTimeFormat(
    DISPLAY_LOCALE,
    {
      month: "long",
      year: "numeric",
      timeZone: DEFAULT_TIMEZONE,
    },
  ).format(date);
}
/* =========================================================
 * 17. SHORT DATE
 * ======================================================= */
export function formatShortDate(
  value: Nullable<ISODate>,
): string {
  if (!value) {
    return "—";
  }
  const date =
    parseDateOnly(value);
  if (!date) {
    return "—";
  }
  return new Intl.DateTimeFormat(
    DISPLAY_LOCALE,
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: DEFAULT_TIMEZONE,
    },
  ).format(date);
}
/* =========================================================
 * 18. TEXT TRUNCATION
 * ======================================================= */
export function truncateText(
  value: string,
  maxLength = 120,
): string {
  const text =
    value.trim();
  if (
    maxLength <= 0 ||
    text.length === 0
  ) {
    return "";
  }
  if (
    text.length <= maxLength
  ) {
    return text;
  }
  if (maxLength === 1) {
    return "…";
  }
  return `${text.slice(
    0,
    maxLength - 1,
  ).trimEnd()}…`;
}
/* =========================================================
 * 19. OPTIONAL TEXT
 * ======================================================= */
export function formatOptionalText(
  value: Nullable<string>,
): string {
  if (!value) {
    return "—";
  }
  const text =
    value.trim();
  return text.length > 0
    ? text
    : "—";
}
/* =========================================================
 * 20. TICKER
 * ======================================================= */
export function formatTicker(
  value: string,
): string {
  const ticker =
    value.trim().toUpperCase();
  return ticker || "—";
}
/* =========================================================
 * 21. GAIN / LOSS
 * ======================================================= */
export interface FormattedGainLoss {
  amount: string;
  percent: string;
  direction:
    | "gain"
    | "loss"
    | "flat";
}
export function formatGainLoss(
  amount: number,
  percent: Nullable<number>,
  currency: CurrencyCode = DEFAULT_CURRENCY,
): FormattedGainLoss {
  const direction:
    | "gain"
    | "loss"
    | "flat" =
    amount > 0
      ? "gain"
      : amount < 0
        ? "loss"
        : "flat";
  return {
    amount:
      formatSignedCurrency(
        amount,
        currency,
      ),
    percent:
      percent === null
        ? "—"
        : formatSignedPercent(
            percent,
          ),
    direction,
  };
}
/* =========================================================
 * 22. PORTFOLIO VALUE
 * ======================================================= */
export function formatPortfolioValue(
  value: Nullable<number>,
  currency: CurrencyCode = DEFAULT_CURRENCY,
): string {
  if (
    value === null
  ) {
    return "—";
  }
  return formatCurrency(
    value,
    currency,
  );
}
/* =========================================================
 * 23. BOOLEAN
 * ======================================================= */
export function formatBoolean(
  value: boolean,
): string {
  return value
    ? "نعم"
    : "لا";
}
/* =========================================================
 * 24. COUNT
 * ======================================================= */
export function formatCount(
  value: number,
): string {
  if (!isFiniteNumber(value)) {
    return "0";
  }
  return formatInteger(
    Math.max(
      0,
      value,
    ),
  );
}
/* =========================================================
 * 25. NULLABLE NUMBER
 * ======================================================= */
export function formatNullableNumber(
  value: Nullable<number>,
  options: Intl.NumberFormatOptions = {},
): string {
  if (value === null) {
    return "—";
  }
  return formatNumber(
    value,
    options,
  );
}
/* =========================================================
 * 26. SAFE CALCULATION DISPLAY
 * ======================================================= */
/**
 * Converts an unknown numeric calculation result into a
 * display-safe number.
 *
 * Intended only for presentation boundaries.
 *
 * Business calculations themselves should still validate
 * their inputs separately.
 */
export function toDisplayNumber(
  value: number,
  fallback = 0,
): number {
  if (!isFiniteNumber(value)) {
    return fallback;
  }
  return normalizeNegativeZero(
    value,
  );
}
/* =========================================================
 * 27. FINAL FORMATTING RULE
 * ======================================================= */
/**
 * LIFE OS formatting principles:
 *
 * - Database stores raw facts.
 * - Calculation code works with raw numbers.
 * - Formatting happens only at presentation boundaries.
 * - Never store formatted currency strings in PostgreSQL.
 * - Never send formatted numbers back into calculations.
 * - Invalid display values fail safely as "—".
 * - Financial calculations remain deterministic.
 */