import type {
  InvestmentMarketPricePoint,
} from "@/lib/investment-intelligence";

import type {
  InvestmentAIEvidenceInsert,
} from "@/lib/investment-intelligence-data";

import type {
  InvestmentAsset,
  JsonValue,
} from "@/lib/types";


/* =========================================================
 * LIFE OS
 * LIFE INVEST AI
 * MARKET DATA GATEWAY
 *
 * Provider V1:
 *
 * Twelve Data
 *
 *
 * Responsibilities:
 *
 * - historical daily prices
 * - latest quote
 * - quarterly income statement evidence
 * - official company press releases
 * - instrument identity verification
 * - market / currency validation
 * - safe evidence normalization
 *
 *
 * This module does NOT:
 *
 * - call LIFE Invest AI
 * - calculate final investment scores
 * - place trades
 * - connect to brokers
 * - write Supabase rows
 * - use private LIFE OS data beyond the supplied asset
 *
 *
 * Missing market data stays missing.
 *
 * No fabricated fallback prices.
 * No guessed financial results.
 * ======================================================= */


/* =========================================================
 * 1. PROVIDER
 * ======================================================= */

export const INVESTMENT_MARKET_DATA_PROVIDER =
  "Twelve Data";


export const TWELVE_DATA_BASE_URL =
  "https://api.twelvedata.com";


/* =========================================================
 * 2. DEFAULTS
 * ======================================================= */

export const DEFAULT_MARKET_HISTORY_SIZE =
  260;


export const DEFAULT_FUNDAMENTAL_PERIODS =
  4;


export const DEFAULT_PRESS_RELEASE_COUNT =
  5;


const MAX_MARKET_HISTORY_SIZE =
  1000;


const REQUEST_TIMEOUT_MS =
  12_000;


const MAX_REQUEST_ATTEMPTS =
  2;


/* =========================================================
 * 3. EVIDENCE TYPE
 * ======================================================= */

export type InvestmentMarketEvidence =
  Omit<
    InvestmentAIEvidenceInsert,
    "analysis_id"
  >;


/* =========================================================
 * 4. ERROR CODES
 * ======================================================= */

export type InvestmentMarketDataErrorCode =
  | "CONFIGURATION_MISSING"
  | "INVALID_ASSET"
  | "INVALID_PROVIDER_SYMBOL"
  | "REQUEST_FAILED"
  | "RATE_LIMITED"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "DATA_NOT_FOUND"
  | "INVALID_RESPONSE"
  | "INSTRUMENT_MISMATCH"
  | "CURRENCY_MISMATCH"
  | "PRICE_HISTORY_UNAVAILABLE";


/* =========================================================
 * 5. ERROR
 * ======================================================= */

export class InvestmentMarketDataError
  extends Error {

  readonly code:
    InvestmentMarketDataErrorCode;

  readonly httpStatus:
    number | null;


  constructor(
    code:
      InvestmentMarketDataErrorCode,

    details:
      string | null =
      null,

    httpStatus:
      number | null =
      null,
  ) {
    const messages:
      Record<
        InvestmentMarketDataErrorCode,
        string
      > = {

        CONFIGURATION_MISSING:
          "مفتاح مزود بيانات السوق غير مضبوط.",

        INVALID_ASSET:
          "بيانات الأصل الاستثماري غير صالحة.",

        INVALID_PROVIDER_SYMBOL:
          "رمز الأصل غير صالح لمزود بيانات السوق.",

        REQUEST_FAILED:
          "تعذر الاتصال بمزود بيانات السوق.",

        RATE_LIMITED:
          "تم الوصول إلى حد طلبات بيانات السوق مؤقتًا.",

        UNAUTHORIZED:
          "مفتاح بيانات السوق غير صالح.",

        FORBIDDEN:
          "الخطة الحالية لا تسمح بهذا النوع من بيانات السوق.",

        DATA_NOT_FOUND:
          "لم تتوفر بيانات لهذا الأصل من مزود السوق.",

        INVALID_RESPONSE:
          "رجع مزود بيانات السوق بيانات غير صالحة.",

        INSTRUMENT_MISMATCH:
          "بيانات مزود السوق لا تطابق الأصل المطلوب.",

        CURRENCY_MISMATCH:
          "عملة بيانات السوق لا تطابق عملة الأصل.",

        PRICE_HISTORY_UNAVAILABLE:
          "لا يتوفر تاريخ سعري كافٍ لهذا الأصل.",
      };


    super(
      details
        ? `${messages[code]} ${details}`
        : messages[code],
    );


    this.name =
      "InvestmentMarketDataError";


    this.code =
      code;


    this.httpStatus =
      httpStatus;
  }
}


/* =========================================================
 * 6. PROVIDER MARKET IDENTIFIER
 * ======================================================= */

export interface InvestmentProviderMarket {
  market:
    string;

  mic_code:
    string | null;

  exchange:
    string | null;
}


/* =========================================================
 * 7. UAE + COMMON MARKET MAP
 * ======================================================= */

/**
 * MIC codes are preferred where we know them because they
 * reduce ticker ambiguity.
 *
 *
 * UAE:
 *
 * ADX → XADS
 * DFM → XDFM
 */
const MARKET_MIC_CODES:
  Readonly<
    Record<
      string,
      string
    >
  > = {

    ADX:
      "XADS",

    XADS:
      "XADS",

    DFM:
      "XDFM",

    XDFM:
      "XDFM",

    NASDAQ:
      "XNAS",

    XNAS:
      "XNAS",

    NYSE:
      "XNYS",

    XNYS:
      "XNYS",

    LSE:
      "XLON",

    XLON:
      "XLON",

    TADAWUL:
      "XSAU",

    SAUDI:
      "XSAU",

    XSAU:
      "XSAU",
  };


/* =========================================================
 * 8. QUOTE
 * ======================================================= */

export interface InvestmentMarketQuote {
  symbol:
    string;

  name:
    string | null;

  exchange:
    string | null;

  mic_code:
    string | null;

  currency:
    string;

  datetime:
    string | null;

