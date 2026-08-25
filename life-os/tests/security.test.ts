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
  APPLICATION_SAFETY_DEFAULTS,
  LIFE_OS_TABLES,
  PRIVATE_DOCUMENT_STORAGE_BUCKET,
  PROTECTED_ROUTES,
  REQUIRED_AUTHENTICATION_LEVEL,
} from "@/lib/constants";


/* =========================================================
 * LIFE OS V2
 * FINAL SECURITY REGRESSION TESTS
 *
 * Protects:
 *
 * authentication
 * route protection
 * secret isolation
 * PostgreSQL RLS
 * Storage RLS
 * Universal Intake
 * Travel OS
 * private PDFs
 * deterministic executors
 * LIFE AI read-only boundaries
 * audit integrity
 *
 *
 * Static and deterministic only.
 *
 * No:
 *
 * production database
 * internet
 * OpenAI
 * real user
 * real secret
 * real private file
 * ======================================================= */


/* =========================================================
 * 1. REPOSITORY HELPERS
 * ======================================================= */

const ROOT =
  process.cwd();


function repositoryPath(
  relativePath:
    string,
): string {
  return join(
    ROOT,
    relativePath,
  );
}


function readRepositoryFile(
  relativePath:
    string,
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
  source:
    string,
): string {
  return source
    .replace(
      /\r\n/g,
      "\n",
    )
    .toLowerCase();
}


/* =========================================================
 * 2. REGEX HELPERS
 * ======================================================= */

function escapeRegExp(
  value:
    string,
): string {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
}


