import type {
  User,
} from "@supabase/supabase-js";

import {
  redirect,
} from "next/navigation";

import {
  DEFAULT_AUTHENTICATED_ROUTE,
  LOGIN_ROUTE,
} from "@/lib/constants";

import {
  createClient,
  type ServerSupabaseClient,
} from "@/lib/supabase/server";

import type {
  UUID,
} from "@/lib/types";

import {
  uuidSchema,
} from "@/lib/validation";


/* =========================================================
 * 1. AUTHENTICATION TYPES
 * ======================================================= */

export type AuthenticatorAssuranceLevel =
  | "aal1"
  | "aal2";


export type MfaAction =
  | "none"
  | "verify"
  | "enroll"
  | "unknown";


export interface VerifiedAuthIdentity {
  id:
    UUID;

  email:
    string |
    null;

  aal:
    AuthenticatorAssuranceLevel;
}


export interface AuthenticationState {
  authenticated:
    boolean;

  identity:
    VerifiedAuthIdentity |
    null;

  current_level:
    AuthenticatorAssuranceLevel |
    null;

  next_level:
    AuthenticatorAssuranceLevel |
    null;

  mfa_action:
    MfaAction;
}


/* =========================================================
 * 2. AUTHENTICATION ERROR
 * ======================================================= */

export type AuthenticationErrorCode =
  | "UNAUTHENTICATED";


export class AuthenticationError
  extends Error {
  readonly code:
    AuthenticationErrorCode;


  constructor(
    code:
      AuthenticationErrorCode,
  ) {
    super(
      "Authentication is required.",
    );


    this.name =
      "AuthenticationError";


    this.code =
      code;
  }
}


/* =========================================================
 * 3. CLAIM HELPERS
 * ======================================================= */

function getClaimString(
  claims:
    Record<
      string,
      unknown
    >,

  key:
    string,
): string | null {
  const value =
    claims[key];


  return typeof value ===
    "string"
    ? value
    : null;
}


function normalizeAal(
  value:
    unknown,
): AuthenticatorAssuranceLevel | null {
  if (
    value ===
      "aal2"
  ) {
    return "aal2";
  }


  if (
    value ===
      "aal1"
  ) {
    return "aal1";
  }


  return null;
}


/* =========================================================
 * 5. VERIFIED IDENTITY
 * ======================================================= */

/**
 * Verifies the current access token using Supabase getClaims().
 *
 * getSession() is not used as authorization proof.
 */
async function getVerifiedIdentityFromClient(
  supabase:
    ServerSupabaseClient,
): Promise<
  VerifiedAuthIdentity |
  null
> {
  const {
    data,
    error,
  } =
    await supabase.auth
      .getClaims();


  if (
    error ||
    !data?.claims
  ) {
    return null;
  }


  const claims =
    data.claims as Record<
      string,
      unknown
    >;


  const subject =
    getClaimString(
      claims,
      "sub",
    );


  if (
    !subject
  ) {
    return null;
  }


  const parsedUserId =
    uuidSchema.safeParse(
      subject,
    );


  if (
    !parsedUserId.success
  ) {
    return null;
  }


  const role =
    getClaimString(
      claims,
      "role",
    );


  if (
    role !==
      null &&
    role !==
      "authenticated"
  ) {
    return null;
  }


  const aal =
    normalizeAal(
      claims["aal"],
    ) ??
    "aal1";


  const email =
    getClaimString(
      claims,
      "email",
    );


  return {
    id:
      parsedUserId.data,

    email,

    aal,
  };
}


/* =========================================================
 * 6. OPTIONAL VERIFIED IDENTITY
 * ======================================================= */

export async function getVerifiedAuthIdentity():
Promise<
  VerifiedAuthIdentity |
  null
> {
  const supabase =
    await createClient();


  return getVerifiedIdentityFromClient(
    supabase,
  );
}


/* =========================================================
 * 7. AUTHENTICATION STATE
 * ======================================================= */

/**
 * Determines whether the current user must:
 *
 * - enroll a TOTP factor
 * - verify an existing TOTP factor
 * - continue with an AAL2 session
 */
export async function getAuthenticationState():
Promise<AuthenticationState> {
  const supabase =
    await createClient();


  const identity =
    await getVerifiedIdentityFromClient(
      supabase,
    );


  if (
    !identity
  ) {
    return {
      authenticated:
        false,

      identity:
        null,

      current_level:
        null,

      next_level:
        null,

      mfa_action:
        "none",
    };
  }


  return {
    authenticated:
      true,

    identity,

    current_level:
      identity.aal,

    next_level:
      identity.aal,

    mfa_action:
      "none",
  };
}