  open:
    number | null;

  high:
    number | null;

  low:
    number | null;

  close:
    number;

  previous_close:
    number | null;

  change:
    number | null;

  percent_change:
    number | null;

  volume:
    number | null;
}


/* =========================================================
 * 9. FUNDAMENTAL PERIOD
 * ======================================================= */

export interface InvestmentIncomeStatementPeriod {
  fiscal_date:
    string;

  quarter:
    number | null;

  year:
    number | null;

  sales:
    number | null;

  gross_profit:
    number | null;

  operating_income:
    number | null;

  pretax_income:
    number | null;

  net_income:
    number | null;

  eps_basic:
    number | null;

  eps_diluted:
    number | null;

  ebit:
    number | null;

  ebitda:
    number | null;
}


/* =========================================================
 * 10. PRESS RELEASE
 * ======================================================= */

export interface InvestmentPressRelease {
  id:
    string | null;

  datetime:
    string;

  title:
    string;

  body:
    string;
}


/* =========================================================
 * 11. MARKET DATA BUNDLE
 * ======================================================= */

export interface InvestmentMarketDataBundle {
  provider:
    typeof INVESTMENT_MARKET_DATA_PROVIDER;

  provider_market:
    InvestmentProviderMarket;

  fetched_at:
    string;

  reference_price:
    number;

  reference_price_source:
    "quote" |
    "time_series";

  currency:
    string;

  quote:
    InvestmentMarketQuote |
    null;

  price_history:
    InvestmentMarketPricePoint[];

  income_statements:
    InvestmentIncomeStatementPeriod[];

  press_releases:
    InvestmentPressRelease[];

  evidence:
    InvestmentMarketEvidence[];

  warnings:
    string[];
}


/* =========================================================
 * 12. FETCH OPTIONS
 * ======================================================= */

export interface FetchInvestmentMarketDataOptions {
  history_size?:
    number;

  include_fundamentals?:
    boolean;

  include_press_releases?:
    boolean;
}


/* =========================================================
 * 13. RECORD GUARD
 * ======================================================= */

