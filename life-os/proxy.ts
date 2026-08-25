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
 * 1. ROUTES
 * ======================================================= */

const MFA_ROUTE =
  "/mfa";


/* =========================================================
 * 2. PROTECTED PAGE DETECTION
 * ======================================================= */

function isProtectedPage(
  pathname:
    string,
): boolean {
  return PROTECTED_ROUTES.some(
    (
      route,
    ) =>
      pathname ===
        route ||
      pathname.startsWith(
        `${route}/`,
      ),
  );
}


/* =========================================================
 * 3. API DETECTION
 * ======================================================= */

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
 * 4. MFA PAGE DETECTION
 * ======================================================= */

function isMfaRoute(
  pathname:
    string,
): boolean {
  return (
    pathname ===
      MFA_ROUTE ||
    pathname.startsWith(
      `${MFA_ROUTE}/`,
    )
  );
}


/* =========================================================
 * 5. COPY REFRESHED AUTH COOKIES
 * ======================================================= */

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
 * 6. SAFE REDIRECT
 * ======================================================= */

function createRedirect(
  request:
    NextRequest,

  supabaseResponse:
    NextResponse,

  pathname:
    string,
): NextResponse {
  const url =
    request.nextUrl.clone();


  url.pathname =
    pathname;


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
 * 7. AUTHENTICATION LEVEL
 * ======================================================= */

function getClaimsAal(
  claims:
    Record<
      string,
      unknown
    > |
    null,
): string | null {
  if (
    !claims
  ) {
    return null;
  }


  const aal =
    claims["aal"];


  return typeof aal ===
    "string"
    ? aal
    : null;
}


/* =========================================================
 * 8. PROXY
 * ======================================================= */

export async function proxy(
  request:
    NextRequest,
): Promise<NextResponse> {
  let supabaseResponse =
    NextResponse.next({
      request,
    });


  const {
    url,
    publishableKey,
  } =
    getSupabasePublicEnvironment();


  const supabase =
    createServerClient(
      url,
      publishableKey,
      {
        cookies: {
          getAll() {
            return request.cookies
              .getAll();
          },


          setAll(
            cookiesToSet,
          ) {
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


            supabaseResponse =
              NextResponse.next({
                request,
              });


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
      : (
          claimsData
            ?.claims as
              Record<
                string,
                unknown
              > |
              undefined
        ) ??
        null;


  const pathname =
    request.nextUrl
      .pathname;


  const protectedPage =
    isProtectedPage(
      pathname,
    );


  const apiRoute =
    isApiRoute(
      pathname,
    );


  const mfaRoute =
    isMfaRoute(
      pathname,
    );


  /* =======================================================
   * 9. SIGNED-OUT PRIVATE PAGE
   * ===================================================== */

  if (
    !claims &&
    protectedPage &&
    !apiRoute
  ) {
    return createRedirect(
      request,
      supabaseResponse,
      LOGIN_ROUTE,
    );
  }


  /* =======================================================
   * 10. AAL1 PRIVATE PAGE
   * ===================================================== */

  const aal =
    getClaimsAal(
      claims,
    );


  if (
    claims &&
    protectedPage &&
    !apiRoute &&
    !mfaRoute &&
    aal !==
      REQUIRED_AUTHENTICATION_LEVEL
  ) {
    return createRedirect(
      request,
      supabaseResponse,
      MFA_ROUTE,
    );
  }


  /* =======================================================
   * 11. NORMAL RESPONSE
   * ===================================================== */

  return supabaseResponse;
}


/* =========================================================
 * 12. MATCHER
 * ======================================================= */

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};


/* =========================================================
 * FINAL SECURITY CONTRACT
 * ======================================================= */

/**
 * Signed out private request
 *      ↓
 * /login
 *
 *
 * AAL1 private request
 *      ↓
 * /mfa
 *
 *
 * AAL2 private request
 *      ↓
 * protected page
 *      ↓
 * server authorization
 *      ↓
 * PostgreSQL RLS
 *
 *
 * API routes are not redirected to HTML.
 *
 * Every private API must independently enforce AAL2 and return
 * a predictable JSON authentication or authorization error.
 */