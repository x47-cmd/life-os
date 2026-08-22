import {
  NextResponse,
} from "next/server";

import {
  getAuthenticationState,
} from "@/lib/auth";

import {
  DEFAULT_AUTHENTICATED_ROUTE,
  LOGIN_ROUTE,
} from "@/lib/constants";

import {
  createClient,
} from "@/lib/supabase/server";


/* =========================================================
 * 1. ROUTE CONFIGURATION
 * ======================================================= */

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";


/* =========================================================
 * 2. CALLBACK LIMITS
 * ======================================================= */

const MAX_AUTH_CODE_LENGTH =
  4_096;

const MAX_FLOW_ID_LENGTH =
  512;


/* =========================================================
 * 3. SAFE REDIRECT
 * ======================================================= */

/**
 * Redirect destinations are application-owned paths only.
 *
 * No user-controlled:
 *
 * next
 * redirect
 * returnTo
 * destination
 *
 * parameter is accepted.
 *
 * This removes an open-redirect class of vulnerability from
 * the authentication callback.
 */
function safeRedirect(
  request: Request,
  path: string,
) {
  const url =
    new URL(
      path,
      request.url,
    );

  return NextResponse.redirect(
    url,
    {
      status:
        303,

      headers: {
        "Cache-Control":
          "no-store, max-age=0",

        "Referrer-Policy":
          "no-referrer",
      },
    },
  );
}


/* =========================================================
 * 4. LOGIN REDIRECT HELPERS
 * ======================================================= */

function redirectToLogin(
  request: Request,
) {
  return safeRedirect(
    request,
    LOGIN_ROUTE,
  );
}


function redirectToEnrollment(
  request: Request,
) {
  return safeRedirect(
    request,
    `${LOGIN_ROUTE}?step=enroll`,
  );
}


function redirectToMfa(
  request: Request,
) {
  return safeRedirect(
    request,
    `${LOGIN_ROUTE}?step=mfa`,
  );
}


function redirectToDashboard(
  request: Request,
) {
  return safeRedirect(
    request,
    DEFAULT_AUTHENTICATED_ROUTE,
  );
}


/* =========================================================
 * 5. SAFE QUERY VALUE
 * ======================================================= */

function readBoundedQueryValue(
  url: URL,
  key: string,
  maxLength: number,
): string | null {
  const value =
    url.searchParams
      .get(
        key,
      )
      ?.trim();

  if (
    !value ||
    value.length >
      maxLength
  ) {
    return null;
  }

  return value;
}


/* =========================================================
 * 6. GET
 * ======================================================= */

export async function GET(
  request: Request,
) {

  /* -------------------------------------------------------
   * Parse callback URL
   * ---------------------------------------------------- */

  let requestUrl:
    URL;

  try {
    requestUrl =
      new URL(
        request.url,
      );
  } catch {
    return redirectToLogin(
      request,
    );
  }


  /* -------------------------------------------------------
   * Provider-reported failure
   * ---------------------------------------------------- */

  /**
   * Supabase or an upstream authentication provider may
   * return error query parameters.
   *
   * LIFE OS deliberately does not forward those raw values
   * to the browser.
   */
  const providerError =
    requestUrl.searchParams.get(
      "error",
    );

  if (
    providerError
  ) {
    return redirectToLogin(
      request,
    );
  }


  /* -------------------------------------------------------
   * Auth code
   * ---------------------------------------------------- */

  const code =
    readBoundedQueryValue(
      requestUrl,
      "code",
      MAX_AUTH_CODE_LENGTH,
    );

  if (
    !code
  ) {
    return redirectToLogin(
      request,
    );
  }


  /* -------------------------------------------------------
   * Optional PKCE flow id
   * ---------------------------------------------------- */

  const flowId =
    readBoundedQueryValue(
      requestUrl,
      "sb_flow_id",
      MAX_FLOW_ID_LENGTH,
    );


  /* -------------------------------------------------------
   * Exchange one-time authorization code
   * ---------------------------------------------------- */

  try {
    const supabase =
      await createClient();

    const {
      error,
    } =
      await supabase.auth
        .exchangeCodeForSession(
          code,
          flowId
            ? {
                flowId,
              }
            : undefined,
        );

    if (
      error
    ) {
      return redirectToLogin(
        request,
      );
    }
  } catch {
    /**
     * Do not disclose whether failure occurred in:
     *
     * - PKCE verification
     * - Supabase Auth
     * - cookie storage
     * - token exchange
     * - provider configuration
     */
    return redirectToLogin(
      request,
    );
  }


  /* -------------------------------------------------------
   * Re-evaluate verified authentication state
   * ---------------------------------------------------- */

  try {
    const auth =
      await getAuthenticationState();


    /* -----------------------------------------------------
     * Session could not be verified
     * -------------------------------------------------- */

    if (
      !auth.authenticated ||
      !auth.identity
    ) {
      return redirectToLogin(
        request,
      );
    }


    /* -----------------------------------------------------
     * Full AAL2
     * -------------------------------------------------- */

    if (
      auth.current_level ===
      "aal2"
    ) {
      return redirectToDashboard(
        request,
      );
    }


    /* -----------------------------------------------------
     * AAL1 requiring first TOTP enrollment
     * -------------------------------------------------- */

    if (
      auth.mfa_action ===
      "enroll"
    ) {
      return redirectToEnrollment(
        request,
      );
    }


    /* -----------------------------------------------------
     * AAL1 requiring existing TOTP verification
     * -------------------------------------------------- */

    if (
      auth.mfa_action ===
      "verify"
    ) {
      return redirectToMfa(
        request,
      );
    }


    /* -----------------------------------------------------
     * Fail closed
     * -------------------------------------------------- */

    return redirectToLogin(
      request,
    );
  } catch {
    return redirectToLogin(
      request,
    );
  }
}