function isRecord(
  value:
    unknown,
): value is Record<string, unknown> {
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


/* =========================================================
 * 14. API KEY
 * ======================================================= */

/**
 * Kept server-only.
 *
 * A later environment configuration file will formally add
 * this variable to the LIFE OS environment contract.
 */
function getTwelveDataApiKey():
string {
  if (
    typeof window !==
    "undefined"
  ) {
    throw new InvestmentMarketDataError(
      "CONFIGURATION_MISSING",
    );
  }


  const value =
    process.env
      .TWELVE_DATA_API_KEY
      ?.trim();


  if (
    !value ||
    value.length <
      8
  ) {
    throw new InvestmentMarketDataError(
      "CONFIGURATION_MISSING",
    );
  }


  return value;
}


/* =========================================================
 * 15. ASSET VALIDATION
 * ======================================================= */

function validateAsset(
  asset:
    InvestmentAsset,
): void {
  if (
    asset.ticker
      .trim()
      .length ===
      0 ||
    asset.market
      .trim()
      .length ===
      0 ||
    !/^[A-Z]{3}$/.test(
      asset.currency
        .trim()
        .toUpperCase(),
    )
  ) {
    throw new InvestmentMarketDataError(
      "INVALID_ASSET",
    );
  }
}


/* =========================================================
 * 16. MARKET RESOLUTION
 * ======================================================= */

export function resolveInvestmentProviderMarket(
  market:
    string,
): InvestmentProviderMarket {
  const normalized =
    market
      .trim()
      .toUpperCase();


  if (
    normalized.length ===
    0
  ) {
    throw new InvestmentMarketDataError(
      "INVALID_ASSET",
    );
  }


  const micCode =
    MARKET_MIC_CODES[
      normalized
    ] ??
    (
      /^X[A-Z0-9]{3}$/.test(
        normalized,
      )
        ? normalized
        : null
    );


  return {
    market:
      normalized,

    mic_code:
      micCode,

    exchange:
      micCode ===
      null
        ? normalized
        : null,
  };
}


/* =========================================================
 * 17. PROVIDER SYMBOL
 * ======================================================= */

function normalizeProviderSymbol(
  ticker:
    string,
): string {
  const symbol =
    ticker
      .trim()
      .toUpperCase();


  if (
    symbol.length ===
      0 ||
    symbol.length >
      40 ||
    !/^[A-Z0-9._/-]+$/.test(
      symbol,
    )
  ) {
    throw new InvestmentMarketDataError(
      "INVALID_PROVIDER_SYMBOL",
    );
  }


  return symbol;
}


/* =========================================================
 * 18. URL
 * ======================================================= */

function buildTwelveDataUrl(
  endpoint:
    string,

  parameters:
    Record<
      string,
      string |
      number |
      null |
      undefined
    >,
): URL {
  const url =
    new URL(
      endpoint,
      TWELVE_DATA_BASE_URL,
    );


  for (
    const [
      key,
      value,
    ] of
      Object.entries(
        parameters,
      )
  ) {
    if (
      value ===
        null ||
      value ===
        undefined ||
      String(
        value,
      ).length ===
        0
    ) {
      continue;
    }


    url.searchParams.set(
      key,
      String(
        value,
      ),
    );
  }


  return url;
}


/* =========================================================
 * 19. PROVIDER ERROR BODY
 * ======================================================= */

function getProviderErrorMessage(
  value:
    unknown,
): string | null {
  if (
    !isRecord(
      value,
    )
  ) {
    return null;
  }


  const message =
    value.message;


  return typeof message ===
    "string"
      ? message
          .trim()
          .slice(
            0,
            500,
          )
      : null;
}


/* =========================================================
 * 20. HTTP ERROR
 * ======================================================= */

function throwProviderHttpError(
  status:
    number,

  body:
    unknown,
): never {
  const details =
    getProviderErrorMessage(
      body,
    );


  if (
    status ===
    401
  ) {
    throw new InvestmentMarketDataError(
      "UNAUTHORIZED",
      details,
      status,
    );
  }


  if (
    status ===
    403
  ) {
    throw new InvestmentMarketDataError(
      "FORBIDDEN",
      details,
      status,
    );
  }


  if (
    status ===
    404
  ) {
    throw new InvestmentMarketDataError(
      "DATA_NOT_FOUND",
      details,
      status,
    );
  }


  if (
    status ===
    429
  ) {
    throw new InvestmentMarketDataError(
      "RATE_LIMITED",
      details,
      status,
    );
  }


  throw new InvestmentMarketDataError(
    "REQUEST_FAILED",
    details,
    status,
  );
}


/* =========================================================
 * 21. TRANSIENT STATUS
 * ======================================================= */

function isTransientStatus(
  status:
    number,
): boolean {
  return (
    status ===
      429 ||
    status ===
      500 ||
    status ===
      502 ||
    status ===
      503 ||
    status ===
      504
  );
}


/* =========================================================
 * 22. WAIT
 * ======================================================= */

async function wait(
  milliseconds:
    number,
): Promise<void> {
  await new Promise<void>(
    (
      resolve,
    ) => {
      setTimeout(
        resolve,
        milliseconds,
      );
    },
  );
}


/* =========================================================
 * 23. TWELVE DATA REQUEST
 * ======================================================= */

async function requestTwelveData(
  endpoint:
    string,

  parameters:
    Record<
      string,
      string |
      number |
      null |
      undefined
    >,
): Promise<unknown> {
  const apiKey =
    getTwelveDataApiKey();


  const url =
    buildTwelveDataUrl(
      endpoint,
      parameters,
    );


  for (
    let attempt =
      1;
    attempt <=
      MAX_REQUEST_ATTEMPTS;
    attempt +=
      1
  ) {
    const controller =
      new AbortController();


    const timeout =
      setTimeout(
        () => {
          controller.abort();
        },
        REQUEST_TIMEOUT_MS,
      );


    try {
      const response =
        await fetch(
          url,
          {
            method:
              "GET",

            headers: {
              Accept:
                "application/json",

              Authorization:
                `apikey ${apiKey}`,
            },

            cache:
              "no-store",

            signal:
              controller.signal,
          },
        );


      let body:
        unknown =
        null;


      try {
        body =
          await response.json();
      } catch {
        body =
          null;
      }


      if (
        response.ok
      ) {
        if (
          isRecord(
            body,
          ) &&
          body.status ===
            "error"
        ) {
          throw new InvestmentMarketDataError(
            "INVALID_RESPONSE",
            getProviderErrorMessage(
              body,
            ),
            response.status,
          );
        }


        return body;
      }


      if (
        isTransientStatus(
          response.status,
        ) &&
        attempt <
          MAX_REQUEST_ATTEMPTS
      ) {
        await wait(
          350 *
          attempt,
        );


        continue;
      }


      throwProviderHttpError(
        response.status,
        body,
      );
    } catch (
      error
    ) {
      if (
        error instanceof
        InvestmentMarketDataError
      ) {
        throw error;
      }


      if (
        attempt <
        MAX_REQUEST_ATTEMPTS
      ) {
        await wait(
          350 *
          attempt,
        );


        continue;
      }


      throw new InvestmentMarketDataError(
        "REQUEST_FAILED",
      );
    } finally {
      clearTimeout(
        timeout,
      );
    }
  }


  throw new InvestmentMarketDataError(
    "REQUEST_FAILED",
  );
}


/* =========================================================
 * 24. OPTIONAL REQUEST
 * ======================================================= */

async function requestOptionalTwelveData(
  endpoint:
    string,

  parameters:
    Record<
      string,
      string |
      number |
      null |
      undefined
    >,

  warningLabel:
    string,

  warnings:
    string[],
): Promise<unknown | null> {
  try {
    return await requestTwelveData(
      endpoint,
      parameters,
    );
  } catch (
    error
  ) {
    if (
      error instanceof
      InvestmentMarketDataError
    ) {
      warnings.push(
        `${warningLabel}: ${error.message}`,
      );


      return null;
    }


    warnings.push(
      `${warningLabel}: تعذر تحميل البيانات.`,
    );


    return null;
  }
}


/* =========================================================
 * 25. NUMBER PARSER
 * ======================================================= */

function parseNullableNumber(
  value:
    unknown,
): number | null {
  if (
    value ===
      null ||
    value ===
      undefined ||
    value ===
      ""
  ) {
    return null;
  }


  if (
    typeof value ===
    "number"
  ) {
    return Number.isFinite(
      value,
    )
      ? value
      : null;
  }


  if (
    typeof value ===
    "string"
  ) {
    const parsed =
      Number(
        value,
      );


    return Number.isFinite(
      parsed,
    )
      ? parsed
      : null;
  }


  return null;
}


/* =========================================================
 * 26. POSITIVE NUMBER
 * ======================================================= */

function parsePositiveNumber(
  value:
    unknown,
): number | null {
  const parsed =
    parseNullableNumber(
      value,
    );


  return (
    parsed !==
      null &&
    parsed >
      0
  )
    ? parsed
    : null;
}


/* =========================================================
 * 27. STRING PARSER
 * ======================================================= */

function parseNullableString(
  value:
    unknown,
): string | null {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }


  const normalized =
    value.trim();


  return normalized.length >
    0
      ? normalized
      : null;
}


/* =========================================================
 * 28. ISO DATETIME
 * ======================================================= */

function normalizeDateTime(
  value:
    unknown,
): string | null {
  const raw =
    parseNullableString(
      value,
    );


  if (
    !raw
  ) {
    return null;
  }


  const timestamp =
    Date.parse(
      raw,
    );


  if (
    !Number.isFinite(
      timestamp,
    )
  ) {
    return null;
  }


  return new Date(
    timestamp,
  ).toISOString();
}


/* =========================================================
 * 29. SAFE DATE
 * ======================================================= */

function normalizeDate(
  value:
    unknown,
): string | null {
  const raw =
    parseNullableString(
      value,
    );


  if (
    !raw
  ) {
    return null;
  }


  const match =
    raw.match(
      /^(\d{4}-\d{2}-\d{2})/,
    );


  return match?.[1] ??
    null;
}


