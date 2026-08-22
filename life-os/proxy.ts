import {
  createServerClient,
} from "@supabase/ssr";

import {
  NextResponse,
  type NextRequest,
} from "next/server";

import {
  LOGIN_ROUTE,
} from "@/lib/constants";

import {
  getSupabasePublicEnvironment,
} from "@/lib/env";


/* =========================================================
 * 1. PROTECTED PAGE ROUTES
 * ======================================================= */

/**
 * These routes belong to the private LIFE OS workspace.
 *
 * Proxy performs only an early authenticated-session check.
 *
 * AAL2 authorization is still enforced by:
 *
 * - protected Server Components
 * - protected Route Handlers
 * - lib/auth.ts
 * - PostgreSQL RLS
 */
const PROTECTED_PAGE_PREFIXES =
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
  ] as const;


/* =========================================================
 * 2. PROTECTED PAGE DETECTION
 * ======================================================= */

function isProtectedPage(
  pathname: string,
): boolean {
  return PROTECTED_PAGE_PREFIXES.some(
    (
      prefix,
    ) =>
      pathname ===
        prefix ||
      pathname.startsWith(
        `${prefix}/`,
      ),
  );
}


/* =========================================================
 * 3. COPY REFRESHED AUTH COOKIES
 * ======================================================= */

/**
 * If Supabase refreshed authentication cookies while the
 * request passed through Proxy, a replacement response must
 * preserve those cookies.
 *
 * Otherwise browser/server authentication state can become
 * inconsistent.
 */
function copyAuthCookies(
  source:
    NextResponse,
  target:
    NextResponse,
): NextResponse {
  source.cookies
    .getAll()
    .forEach(
      (
        cookie,
      ) => {
        target.cookies.set(
          cookie,
        );
      },
    );

  return target;
}


/* =========================================================
 * 4. LOGIN REDIRECT
 * ======================================================= */

function redirectToLogin(
  request:
    NextRequest,
  supabaseResponse:
    NextResponse,
): NextResponse {
  const url =
    request.nextUrl.clone();

  url.pathname =
    LOGIN_ROUTE;

  /**
   * Never preserve arbitrary query parameters from a private
   * route as an authentication destination.
   */
  url.search =
    "";

  const response =
    NextResponse.redirect(
      url,
      303,
    );

  response.headers.set(
    "Cache-Control",
    "no-store, max-age=0",
  );

  return copyAuthCookies(
    supabaseResponse,
    response,
  );
}


/* =========================================================
 * 5. PROXY
 * ======================================================= */

export async function proxy(
  request:
    NextRequest,
): Promise<NextResponse> {

  /* -------------------------------------------------------
   * Initial pass-through response
   * ---------------------------------------------------- */

  let supabaseResponse =
    NextResponse.next({
      request,
    });


  /* -------------------------------------------------------
   * Public Supabase configuration
   * ---------------------------------------------------- */

  const {
    url,
    publishableKey,
  } =
    getSupabasePublicEnvironment();


  /* -------------------------------------------------------
   * Request-scoped Supabase client
   * ---------------------------------------------------- */

  const supabase =
    createServerClient(
      url,
      publishableKey,
      {
        cookies: {

          getAll() {
            return request
              .cookies
              .getAll();
          },


          setAll(
            cookiesToSet,
            headers,
          ) {

            /**
             * First update the incoming request cookies.
             *
             * Server Components downstream can then observe
             * the refreshed authentication state.
             */
            cookiesToSet.forEach(
              ({
                name,
                value,
              }) => {
                request.cookies.set(
                  name,
                  value,
                );
              },
            );


            /**
             * Re-create the pass-through response using the
             * now-updated request.
             */
            supabaseResponse =
              NextResponse.next({
                request,
              });


            /**
             * Then update response cookies so the browser
             * receives the refreshed session as well.
             */
            cookiesToSet.forEach(
              ({
                name,
                value,
                options,
              }) => {
                supabaseResponse
                  .cookies
                  .set(
                    name,
                    value,
                    options,
                  );
              },
            );


            /**
             * Preserve any additional headers supplied by the
             * SSR auth integration.
             */
            Object.entries(
              headers,
            ).forEach(
              ([
                key,
                value,
              ]) => {
                supabaseResponse
                  .headers
                  .set(
                    key,
                    value,
                  );
              },
            );
          },
        },
      },
    );


  /* =======================================================
   * 6. VERIFIED CLAIMS
   * ===================================================== */

  /**
   * IMPORTANT:
   *
   * Do not replace this with:
   *
   * getSession()
   *
   * Proxy needs verified authentication information rather
   * than blindly trusting session data stored in cookies.
   */
  const {
    data:
      claimsData,
    error:
      claimsError,
  } =
    await supabase.auth
      .getClaims();


  const claims =
    claimsError
      ? null
      : claimsData
          ?.claims ??
        null;


  /* =======================================================
   * 7. EARLY PRIVATE-PAGE ROUTING
   * ===================================================== */

  if (
    !claims &&
    isProtectedPage(
      request.nextUrl
        .pathname,
    )
  ) {
    return redirectToLogin(
      request,
      supabaseResponse,
    );
  }


  /* =======================================================
   * 8. NORMAL RESPONSE
   * ===================================================== */

  /**
   * Return the exact response carrying Supabase's refreshed
   * cookies.
   *
   * Do not replace this with a fresh:
   *
   * NextResponse.next()
   *
   * unless authentication cookies are explicitly copied.
   */
  return supabaseResponse;
}


