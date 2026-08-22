import {
  existsSync,
  readFileSync,
} from "node:fs";

import {
  join,
} from "node:path";

import {
  describe,
  expect,
  it,
} from "vitest";

import {
  AI_TOOL_NAMES,
} from "@/lib/constants";


/* =========================================================
 * 1. REPOSITORY HELPERS
 * ======================================================= */

const ROOT =
  process.cwd();


function repositoryPath(
  relativePath: string,
): string {
  return join(
    ROOT,
    relativePath,
  );
}


function readRepositoryFile(
  relativePath: string,
): string {
  const path =
    repositoryPath(
      relativePath,
    );

  if (
    !existsSync(
      path,
    )
  ) {
    throw new Error(
      `Required repository file is missing: ${relativePath}`,
    );
  }

  return readFileSync(
    path,
    "utf8",
  );
}


function normalizeSource(
  source: string,
): string {
  return source
    .replace(
      /\r\n/g,
      "\n",
    )
    .toLowerCase();
}


/* =========================================================
 * 2. LOCKED TABLES
 * ======================================================= */

const USER_OWNED_TABLES =
  [
    "profiles",
    "income_sources",
    "budget_items",
    "monthly_snapshots",
    "investment_assets",
    "investment_transactions",
    "goals",
    "projects",
    "tasks",
    "learning_items",
    "career_items",
    "memory_items",
    "ai_recommendations",
    "audit_logs",
  ] as const;


/* =========================================================
 * 3. REGEX ESCAPE
 * ======================================================= */

function escapeRegExp(
  value: string,
): string {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
}


/* =========================================================
 * 4. RLS STATEMENT CHECKER
 * ======================================================= */

function tableSecurityPattern(
  table:
    string,
  command:
    "enable" | "force",
): RegExp {
  const escapedTable =
    escapeRegExp(
      table,
    );

  return new RegExp(
    [
      "alter\\s+table\\s+",
      "(?:public\\.)?",
      `"?${escapedTable}"?`,
      "\\s+",
      command,
      "\\s+row\\s+level\\s+security",
    ].join(
      "",
    ),
    "i",
  );
}


/* =========================================================
 * 5. ENVIRONMENT SECURITY
 * ======================================================= */

describe(
  "environment security",
  () => {
    it(
      "documents only the three allowed V1 environment variables",
      () => {
        const source =
          readRepositoryFile(
            ".env.example",
          );

        const variableNames =
          source
            .split(
              /\r?\n/,
            )
            .map(
              (line) =>
                line.trim(),
            )
            .filter(
              (line) =>
                line.length >
                  0 &&
                !line.startsWith(
                  "#",
                ) &&
                line.includes(
                  "=",
                ),
            )
            .map(
              (line) =>
                line
                  .split(
                    "=",
                    1,
                  )[0]
                  ?.trim(),
            )
            .filter(
              (
                value,
              ): value is string =>
                Boolean(
                  value,
                ),
            );


        expect(
          variableNames.sort(),
        ).toEqual(
          [
            "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
            "NEXT_PUBLIC_SUPABASE_URL",
            "OPENAI_API_KEY",
          ].sort(),
        );
      },
    );


    it(
      "does not expose a Supabase service-role key in the environment template",
      () => {
        const source =
          normalizeSource(
            readRepositoryFile(
              ".env.example",
            ),
          );


        expect(
          source,
        ).not.toContain(
          "service_role",
        );

        expect(
          source,
        ).not.toContain(
          "supabase_service_role",
        );

        expect(
          source,
        ).not.toContain(
          "database_password",
        );
      },
    );


    it(
      "keeps local environment files out of Git",
      () => {
        const source =
          normalizeSource(
            readRepositoryFile(
              ".gitignore",
            ),
          );


        expect(
          source,
        ).toMatch(
          /(^|\n)\.env(\n|$|\*)/,
        );

        expect(
          source,
        ).toContain(
          ".env.local",
        );
      },
    );
  },
);


/* =========================================================
 * 6. NO SERVICE ROLE IN RUNTIME
 * ======================================================= */