/* =========================================================
 * 30. HISTORY SIZE
 * ======================================================= */

function normalizeHistorySize(
  value:
    number |
    undefined,
): number {
  if (
    value ===
    undefined
  ) {
    return DEFAULT_MARKET_HISTORY_SIZE;
  }


  if (
    !Number.isInteger(
      value,
    )
  ) {
    return DEFAULT_MARKET_HISTORY_SIZE;
  }


  return Math.max(
    60,
    Math.min(
      value,
      MAX_MARKET_HISTORY_SIZE,
    ),
  );
}


/* =========================================================
 * 31. PROVIDER PARAMETERS
 * ======================================================= */

function buildInstrumentParameters(
  asset:
    InvestmentAsset,

  providerMarket:
    InvestmentProviderMarket,
): Record<
  string,
  string
> {
  const parameters:
    Record<
      string,
      string
    > = {

      symbol:
        normalizeProviderSymbol(
          asset.ticker,
        ),
  };


  if (
    providerMarket.mic_code
  ) {
    parameters.mic_code =
      providerMarket.mic_code;
  } else if (
    providerMarket.exchange
  ) {
    parameters.exchange =
      providerMarket.exchange;
  }


  return parameters;
}


/* =========================================================
 * 32. TIME SERIES META
 * ======================================================= */

interface TimeSeriesMeta {
  symbol:
    string | null;

  currency:
    string | null;

  exchange:
    string | null;

  mic_code:
    string | null;
}


/* =========================================================
 * 33. PARSE TIME SERIES META
 * ======================================================= */

function parseTimeSeriesMeta(
  body:
    unknown,
): TimeSeriesMeta {
  if (
    !isRecord(
      body,
    ) ||
    !isRecord(
      body.meta,
    )
  ) {
    return {
      symbol:
        null,

      currency:
        null,

      exchange:
        null,

      mic_code:
        null,
    };
  }


  return {
    symbol:
      parseNullableString(
        body.meta.symbol,
      ),

    currency:
      parseNullableString(
        body.meta.currency,
      )
        ?.toUpperCase() ??
      null,

    exchange:
      parseNullableString(
        body.meta.exchange,
      ),

    mic_code:
      parseNullableString(
        body.meta.mic_code,
      )
        ?.toUpperCase() ??
      null,
  };
}


/* =========================================================
 * 34. VERIFY INSTRUMENT
 * ======================================================= */

function verifyInstrumentIdentity(
  asset:
    InvestmentAsset,

  providerMarket:
    InvestmentProviderMarket,

  meta:
    TimeSeriesMeta,
): void {
  const expectedSymbol =
    normalizeProviderSymbol(
      asset.ticker,
    );


  if (
    meta.symbol &&
    meta.symbol
      .toUpperCase() !==
      expectedSymbol
  ) {
    throw new InvestmentMarketDataError(
      "INSTRUMENT_MISMATCH",
    );
  }


  if (
    providerMarket.mic_code &&
    meta.mic_code &&
    providerMarket.mic_code !==
      meta.mic_code
  ) {
    throw new InvestmentMarketDataError(
      "INSTRUMENT_MISMATCH",
    );
  }


  const expectedCurrency =
    asset.currency
      .trim()
      .toUpperCase();


  if (
    meta.currency &&
    meta.currency !==
      expectedCurrency
  ) {
    throw new InvestmentMarketDataError(
      "CURRENCY_MISMATCH",
    );
  }
}


/* =========================================================
 * 35. FETCH PRICE HISTORY
 * ======================================================= */

async function fetchPriceHistory(
  asset:
    InvestmentAsset,

  providerMarket:
    InvestmentProviderMarket,

  historySize:
    number,
): Promise<{
  prices:
    InvestmentMarketPricePoint[];

  meta:
    TimeSeriesMeta;
}> {
  const body =
    await requestTwelveData(
      "/time_series",
      {
        ...buildInstrumentParameters(
          asset,
          providerMarket,
        ),

        interval:
          "1day",

        outputsize:
          historySize,

        order:
          "ASC",

        timezone:
          "UTC",
      },
    );


  if (
    !isRecord(
      body,
    ) ||
    !Array.isArray(
      body.values,
    )
  ) {
    throw new InvestmentMarketDataError(
      "INVALID_RESPONSE",
    );
  }


  const meta =
    parseTimeSeriesMeta(
      body,
    );


  verifyInstrumentIdentity(
    asset,
    providerMarket,
    meta,
  );


  const prices:
    InvestmentMarketPricePoint[] = [];


  for (
    const raw of
      body.values
  ) {
    if (
      !isRecord(
        raw,
      )
    ) {
      continue;
    }


    const date =
      normalizeDate(
        raw.datetime,
      );


    const close =
      parsePositiveNumber(
        raw.close,
      );


    if (
      !date ||
      close ===
        null
    ) {
      continue;
    }


    prices.push({
      date,

      close,
    });
  }


  prices.sort(
    (
      a,
      b,
    ) =>
      a.date.localeCompare(
        b.date,
      ),
  );


  if (
    prices.length <
    20
  ) {
    throw new InvestmentMarketDataError(
      "PRICE_HISTORY_UNAVAILABLE",
    );
  }


  return {
    prices,

    meta,
  };
}


/* =========================================================
 * 36. PARSE QUOTE
 * ======================================================= */

