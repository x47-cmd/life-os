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
} from "@/lib/constants";

import {
  getSupabasePublicEnvironment,
} from "@/lib/env";


/* =========================================================
 * 1. PROTECTED PAGE DETECTION
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
 * 2. API DETECTION
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
 * 3. COPY REFRESHED AUTH COOKIES
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
 * 4. SAFE REDIRECT
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
 * 5. PROXY
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


  /* =======================================================
   * 6. SIGNED-OUT PRIVATE PAGE
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
   * 7. NORMAL RESPONSE
   * ===================================================== */

  return supabaseResponse;
}


/* =========================================================
 * 8. MATCHER
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
 * Verified password-authenticated request
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
 * Every private API must independently verify authentication
 * and return
 * a predictable JSON authentication or authorization error.
 */

