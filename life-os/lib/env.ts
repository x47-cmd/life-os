import { z } from "zod";


/**
 * LIFE OS — Environment Configuration
 *
 * Security rules:
 *
 * - Real secrets never live in source control.
 * - OPENAI_API_KEY is server-only.
 * - TWELVE_DATA_API_KEY is server-only.
 * - NEXT_PUBLIC_* values are the only values allowed for browser use.
 * - Environment validation happens before a value is trusted.
 *
 *
 * Important isolation rule:
 *
 * Core LIFE OS server configuration
 * and
 * Investment Market Data configuration
 *
 * are validated independently.
 *
 *
 * This prevents a missing optional market-data provider key
 * from breaking unrelated LIFE OS functionality.
 */


/* =========================================================
 * 1. PUBLIC ENVIRONMENT
 * ======================================================= */

const publicEnvironmentSchema =
  z.object({

    NEXT_PUBLIC_SUPABASE_URL:
      z
        .string()
        .trim()
        .min(
          1,
          "NEXT_PUBLIC_SUPABASE_URL is required.",
        )
        .url(
          "NEXT_PUBLIC_SUPABASE_URL must be a valid URL.",
        )
        .refine(
          (
            value,
          ) =>
            value.startsWith(
              "https://",
            ),

          "NEXT_PUBLIC_SUPABASE_URL must use HTTPS.",
        ),


    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      z
        .string()
        .trim()
        .min(
          1,
          "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required.",
        ),
  });


/* =========================================================
 * 2. CORE SERVER ENVIRONMENT
 * ======================================================= */

/**
 * Core server secrets.
 *
 *
 * Do NOT add feature-specific secrets here unless the entire
 * LIFE OS server genuinely requires them.
 *
 *
 * Otherwise one optional integration could break unrelated
 * application features.
 */
const serverEnvironmentSchema =
  publicEnvironmentSchema.extend({

    OPENAI_API_KEY:
      z
        .string()
        .trim()
        .min(
          1,
          "OPENAI_API_KEY is required.",
        )
        .refine(
          (
            value,
          ) =>
            !value
              .toLowerCase()
              .includes(
                "replace",
              ),

          "OPENAI_API_KEY appears to contain a placeholder value.",
        ),
  });


/* =========================================================
 * 3. INVESTMENT MARKET ENVIRONMENT
 * ======================================================= */

/**
 * LIFE Invest AI market-data provider.
 *
 *
 * This schema is intentionally separate from:
 *
 * serverEnvironmentSchema
 *
 *
 * Why?
 *
 * If TWELVE_DATA_API_KEY is missing:
 *
 * LIFE Invest AI market analysis
 *      → unavailable
 *
 *
 * but:
 *
 * Finance
 * Travel
 * Goals
 * LIFE AI
 * Authentication
 *
 * must continue working normally.
 */
const investmentMarketEnvironmentSchema =
  z.object({

    TWELVE_DATA_API_KEY:
      z
        .string()
        .trim()
        .min(
          8,
          "TWELVE_DATA_API_KEY is required.",
        )
        .refine(
          (
            value,
          ) =>
            !value
              .toLowerCase()
              .includes(
                "replace",
              ),

          "TWELVE_DATA_API_KEY appears to contain a placeholder value.",
        ),
  });


/* =========================================================
 * 4. TYPES
 * ======================================================= */

export type PublicEnvironment =
  z.infer<
    typeof publicEnvironmentSchema
  >;


export type ServerEnvironment =
  z.infer<
    typeof serverEnvironmentSchema
  >;


export type InvestmentMarketEnvironment =
  z.infer<
    typeof investmentMarketEnvironmentSchema
  >;


/* =========================================================
 * 5. CACHES
 * ======================================================= */

let cachedPublicEnvironment:
  PublicEnvironment |
  null =
  null;


let cachedServerEnvironment:
  ServerEnvironment |
  null =
  null;


let cachedInvestmentMarketEnvironment:
  InvestmentMarketEnvironment |
  null =
  null;


/* =========================================================
 * 6. ENVIRONMENT ERROR FORMATTER
 * ======================================================= */

/**
 * Convert Zod validation failures into a short configuration
 * error.
 *
 *
 * Important:
 *
 * The error intentionally reports:
 *
 * variable names
 * +
 * validation messages
 *
 *
 * It NEVER prints secret values.
 */
function formatEnvironmentError(
  error:
    z.ZodError,

  scope:
    | "public"
    | "server"
    | "investment-market",
): Error {
  const details =
    error.issues
      .map(
        (
          issue,
        ) => {

          const variableName =
            issue.path.join(
              ".",
            ) ||
            "environment";


          return `${variableName}: ${issue.message}`;
        },
      )
      .join(
        " | ",
      );


  return new Error(
    `LIFE OS ${scope} environment configuration is invalid. ${details}`,
  );
}


/* =========================================================
 * 7. PUBLIC ENVIRONMENT
 * ======================================================= */

/**
 * Read browser-safe environment configuration.
 *
 *
 * These values are intentionally public:
 *
 * NEXT_PUBLIC_SUPABASE_URL
 * NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 *
 *
 * Authorization must never depend on these values being
 * secret.
 *
 *
 * Security is enforced through:
 *
 * authentication
 * +
 * PostgreSQL RLS.
 */