function parseQuote(
  body:
    unknown,

  asset:
    InvestmentAsset,

  providerMarket:
    InvestmentProviderMarket,
): InvestmentMarketQuote {
  if (
    !isRecord(
      body,
    )
  ) {
    throw new InvestmentMarketDataError(
      "INVALID_RESPONSE",
    );
  }


  const symbol =
    parseNullableString(
      body.symbol,
    );


  const close =
    parsePositiveNumber(
      body.close,
    ) ??
    parsePositiveNumber(
      body.price,
    );


  if (
    !symbol ||
    close ===
      null
  ) {
    throw new InvestmentMarketDataError(
      "INVALID_RESPONSE",
    );
  }


  if (
    symbol.toUpperCase() !==
    normalizeProviderSymbol(
      asset.ticker,
    )
  ) {
    throw new InvestmentMarketDataError(
      "INSTRUMENT_MISMATCH",
    );
  }


  const responseCurrency =
    parseNullableString(
      body.currency,
    )
      ?.toUpperCase() ??
    asset.currency
      .toUpperCase();


  if (
    responseCurrency !==
    asset.currency
      .toUpperCase()
  ) {
    throw new InvestmentMarketDataError(
      "CURRENCY_MISMATCH",
    );
  }


  const returnedMic =
    parseNullableString(
      body.mic_code,
    )
      ?.toUpperCase() ??
    null;


  if (
    providerMarket.mic_code &&
    returnedMic &&
    providerMarket.mic_code !==
      returnedMic
  ) {
    throw new InvestmentMarketDataError(
      "INSTRUMENT_MISMATCH",
    );
  }


  return {
    symbol:
      symbol.toUpperCase(),

    name:
      parseNullableString(
        body.name,
      ),

    exchange:
      parseNullableString(
        body.exchange,
      ),

    mic_code:
      returnedMic,

    currency:
      responseCurrency,

    datetime:
      normalizeDateTime(
        body.datetime,
      ) ??
      parseNullableString(
        body.datetime,
      ),

    open:
      parsePositiveNumber(
        body.open,
      ),

    high:
      parsePositiveNumber(
        body.high,
      ),

    low:
      parsePositiveNumber(
        body.low,
      ),

    close,

    previous_close:
      parsePositiveNumber(
        body.previous_close,
      ),

    change:
      parseNullableNumber(
        body.change,
      ),

    percent_change:
      parseNullableNumber(
        body.percent_change,
      ),

    volume:
      parseNullableNumber(
        body.volume,
      ),
  };
}


/* =========================================================
 * 37. FETCH QUOTE
 * ======================================================= */

async function fetchQuote(
  asset:
    InvestmentAsset,

  providerMarket:
    InvestmentProviderMarket,

  warnings:
    string[],
): Promise<InvestmentMarketQuote | null> {
  const body =
    await requestOptionalTwelveData(
      "/quote",
      {
        ...buildInstrumentParameters(
          asset,
          providerMarket,
        ),

        timezone:
          "UTC",
      },
      "Latest quote",
      warnings,
    );


  if (
    body ===
    null
  ) {
    return null;
  }


  try {
    return parseQuote(
      body,
      asset,
      providerMarket,
    );
  } catch (
    error
  ) {
    if (
      error instanceof
      InvestmentMarketDataError
    ) {
      warnings.push(
        `Latest quote: ${error.message}`,
      );


      return null;
    }


    warnings.push(
      "Latest quote: تعذر التحقق من البيانات.",
    );


    return null;
  }
}


/* =========================================================
 * 38. INCOME STATEMENT ITEM
 * ======================================================= */

function parseIncomeStatementPeriod(
  value:
    unknown,
): InvestmentIncomeStatementPeriod | null {
  if (
    !isRecord(
      value,
    )
  ) {
    return null;
  }


  const fiscalDate =
    normalizeDate(
      value.fiscal_date,
    );


  if (
    !fiscalDate
  ) {
    return null;
  }


  return {
    fiscal_date:
      fiscalDate,

    quarter:
      parseNullableNumber(
        value.quarter,
      ),

    year:
      parseNullableNumber(
        value.year,
      ),

    sales:
      parseNullableNumber(
        value.sales,
      ),

    gross_profit:
      parseNullableNumber(
        value.gross_profit,
      ),

    operating_income:
      parseNullableNumber(
        value.operating_income,
      ),

    pretax_income:
      parseNullableNumber(
        value.pretax_income,
      ),

    net_income:
      parseNullableNumber(
        value.net_income,
      ),

    eps_basic:
      parseNullableNumber(
        value.eps_basic,
      ),

    eps_diluted:
      parseNullableNumber(
        value.eps_diluted,
      ),

    ebit:
      parseNullableNumber(
        value.ebit,
      ),

    ebitda:
      parseNullableNumber(
        value.ebitda,
      ),
  };
}


/* =========================================================
 * 39. FETCH FUNDAMENTALS
 * ======================================================= */

async function fetchIncomeStatements(
  asset:
    InvestmentAsset,

  providerMarket:
    InvestmentProviderMarket,

  warnings:
    string[],
): Promise<InvestmentIncomeStatementPeriod[]> {
  const body =
    await requestOptionalTwelveData(
      "/income_statement",
      {
        ...buildInstrumentParameters(
          asset,
          providerMarket,
        ),

        period:
          "quarterly",

        outputsize:
          DEFAULT_FUNDAMENTAL_PERIODS,
      },
      "Fundamentals",
      warnings,
    );


  if (
    body ===
      null ||
    !isRecord(
      body,
    ) ||
    !Array.isArray(
      body.income_statement,
    )
  ) {
    return [];
  }


  const result =
    body.income_statement
      .map(
        (
          item,
        ) =>
          parseIncomeStatementPeriod(
            item,
          ),
      )
      .filter(
        (
          item,
        ): item is InvestmentIncomeStatementPeriod =>
          item !==
          null,
      );


  result.sort(
    (
      a,
      b,
    ) =>
      b.fiscal_date.localeCompare(
        a.fiscal_date,
      ),
  );


  return result.slice(
    0,
    DEFAULT_FUNDAMENTAL_PERIODS,
  );
}


/* =========================================================
 * 40. STRIP HTML
 * ======================================================= */

function stripHtml(
  value:
    string,
): string {
  return value
    .replace(
      /<script[\s\S]*?<\/script>/gi,
      " ",
    )
    .replace(
      /<style[\s\S]*?<\/style>/gi,
      " ",
    )
    .replace(
      /<[^>]+>/g,
      " ",
    )
    .replace(
      /&nbsp;/gi,
      " ",
    )
    .replace(
      /&amp;/gi,
      "&",
    )
    .replace(
      /&quot;/gi,
      "\"",
    )
    .replace(
      /&#39;/gi,
      "'",
    )
    .replace(
      /\s+/g,
      " ",
    )
    .trim();
}


