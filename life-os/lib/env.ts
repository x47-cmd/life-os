import { z } from "zod";

/**
 * LIFE OS — Environment Configuration
 *
 * Security rules:
 * - Real secrets never live in source control.
 * - OPENAI_API_KEY is server-only.
 * - NEXT_PUBLIC_* values are the only values allowed for browser use.
 * - Environment validation happens before a value is trusted.
 */

const publicEnvironmentSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .trim()
    .min(1, "NEXT_PUBLIC_SUPABASE_URL is required.")
    .url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL.")
    .refine(
      (value) => value.startsWith("https://"),
      "NEXT_PUBLIC_SUPABASE_URL must use HTTPS.",
    ),

  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .trim()
    .min(1, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required."),
});

const serverEnvironmentSchema = publicEnvironmentSchema.extend({
  OPENAI_API_KEY: z
    .string()
    .trim()
    .min(1, "OPENAI_API_KEY is required.")
    .refine(
      (value) => !value.toLowerCase().includes("replace"),
      "OPENAI_API_KEY appears to contain a placeholder value.",
    ),
});

export type PublicEnvironment = z.infer<typeof publicEnvironmentSchema>;
export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;

let cachedPublicEnvironment: PublicEnvironment | null = null;
let cachedServerEnvironment: ServerEnvironment | null = null;

/**
 * Convert Zod validation failures into a short configuration error.
 *
 * Important:
 * The error intentionally reports variable names and validation messages only.
 * It never prints secret values.
 */
function formatEnvironmentError(
  error: z.ZodError,
  scope: "public" | "server",
): Error {
  const details = error.issues
    .map((issue) => {
      const variableName = issue.path.join(".") || "environment";
      return `${variableName}: ${issue.message}`;
    })
    .join(" | ");

  return new Error(
    `LIFE OS ${scope} environment configuration is invalid. ${details}`,
  );
}

/**
 * Read browser-safe environment configuration.
 *
 * These values are intentionally public:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 *
 * Authorization must never depend on these values being secret.
 * Security is enforced through authentication and PostgreSQL RLS.
 */
export function getPublicEnvironment(): PublicEnvironment {
  if (cachedPublicEnvironment) {
    return cachedPublicEnvironment;
  }

  const result = publicEnvironmentSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL,

    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });

  if (!result.success) {
    throw formatEnvironmentError(result.error, "public");
  }

  cachedPublicEnvironment = Object.freeze(result.data);

  return cachedPublicEnvironment;
}

/**
 * Read server-only environment configuration.
 *
 * NEVER call this function from:
 * - Client Components
 * - browser code
 * - client-side utilities
 *
 * OPENAI_API_KEY must remain server-only.
 */
export function getServerEnvironment(): ServerEnvironment {
  if (typeof window !== "undefined") {
    throw new Error(
      "LIFE OS security error: server environment requested from browser code.",
    );
  }

  if (cachedServerEnvironment) {
    return cachedServerEnvironment;
  }

  const result = serverEnvironmentSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL,

    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,

    OPENAI_API_KEY:
      process.env.OPENAI_API_KEY,
  });

  if (!result.success) {
    throw formatEnvironmentError(result.error, "server");
  }

  cachedServerEnvironment = Object.freeze(result.data);

  return cachedServerEnvironment;
}

/**
 * Convenience accessor for Supabase browser-safe configuration.
 */
export function getSupabasePublicEnvironment(): {
  url: string;
  publishableKey: string;
} {
  const environment = getPublicEnvironment();

  return {
    url: environment.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey:
      environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };
}

/**
 * Convenience accessor for server-only OpenAI configuration.
 */
export function getOpenAIEnvironment(): {
  apiKey: string;
} {
  const environment = getServerEnvironment();

  return {
    apiKey: environment.OPENAI_API_KEY,
  };
}