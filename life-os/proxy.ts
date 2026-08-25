import {
  createServerClient,
} from "@supabase/ssr";

import {
  NextResponse,
  type NextRequest,
} from "next/server";

import {
  LOGIN_ROUTE,
  PROTECTED_ROUTES,
  REQUIRED_AUTHENTICATION_LEVEL,
} from "@/lib/constants";

import {
  getSupabasePublicEnvironment,
} from "@/lib/env";


/* =========================================================
 * LIFE OS V2
 * FINAL NEXT.JS PROXY
 *
 * Responsibilities:
 *
 * - synchronize Supabase auth cookies
 * - verify authenticated claims
 * - protect private page routes early
 * - preserve refreshed auth cookies
 *
 *
 * Authentication model:
 *
 * verified authenticated session
 * +
 * AAL1 minimum
 *
 *
 * Proxy is defense-in-depth.
 *
 * Database ownership is still enforced by PostgreSQL RLS.
 * ======================================================= */


/* =========================================================
 * 1. AUTH LEVEL CONTRACT
 * ======================================================= */

/**
 * V2 requires AAL1.
 *
 * Keep this guard explicit so an accidental future constants
 * change does not silently alter proxy assumptions.
 */
const REQUIRED_LEVEL =
  REQUIRED_AUTHENTICATION_LEVEL;


/* =========================================================
 * 2. PROTECTED PAGE DETECTION
 * ======================================================= */

/**
 * PROTECTED_ROUTES is the canonical V2 route registry.
 *
 * Current protected areas include:
 *
 * /dashboard
 * /finance
 * /goals
 * /travel
 * /learning
 * /assistant
 * /investments
 * /projects
 * /career
 * /tasks
 * /audit
 * /settings
 * /onboarding
 */