/* =========================================================
 * 41. PRESS RELEASE
 * ======================================================= */

function parsePressRelease(
  value:
    unknown,
): InvestmentPressRelease | null {
  if (
    !isRecord(
      value,
    )
  ) {
    return null;
  }


  const title =
    parseNullableString(
      value.title,
    );


  const body =
    parseNullableString(
      value.body,
    );


  const datetime =
    normalizeDateTime(
      value.datetime,
    );


  if (
    !title ||
    !body ||
    !datetime
  ) {
    return null;
  }


  return {
    id:
      parseNullableString(
        value.id,
      ),

    datetime,

    title:
      title.slice(
        0,
        500,
      ),

    body:
      stripHtml(
        body,
      ).slice(
        0,
        3500,
      ),
  };
}


/* =========================================================
 * 42. FETCH PRESS RELEASES
 * ======================================================= */

async function fetchPressReleases(
  asset:
    InvestmentAsset,

  providerMarket:
    InvestmentProviderMarket,

  warnings:
    string[],
): Promise<InvestmentPressRelease[]> {
  const body =
    await requestOptionalTwelveData(
      "/press_releases",
      {
        ...buildInstrumentParameters(
          asset,
          providerMarket,
        ),

        outputsize:
          DEFAULT_PRESS_RELEASE_COUNT,
      },
      "Company news",
      warnings,
    );


  if (
    body ===
      null ||
    !isRecord(
      body,
    ) ||
    !Array.isArray(
      body.press_releases,
    )
  ) {
    return [];
  }


  return body.press_releases
    .map(
      (
        item,
      ) =>
        parsePressRelease(
          item,
        ),
    )
    .filter(
      (
        item,
      ): item is InvestmentPressRelease =>
        item !==
        null,
    )
    .sort(
      (
        a,
        b,
      ) =>
        b.datetime.localeCompare(
          a.datetime,
      ),
    )
    .slice(
      0,
      DEFAULT_PRESS_RELEASE_COUNT,
    );
}


/* =========================================================
 * 43. SAFE JSON NUMBER
 * ======================================================= */

function jsonNumber(
  value:
    number |
    null,
): JsonValue {
  return value ??
    null;
}


/* =========================================================
 * 44. QUOTE EVIDENCE
 * ======================================================= */

function buildQuoteEvidence(
  quote:
    InvestmentMarketQuote,

  fetchedAt:
    string,
): InvestmentMarketEvidence {
  const value:
    JsonValue = {

      symbol:
        quote.symbol,

      currency:
        quote.currency,

      exchange:
        quote.exchange,

      mic_code:
        quote.mic_code,

      open:
        jsonNumber(
          quote.open,
        ),

      high:
        jsonNumber(
          quote.high,
        ),

      low:
        jsonNumber(
          quote.low,
        ),

      close:
        quote.close,

      previous_close:
        jsonNumber(
          quote.previous_close,
        ),

      change:
        jsonNumber(
          quote.change,
        ),

      percent_change:
        jsonNumber(
          quote.percent_change,
        ),

      volume:
        jsonNumber(
          quote.volume,
        ),
    };


  const changeText =
    quote.percent_change ===
    null
      ? ""
      : `، التغير ${quote.percent_change.toFixed(2)}%`;


  return {
    source_type:
      "market_data",

    source_name:
      INVESTMENT_MARKET_DATA_PROVIDER,

    title:
      `${quote.symbol} latest market quote`,

    source_url:
      null,

    published_at:
      quote.datetime,

    observed_at:
      fetchedAt,

    fact:
      `السعر المرجعي ${quote.close} ${quote.currency}${changeText}.`,

    value_json:
      value,
  };
}


/* =========================================================
 * 45. HISTORY EVIDENCE
 * ======================================================= */

function buildHistoryEvidence(
  asset:
    InvestmentAsset,

  prices:
    InvestmentMarketPricePoint[],

  fetchedAt:
    string,
): InvestmentMarketEvidence | null {
  const first =
    prices[0];


  const latest =
    prices[
      prices.length -
        1
    ];


  if (
    !first ||
    !latest
  ) {
    return null;
  }


  const change =
    (
      (
        latest.close -
        first.close
      ) /
      first.close
    ) *
    100;


  return {
    source_type:
      "market_data",

    source_name:
      INVESTMENT_MARKET_DATA_PROVIDER,

    title:
      `${asset.ticker} historical daily prices`,

    source_url:
      null,

    published_at:
      null,

    observed_at:
      fetchedAt,

    fact:
      `التاريخ السعري المتاح يحتوي ${prices.length} جلسة من ${first.date} إلى ${latest.date}. التغير بين أول وآخر إغلاق في العينة ${change.toFixed(2)}%.`,

    value_json: {
      data_points:
        prices.length,

      first_date:
        first.date,

      first_close:
        first.close,

      latest_date:
        latest.date,

      latest_close:
        latest.close,

      sample_change_percent:
        Number(
          change.toFixed(
            4,
          ),
        ),
    },
  };
}


/* =========================================================
 * 46. FUNDAMENTAL EVIDENCE
 * ======================================================= */