/* =========================================================
 * 9. MATCHER
 * ======================================================= */

export const config = {
  matcher: [
    /**
     * Run Proxy for application requests while skipping:
     *
     * - Next.js static assets
     * - optimized images
     * - favicon
     * - common static image files
     *
     * API routes intentionally remain included because they
     * may also need refreshed authentication cookies.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};


/* =========================================================
 * 10. PROXY RESPONSIBILITY
 * ======================================================= */

/**
 * Proxy has three responsibilities:
 *
 * 1. Read Supabase authentication cookies
 * 2. Refresh authentication state when necessary
 * 3. Prevent obviously unauthenticated requests from
 *    starting private page rendering
 *
 * Nothing more.
 */


/* =========================================================
 * 11. PROXY IS NOT THE SECURITY BOUNDARY
 * ======================================================= */

/**
 * Proxy redirect logic is defense-in-depth and UX protection.
 *
 * It must never become the only authorization layer.
 *
 * Private data still requires:
 *
 * verified JWT
 *      ↓
 * AAL2
 *      ↓
 * Server authorization
 *      ↓
 * authenticated user ownership
 *      ↓
 * PostgreSQL RLS
 */


/* =========================================================
 * 12. AAL2 RULE
 * ======================================================= */

/**
 * Proxy verifies that an authenticated identity exists.
 *
 * It intentionally does NOT duplicate the full LIFE OS MFA
 * state machine.
 *
 * Actual private pages call:
 *
 * requireAAL2Identity()
 *
 * and private APIs call:
 *
 * requireAAL2UserId()
 *
 * Therefore:
 *
 * AAL1 may reach the authentication routing layer,
 * but it cannot read protected LIFE OS data.
 */


/* =========================================================
 * 13. LOGIN LOOP RULE
 * ======================================================= */

/**
 * /login is intentionally NOT in PROTECTED_PAGE_PREFIXES.
 *
 * This is essential because an AAL1 user may need:
 *
 * /login?step=enroll
 *
 * or:
 *
 * /login?step=mfa
 *
 * before reaching AAL2.
 *
 * Redirecting all authenticated users away from /login here
 * could create an MFA redirect loop.
 */


/* =========================================================
 * 14. ROOT ROUTE RULE
 * ======================================================= */

/**
 * /
 *
 * is intentionally not protected here.
 *
 * app/page.tsx owns root authentication routing:
 *
 * signed out
 *      ↓
 * login
 *
 * AAL1
 *      ↓
 * MFA
 *
 * AAL2
 *      ↓
 * dashboard
 */


/* =========================================================
 * 15. API RULE
 * ======================================================= */

/**
 * Proxy does not redirect private API requests to HTML login
 * pages.
 *
 * API authorization belongs inside each Route Handler.
 *
 * Example:
 *
 * /api/ai
 *      ↓
 * requireAAL2UserId()
 *
 * /api/opportunities
 *      ↓
 * requireAAL2UserId()
 *
 * This preserves predictable JSON error behavior.
 */


/* =========================================================
 * 16. COOKIE RULE
 * ======================================================= */

/**
 * Supabase SSR cookie flow:
 *
 * Request cookies
 *      ↓
 * Proxy Supabase client
 *      ↓
 * refreshed token if necessary
 *      ↓
 * request.cookies updated
 *      +
 * response.cookies updated
 *
 * Both directions matter.
 */


/* =========================================================
 * 17. NO SERVICE ROLE
 * ======================================================= */

/**
 * Proxy uses only:
 *
 * NEXT_PUBLIC_SUPABASE_URL
 * NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 *
 * It never receives or uses:
 *
 * service_role
 * database password
 * OpenAI API key
 * other production secrets
 */


/* =========================================================
 * 18. NO DATA ACCESS
 * ======================================================= */

/**
 * Proxy does NOT query:
 *
 * finances
 * investments
 * goals
 * projects
 * tasks
 * career
 * learning
 * memory
 * audit logs
 *
 * Authentication refresh should remain lightweight.
 */


/* =========================================================
 * 19. NO AI
 * ======================================================= */

/**
 * Proxy never invokes:
 *
 * OpenAI
 * Chief of Staff
 * Decision Simulator
 * Opportunity Search
 *
 * Authentication infrastructure and AI infrastructure remain
 * isolated.
 */


/* =========================================================
 * 20. FAIL-CLOSED RULE
 * ======================================================= */

/**
 * Verified claims unavailable
 *      +
 * protected page requested
 *      ↓
 * login
 *
 * Proxy never assumes that malformed or unverified cookie
 * state represents a valid user.
 */


/* =========================================================
 * 21. NEXT.JS 16 RULE
 * ======================================================= */

/**
 * LIFE OS targets Next.js 16.
 *
 * Therefore the framework convention is:
 *
 * proxy.ts ✅
 *
 * not:
 *
 * middleware.ts ❌
 */


/* =========================================================
 * 22. FINAL PROXY RULE
 * ======================================================= */

/**
 * Request
 *      ↓
 * Supabase cookie synchronization
 *      ↓
 * Verified claims
 *      ↓
 * Early route protection
 *      ↓
 * Server Component / Route Handler
 *      ↓
 * AAL2
 *      ↓
 * RLS
 *
 *
 * Proxy helps protect the door.
 *
 * It is not the vault.
 */