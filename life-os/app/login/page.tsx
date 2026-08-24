import {
  redirect,
} from "next/navigation";

import {
  getAuthenticationState,
} from "@/lib/auth";

import {
  getProfile,
} from "@/lib/data";

import {
  DEFAULT_AUTHENTICATED_ROUTE,
  LOGIN_ROUTE,
} from "@/lib/constants";


/* =========================================================
 * LIFE OS V2
 * ROOT ROUTER
 *
 * /
 *      ↓
 *
 * No session
 *      → /login
 *
 * Authenticated + no profile
 *      → /onboarding
 *
 * Authenticated + profile
 *      → /dashboard
 * ======================================================= */


/* =========================================================
 * 1. ROUTES
 * ======================================================= */

const ONBOARDING_ROUTE =
  "/onboarding";


/* =========================================================
 * 2. ROOT ENTRY
 * ======================================================= */

export default async function HomePage():
Promise<never> {
  const auth =
    await getAuthenticationState();


  /* -------------------------------------------------------
   * NOT AUTHENTICATED
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
   * AUTHENTICATED
   * ---------------------------------------------------- */

  const profile =
    await getProfile();


  /* -------------------------------------------------------
   * FIRST-TIME SETUP
   * ---------------------------------------------------- */

  if (
    !profile
  ) {
    redirect(
      ONBOARDING_ROUTE,
    );
  }


  /* -------------------------------------------------------
   * READY
   * ---------------------------------------------------- */

  redirect(
    DEFAULT_AUTHENTICATED_ROUTE,
  );
}


/* =========================================================
 * 3. SERVER-ONLY RULE
 * ======================================================= */

/**
 * Root routing stays entirely server-side.
 *
 * No:
 *
 * "use client"
 *
 * No browser-side profile lookup.
 *
 * No private user information is rendered here.
 */


/* =========================================================
 * 4. V2 ROUTING FLOW
 * ======================================================= */

/**
 * First visit:
 *
 * /
 *      ↓
 * session?
 *
 *
 * No
 *      ↓
 * /login
 *
 *
 * Yes
 *      ↓
 * profile?
 *
 *
 * No
 *      ↓
 * /onboarding
 *
 *
 * Yes
 *      ↓
 * /dashboard
 */


/* =========================================================
 * 5. RESPONSIBILITY RULE
 * ======================================================= */

/**
 * Authentication answers:
 *
 * "Who is this?"
 *
 *
 * Profile answers:
 *
 * "Has LIFE OS been initialized?"
 *
 *
 * Dashboard answers:
 *
 * "What matters now?"
 *
 *
 * Each layer has one responsibility.
 */


/* =========================================================
 * 6. SECURITY RULE
 * ======================================================= */

/**
 * Profile existence is checked through the authenticated
 * LIFE OS data layer.
 *
 * The browser cannot supply:
 *
 * - user_id
 * - destination
 * - onboarding state
 *
 *
 * Ownership remains:
 *
 * verified Supabase identity
 *      ↓
 * server data layer
 *      ↓
 * PostgreSQL RLS
 */


/* =========================================================
 * 7. NO OPEN REDIRECT
 * ======================================================= */

/**
 * LIFE OS does not accept:
 *
 * ?next=
 * ?redirect=
 * external destinations
 *
 *
 * All destinations are application-controlled.
 */


/* =========================================================
 * 8. FAILURE BEHAVIOR
 * ======================================================= */

/**
 * If profile retrieval fails because the session or data
 * layer is invalid, the data layer is responsible for
 * surfacing that failure.
 *
 * LIFE OS must not silently treat a database error as:
 *
 * "new user"
 *
 * Missing profile and failed profile lookup are different
 * states.
 */


/* =========================================================
 * 9. FINAL V2 RULE
 * ======================================================= */

/**
 * Opening LIFE OS should require zero navigation decisions.
 *
 * The system decides the correct entry point automatically.
 *
 * Simple outside.
 * Intelligent underneath.
 */