function buildFundamentalEvidence(
  asset:
    InvestmentAsset,

  periods:
    InvestmentIncomeStatementPeriod[],

  fetchedAt:
    string,
): InvestmentMarketEvidence[] {
  return periods.map(
    (
      period,
    ) => {

      const pieces:
        string[] = [
          `الفترة ${period.fiscal_date}`,
        ];


      if (
        period.sales !==
        null
      ) {
        pieces.push(
          `الإيرادات ${period.sales}`,
        );
      }


      if (
        period.net_income !==
        null
      ) {
        pieces.push(
          `صافي الربح ${period.net_income}`,
        );
      }


      if (
        period.eps_basic !==
        null
      ) {
        pieces.push(
          `ربحية السهم الأساسية ${period.eps_basic}`,
        );
      }


      if (
        period.operating_income !==
        null
      ) {
        pieces.push(
          `الدخل التشغيلي ${period.operating_income}`,
        );
      }


      return {
        source_type:
          "financials",

        source_name:
          INVESTMENT_MARKET_DATA_PROVIDER,

        title:
          `${asset.ticker} quarterly income statement — ${period.fiscal_date}`,

        source_url:
          null,

        published_at:
          null,

        observed_at:
          fetchedAt,

        fact:
          `${pieces.join("، ")}.`,

        value_json: {
          fiscal_date:
            period.fiscal_date,

          quarter:
            jsonNumber(
              period.quarter,
            ),

          year:
            jsonNumber(
              period.year,
            ),

          sales:
            jsonNumber(
              period.sales,
            ),

          gross_profit:
            jsonNumber(
              period.gross_profit,
            ),

          operating_income:
            jsonNumber(
              period.operating_income,
            ),

          pretax_income:
            jsonNumber(
              period.pretax_income,
            ),

          net_income:
            jsonNumber(
              period.net_income,
            ),

          eps_basic:
            jsonNumber(
              period.eps_basic,
            ),

          eps_diluted:
            jsonNumber(
              period.eps_diluted,
            ),

          ebit:
            jsonNumber(
              period.ebit,
            ),

          ebitda:
            jsonNumber(
              period.ebitda,
            ),
        },
      };
    },
  );
}


/* =========================================================
 * 47. NEWS EVIDENCE
 * ======================================================= */

function buildPressReleaseEvidence(
  asset:
    InvestmentAsset,

  releases:
    InvestmentPressRelease[],

  fetchedAt:
    string,
): InvestmentMarketEvidence[] {
  return releases.map(
    (
      release,
    ) => ({
      /*
       * Investment Committee sentiment gating recognizes
       * source_type = news.
       *
       * These rows still originate from official corporate
       * press releases supplied by Twelve Data.
       */
      source_type:
        "news",

      source_name:
        `${INVESTMENT_MARKET_DATA_PROVIDER} — Press Releases`,

      title:
        release.title,

      source_url:
        null,

      published_at:
        release.datetime,

      observed_at:
        fetchedAt,

      fact:
        `${asset.ticker}: ${release.body}`.slice(
          0,
          4000,
        ),

      value_json: {
        press_release_id:
          release.id,

        datetime:
          release.datetime,
      },
    }),
  );
}


/* =========================================================
 * 48. REFERENCE PRICE
 * ======================================================= */

function resolveReferencePrice(
  quote:
    InvestmentMarketQuote |
    null,

  priceHistory:
    InvestmentMarketPricePoint[],
): {
  price:
    number;

  source:
    "quote" |
    "time_series";
} {
  if (
    quote &&
    quote.close >
      0
  ) {
    return {
      price:
        quote.close,

      source:
        "quote",
    };
  }


  const latest =
    priceHistory[
      priceHistory.length -
        1
    ];


  if (
    !latest ||
    latest.close <=
      0
  ) {
    throw new InvestmentMarketDataError(
      "PRICE_HISTORY_UNAVAILABLE",
    );
  }


  return {
    price:
      latest.close,

    source:
      "time_series",
  };
}


/* =========================================================
 * 49. BUILD EVIDENCE
 * ======================================================= */

function buildMarketEvidence(
  asset:
    InvestmentAsset,

  quote:
    InvestmentMarketQuote |
    null,

  prices:
    InvestmentMarketPricePoint[],

  incomeStatements:
    InvestmentIncomeStatementPeriod[],

  pressReleases:
    InvestmentPressRelease[],

  fetchedAt:
    string,
): InvestmentMarketEvidence[] {
  const evidence:
    InvestmentMarketEvidence[] = [];


  if (
    quote
  ) {
    evidence.push(
      buildQuoteEvidence(
        quote,
        fetchedAt,
      ),
    );
  }


  const historyEvidence =
    buildHistoryEvidence(
      asset,
      prices,
      fetchedAt,
    );


  if (
    historyEvidence
  ) {
    evidence.push(
      historyEvidence,
    );
  }


  evidence.push(
    ...buildFundamentalEvidence(
      asset,
      incomeStatements,
      fetchedAt,
    ),
  );


  evidence.push(
    ...buildPressReleaseEvidence(
      asset,
      pressReleases,
      fetchedAt,
    ),
  );


  return evidence;
}


/* =========================================================
 * 50. MAIN MARKET DATA FETCH
 * ======================================================= */

/**
 * Main LIFE Invest AI external-data boundary.
 *
 *
 * Flow:
 *
 * LIFE OS investment asset
 *      ↓
 * provider market resolution
 *      ↓
 * Twelve Data
 *      ↓
 * instrument verification
 *      ↓
 * price history
 *      ↓
 * latest quote
 *      ↓
 * fundamentals
 *      ↓
 * press releases
 *      ↓
 * normalized evidence package
 *
 *
 * Critical:
 *
 * Historical price data is required because the deterministic
 * Technical Engine depends on it.
 *
 *
 * Fundamentals and company news degrade gracefully when the
 * current provider subscription does not include them.
 */
