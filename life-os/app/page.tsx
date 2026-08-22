import {
  redirect,
} from "next/navigation";

import {
  getAuthenticationState,
} from "@/lib/auth";

import {
  DEFAULT_AUTHENTICATED_ROUTE,
  LOGIN_ROUTE,
} from "@/lib/constants";


/* =========================================================
 * 1. ROOT ENTRY
 * ======================================================= */

/**
 * LIFE OS root route:
 *
 * /
 *
 * This page never renders private user data.
 *
 * Its only responsibility is to resolve the authenticated
 * destination safely on the server.
 */
export default async function HomePage():
Promise<never> {
  const auth =
    await getAuthenticationState();


  /* -------------------------------------------------------
   * No verified authentication
   * ---------------------------------------------------- */

  if (
    !auth.authenticated ||
    !auth.identity
  ) {
    redirect(
      LOGIN_ROUTE,
    );
  }


  /* -------------------------------------------------------
   * Fully authenticated with MFA / AAL2
   * ---------------------------------------------------- */

  if (
    auth.current_level ===
    "aal2"
  ) {
    redirect(
      DEFAULT_AUTHENTICATED_ROUTE,
    );
  }


  /* -------------------------------------------------------
   * MFA enrollment required
   * ---------------------------------------------------- */

  if (
    auth.mfa_action ===
    "enroll"
  ) {
    redirect(
      `${LOGIN_ROUTE}?step=enroll`,
    );
  }


  /* -------------------------------------------------------
   * MFA verification required
   * ---------------------------------------------------- */

  if (
    auth.mfa_action ===
    "verify"
  ) {
    redirect(
      `${LOGIN_ROUTE}?step=mfa`,
    );
  }


  /* -------------------------------------------------------
   * Fail closed
   * ---------------------------------------------------- */

  /**
   * If Supabase cannot determine the MFA transition state,
   * LIFE OS does not grant access to the private workspace.
   *
   * The login page may safely recover or ask the user to
   * authenticate again.
   */
  redirect(
    LOGIN_ROUTE,
  );
}


/* =========================================================
 * 2. SERVER-ONLY RULE
 * ======================================================= */

/**
 * This page intentionally remains a Server Component.
 *
 * It does not use:
 *
 * "use client"
 *
 * Authentication routing occurs before private application
 * content reaches the browser.
 */


/* =========================================================
 * 3. NO PRIVATE CONTENT RULE
 * ======================================================= */

/**
 * The root route never renders:
 *
 * - salary
 * - finances
 * - investments
 * - goals
 * - projects
 * - personal memory
 * - AI recommendations
 *
 * It is purely an authentication router.
 */


/* =========================================================
 * 4. NO CLIENT-PROVIDED DESTINATION
 * ======================================================= */

/**
 * Redirect destinations are application constants.
 *
 * LIFE OS does NOT accept:
 *
 * ?next=https://...
 * ?redirect=...
 * user-supplied destination URLs
 *
 * at this boundary.
 *
 * This avoids creating an open-redirect path.
 */


/* =========================================================
 * 5. MFA FLOW
 * ======================================================= */

/**
 * Possible states:
 *
 * No session
 *      ↓
 * /login
 *
 *
 * Authenticated AAL1 + no enrolled factor
 *      ↓
 * /login?step=enroll
 *
 *
 * Authenticated AAL1 + enrolled factor
 *      ↓
 * /login?step=mfa
 *
 *
 * Authenticated AAL2
 *      ↓
 * Dashboard
 */


/* =========================================================
 * 6. SECURITY PRINCIPLE
 * ======================================================= */

/**
 * This redirect is UX routing.
 *
 * It is NOT the final authorization boundary.
 *
 * Protected LIFE OS data still requires:
 *
 * verified Supabase JWT
 *      ↓
 * AAL2
 *      ↓
 * server authorization
 *      ↓
 * PostgreSQL RLS
 */


/* =========================================================
 * 7. FINAL ROOT RULE
 * ======================================================= */

/**
 * /
 *
 * should answer only:
 *
 * Where should this authenticated state go?
 *
 * Nothing else.
 *
 * No dashboard flash.
 * No private-data flash.
 * No client-side auth guessing.
 */