export function getPublicEnvironment():
PublicEnvironment {
  if (
    cachedPublicEnvironment
  ) {
    return cachedPublicEnvironment;
  }


  const result =
    publicEnvironmentSchema.safeParse({

      NEXT_PUBLIC_SUPABASE_URL:
        process.env
          .NEXT_PUBLIC_SUPABASE_URL,


      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        process.env
          .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    });


  if (
    !result.success
  ) {
    throw formatEnvironmentError(
      result.error,
      "public",
    );
  }


  cachedPublicEnvironment =
    Object.freeze(
      result.data,
    );


  return cachedPublicEnvironment;
}


/* =========================================================
 * 8. CORE SERVER ENVIRONMENT
 * ======================================================= */

/**
 * Read core server-only environment configuration.
 *
 *
 * NEVER call this function from:
 *
 * Client Components
 * browser code
 * client-side utilities
 *
 *
 * OPENAI_API_KEY must remain server-only.
 */
export function getServerEnvironment():
ServerEnvironment {
  if (
    typeof window !==
    "undefined"
  ) {
    throw new Error(
      "LIFE OS security error: server environment requested from browser code.",
    );
  }


  if (
    cachedServerEnvironment
  ) {
    return cachedServerEnvironment;
  }


  const result =
    serverEnvironmentSchema.safeParse({

      NEXT_PUBLIC_SUPABASE_URL:
        process.env
          .NEXT_PUBLIC_SUPABASE_URL,


      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        process.env
          .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,


      OPENAI_API_KEY:
        process.env
          .OPENAI_API_KEY,
    });


  if (
    !result.success
  ) {
    throw formatEnvironmentError(
      result.error,
      "server",
    );
  }


  cachedServerEnvironment =
    Object.freeze(
      result.data,
    );


  return cachedServerEnvironment;
}


/* =========================================================
 * 9. INVESTMENT MARKET ENVIRONMENT
 * ======================================================= */

/**
 * Read LIFE Invest AI market-data configuration.
 *
 *
 * TWELVE_DATA_API_KEY:
 *
 * server-only
 * never NEXT_PUBLIC_
 * never browser-visible
 * never source-controlled
 *
 *
 * It is validated only when investment market functionality
 * actually requires it.
 */
export function getInvestmentMarketEnvironment():
InvestmentMarketEnvironment {
  if (
    typeof window !==
    "undefined"
  ) {
    throw new Error(
      "LIFE OS security error: investment market environment requested from browser code.",
    );
  }


  if (
    cachedInvestmentMarketEnvironment
  ) {
    return cachedInvestmentMarketEnvironment;
  }


  const result =
    investmentMarketEnvironmentSchema.safeParse({

      TWELVE_DATA_API_KEY:
        process.env
          .TWELVE_DATA_API_KEY,
    });


  if (
    !result.success
  ) {
    throw formatEnvironmentError(
      result.error,
      "investment-market",
    );
  }


  cachedInvestmentMarketEnvironment =
    Object.freeze(
      result.data,
    );


  return cachedInvestmentMarketEnvironment;
}


/* =========================================================
 * 10. SUPABASE ACCESSOR
 * ======================================================= */

/**
 * Convenience accessor for Supabase browser-safe
 * configuration.
 */
export function getSupabasePublicEnvironment(): {
  url:
    string;

  publishableKey:
    string;
} {
  const environment =
    getPublicEnvironment();


  return {
    url:
      environment
        .NEXT_PUBLIC_SUPABASE_URL,

    publishableKey:
      environment
        .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };
}


/* =========================================================
 * 11. OPENAI ACCESSOR
 * ======================================================= */

/**
 * Convenience accessor for server-only OpenAI configuration.
 */
export function getOpenAIEnvironment(): {
  apiKey:
    string;
} {
  const environment =
    getServerEnvironment();


  return {
    apiKey:
      environment
        .OPENAI_API_KEY,
  };
}


/* =========================================================
 * 12. TWELVE DATA ACCESSOR
 * ======================================================= */

/**
 * Convenience accessor for LIFE Invest AI market-data
 * configuration.
 *
 *
 * Important:
 *
 * This function must never be imported into a Client
 * Component.
 */
export function getTwelveDataEnvironment(): {
  apiKey:
    string;
} {
  const environment =
    getInvestmentMarketEnvironment();


  return {
    apiKey:
      environment
        .TWELVE_DATA_API_KEY,
  };
}


/* =========================================================
 * 13. SECRET ISOLATION CONTRACT
 * ======================================================= */

/**
 * Browser-safe:
 *
 * NEXT_PUBLIC_SUPABASE_URL
 * NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 *
 *
 * Server-only:
 *
 * OPENAI_API_KEY
 * TWELVE_DATA_API_KEY
 *
 *
 * No server secret may ever use:
 *
 * NEXT_PUBLIC_
 */


/* =========================================================
 * 14. FEATURE ISOLATION CONTRACT
 * ======================================================= */

/**
 * Missing OPENAI_API_KEY:
 *
 * AI functionality requiring OpenAI fails safely.
 *
 *
 * Missing TWELVE_DATA_API_KEY:
 *
 * LIFE Invest AI market-data functionality fails safely.
 *
 *
 * It must NOT break unrelated LIFE OS pages merely because
 * the market-data integration is not configured.
 */


/* =========================================================
 * 15. FINAL ENVIRONMENT RULE
 * ======================================================= */

/**
 * Source code
 *      ↓
 * variable name only
 *
 *
 * Vercel / runtime environment
 *      ↓
 * real secret
 *
 *
 * server-only validation
 *      ↓
 * trusted integration
 *
 *
 * Real API keys never belong in:
 *
 * GitHub
 * client bundles
 * URLs
 * logs
 * error responses
 */