export async function fetchInvestmentMarketData(
  asset:
    InvestmentAsset,

  options:
    FetchInvestmentMarketDataOptions =
    {},
): Promise<InvestmentMarketDataBundle> {
  validateAsset(
    asset,
  );


  const providerMarket =
    resolveInvestmentProviderMarket(
      asset.market,
    );


  const historySize =
    normalizeHistorySize(
      options.history_size,
    );


  const includeFundamentals =
    options.include_fundamentals ??
    true;


  const includePressReleases =
    options.include_press_releases ??
    true;


  const warnings:
    string[] = [];


  const fetchedAt =
    new Date()
      .toISOString();


  /*
   * Historical prices are the minimum required market input.
   *
   * If this fails, technical analysis cannot be trusted.
   */
  const {
    prices,
    meta,
  } =
    await fetchPriceHistory(
      asset,
      providerMarket,
      historySize,
    );


  const [
    quote,
    incomeStatements,
    pressReleases,
  ] =
    await Promise.all([

      fetchQuote(
        asset,
        providerMarket,
        warnings,
      ),


      includeFundamentals
        ? fetchIncomeStatements(
            asset,
            providerMarket,
            warnings,
          )
        : Promise.resolve(
            [],
          ),


      includePressReleases
        ? fetchPressReleases(
            asset,
            providerMarket,
            warnings,
          )
        : Promise.resolve(
            [],
          ),
    ]);


  const reference =
    resolveReferencePrice(
      quote,
      prices,
    );


  const currency =
    (
      quote?.currency ??
      meta.currency ??
      asset.currency
    )
      .trim()
      .toUpperCase();


  if (
    currency !==
    asset.currency
      .trim()
      .toUpperCase()
  ) {
    throw new InvestmentMarketDataError(
      "CURRENCY_MISMATCH",
    );
  }


  const evidence =
    buildMarketEvidence(
      asset,
      quote,
      prices,
      incomeStatements,
      pressReleases,
      fetchedAt,
    );


  return {
    provider:
      INVESTMENT_MARKET_DATA_PROVIDER,

    provider_market:
      providerMarket,

    fetched_at:
      fetchedAt,

    reference_price:
      reference.price,

    reference_price_source:
      reference.source,

    currency,

    quote,

    price_history:
      prices,

    income_statements:
      incomeStatements,

    press_releases:
      pressReleases,

    evidence,

    warnings,
  };
}


/* =========================================================
 * 51. MARKET DATA ONLY
 * ======================================================= */

/**
 * Useful when LIFE OS needs:
 *
 * latest price
 * +
 * chart history
 *
 * but does NOT need an expensive fundamentals refresh.
 */
export async function fetchInvestmentPriceData(
  asset:
    InvestmentAsset,

  historySize:
    number =
    DEFAULT_MARKET_HISTORY_SIZE,
): Promise<InvestmentMarketDataBundle> {
  return fetchInvestmentMarketData(
    asset,
    {
      history_size:
        historySize,

      include_fundamentals:
        false,

      include_press_releases:
        false,
    },
  );
}


/* =========================================================
 * 52. RESEARCH DATA
 * ======================================================= */

/**
 * Full evidence refresh for Investment Committee analysis.
 */
export async function fetchInvestmentResearchData(
  asset:
    InvestmentAsset,
): Promise<InvestmentMarketDataBundle> {
  return fetchInvestmentMarketData(
    asset,
    {
      history_size:
        DEFAULT_MARKET_HISTORY_SIZE,

      include_fundamentals:
        true,

      include_press_releases:
        true,
    },
  );
}


/* =========================================================
 * 53. PROVIDER DEGRADATION
 * ======================================================= */

/**
 * LIFE Invest AI distinguishes:
 *
 * CRITICAL
 *
 * historical prices
 *
 *
 * from OPTIONAL:
 *
 * latest quote
 * fundamentals
 * press releases
 *
 *
 * If an optional endpoint requires a higher Twelve Data plan:
 *
 * the system does NOT invent the missing evidence.
 *
 * Instead:
 *
 * warning
 * +
 * score component becomes null
 * +
 * lower Data Quality
 * +
 * lower Confidence
 */


/* =========================================================
 * 54. UAE MARKET CONTRACT
 * ======================================================= */

/**
 * Current UAE market mapping:
 *
 * LIFE OS market     Twelve Data MIC
 *
 * ADX                XADS
 * DFM                XDFM
 *
 *
 * MIC is supplied whenever known to reduce symbol ambiguity.
 */


/* =========================================================
 * 55. REFERENCE PRICE CONTRACT
 * ======================================================= */

/**
 * Preferred:
 *
 * validated latest quote close
 *
 *
 * Fallback:
 *
 * latest validated daily time-series close
 *
 *
 * LIFE OS records which source produced the reference price.
 *
 *
 * There is NEVER:
 *
 * random fallback
 * stale hard-coded price
 * AI-generated price
 */


/* =========================================================
 * 56. FUNDAMENTAL CONTRACT
 * ======================================================= */

/**
 * Fundamental evidence currently uses:
 *
 * quarterly income statement
 *
 * including when available:
 *
 * revenue
 * gross profit
 * operating income
 * pretax income
 * net income
 * EPS
 * EBIT
 * EBITDA
 *
 *
 * Missing provider values remain null.
 */


/* =========================================================
 * 57. NEWS CONTRACT
 * ======================================================= */

/**
 * V1 news evidence uses official company press releases.
 *
 *
 * Later we can add:
 *
 * independent financial news
 * exchange disclosures
 * regulator announcements
 *
 *
 * They will enter the same evidence contract without changing
 * Investment Committee scoring architecture.
 */


/* =========================================================
 * 58. SECURITY CONTRACT
 * ======================================================= */

/**
 * TWELVE_DATA_API_KEY:
 *
 * server only
 *
 * never NEXT_PUBLIC_
 *
 * never browser
 *
 * never GitHub
 *
 *
 * Authentication uses the provider's Authorization header.
 */


/* =========================================================
 * 59. PROVIDER INDEPENDENCE
 * ======================================================= */

/**
 * Twelve Data is V1 provider.
 *
 *
 * LIFE Invest AI itself does not depend on Twelve Data.
 *
 *
 * A future provider can produce:
 *
 * InvestmentMarketDataBundle
 *
 *
 * without changing:
 *
 * Technical Engine
 * Investment Committee
 * Forecast Engine
 * Track Record
 */


/* =========================================================
 * 60. FINAL MARKET DATA RULE
 * ======================================================= */

/**
 * External provider
 *      ↓
 * strict parsing
 *      ↓
 * instrument verification
 *      ↓
 * currency verification
 *      ↓
 * normalized market facts
 *      ↓
 * evidence
 *      ↓
 * LIFE Invest AI
 *
 *
 * Provider facts are evidence.
 *
 * AI interpretation is separate.
 *
 * Execution is separate.
 */