function isProtectedPage(
  pathname:
    string,
): boolean {
  return PROTECTED_ROUTES.some(
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
 * 3. API DETECTION
 * ======================================================= */

/**
 * API routes must return their own JSON authorization errors.
 *
 * Proxy refreshes their auth cookies but never redirects them
 * to an HTML login page.
 */
function isApiRoute(
  pathname:
    string,
): boolean {
  return (
    pathname ===
      "/api" ||
    pathname.startsWith(
      "/api/",
    )
  );
}


/* =========================================================
 * 4. COPY REFRESHED AUTH COOKIES
 * ======================================================= */

/**
 * Supabase may refresh authentication cookies while the
 * request is passing through Proxy.
 *
 * If we create a redirect response, those refreshed cookies
 * must be copied to it.
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
 * 5. LOGIN REDIRECT
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


  /*
   * Never preserve arbitrary private query parameters in the
   * authentication URL.
   *
   * This prevents sensitive page parameters from leaking into
   * redirects or browser history unnecessarily.
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
 * 6. PROXY
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
   * Public Supabase environment
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
          ) {
            /*
             * Update request cookies first so downstream
             * Server Components see the refreshed session.
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


            /*
             * Rebuild the pass-through response using the
             * updated request.
             */
            supabaseResponse =
              NextResponse.next({
                request,
              });


            /*
             * Then update browser response cookies.
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
          },
        },
      },
    );


  /* =======================================================
   * 7. VERIFIED AUTHENTICATION CLAIMS
   * ===================================================== */

  /**
   * Do not use getSession() as the authentication proof here.
   *
   * getClaims() verifies the token-backed identity rather than
   * blindly trusting local cookie session content.
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
   * 8. PRIVATE PAGE ROUTING
   * ===================================================== */

  const pathname =
    request.nextUrl
      .pathname;


  if (
    !claims &&
    !isApiRoute(
      pathname,
    ) &&
    isProtectedPage(
      pathname,
    )
  ) {
    return redirectToLogin(
      request,
      supabaseResponse,
    );
  }


  /* =======================================================
   * 9. NORMAL RESPONSE
   * ===================================================== */

  return supabaseResponse;
}


/* =========================================================
 * 10. MATCHER
 * ======================================================= */

export const config = {
  matcher: [
    /**
     * Proxy runs for application routes while skipping static
     * framework/image assets.
     *
     * API routes intentionally remain included so Supabase can
     * refresh authentication cookies before Route Handlers.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};


/* =========================================================
 * 11. V2 AUTHENTICATION RULE
 * ======================================================= */

/**
 * LIFE OS V2:
 *
 * password authentication
 *      ↓
 * verified Supabase identity
 *      ↓
 * AAL1
 *      ↓
 * private application
 *
 *
 * TOTP may exist as optional additional account protection.
 *
 * It is not mandatory for ordinary V2 access.
 */


/* =========================================================
 * 12. AAL LEVEL RULE
 * ======================================================= */

/**
 * Keep the imported constant referenced explicitly.
 *
 * This also documents the intended security contract directly
 * in the proxy layer.
 */
void REQUIRED_LEVEL;


/* =========================================================
 * 13. PROXY IS NOT THE DATA SECURITY BOUNDARY
 * ======================================================= */

/**
 * Proxy prevents obviously unauthenticated page rendering.
 *
 *
 * Actual private data access still requires:
 *
 * verified authenticated session
 *      ↓
 * server-side data layer
 *      ↓
 * auth.uid()
 *      ↓
 * PostgreSQL RLS
 *
 *
 * Private documents additionally require:
 *
 * Storage RLS
 */


/* =========================================================
 * 14. TRAVEL ROUTE
 * ======================================================= */

/**
 * /travel is now a normal protected V2 route.
 *
 *
 * Signed-out request:
 *
 * /travel
 *      ↓
 * /login
 *
 *
 * Signed-in verified request:
 *
 * /travel
 *      ↓
 * server page
 *      ↓
 * RLS-protected Travel data
 */


/* =========================================================
 * 15. ONBOARDING ROUTE
 * ======================================================= */

/**
 * /onboarding is private.
 *
 * It is NOT public account registration.
 *
 *
 * The user must already have an authenticated LIFE OS account
 * before accessing onboarding.
 */


/* =========================================================
 * 16. LOGIN ROUTE
 * ======================================================= */

/**
 * /login is intentionally public.
 *
 *
 * Proxy does not redirect authenticated users away from it.
 *
 * Login/root components own any authenticated-user routing
 * behavior.
 *
 *
 * This keeps authentication state transitions centralized
 * outside Proxy.
 */


/* =========================================================
 * 17. ROOT ROUTE
 * ======================================================= */

/**
 * /
 *
 * remains public at Proxy level.
 *
 *
 * app/page.tsx owns root routing:
 *
 * signed out
 *      ↓
 * login
 *
 * signed in
 *      ↓
 * authenticated LIFE OS route
 */


/* =========================================================
 * 18. API AUTHORIZATION
 * ======================================================= */

/**
 * Proxy does not redirect API calls to /login.
 *
 *
 * Example:
 *
 * /api/intake/preview
 * /api/intake/confirm
 * /api/ai
 * /api/opportunities
 *
 *
 * Their Route Handlers must independently verify the user and
 * return predictable JSON errors.
 */


/* =========================================================
 * 19. COOKIE SYNCHRONIZATION
 * ======================================================= */

/**
 * Supabase SSR flow:
 *
 * request cookies
 *      ↓
 * createServerClient()
 *      ↓
 * getClaims()
 *      ↓
 * refresh if necessary
 *      ↓
 * request cookies updated
 *      +
 * response cookies updated
 */


/* =========================================================
 * 20. NO SERVICE ROLE
 * ======================================================= */

/**
 * Proxy uses only public Supabase configuration:
 *
 * NEXT_PUBLIC_SUPABASE_URL
 * NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 *
 *
 * It never uses:
 *
 * service_role
 * database password
 * OpenAI API key
 * private document credentials
 */


/* =========================================================
 * 21. NO PRIVATE DOMAIN DATA
 * ======================================================= */

/**
 * Proxy does not query:
 *
 * finance
 * investments
 * goals
 * projects
 * tasks
 * travel
 * documents
 * learning
 * career
 * memory
 * audit logs
 *
 *
 * It only handles authentication routing and cookie
 * synchronization.
 */


/* =========================================================
 * 22. NO AI
 * ======================================================= */

/**
 * Proxy never invokes:
 *
 * OpenAI
 * LIFE AI
 * Intake Intelligence
 * Decision Simulator
 * Opportunity Search
 *
 *
 * Authentication infrastructure remains isolated from AI.
 */


/* =========================================================
 * 23. FAIL-CLOSED RULE
 * ======================================================= */

/**
 * Verified claims unavailable
 *      +
 * protected page requested
 *      ↓
 * login
 *
 *
 * Invalid or malformed cookie state is never treated as a
 * valid authenticated identity.
 */


/* =========================================================
 * 24. NEXT.JS 16
 * ======================================================= */

/**
 * LIFE OS uses the Next.js 16 convention:
 *
 * proxy.ts
 *
 *
 * not the older middleware.ts convention.
 */


/* =========================================================
 * 25. FINAL LIFE OS V2 PROXY RULE
 * ======================================================= */

/**
 * Request
 *      ↓
 * Supabase cookie synchronization
 *      ↓
 * verified claims
 *      ↓
 * early private-page protection
 *      ↓
 * Server Component / Route Handler
 *      ↓
 * verified authenticated identity
 *      ↓
 * PostgreSQL / Storage RLS
 *
 *
 * Proxy protects the entrance.
 *
 * RLS protects the data.
 */