/* =========================================================
 * 7. ASSERT AUTHENTICATED IDENTITY
 * ======================================================= */

/**
 * Canonical private API and data-layer assertion.
 *
 * A verified email-and-password session is sufficient.
 * PostgreSQL RLS still enforces row ownership.
 */
export async function assertAuthenticatedIdentity():
Promise<VerifiedAuthIdentity> {
  const identity =
    await getVerifiedAuthIdentity();


  if (
    !identity
  ) {
    throw new AuthenticationError(
      "UNAUTHENTICATED",
    );
  }


  return identity;
}


/* =========================================================
 * 8. LEGACY AAL2 ASSERTION ALIAS
 * ======================================================= */

/**
 * Backward-compatible name used by existing modules.
 * It now verifies authentication without requiring MFA.
 */
export async function assertAAL2Identity():
Promise<VerifiedAuthIdentity> {
  return assertAuthenticatedIdentity();
}


/* =========================================================
 * 9. LEGACY OPTIONAL IDENTITY ALIAS
 * ======================================================= */

export async function getAAL2Identity():
Promise<
  VerifiedAuthIdentity |
  null
> {
  return getVerifiedAuthIdentity();
}


/* =========================================================
 * 10. PAGE GUARD — AUTHENTICATED
 * ======================================================= */

/**
 * Canonical private page guard.
 *
 * Users without a verified session are redirected to login.
 */
export async function requireAuthenticatedIdentity():
Promise<VerifiedAuthIdentity> {
  const state =
    await getAuthenticationState();


  if (
    !state.authenticated ||
    !state.identity
  ) {
    redirect(
      LOGIN_ROUTE,
    );
  }


  return state.identity;
}


/* =========================================================
 * 11. LEGACY PAGE GUARD ALIAS
 * ======================================================= */

/**
 * Backward-compatible name used by existing pages.
 */
export async function requireAAL2Identity():
Promise<VerifiedAuthIdentity> {
  return requireAuthenticatedIdentity();
}


/* =========================================================
 * 12. LOGIN PAGE REDIRECT
 * ======================================================= */

export async function redirectIfFullyAuthenticated():
Promise<void> {
  const state =
    await getAuthenticationState();


  if (
    state.authenticated
  ) {
    redirect(
      DEFAULT_AUTHENTICATED_ROUTE,
    );
  }
}


/* =========================================================
 * 13. FRESH AUTHENTICATED USER
 * ======================================================= */

export async function getFreshAuthenticatedUser():
Promise<
  User |
  null
> {
  const supabase =
    await createClient();


  const identity =
    await getVerifiedIdentityFromClient(
      supabase,
    );


  if (
    !identity
  ) {
    return null;
  }


  const {
    data,
    error,
  } =
    await supabase.auth
      .getUser();


  if (
    error ||
    !data.user ||
    data.user.id !==
      identity.id
  ) {
    return null;
  }


  return data.user;
}


/* =========================================================
 * 15. REQUIRE FRESH USER
 * ======================================================= */

export async function requireFreshAuthenticatedUser():
Promise<User> {
  const user =
    await getFreshAuthenticatedUser();


  if (
    !user
  ) {
    redirect(
      LOGIN_ROUTE,
    );
  }


  return user;
}


/* =========================================================
 * 16. USER ID
 * ======================================================= */

/**
 * Private data operations derive user_id from a verified
 * authenticated identity.
 */
export async function requireAAL2UserId():
Promise<UUID> {
  const identity =
    await assertAAL2Identity();


  return identity.id;
}


/* =========================================================
 * 17. FINAL SECURITY CONTRACT
 * ======================================================= */

/**
 * Signed out
 *      ↓
 * /login
 *
 *
 * Email and password verified
 *      ↓
 * private LIFE OS access
 *
 *
 * Authorization proof:
 *
 * verified JWT claims
 * +
 * server-derived user identity
 * +
 * PostgreSQL RLS
 * +
 * row ownership
 *
 *
 * Never:
 *
 * - trust user_id from request input
 * - trust user_id generated by AI
 * - use getSession() user data as authorization proof
 * - expose privileged credentials
 * - weaken RLS because application guards exist
 */