describe(
  "Supabase runtime keys",
  () => {
    const runtimeFiles =
      [
        "lib/env.ts",
        "lib/supabase/client.ts",
        "lib/supabase/server.ts",
        "lib/auth.ts",
        "proxy.ts",
      ] as const;


    for (
      const file of runtimeFiles
    ) {
      it(
        `${file} does not use a service-role credential`,
        () => {
          const source =
            normalizeSource(
              readRepositoryFile(
                file,
              ),
            );


          expect(
            source,
          ).not.toContain(
            "supabase_service_role_key",
          );

          expect(
            source,
          ).not.toContain(
            "service_role_key",
          );
        },
      );
    }
  },
);


/* =========================================================
 * 7. VERIFIED AUTHENTICATION
 * ======================================================= */

describe(
  "verified authentication",
  () => {
    it(
      "uses verified claims in the central auth module",
      () => {
        const source =
          readRepositoryFile(
            "lib/auth.ts",
          );


        expect(
          source,
        ).toMatch(
          /\.getClaims\s*\(/,
        );
      },
    );


    it(
      "does not use getSession as the identity-verification authority",
      () => {
        const source =
          readRepositoryFile(
            "lib/auth.ts",
          );


        expect(
          source,
        ).not.toMatch(
          /\.getSession\s*\(/,
        );
      },
    );


    it(
      "contains an explicit AAL2 authorization boundary",
      () => {
        const source =
          normalizeSource(
            readRepositoryFile(
              "lib/auth.ts",
            ),
          );


        expect(
          source,
        ).toContain(
          "aal2",
        );

        expect(
          source,
        ).toContain(
          "assertaal2",
        );
      },
    );
  },
);


/* =========================================================
 * 8. NEXT.JS 16 PROXY
 * ======================================================= */

describe(
  "Next.js authentication proxy",
  () => {
    it(
      "uses proxy.ts instead of the deprecated middleware convention",
      () => {
        expect(
          existsSync(
            repositoryPath(
              "proxy.ts",
            ),
          ),
        ).toBe(
          true,
        );


        expect(
          existsSync(
            repositoryPath(
              "middleware.ts",
            ),
          ),
        ).toBe(
          false,
        );
      },
    );


    it(
      "exports the Next.js proxy function",
      () => {
        const source =
          readRepositoryFile(
            "proxy.ts",
          );


        expect(
          source,
        ).toMatch(
          /export\s+async\s+function\s+proxy\s*\(/,
        );
      },
    );


    it(
      "uses verified claims during early route protection",
      () => {
        const source =
          readRepositoryFile(
            "proxy.ts",
          );


        expect(
          source,
        ).toMatch(
          /\.getClaims\s*\(/,
        );

        expect(
          source,
        ).not.toMatch(
          /\.getSession\s*\(/,
        );
      },
    );


    it(
      "contains the private application routes",
      () => {
        const source =
          normalizeSource(
            readRepositoryFile(
              "proxy.ts",
            ),
          );

        const requiredRoutes =
          [
            "/dashboard",
            "/goals",
            "/projects",
            "/finance",
            "/investments",
            "/career",
            "/learning",
            "/tasks",
            "/assistant",
            "/settings",
            "/audit",
          ];


        for (
          const route of requiredRoutes
        ) {
          expect(
            source,
          ).toContain(
            `"${route}"`,
          );
        }
      },
    );
  },
);


/* =========================================================
 * 9. ROW LEVEL SECURITY
 * ======================================================= */

describe(
  "PostgreSQL row level security",
  () => {
    const rlsMigration =
      readRepositoryFile(
        "supabase/migrations/002_v1_rls.sql",
      );


    for (
      const table of USER_OWNED_TABLES
    ) {
      it(
        `enables RLS on ${table}`,
        () => {
          expect(
            rlsMigration,
          ).toMatch(
            tableSecurityPattern(
              table,
              "enable",
            ),
          );
        },
      );


      it(
        `forces RLS on ${table}`,
        () => {
          expect(
            rlsMigration,
          ).toMatch(
            tableSecurityPattern(
              table,
              "force",
            ),
          );
        },
      );
    }
  },
);


/* =========================================================
 * 10. RLS OWNERSHIP
 * ======================================================= */

describe(
  "RLS ownership policies",
  () => {
    it(
      "uses authenticated user identity in RLS policy logic",
      () => {
        const source =
          normalizeSource(
            readRepositoryFile(
              "supabase/migrations/002_v1_rls.sql",
            ),
          );


        expect(
          source,
        ).toContain(
          "auth.uid()",
        );
      },
    );


    it(
      "contains the AAL2 requirement in the RLS migration",
      () => {
        const source =
          normalizeSource(
            readRepositoryFile(
              "supabase/migrations/002_v1_rls.sql",
            ),
          );


        expect(
          source,
        ).toContain(
          "aal2",
        );
      },
    );
  },
);


/* =========================================================
 * 11. AUDIT APPEND-ONLY DATABASE POLICY
 * ======================================================= */

describe(
  "audit log database protections",
  () => {
    const rlsMigration =
      readRepositoryFile(
        "supabase/migrations/002_v1_rls.sql",
      );


    const policyStatements =
      rlsMigration
        .split(
          ";",
        )
        .filter(
          (statement) =>
            /create\s+policy/i.test(
              statement,
            ) &&
            /audit_logs/i.test(
              statement,
            ),
        );


    it(
      "defines audit policies explicitly",
      () => {
        expect(
          policyStatements.length,
        ).toBeGreaterThan(
          0,
        );
      },
    );


    it(
      "does not create an UPDATE audit policy",
      () => {
        const updatePolicies =
          policyStatements.filter(
            (statement) =>
              /for\s+update/i.test(
                statement,
              ),
          );


        expect(
          updatePolicies,
        ).toHaveLength(
          0,
        );
      },
    );


    it(
      "does not create a DELETE audit policy",
      () => {
        const deletePolicies =
          policyStatements.filter(
            (statement) =>
              /for\s+delete/i.test(
                statement,
              ),
          );


        expect(
          deletePolicies,
        ).toHaveLength(
          0,
        );
      },
    );
  },
);


/* =========================================================
 * 12. AUDIT APPLICATION WRITER
 * ======================================================= */

describe(
  "audit application writer",
  () => {
    it(
      "does not call update or delete on audit records",
      () => {
        const source =
          readRepositoryFile(
            "lib/audit.ts",
          );


        expect(
          source,
        ).not.toMatch(
          /\.\s*update\s*\(/,
        );

        expect(
          source,
        ).not.toMatch(
          /\.\s*delete\s*\(/,
        );
      },
    );


    it(
      "contains an insert path for audit events",
      () => {
        const source =
          normalizeSource(
            readRepositoryFile(
              "lib/audit.ts",
            ),
          );


        expect(
          source,
        ).toContain(
          "audit_logs",
        );

        expect(
          source,
        ).toMatch(
          /\.\s*insert\s*\(/,
        );
      },
    );
  },
);


/* =========================================================
 * 13. AI TOOL ALLOW-LIST
 * ======================================================= */

describe(
  "AI tool allow-list",
  () => {
    const expectedTools =
      [
        "get_dashboard_snapshot",
        "get_finance_snapshot",
        "get_investment_snapshot",
        "get_goal_status",
        "get_learning_status",
        "simulate_decision",
        "search_opportunities",
      ] as const;


    it(
      "contains exactly the seven approved tools",
      () => {
        expect(
          [
            ...AI_TOOL_NAMES,
          ].sort(),
        ).toEqual(
          [
            ...expectedTools,
          ].sort(),
        );
      },
    );


    it(
      "does not expose financial execution tools",
      () => {
        const names =
          AI_TOOL_NAMES
            .join(
              " ",
            )
            .toLowerCase();


        const prohibited =
          [
            "transfer_money",
            "send_money",
            "buy",
            "sell",
            "trade",
            "broker",
            "rebalance",
          ];


        for (
          const term of prohibited
        ) {
          expect(
            names,
          ).not.toContain(
            term,
          );
        }
      },
    );


    it(
      "does not expose messaging, shell or database execution tools",
      () => {
        const names =
          AI_TOOL_NAMES
            .join(
              " ",
            )
            .toLowerCase();


        const prohibited =
          [
            "send_email",
            "send_message",
            "shell",
            "command",
            "execute_sql",
            "delete_record",
            "change_password",
            "disable_mfa",
          ];


        for (
          const term of prohibited
        ) {
          expect(
            names,
          ).not.toContain(
            term,
          );
        }
      },
    );
  },
);


/* =========================================================
 * 14. AI API AUTHORIZATION
 * ======================================================= */

describe(
  "AI API authorization",
  () => {
    const aiRoute =
      readRepositoryFile(
        "app/api/ai/route.ts",
      );

    const opportunityRoute =
      readRepositoryFile(
        "app/api/opportunities/route.ts",
      );


    it(
      "/api/ai requires the AAL2 API boundary",
      () => {
        expect(
          aiRoute,
        ).toContain(
          "requireAAL2UserId",
        );
      },
    );


    it(
      "/api/opportunities requires the AAL2 API boundary",
      () => {
        expect(
          opportunityRoute,
        ).toContain(
          "requireAAL2UserId",
        );
      },
    );


    it(
      "both private AI routes disable response caching",
      () => {
        expect(
          normalizeSource(
            aiRoute,
          ),
        ).toContain(
          "no-store",
        );

        expect(
          normalizeSource(
            opportunityRoute,
          ),
        ).toContain(
          "no-store",
        );
      },
    );


    it(
      "both routes perform origin validation",
      () => {
        expect(
          aiRoute,
        ).toContain(
          "hasValidOrigin",
        );

        expect(
          opportunityRoute,
        ).toContain(
          "hasValidOrigin",
        );
      },
    );
  },
);


/* =========================================================
 * 15. AI ROUTE MODE RESTRICTION
 * ======================================================= */

describe(
  "AI route mode restriction",
  () => {
    it(
      "does not expose a generic execution mode",
      () => {
        const source =
          readRepositoryFile(
            "app/api/ai/route.ts",
          );


        expect(
          source,
        ).toMatch(
          /z\.literal\s*\(\s*"chief_of_staff"/,
        );

        expect(
          source,
        ).toMatch(
          /z\.literal\s*\(\s*"decision"/,
        );


        /**
         * Search only executable request-schema definitions,
         * not security comments explaining forbidden modes.
         */
        expect(
          source,
        ).not.toMatch(
          /z\.literal\s*\(\s*"execute"/,
        );

        expect(
          source,
        ).not.toMatch(
          /z\.literal\s*\(\s*"shell"/,
        );

        expect(
          source,
        ).not.toMatch(
          /z\.literal\s*\(\s*"sql"/,
        );
      },
    );
  },
);


/* =========================================================
 * 16. OPPORTUNITY CATEGORY ALLOW-LIST
 * ======================================================= */

describe(
  "opportunity search allow-list",
  () => {
    it(
      "accepts only the six locked V1 categories",
      () => {
        const source =
          readRepositoryFile(
            "app/api/opportunities/route.ts",
          );


        const categories =
          [
            "course",
            "certification",
            "job",
            "education",
            "professional_program",
            "development",
          ];


        for (
          const category of categories
        ) {
          expect(
            source,
          ).toContain(
            `"${category}"`,
          );
        }
      },
    );


    it(
      "contains explicit external URL protocol validation",
      () => {
        const source =
          readRepositoryFile(
            "app/api/opportunities/route.ts",
          );


        expect(
          source,
        ).toContain(
          '"https:"',
        );

        expect(
          source,
        ).toContain(
          '"http:"',
        );
      },
    );
  },
);


/* =========================================================
 * 17. PRIVATE PAGE AAL2 GUARDS
 * ======================================================= */

describe(
  "private page authorization",
  () => {
    const privatePages =
      [
        "app/dashboard/page.tsx",
        "app/goals/page.tsx",
        "app/projects/page.tsx",
        "app/finance/page.tsx",
        "app/investments/page.tsx",
        "app/career/page.tsx",
        "app/learning/page.tsx",
        "app/tasks/page.tsx",
        "app/settings/page.tsx",
        "app/audit/page.tsx",
      ] as const;


    for (
      const page of privatePages
    ) {
      it(
        `${page} contains an AAL2 page guard`,
        () => {
          const source =
            readRepositoryFile(
              page,
            );


          expect(
            source,
          ).toContain(
            "requireAAL2Identity",
          );
        },
      );
    }
  },
);


/* =========================================================
 * 18. ASSISTANT SERVER BOUNDARY
 * ======================================================= */

describe(
  "assistant privacy boundary",
  () => {
    it(
      "does not import the server data layer directly into the client Assistant page",
      () => {
        const source =
          readRepositoryFile(
            "app/assistant/page.tsx",
          );


        expect(
          source,
        ).not.toMatch(
          /from\s+["']@\/lib\/data["']/,
        );

        expect(
          source,
        ).not.toMatch(
          /from\s+["']@\/ai\/context["']/,
        );
      },
    );


    it(
      "calls only the two controlled HTTP AI endpoints",
      () => {
        const source =
          readRepositoryFile(
            "app/assistant/page.tsx",
          );


        expect(
          source,
        ).toContain(
          '"/api/ai"',
        );

        expect(
          source,
        ).toContain(
          '"/api/opportunities"',
        );
      },
    );
  },
);


/* =========================================================
 * 19. AUTH CALLBACK
 * ======================================================= */

describe(
  "authentication callback",
  () => {
    const source =
      readRepositoryFile(
        "app/auth/callback/route.ts",
      );


    it(
      "exchanges the one-time authorization code for a session",
      () => {
        expect(
          source,
        ).toContain(
          "exchangeCodeForSession",
        );
      },
    );


    it(
      "does not accept a browser-controlled next destination",
      () => {
        /**
         * Security check is intentionally targeted at query
         * retrieval rather than comments.
         */
        expect(
          source,
        ).not.toMatch(
          /searchParams\s*\.\s*get\s*\(\s*["']next["']/,
        );

        expect(
          source,
        ).not.toMatch(
          /searchParams\s*\.\s*get\s*\(\s*["']redirect["']/,
        );

        expect(
          source,
        ).not.toMatch(
          /searchParams\s*\.\s*get\s*\(\s*["']returnTo["']/,
        );
      },
    );


    it(
      "does not invoke AI from the authentication callback",
      () => {
        expect(
          source,
        ).not.toMatch(
          /@\/ai\//,
        );

        expect(
          source,
        ).not.toContain(
          "OPENAI_API_KEY",
        );
      },
    );
  },
);


/* =========================================================
 * 20. SECURITY HEADERS
 * ======================================================= */

describe(
  "application security headers",
  () => {
    const source =
      normalizeSource(
        readRepositoryFile(
          "next.config.ts",
        ),
      );


    it(
      "sets X-Content-Type-Options",
      () => {
        expect(
          source,
        ).toContain(
          "x-content-type-options",
        );

        expect(
          source,
        ).toContain(
          "nosniff",
        );
      },
    );


    it(
      "sets frame protection",
      () => {
        expect(
          source,
        ).toContain(
          "x-frame-options",
        );

        expect(
          source,
        ).toContain(
          "deny",
        );
      },
    );


    it(
      "sets a referrer policy",
      () => {
        expect(
          source,
        ).toContain(
          "referrer-policy",
        );
      },
    );


    it(
      "sets HSTS",
      () => {
        expect(
          source,
        ).toContain(
          "strict-transport-security",
        );
      },
    );


    it(
      "sets a permissions policy",
      () => {
        expect(
          source,
        ).toContain(
          "permissions-policy",
        );
      },
    );
  },
);


/* =========================================================
 * 21. GITHUB DATA SAFETY
 * ======================================================= */

describe(
  "repository data safety",
  () => {
    it(
      "keeps the SQL seed explicitly synthetic",
      () => {
        const source =
          normalizeSource(
            readRepositoryFile(
              "supabase/seed.sql",
            ),
          );


        expect(
          source,
        ).toContain(
          ".invalid",
        );

        expect(
          source,
        ).toContain(
          "life-os-dev@example.invalid",
        );
      },
    );


    it(
      "does not contain obvious consumer email domains in the synthetic seed",
      () => {
        const source =
          normalizeSource(
            readRepositoryFile(
              "supabase/seed.sql",
            ),
          );


        const forbiddenDomains =
          [
            "@gmail.com",
            "@hotmail.com",
            "@outlook.com",
            "@icloud.com",
            "@yahoo.com",
          ];


        for (
          const domain of forbiddenDomains
        ) {
          expect(
            source,
          ).not.toContain(
            domain,
          );
        }
      },
    );
  },
);


/* =========================================================
 * 22. CLIENT SECRET ISOLATION
 * ======================================================= */

describe(
  "client secret isolation",
  () => {
    it(
      "does not reference OPENAI_API_KEY from the browser Supabase client",
      () => {
        const source =
          readRepositoryFile(
            "lib/supabase/client.ts",
          );


        expect(
          source,
        ).not.toContain(
          "OPENAI_API_KEY",
        );
      },
    );


    it(
      "does not reference OPENAI_API_KEY from the client Assistant page",
      () => {
        const source =
          readRepositoryFile(
            "app/assistant/page.tsx",
          );


        expect(
          source,
        ).not.toContain(
          "OPENAI_API_KEY",
        );
      },
    );


    it(
      "does not expose the OpenAI key as a NEXT_PUBLIC variable",
      () => {
        const source =
          readRepositoryFile(
            ".env.example",
          );


        expect(
          source,
        ).not.toContain(
          "NEXT_PUBLIC_OPENAI",
        );
      },
    );
  },
);


/* =========================================================
 * 23. NO BANK / BROKER INTEGRATION
 * ======================================================= */

describe(
  "V1 execution boundary",
  () => {
    it(
      "does not include bank or brokerage environment credentials",
      () => {
        const source =
          normalizeSource(
            readRepositoryFile(
              ".env.example",
            ),
          );


        const prohibited =
          [
            "broker_api",
            "broker_key",
            "bank_api",
            "bank_key",
            "trading_api",
            "trading_key",
          ];


        for (
          const term of prohibited
        ) {
          expect(
            source,
          ).not.toContain(
            term,
          );
        }
      },
    );
  },
);


/* =========================================================
 * 24. DATABASE OWNERSHIP COLUMN
 * ======================================================= */

describe(
  "database ownership model",
  () => {
    it(
      "defines user ownership across the V1 schema",
      () => {
        const source =
          normalizeSource(
            readRepositoryFile(
              "supabase/migrations/001_v1_schema.sql",
            ),
          );


        for (
          const table of USER_OWNED_TABLES
        ) {
          expect(
            source,
          ).toContain(
            table,
          );
        }


        expect(
          source,
        ).toContain(
          "user_id",
        );
      },
    );
  },
);


/* =========================================================
 * 25. SECURITY TEST ISOLATION
 * ======================================================= */

/**
 * security.test.ts is intentionally static / deterministic.
 *
 * It does not require:
 *
 * production Supabase
 * a real authentication session
 * OpenAI
 * internet access
 * production secrets
 *
 *
 * This means the security contract can be checked on every
 * GitHub Actions run safely.
 */


/* =========================================================
 * 26. DEFENSE-IN-DEPTH RULE
 * ======================================================= */

/**
 * LIFE OS security is not one test or one component.
 *
 * Expected layers:
 *
 * Git secret hygiene
 *      ↓
 * Environment validation
 *      ↓
 * Supabase authentication
 *      ↓
 * TOTP / AAL2
 *      ↓
 * Server authorization
 *      ↓
 * PostgreSQL RLS
 *      ↓
 * AI allow-list
 *      ↓
 * Audit trail
 */


/* =========================================================
 * 27. SECURITY REGRESSION RULE
 * ======================================================= */

/**
 * These tests intentionally fail if a future change:
 *
 * removes RLS
 * removes FORCE RLS
 * adds a service-role runtime credential
 * restores middleware.ts
 * bypasses verified claims
 * removes AAL2 page guards
 * exposes an execution AI tool
 * makes audit history editable
 * exposes unsafe external URLs
 * places secrets in client code
 */


/* =========================================================
 * 28. FINAL SECURITY TEST RULE
 * ======================================================= */

/**
 * Security changes should not rely on:
 *
 * "I think this is still safe."
 *
 *
 * They should be able to survive:
 *
 * npm test
 * npm run typecheck
 * npm run lint
 * npm run build
 *
 *
 * Trust the architecture.
 * Verify the implementation.
 */