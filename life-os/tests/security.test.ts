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
  REQUIRED_AUTHENTICATION_LEVEL,
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
 * 3. REGEX HELPERS
 * ======================================================= */

function escapeRegExp(
  value: string,
): string {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
}


function tableSecurityPattern(
  table: string,
  command: "enable" | "force",
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
 * 4. ENVIRONMENT SECURITY
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
      "does not expose privileged Supabase credentials",
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
 * 5. NO SERVICE ROLE IN RUNTIME
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
 * 6. VERIFIED AUTHENTICATION
 * ======================================================= */

describe(
  "verified authentication",
  () => {
    it(
      "uses verified JWT claims",
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
      "does not use getSession as identity authority",
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
      "uses AAL1 as the password-only V1 authentication level",
      () => {
        expect(
          REQUIRED_AUTHENTICATION_LEVEL,
        ).toBe(
          "aal1",
        );
      },
    );


    it(
      "does not perform MFA operations in the central auth module",
      () => {
        const source =
          readRepositoryFile(
            "lib/auth.ts",
          );

        expect(
          source,
        ).not.toMatch(
          /auth\.mfa/,
        );
      },
    );


    it(
      "retains the legacy AAL2 assertion name as an authenticated alias",
      () => {
        const source =
          readRepositoryFile(
            "lib/auth.ts",
          );

        expect(
          source,
        ).toContain(
          "assertAAL2Identity",
        );

        expect(
          source,
        ).toContain(
          "return assertAuthenticatedIdentity();",
        );
      },
    );


    it(
      "retains the legacy AAL2 page guard name as an authenticated alias",
      () => {
        const source =
          readRepositoryFile(
            "lib/auth.ts",
          );

        expect(
          source,
        ).toContain(
          "requireAAL2Identity",
        );

        expect(
          source,
        ).toContain(
          "return requireAuthenticatedIdentity();",
        );
      },
    );
  },
);


/* =========================================================
 * 7. PASSWORD-ONLY LOGIN
 * ======================================================= */

describe(
  "password-only login",
  () => {
    const source =
      readRepositoryFile(
        "app/login/page.tsx",
      );


    it(
      "uses password authentication",
      () => {
        expect(
          source,
        ).toContain(
          "signInWithPassword",
        );
      },
    );


    it(
      "does not contain MFA API calls",
      () => {
        expect(
          source,
        ).not.toMatch(
          /auth\.mfa/,
        );
      },
    );


    it(
      "does not use the MFA code schema",
      () => {
        expect(
          source,
        ).not.toContain(
          "mfaCodeSchema",
        );
      },
    );


    it(
      "does not challenge or verify TOTP",
      () => {
        expect(
          source,
        ).not.toContain(
          "challengeAndVerify",
        );

        expect(
          source,
        ).not.toContain(
          "factorType",
        );
      },
    );


    it(
      "redirects authenticated users to the normal private route",
      () => {
        expect(
          source,
        ).toContain(
          "DEFAULT_AUTHENTICATED_ROUTE",
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
      "uses proxy.ts instead of middleware.ts",
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
      "exports the proxy function",
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
      "uses verified claims",
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
    const source =
      normalizeSource(
        readRepositoryFile(
          "supabase/migrations/002_v1_rls.sql",
        ),
      );


    it(
      "uses authenticated user identity",
      () => {
        expect(
          source,
        ).toContain(
          "auth.uid()",
        );
      },
    );


    it(
      "grants normal table access only to authenticated users",
      () => {
        expect(
          source,
        ).toContain(
          "to authenticated",
        );
      },
    );


    it(
      "explicitly revokes default anonymous access",
      () => {
        expect(
          source,
        ).toContain(
          "from anon, authenticated",
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
      "defines audit policies",
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
      "does not update or delete audit records",
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
      "contains the insert path for audit events",
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
            "change_authentication",
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
      "/api/ai uses the centralized user-id authorization boundary",
      () => {
        expect(
          aiRoute,
        ).toContain(
          "requireAAL2UserId",
        );
      },
    );


    it(
      "/api/opportunities uses the centralized user-id authorization boundary",
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
      "both private AI routes validate request origin",
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
      "does not expose generic execution modes",
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
      "contains external URL protocol validation",
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
 * 17. PRIVATE PAGE AUTHENTICATION GUARDS
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
        `${page} contains the centralized private-page guard`,
        () => {
          const source =
            readRepositoryFile(
              page,
            );

          /**
           * The legacy function name is intentionally kept.
           *
           * lib/auth.ts now maps it to the normal verified
           * authenticated identity guard.
           */
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
      "does not accept browser-controlled redirect destinations",
      () => {
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
      "does not route authenticated users into an MFA step",
      () => {
        expect(
          source,
        ).not.toContain(
          "?step=mfa",
        );

        expect(
          source,
        ).not.toContain(
          "?step=enroll",
        );
      },
    );


    it(
      "does not invoke AI",
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
 * 20. ROOT AUTH ROUTING
 * ======================================================= */

describe(
  "root authentication routing",
  () => {
    const source =
      readRepositoryFile(
        "app/page.tsx",
      );


    it(
      "routes signed-in users to the authenticated workspace",
      () => {
        expect(
          source,
        ).toContain(
          "DEFAULT_AUTHENTICATED_ROUTE",
        );
      },
    );


    it(
      "does not route through MFA screens",
      () => {
        expect(
          source,
        ).not.toContain(
          "?step=mfa",
        );

        expect(
          source,
        ).not.toContain(
          "?step=enroll",
        );
      },
    );
  },
);


/* =========================================================
 * 21. SECURITY HEADERS
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
 * 22. GITHUB DATA SAFETY
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
      "does not contain common consumer email domains in the seed",
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
 * 23. CLIENT SECRET ISOLATION
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
      "does not expose the OpenAI key as NEXT_PUBLIC",
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
 * 24. NO BANK / BROKER INTEGRATION
 * ======================================================= */

describe(
  "V1 execution boundary",
  () => {
    it(
      "does not include bank or brokerage credentials",
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
 * 25. DATABASE OWNERSHIP MODEL
 * ======================================================= */

describe(
  "database ownership model",
  () => {
    it(
      "defines all V1 user-owned tables",
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
      },
    );


    it(
      "defines the user ownership column",
      () => {
        const source =
          normalizeSource(
            readRepositoryFile(
              "supabase/migrations/001_v1_schema.sql",
            ),
          );

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
 * 26. SECURITY TEST ISOLATION
 * ======================================================= */

/**
 * security.test.ts remains static and deterministic.
 *
 * It does not require:
 *
 * - production Supabase access
 * - a real user session
 * - OpenAI
 * - internet access
 * - production secrets
 */


/* =========================================================
 * 27. DEFENSE IN DEPTH
 * ======================================================= */

/**
 * LIFE OS V1 security:
 *
 * Git secret hygiene
 *      ↓
 * Environment validation
 *      ↓
 * Email + password
 *      ↓
 * Verified Supabase JWT
 *      ↓
 * Server authorization
 *      ↓
 * PostgreSQL FORCE RLS
 *      ↓
 * user_id ownership
 *      ↓
 * AI allow-list
 *      ↓
 * append-oriented audit trail
 *
 *
 * Password-only authentication intentionally replaces the
 * previous mandatory MFA requirement.
 *
 * Removing MFA does NOT remove:
 *
 * - verified JWT checks
 * - private route guards
 * - server authorization
 * - RLS
 * - row ownership
 * - secret isolation
 */


/* =========================================================
 * 28. SECURITY REGRESSION RULE
 * ======================================================= */

/**
 * These tests intentionally fail if a future change:
 *
 * - removes RLS
 * - removes FORCE RLS
 * - adds a service-role runtime credential
 * - restores middleware.ts
 * - bypasses verified claims
 * - removes private page guards
 * - restores mandatory MFA into the login flow
 * - exposes an execution AI tool
 * - makes audit history editable
 * - places secrets in browser code
 */


/* =========================================================
 * 29. FINAL SECURITY TEST RULE
 * ======================================================= */

/**
 * Security changes should survive:
 *
 * npm test
 * npm run typecheck
 * npm run lint
 * npm run build
 *
 *
 * Simple outside.
 * Protected underneath.
 */