function tableSecurityPattern(
  table:
    string,

  command:
    "enable" |
    "force",
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
 * 3. V1 USER-OWNED TABLES
 * ======================================================= */

const V1_USER_OWNED_TABLES = [
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
 * 4. V2 SECURITY TABLES
 * ======================================================= */

const V2_USER_OWNED_TABLES = [
  "intake_items",
  "trips",
  "documents",
] as const;


/* =========================================================
 * 5. ENVIRONMENT SECURITY
 * ======================================================= */

describe(
  "environment security",
  () => {
    it(
      "documents only the required application environment variables",
      () => {
        const source =
          readRepositoryFile(
            ".env.example",
          );


        const variables =
          source
            .split(
              /\r?\n/,
            )
            .map(
              (
                line,
              ) =>
                line.trim(),
            )
            .filter(
              (
                line,
              ) =>
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
              (
                line,
              ) =>
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
          [
            ...variables,
          ].sort(),
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
      "does not document privileged Supabase credentials",
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
          "supabase_service_role",
        );


        expect(
          source,
        ).not.toContain(
          "service_role_key",
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


    it(
      "does not expose OpenAI through NEXT_PUBLIC",
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
 * 6. NO SERVICE ROLE IN APPLICATION RUNTIME
 * ======================================================= */

describe(
  "Supabase runtime credential isolation",
  () => {
    const runtimeFiles = [
      "lib/env.ts",
      "lib/supabase/client.ts",
      "lib/supabase/server.ts",
      "lib/auth.ts",
      "lib/intake-data.ts",
      "lib/intake-executor.ts",
      "lib/travel-data.ts",
      "ai/context.ts",
      "app/api/intake/preview/route.ts",
      "app/api/intake/confirm/route.ts",
      "proxy.ts",
    ] as const;


    for (
      const file of
        runtimeFiles
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


          expect(
            source,
          ).not.toContain(
            "database_password",
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
    const source =
      readRepositoryFile(
        "lib/auth.ts",
      );


    it(
      "uses verified JWT claims",
      () => {
        expect(
          source,
        ).toMatch(
          /\.getClaims\s*\(/,
        );
      },
    );


    it(
      "does not use getSession as authorization proof",
      () => {
        expect(
          source,
        ).not.toMatch(
          /\.getSession\s*\(/,
        );
      },
    );


    it(
      "derives the authenticated ID from verified claims",
      () => {
        expect(
          source,
        ).toContain(
          '"sub"',
        );


        expect(
          source,
        ).toContain(
          "uuidSchema.safeParse",
        );
      },
    );


    it(
      "accepts AAL1 as the normal V2 authentication level",
      () => {
        expect(
          REQUIRED_AUTHENTICATION_LEVEL,
        ).toBe(
          "aal1",
        );
      },
    );


    it(
      "exports the final authenticated identity assertion",
      () => {
        expect(
          source,
        ).toContain(
          "assertAuthenticatedIdentity",
        );
      },
    );


    it(
      "exports the final authenticated page guard",
      () => {
        expect(
          source,
        ).toContain(
          "requireAuthenticatedIdentity",
        );
      },
    );


    it(
      "retains the legacy AAL2 aliases only as compatibility wrappers",
      () => {
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


    it(
      "does not perform MFA operations in the central auth module",
      () => {
        expect(
          source,
        ).not.toMatch(
          /auth\.mfa/,
        );
      },
    );
  },
);


/* =========================================================
 * 8. PASSWORD LOGIN
 * ======================================================= */

describe(
  "password authentication",
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
      "does not require MFA API operations",
      () => {
        expect(
          source,
        ).not.toMatch(
          /auth\.mfa/,
        );


        expect(
          source,
        ).not.toContain(
          "challengeAndVerify",
        );
      },
    );


    it(
      "routes authenticated users to the normal private workspace",
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
 * 9. PROTECTED ROUTE REGISTRY
 * ======================================================= */

describe(
  "V2 protected routes",
  () => {
    const expectedRoutes = [
      "/dashboard",
      "/finance",
      "/goals",
      "/travel",
      "/learning",
      "/assistant",
      "/investments",
      "/projects",
      "/career",
      "/tasks",
      "/audit",
      "/settings",
      "/onboarding",
    ] as const;


    it(
      "contains every private V2 route",
      () => {
        for (
          const route of
            expectedRoutes
        ) {
          expect(
            PROTECTED_ROUTES,
          ).toContain(
            route,
          );
        }
      },
    );


    it(
      "protects Travel",
      () => {
        expect(
          PROTECTED_ROUTES,
        ).toContain(
          "/travel",
        );
      },
    );


    it(
      "protects onboarding",
      () => {
        expect(
          PROTECTED_ROUTES,
        ).toContain(
          "/onboarding",
        );
      },
    );
  },
);


/* =========================================================
 * 10. NEXT.JS 16 PROXY
 * ======================================================= */

describe(
  "Next.js authentication proxy",
  () => {
    const source =
      readRepositoryFile(
        "proxy.ts",
      );


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
      "uses the canonical protected route registry",
      () => {
        expect(
          source,
        ).toContain(
          "PROTECTED_ROUTES",
        );
      },
    );


    it(
      "does not redirect API requests into an HTML login response",
      () => {
        expect(
          source,
        ).toContain(
          "isApiRoute",
        );
      },
    );


    it(
      "preserves refreshed Supabase cookies during login redirects",
      () => {
        expect(
          source,
        ).toContain(
          "copyAuthCookies",
        );
      },
    );
  },
);


/* =========================================================
 * 11. V1 ROW LEVEL SECURITY
 * ======================================================= */

describe(
  "V1 PostgreSQL RLS",
  () => {
    const source =
      readRepositoryFile(
        "supabase/migrations/002_v1_rls.sql",
      );


    for (
      const table of
        V1_USER_OWNED_TABLES
    ) {
      it(
        `enables RLS on ${table}`,
        () => {
          expect(
            source,
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
            source,
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
 * 12. V1 RLS OWNERSHIP
 * ======================================================= */

describe(
  "V1 RLS ownership policies",
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
      "grants normal table access to authenticated users",
      () => {
        expect(
          source,
        ).toContain(
          "to authenticated",
        );
      },
    );


    it(
      "revokes default anonymous privileges",
      () => {
        expect(
          source,
        ).toContain(
          "from public, anon, authenticated",
        );
      },
    );
  },
);


/* =========================================================
 * 13. UNIVERSAL INTAKE TABLE SECURITY
 * ======================================================= */

describe(
  "Universal Intake RLS",
  () => {
    const source =
      readRepositoryFile(
        "supabase/migrations/004_v2_intake_items.sql",
      );


    it(
      "enables RLS on intake_items",
      () => {
        expect(
          source,
        ).toMatch(
          tableSecurityPattern(
            "intake_items",
            "enable",
          ),
        );
      },
    );


    it(
      "forces RLS on intake_items",
      () => {
        expect(
          source,
        ).toMatch(
          tableSecurityPattern(
            "intake_items",
            "force",
          ),
        );
      },
    );


    it(
      "uses auth.uid ownership",
      () => {
        expect(
          normalizeSource(
            source,
          ),
        ).toContain(
          "auth.uid()",
        );
      },
    );


    it(
      "does not grant hard-delete access to authenticated users",
      () => {
        const normalized =
          normalizeSource(
            source,
          );


        const grantBlockMatch =
          normalized.match(
            /grant[\s\S]*?on table public\.intake_items[\s\S]*?to authenticated;/,
          );


        expect(
          grantBlockMatch,
        ).not.toBeNull();


        expect(
          grantBlockMatch?.[0],
        ).not.toContain(
          "delete",
        );
      },
    );


    it(
      "stores proposals rather than PDF binary content",
      () => {
        const normalized =
          normalizeSource(
            source,
          );


        expect(
          normalized,
        ).toContain(
          "proposed_payload",
        );


        expect(
          normalized,
        ).not.toContain(
          "bytea",
        );
      },
    );
  },
);


/* =========================================================
 * 14. V2 TABLE REGISTRY
 * ======================================================= */

describe(
  "V2 table registry",
  () => {
    it(
      "contains all three V2 security-sensitive tables",
      () => {
        for (
          const table of
            V2_USER_OWNED_TABLES
        ) {
          expect(
            LIFE_OS_TABLES,
          ).toContain(
            table,
          );
        }
      },
    );


    it(
      "contains no duplicate application tables",
      () => {
        expect(
          new Set(
            LIFE_OS_TABLES,
          ).size,
        ).toBe(
          LIFE_OS_TABLES.length,
        );
      },
    );
  },
);


/* =========================================================
 * 15. TRAVEL TABLE RLS
 * ======================================================= */

describe(
  "Travel PostgreSQL RLS",
  () => {
    const source =
      readRepositoryFile(
        "supabase/migrations/009_v2_travel_documents.sql",
      );


    for (
      const table of [
        "trips",
        "documents",
      ] as const
    ) {
      it(
        `enables RLS on ${table}`,
        () => {
          expect(
            source,
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
            source,
          ).toMatch(
            tableSecurityPattern(
              table,
              "force",
            ),
          );
        },
      );
    }


    it(
      "uses auth.uid ownership for Travel rows",
      () => {
        expect(
          normalizeSource(
            source,
          ),
        ).toContain(
          "auth.uid()",
        );
      },
    );


    it(
      "defines owner-only trip policies",
      () => {
        const normalized =
          normalizeSource(
            source,
          );


        expect(
          normalized,
        ).toContain(
          "trips_select_own",
        );


        expect(
          normalized,
        ).toContain(
          "trips_insert_own",
        );


        expect(
          normalized,
        ).toContain(
          "trips_update_own",
        );


        expect(
          normalized,
        ).toContain(
          "trips_delete_own",
        );
      },
    );


    it(
      "defines owner-only document policies",
      () => {
        const normalized =
          normalizeSource(
            source,
          );


        expect(
          normalized,
        ).toContain(
          "documents_select_own",
        );


        expect(
          normalized,
        ).toContain(
          "documents_insert_own",
        );


        expect(
          normalized,
        ).toContain(
          "documents_update_own",
        );


        expect(
          normalized,
        ).toContain(
          "documents_delete_own",
        );
      },
    );
  },
);


/* =========================================================
 * 16. PRIVATE DOCUMENT DATABASE CONSTRAINTS
 * ======================================================= */

describe(
  "private document database constraints",
  () => {
    const source =
      normalizeSource(
        readRepositoryFile(
          "supabase/migrations/009_v2_travel_documents.sql",
        ),
      );


    it(
      "allows PDF MIME only",
      () => {
        expect(
          source,
        ).toContain(
          "application/pdf",
        );


        expect(
          source,
        ).toContain(
          "documents_pdf_only_check",
        );
      },
    );


    it(
      "limits files to 15 MB",
      () => {
        expect(
          source,
        ).toContain(
          "15728640",
        );


        expect(
          source,
        ).toContain(
          "documents_file_size_check",
        );
      },
    );


    it(
      "uses the fixed private bucket",
      () => {
        expect(
          source,
        ).toContain(
          PRIVATE_DOCUMENT_STORAGE_BUCKET,
        );


        expect(
          source,
        ).toContain(
          "documents_storage_bucket_check",
        );
      },
    );


    it(
      "requires the storage path to begin with row owner ID",
      () => {
        expect(
          source,
        ).toContain(
          "documents_storage_path_owner_check",
        );


        expect(
          source,
        ).toMatch(
          /split_part\s*\([\s\S]*?storage_path[\s\S]*?'\/'[\s\S]*?1[\s\S]*?\)\s*=\s*user_id::text/,
        );
      },
    );
  },
);


/* =========================================================
 * 17. PRIVATE STORAGE BUCKET
 * ======================================================= */

describe(
  "private Supabase document Storage",
  () => {
    const source =
      normalizeSource(
        readRepositoryFile(
          "supabase/migrations/009_v2_travel_documents.sql",
        ),
      );


    it(
      "creates the canonical private bucket",
      () => {
        expect(
          source,
        ).toContain(
          PRIVATE_DOCUMENT_STORAGE_BUCKET,
        );
      },
    );


    it(
      "creates the bucket as non-public",
      () => {
        expect(
          source,
        ).toMatch(
          /insert\s+into\s+storage\.buckets[\s\S]*?values\s*\([\s\S]*?'life-os-private-documents'[\s\S]*?'life-os-private-documents'[\s\S]*?false[\s\S]*?15728640/,
        );
      },
    );


    it(
      "restricts the Storage MIME type to PDF",
      () => {
        expect(
          source,
        ).toMatch(
          /allowed_mime_types[\s\S]*?'application\/pdf'/,
        );
      },
    );


    it(
      "defines authenticated owner-only Storage policies",
      () => {
        expect(
          source,
        ).toContain(
          "life_os_private_documents_select_own",
        );


        expect(
          source,
        ).toContain(
          "life_os_private_documents_insert_own",
        );


        expect(
          source,
        ).toContain(
          "life_os_private_documents_update_own",
        );


        expect(
          source,
        ).toContain(
          "life_os_private_documents_delete_own",
        );
      },
    );


    it(
      "requires the first Storage path segment to equal auth.uid",
      () => {
        expect(
          source,
        ).toMatch(
          /split_part\s*\(\s*name\s*,\s*'\/'\s*,\s*1\s*\)\s*=\s*auth\.uid\(\)::text/,
        );
      },
    );
  },
);


/* =========================================================
 * 18. TRAVEL DATA LAYER
 * ======================================================= */

describe(
  "Travel data layer security",
  () => {
    const source =
      readRepositoryFile(
        "lib/travel-data.ts",
      );


    const normalized =
      normalizeSource(
        source,
      );


    it(
      "starts from verified authenticated identity",
      () => {
        expect(
          source,
        ).toContain(
          "assertAuthenticatedIdentity",
        );
      },
    );


    it(
      "derives user ownership server-side",
      () => {
        expect(
          source,
        ).toContain(
          "identity.id",
        );


        expect(
          source,
        ).toContain(
          "user_id:",
        );
      },
    );


    it(
      "generates private document paths server-side",
      () => {
        expect(
          source,
        ).toContain(
          "crypto.randomUUID",
        );


        expect(
          source,
        ).toContain(
          "buildPrivatePdfStoragePath",
        );
      },
    );


    it(
      "does not generate public document URLs",
      () => {
        expect(
          source,
        ).not.toContain(
          "getPublicUrl",
        );
      },
    );


    it(
      "uses short-lived signed URLs",
      () => {
        expect(
          source,
        ).toContain(
          "createSignedUrl",
        );


        expect(
          source,
        ).toContain(
          "normalizeSignedUrlExpiry",
        );
      },
    );


    it(
      "uploads with upsert disabled",
      () => {
        expect(
          normalized,
        ).toContain(
          "upsert:",
        );


        expect(
          normalized,
        ).toMatch(
          /upsert\s*:\s*false/,
        );
      },
    );


    it(
      "removes an uploaded object if metadata persistence fails",
      () => {
        expect(
          source,
        ).toContain(
          ".remove([",
        );
      },
    );
  },
);


/* =========================================================
 * 19. TRAVEL EXECUTOR SECURITY
 * ======================================================= */

describe(
  "deterministic Travel intake executor",
  () => {
    const source =
      normalizeSource(
        readRepositoryFile(
          "supabase/migrations/010_v2_travel_intake_executor.sql",
        ),
      );


    it(
      "uses SECURITY INVOKER",
      () => {
        expect(
          source,
        ).toMatch(
          /language\s+plpgsql\s+security\s+invoker/,
        );
      },
    );


    it(
      "does not use SECURITY DEFINER",
      () => {
        expect(
          source,
        ).not.toMatch(
          /\bsecurity\s+definer\b/,
        );
      },
    );


    it(
      "requires auth.uid",
      () => {
        expect(
          source,
        ).toContain(
          "auth.uid()",
        );
      },
    );


    it(
      "requires approved intake",
      () => {
        expect(
          source,
        ).toContain(
          "v_intake.status <> 'approved'",
        );


        expect(
          source,
        ).toContain(
          "approved_at",
        );
      },
    );


    it(
      "supports create_trip only",
      () => {
        expect(
          source,
        ).toContain(
          "v_action <> 'create_trip'",
        );
      },
    );


    it(
      "locks the intake before execution",
      () => {
        expect(
          source,
        ).toContain(
          "for update",
        );
      },
    );


    it(
      "implements an idempotent applied state",
      () => {
        expect(
          source,
        ).toContain(
          "v_intake.status = 'applied'",
        );


        expect(
          source,
        ).toContain(
          "v_intake.target_entity_id",
        );
      },
    );


    it(
      "revokes execution from public",
      () => {
        expect(
          source,
        ).toMatch(
          /revoke\s+all\s+privileges[\s\S]*?execute_travel_intake\(uuid\)[\s\S]*?from public/,
        );
      },
    );


    it(
      "revokes execution from anon",
      () => {
        expect(
          source,
        ).toMatch(
          /revoke\s+all\s+privileges[\s\S]*?execute_travel_intake\(uuid\)[\s\S]*?from anon/,
        );
      },
    );


    it(
      "grants execution only through authenticated role",
      () => {
        expect(
          source,
        ).toMatch(
          /grant\s+execute[\s\S]*?execute_travel_intake\(uuid\)[\s\S]*?to authenticated/,
        );
      },
    );
  },
);


/* =========================================================
 * 20. GENERIC INTAKE EXECUTOR
 * ======================================================= */

describe(
  "TypeScript intake executor security",
  () => {
    const source =
      readRepositoryFile(
        "lib/intake-executor.ts",
      );


    it(
      "uses an exact deterministic kind dispatcher",
      () => {
        expect(
          source,
        ).toContain(
          'case "finance"',
        );


        expect(
          source,
        ).toContain(
          'case "plan"',
        );


        expect(
          source,
        ).toContain(
          'case "growth"',
        );


        expect(
          source,
        ).toContain(
          'case "travel"',
        );
      },
    );


    it(
      "uses the dedicated Travel RPC",
      () => {
        expect(
          source,
        ).toContain(
          "execute_travel_intake",
        );
      },
    );


    it(
      "does not send document intake through the generic executor",
      () => {
        expect(
          source,
        ).toContain(
          'case "document"',
        );


        expect(
          source,
        ).toContain(
          '"UNSUPPORTED_KIND"',
        );
      },
    );


    it(
      "does not accept arbitrary function names from AI",
      () => {
        expect(
          source,
        ).not.toContain(
          "proposal.function",
        );


        expect(
          source,
        ).not.toContain(
          "proposal.table",
        );
      },
    );
  },
);


/* =========================================================
 * 21. UNIVERSAL ADD PREVIEW ROUTE
 * ======================================================= */

describe(
  "Universal Add preview security",
  () => {
    const source =
      readRepositoryFile(
        "app/api/intake/preview/route.ts",
      );


    const normalized =
      normalizeSource(
        source,
      );


    it(
      "requires verified authentication",
      () => {
        expect(
          source,
        ).toContain(
          "assertAuthenticatedIdentity",
        );
      },
    );


    it(
      "uses the active strict V2 preview schema",
      () => {
        expect(
          source,
        ).toContain(
          "activeStrictIntakePreviewSchema",
        );
      },
    );


    it(
      "supports exact structured Travel proposal output",
      () => {
        expect(
          source,
        ).toContain(
          "TRAVEL_PROPOSAL_SCHEMA",
        );


        expect(
          source,
        ).toContain(
          '"create_trip"',
        );
      },
    );


    it(
      "disables response caching",
      () => {
        expect(
          normalized,
        ).toContain(
          "no-store",
        );
      },
    );


    it(
      "does not create durable intake records during preview",
      () => {
        expect(
          source,
        ).not.toContain(
          "createIntakeItem",
        );


        expect(
          source,
        ).not.toContain(
          "approveIntakeItem",
        );


        expect(
          source,
        ).not.toContain(
          "executeIntakeItem",
        );
      },
    );


    it(
      "does not upload private documents during preview",
      () => {
        expect(
          source,
        ).not.toContain(
          "uploadPrivatePdfDocument",
        );
      },
    );
  },
);


/* =========================================================
 * 22. UNIVERSAL ADD CONFIRM ROUTE
 * ======================================================= */

describe(
  "Universal Add confirmation security",
  () => {
    const source =
      readRepositoryFile(
        "app/api/intake/confirm/route.ts",
      );


    const normalized =
      normalizeSource(
        source,
      );


    it(
      "requires verified authentication",
      () => {
        expect(
          source,
        ).toContain(
          "assertAuthenticatedIdentity",
        );
      },
    );


    it(
      "validates the active strict preview again",
      () => {
        expect(
          source,
        ).toContain(
          "activeStrictIntakePreviewSchema",
        );
      },
    );


    it(
      "validates same origin",
      () => {
        expect(
          source,
        ).toContain(
          "hasValidOrigin",
        );
      },
    );


    it(
      "creates durable intake only in confirmation flow",
      () => {
        expect(
          source,
        ).toContain(
          "createIntakeItem",
        );
      },
    );


    it(
      "explicitly approves intake before deterministic execution",
      () => {
        expect(
          source,
        ).toContain(
          "approveIntakeItem",
        );


        expect(
          source,
        ).toContain(
          "executeIntakeItem",
        );
      },
    );


    it(
      "uses the private PDF pipeline for documents",
      () => {
        expect(
          source,
        ).toContain(
          "uploadPrivatePdfDocument",
        );
      },
    );


    it(
      "disables response caching",
      () => {
        expect(
          normalized,
        ).toContain(
          "no-store",
        );
      },
    );


    it(
      "does not use a service-role client",
      () => {
        expect(
          normalized,
        ).not.toContain(
          "supabase_service_role_key",
        );


        expect(
          normalized,
        ).not.toContain(
          "service_role_key",
        );
      },
    );
  },
);


/* =========================================================
 * 23. LIFE AI TOOL ALLOW-LIST
 * ======================================================= */

describe(
  "LIFE AI tool allow-list",
  () => {
    const expectedTools = [
      "get_dashboard_snapshot",
      "get_finance_snapshot",
      "get_investment_snapshot",
      "get_goal_status",
      "get_learning_status",
      "simulate_decision",
      "search_opportunities",
    ] as const;


    it(
      "contains exactly the approved seven tools",
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
      "does not expose direct execution tools",
      () => {
        const names =
          AI_TOOL_NAMES
            .join(
              " ",
            )
            .toLowerCase();


        const prohibited = [
          "transfer",
          "buy",
          "sell",
          "broker",
          "trade",
          "rebalance",
          "send_email",
          "send_message",
          "shell",
          "execute_sql",
          "delete_record",
          "upload_document",
          "change_password",
        ];


        for (
          const term of
            prohibited
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
 * 24. LIFE AI CONTEXT IS READ-ONLY
 * ======================================================= */

describe(
  "LIFE AI context boundary",
  () => {
    const source =
      readRepositoryFile(
        "ai/context.ts",
      );


    it(
      "contains Travel as a controlled context scope",
      () => {
        expect(
          source,
        ).toContain(
          '"travel"',
        );


        expect(
          source,
        ).toContain(
          "getTravelSnapshot",
        );
      },
    );


    it(
      "does not directly write database records",
      () => {
        expect(
          source,
        ).not.toMatch(
          /\.\s*(insert|update|delete|upsert)\s*\(/,
        );
      },
    );


    it(
      "does not create signed private-file URLs for AI",
      () => {
        expect(
          source,
        ).not.toContain(
          "createPrivateDocumentSignedUrl",
        );


        expect(
          source,
        ).not.toContain(
          "createSignedUrl",
        );
      },
    );


    it(
      "does not expose Storage paths to AI context",
      () => {
        expect(
          source,
        ).not.toContain(
          "storage_path:",
        );


        expect(
          source,
        ).not.toContain(
          "storage_bucket:",
        );
      },
    );
  },
);


/* =========================================================
 * 25. APPLICATION SAFETY DEFAULTS
 * ======================================================= */

describe(
  "V2 safety defaults",
  () => {
    it(
      "keeps autonomous execution disabled",
      () => {
        expect(
          APPLICATION_SAFETY_DEFAULTS
            .autonomousFinancialExecution,
        ).toBe(
          false,
        );


        expect(
          APPLICATION_SAFETY_DEFAULTS
            .autonomousEmailExecution,
        ).toBe(
          false,
        );


        expect(
          APPLICATION_SAFETY_DEFAULTS
            .autonomousDeletion,
        ).toBe(
          false,
        );


        expect(
          APPLICATION_SAFETY_DEFAULTS
            .autonomousIntakeExecution,
        ).toBe(
          false,
        );
      },
    );


    it(
      "keeps arbitrary code and SQL execution disabled",
      () => {
        expect(
          APPLICATION_SAFETY_DEFAULTS
            .arbitrarySqlEnabled,
        ).toBe(
          false,
        );


        expect(
          APPLICATION_SAFETY_DEFAULTS
            .shellExecutionEnabled,
        ).toBe(
          false,
        );
      },
    );


    it(
      "keeps direct AI database authority disabled",
      () => {
        expect(
          APPLICATION_SAFETY_DEFAULTS
            .aiDatabaseWriteAuthority,
        ).toBe(
          false,
        );
      },
    );


    it(
      "keeps bank and broker execution disabled",
      () => {
        expect(
          APPLICATION_SAFETY_DEFAULTS
            .directBankIntegration,
        ).toBe(
          false,
        );


        expect(
          APPLICATION_SAFETY_DEFAULTS
            .brokerExecution,
        ).toBe(
          false,
        );
      },
    );


    it(
      "keeps document Storage private",
      () => {
        expect(
          APPLICATION_SAFETY_DEFAULTS
            .publicDocumentStorage,
        ).toBe(
          false,
        );
      },
    );


    it(
      "keeps public registration disabled",
      () => {
        expect(
          APPLICATION_SAFETY_DEFAULTS
            .publicRegistrationEnabled,
        ).toBe(
          false,
        );
      },
    );
  },
);


/* =========================================================
 * 26. AI API AUTHORIZATION
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
      "keeps centralized authenticated user-ID authorization",
      () => {
        expect(
          aiRoute,
        ).toContain(
          "requireAAL2UserId",
        );


        expect(
          opportunityRoute,
        ).toContain(
          "requireAAL2UserId",
        );
      },
    );


    it(
      "disables caching for both private AI APIs",
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
      "validates request origin on both APIs",
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
 * 27. PRIVATE SERVER PAGE GUARDS
 * ======================================================= */

describe(
  "private Server Component authorization",
  () => {
    const pages = [
      "app/dashboard/page.tsx",
      "app/finance/page.tsx",
      "app/goals/page.tsx",
      "app/travel/page.tsx",
      "app/learning/page.tsx",
      "app/investments/page.tsx",
      "app/projects/page.tsx",
      "app/career/page.tsx",
      "app/tasks/page.tsx",
      "app/settings/page.tsx",
      "app/audit/page.tsx",
    ] as const;


    for (
      const page of
        pages
    ) {
      it(
        `${page} contains a centralized authenticated page guard`,
        () => {
          const source =
            readRepositoryFile(
              page,
            );


          expect(
            source,
          ).toMatch(
            /require(?:AuthenticatedIdentity|AAL2Identity)\s*\(/,
          );
        },
      );
    }
  },
);


/* =========================================================
 * 28. ASSISTANT CLIENT PRIVACY BOUNDARY
 * ======================================================= */

describe(
  "Assistant client boundary",
  () => {
    const source =
      readRepositoryFile(
        "app/assistant/page.tsx",
      );


    it(
      "does not import server data layer directly",
      () => {
        expect(
          source,
        ).not.toMatch(
          /from\s+["']@\/lib\/data["']/,
        );


        expect(
          source,
        ).not.toMatch(
          /from\s+["']@\/lib\/travel-data["']/,
        );


        expect(
          source,
        ).not.toMatch(
          /from\s+["']@\/ai\/context["']/,
        );
      },
    );


    it(
      "uses the controlled AI APIs",
      () => {
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


    it(
      "does not expose the OpenAI secret",
      () => {
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
 * 29. AUDIT APPEND-ORIENTED POLICY
 * ======================================================= */

describe(
  "audit log database protection",
  () => {
    const migration =
      readRepositoryFile(
        "supabase/migrations/002_v1_rls.sql",
      );


    const policyStatements =
      migration
        .split(
          ";",
        )
        .filter(
          (
            statement,
          ) =>
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
        expect(
          policyStatements.filter(
            (
              statement,
            ) =>
              /for\s+update/i.test(
                statement,
              ),
          ),
        ).toHaveLength(
          0,
        );
      },
    );


    it(
      "does not create a DELETE audit policy",
      () => {
        expect(
          policyStatements.filter(
            (
              statement,
            ) =>
              /for\s+delete/i.test(
                statement,
              ),
          ),
        ).toHaveLength(
          0,
        );
      },
    );
  },
);


/* =========================================================
 * 30. AUDIT APPLICATION WRITER
 * ======================================================= */

describe(
  "audit application writer",
  () => {
    const source =
      readRepositoryFile(
        "lib/audit.ts",
      );


    it(
      "does not update audit events",
      () => {
        expect(
          source,
        ).not.toMatch(
          /\.\s*update\s*\(/,
        );
      },
    );


    it(
      "does not delete audit events",
      () => {
        expect(
          source,
        ).not.toMatch(
          /\.\s*delete\s*\(/,
        );
      },
    );


    it(
      "contains the audit insert path",
      () => {
        expect(
          normalizeSource(
            source,
          ),
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
 * 31. AUTH CALLBACK
 * ======================================================= */

describe(
  "authentication callback",
  () => {
    const source =
      readRepositoryFile(
        "app/auth/callback/route.ts",
      );


    it(
      "exchanges only the authorization code for a session",
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
      "does not force an MFA workflow",
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
      "does not invoke LIFE AI",
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
 * 32. ROOT AUTH ROUTING
 * ======================================================= */

describe(
  "root authentication routing",
  () => {
    const source =
      readRepositoryFile(
        "app/page.tsx",
      );


    it(
      "uses the normal authenticated destination",
      () => {
        expect(
          source,
        ).toContain(
          "DEFAULT_AUTHENTICATED_ROUTE",
        );
      },
    );


    it(
      "does not force MFA routing",
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
 * 33. SECURITY HEADERS
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
 * 34. SYNTHETIC GITHUB DATA
 * ======================================================= */

describe(
  "repository data safety",
  () => {
    const source =
      normalizeSource(
        readRepositoryFile(
          "supabase/seed.sql",
        ),
      );


    it(
      "keeps the SQL seed explicitly synthetic",
      () => {
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
      "does not contain normal consumer email domains",
      () => {
        const forbiddenDomains = [
          "@gmail.com",
          "@hotmail.com",
          "@outlook.com",
          "@icloud.com",
          "@yahoo.com",
        ];


        for (
          const domain of
            forbiddenDomains
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
 * 35. CLIENT SECRET ISOLATION
 * ======================================================= */

describe(
  "client secret isolation",
  () => {
    const browserFiles = [
      "lib/supabase/client.ts",
      "app/assistant/page.tsx",
    ] as const;


    for (
      const file of
        browserFiles
    ) {
      it(
        `${file} does not reference OPENAI_API_KEY`,
        () => {
          expect(
            readRepositoryFile(
              file,
            ),
          ).not.toContain(
            "OPENAI_API_KEY",
          );
        },
      );
    }
  },
);


/* =========================================================
 * 36. NO BANK OR BROKER CREDENTIALS
 * ======================================================= */

describe(
  "financial execution isolation",
  () => {
    it(
      "does not document bank or broker credentials",
      () => {
        const source =
          normalizeSource(
            readRepositoryFile(
              ".env.example",
            ),
          );


        const prohibited = [
          "broker_api",
          "broker_key",
          "bank_api",
          "bank_key",
          "trading_api",
          "trading_key",
        ];


        for (
          const term of
            prohibited
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
 * 37. FINAL V2 SECURITY ARCHITECTURE
 * ======================================================= */

/**
 * LIFE OS V2:
 *
 * Git secret hygiene
 *      ↓
 * publishable Supabase configuration
 *      ↓
 * password authentication
 *      ↓
 * verified JWT claims
 *      ↓
 * AAL1 authenticated workspace
 *      ↓
 * server authorization
 *      ↓
 * PostgreSQL FORCE RLS
 *      ↓
 * auth.uid ownership
 *      ↓
 * private Storage RLS
 *      ↓
 * explicit Universal Add confirmation
 *      ↓
 * deterministic SECURITY INVOKER executors
 *
 *
 * AI remains an advisor.
 */


/* =========================================================
 * 38. PRIVATE DOCUMENT SECURITY
 * ======================================================= */

/**
 * PDF:
 *
 * application/pdf only
 *      ↓
 * maximum 15 MB
 *      ↓
 * server-generated random path
 *      ↓
 * authenticated-user prefix
 *      ↓
 * private Storage bucket
 *      ↓
 * Storage RLS
 *      ↓
 * metadata under PostgreSQL RLS
 *      ↓
 * temporary signed URL only
 *
 *
 * Never a public document URL.
 */


/* =========================================================
 * 39. UNIVERSAL ADD SECURITY
 * ======================================================= */

/**
 * User text / PDF
 *      ↓
 * AI preview
 *      ↓
 * NO durable write
 *      ↓
 * exact validated proposal
 *      ↓
 * user reviews
 *      ↓
 * explicit confirmation
 *      ↓
 * durable intake
 *      ↓
 * explicit approved state
 *      ↓
 * deterministic executor
 *      ↓
 * RLS-protected target
 */


/* =========================================================
 * 40. SECURITY REGRESSION RULE
 * ======================================================= */

/**
 * CI should fail if a future change:
 *
 * removes ENABLE RLS
 * removes FORCE RLS
 * adds service-role runtime credentials
 * makes Travel documents public
 * removes Storage owner-prefix checks
 * permits anonymous Travel execution
 * changes Travel executor to SECURITY DEFINER
 * bypasses explicit approval
 * exposes database writes to LIFE AI
 * exposes broker / bank execution
 * exposes shell or arbitrary SQL
 * replaces signed URLs with public URLs
 * removes Travel route protection
 * removes onboarding route protection
 * weakens verified authentication
 */


/* =========================================================
 * 41. FINAL SECURITY TEST RULE
 * ======================================================= */

/**
 * This file verifies repository-level security invariants.
 *
 *
 * It does not prove the live Supabase or Vercel deployment is
 * configured correctly.
 *
 *
 * Final deployment verification still requires:
 *
 * TypeScript
 * tests
 * lint
 * production build
 * GitHub CI
 * Supabase migrations
 * Supabase advisors
 * Vercel deployment
 *
 *
 * Simple outside.
 * Intelligent underneath.
 * Private by default.
 */