/* =========================================================
 * 7. PKCE RULE
 * ======================================================= */

/**
 * LIFE OS uses the server-compatible PKCE authentication
 * flow.
 *
 * Browser / provider:
 *
 * authentication begins
 *      ↓
 * one-time authorization code
 *      ↓
 * /auth/callback
 *      ↓
 * exchangeCodeForSession()
 *      ↓
 * secure cookie-backed session
 *
 *
 * The authorization code itself is not a permanent session
 * credential.
 */


/* =========================================================
 * 8. ONE-TIME CODE RULE
 * ======================================================= */

/**
 * The callback authorization code:
 *
 * - is short-lived
 * - is exchanged server-side
 * - must not be stored in LIFE OS tables
 * - must not be added to audit metadata
 * - must not be sent to OpenAI
 * - must not be logged by application code
 */


/* =========================================================
 * 9. FLOW ID RULE
 * ======================================================= */

/**
 * sb_flow_id is optional.
 *
 * When Supabase includes it, LIFE OS passes it back to
 * exchangeCodeForSession() so the corresponding PKCE verifier
 * can be selected.
 *
 * LIFE OS does not interpret the flow id or treat it as an
 * identity.
 */


/* =========================================================
 * 10. REDIRECT RULE
 * ======================================================= */

/**
 * LIFE OS does not honor browser-controlled destination
 * parameters at this authentication boundary.
 *
 * Allowed destinations are only:
 *
 * /login
 * /login?step=enroll
 * /login?step=mfa
 * authenticated dashboard
 *
 *
 * Therefore:
 *
 * ?next=https://evil.example
 *
 * cannot create an open redirect.
 */


/* =========================================================
 * 11. MFA RULE
 * ======================================================= */

/**
 * Successful PKCE exchange does NOT automatically mean the
 * user may access private LIFE OS data.
 *
 * Session
 *      ↓
 * Authentication State
 *      ↓
 * AAL1?
 *      ↓
 * TOTP enrollment / verification
 *      ↓
 * AAL2
 *      ↓
 * Dashboard
 */


/* =========================================================
 * 12. ERROR RULE
 * ======================================================= */

/**
 * Callback failures intentionally collapse into the safe
 * login page.
 *
 * Raw provider errors are never reflected back into the URL
 * or rendered to the user.
 *
 * This avoids leaking:
 *
 * provider configuration
 * token details
 * PKCE details
 * internal authentication state
 */


/* =========================================================
 * 13. CACHE RULE
 * ======================================================= */

/**
 * Authentication callback responses must not be cached.
 *
 * Redirect responses therefore include:
 *
 * Cache-Control: no-store
 */


/* =========================================================
 * 14. DATA RULE
 * ======================================================= */

/**
 * This route does not access:
 *
 * finances
 * investments
 * goals
 * projects
 * learning
 * career
 * memory
 *
 * Its responsibility ends after authentication routing.
 */


/* =========================================================
 * 15. AI RULE
 * ======================================================= */

/**
 * No AI workflow is reachable from the authentication
 * callback.
 *
 * Authentication codes, sessions and MFA state must never
 * become AI context.
 */


/* =========================================================
 * 16. SECURITY FLOW
 * ======================================================= */

/**
 * Auth Provider / Supabase
 *      ↓
 * Authorization Code
 *      ↓
 * PKCE Exchange
 *      ↓
 * Cookie-backed Session
 *      ↓
 * Verified Authentication State
 *      ↓
 * MFA / AAL2
 *      ↓
 * Private LIFE OS
 */


/* =========================================================
 * 17. FINAL CALLBACK RULE
 * ======================================================= */

/**
 * Callback has one responsibility:
 *
 * Establish the session safely and send the user to the
 * correct authentication stage.
 *
 *
 * No private data.
 * No arbitrary redirects.
 * No AI.
 * No execution.
 * No leaked authentication errors.
 */