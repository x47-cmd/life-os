import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import {
  DEFAULT_AUTHENTICATED_ROUTE,
  LOGIN_ROUTE,
  REQUIRED_AUTHENTICATION_LEVEL,
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
 * 1. AUTH TYPES
 * ======================================================= */

export type AuthenticatorAssuranceLevel =
  | "aal1"
  | "aal2";


export interface VerifiedAuthIdentity {
  id: UUID;
  email: string | null;
  aal: AuthenticatorAssuranceLevel;
}


export type MfaAction =
  | "none"
  | "verify"
  | "enroll"
  | "unknown";


export interface AuthenticationState {
  authenticated: boolean;

  identity: VerifiedAuthIdentity | null;

  current_level:
    | AuthenticatorAssuranceLevel
    | null;

  next_level:
    | AuthenticatorAssuranceLevel
    | null;

  mfa_action: MfaAction;
}


/* =========================================================
 * 2. AUTHENTICATION ERROR
 * ======================================================= */

export type AuthenticationErrorCode =
  | "UNAUTHENTICATED"
  | "MFA_REQUIRED";


export class AuthenticationError extends Error {
  readonly code: AuthenticationErrorCode;

  constructor(
    code: AuthenticationErrorCode,
  ) {
    super(
      code === "UNAUTHENTICATED"
        ? "Authentication required."
        : "AAL2 authentication required.",
    );

    this.name =
      "AuthenticationError";

    this.code = code;
  }
}


/* =========================================================
 * 3. CLAIM HELPERS
 * ======================================================= */

function getClaimString(
  claims: Record<string, unknown>,
  key: string,
): string | null {
  const value = claims[key];

  return typeof value === "string"
    ? value
    : null;
}


function normalizeAal(
  value: unknown,
): AuthenticatorAssuranceLevel | null {
  if (value === "aal2") {
    return "aal2";
  }

  if (value === "aal1") {
    return "aal1";
  }

  return null;
}


/* =========================================================
 * 4. VERIFIED IDENTITY
 * ======================================================= */

/**
 * Verifies the current access token using Supabase getClaims().
 *
 * IMPORTANT:
 *
 * This intentionally does NOT use getSession() as proof of
 * identity.
 *
 * getSession() may be useful when raw session tokens are
 * required, but its stored user object is not trusted here
 * for authorization.
 */
async function getVerifiedIdentityFromClient(
  supabase: ServerSupabaseClient,
): Promise<VerifiedAuthIdentity | null> {
  const {
    data,
    error,
  } = await supabase.auth.getClaims();

  if (
    error ||
    !data?.claims
  ) {
    return null;
  }

  const claims =
    data.claims as Record<string, unknown>;

  const subject =
    getClaimString(
      claims,
      "sub",
    );

  if (!subject) {
    return null;
  }

  const parsedUserId =
    uuidSchema.safeParse(subject);

  if (!parsedUserId.success) {
    return null;
  }

  const role =
    getClaimString(
      claims,
      "role",
    );

  if (
    role !== null &&
    role !== "authenticated"
  ) {
    return null;
  }

  /**
   * Supabase treats JWTs without an AAL claim as AAL1.
   *
   * Therefore anything that is not explicitly AAL2 falls
   * back to the weaker AAL1 state.
   */
  const aal =
    normalizeAal(
      claims["aal"],
    ) ?? "aal1";

  const email =
    getClaimString(
      claims,
      "email",
    );

  return {
    id: parsedUserId.data,
    email,
    aal,
  };
}


/* =========================================================
 * 5. OPTIONAL VERIFIED IDENTITY
 * ======================================================= */

/**
 * Returns the verified authenticated identity when one
 * exists.
 *
 * Returns null for:
 *
 * - no session
 * - invalid token
 * - expired/unverifiable token
 * - invalid subject
 *
 * No redirect occurs.
 */
export async function getVerifiedAuthIdentity():
Promise<VerifiedAuthIdentity | null> {
  const supabase =
    await createClient();

  return getVerifiedIdentityFromClient(
    supabase,
  );
}


/* =========================================================
 * 6. AUTHENTICATION STATE
 * ======================================================= */

/**
 * Provides enough information for the login/MFA UI to decide
 * whether the user needs:
 *
 * - conventional login
 * - MFA enrollment
 * - MFA verification
 * - no further authentication
 *
 * Authorization itself still relies on the verified JWT AAL.
 */
export async function getAuthenticationState():
Promise<AuthenticationState> {
  const supabase =
    await createClient();

  const identity =
    await getVerifiedIdentityFromClient(
      supabase,
    );

  if (!identity) {
    return {
      authenticated: false,
      identity: null,
      current_level: null,
      next_level: null,
      mfa_action: "none",
    };
  }

  if (
    identity.aal ===
    REQUIRED_AUTHENTICATION_LEVEL
  ) {
    return {
      authenticated: true,
      identity,
      current_level: "aal2",
      next_level: "aal2",
      mfa_action: "none",
    };
  }

  const {
    data,
    error,
  } =
    await supabase.auth.mfa
      .getAuthenticatorAssuranceLevel();

  if (error || !data) {
    return {
      authenticated: true,
      identity,
      current_level: "aal1",
      next_level: null,
      mfa_action: "unknown",
    };
  }

  const nextLevel =
    normalizeAal(
      data.nextLevel,
    );

  if (nextLevel === "aal2") {
    return {
      authenticated: true,
      identity,
      current_level: "aal1",
      next_level: "aal2",
      mfa_action: "verify",
    };
  }

  if (nextLevel === "aal1") {
    return {
      authenticated: true,
      identity,
      current_level: "aal1",
      next_level: "aal1",
      mfa_action: "enroll",
    };
  }

  return {
    authenticated: true,
    identity,
    current_level: "aal1",
    next_level: null,
    mfa_action: "unknown",
  };
}


/* =========================================================
 * 7. ASSERT AUTHENTICATED
 * ======================================================= */

/**
 * Server/API-friendly authentication assertion.
 *
 * Unlike the page helpers below, this throws instead of
 * redirecting.
 */
export async function assertAuthenticatedIdentity():
Promise<VerifiedAuthIdentity> {
  const identity =
    await getVerifiedAuthIdentity();

  if (!identity) {
    throw new AuthenticationError(
      "UNAUTHENTICATED",
    );
  }

  return identity;
}


/* =========================================================
 * 8. ASSERT AAL2
 * ======================================================= */

/**
 * Primary server-side LIFE OS data authorization gate.
 *
 * Authenticated AAL1 is intentionally insufficient for
 * private LIFE OS data.
 */
export async function assertAAL2Identity():
Promise<VerifiedAuthIdentity> {
  const identity =
    await assertAuthenticatedIdentity();

  if (
    identity.aal !==
    REQUIRED_AUTHENTICATION_LEVEL
  ) {
    throw new AuthenticationError(
      "MFA_REQUIRED",
    );
  }

  return identity;
}


/* =========================================================
 * 9. GET AAL2 IDENTITY WITHOUT THROWING
 * ======================================================= */

export async function getAAL2Identity():
Promise<VerifiedAuthIdentity | null> {
  const identity =
    await getVerifiedAuthIdentity();

  if (
    !identity ||
    identity.aal !==
      REQUIRED_AUTHENTICATION_LEVEL
  ) {
    return null;
  }

  return identity;
}


/* =========================================================
 * 10. PAGE GUARD — AUTHENTICATED
 * ======================================================= */

/**
 * Server Component page guard.
 *
 * Allows AAL1 because the login/MFA flow itself may need to
 * operate after the first authentication factor.
 */
export async function requireAuthenticatedIdentity():
Promise<VerifiedAuthIdentity> {
  const identity =
    await getVerifiedAuthIdentity();

  if (!identity) {
    redirect(LOGIN_ROUTE);
  }

  return identity;
}


/* =========================================================
 * 11. PAGE GUARD — AAL2
 * ======================================================= */

/**
 * Main protected-page guard.
 *
 * User without a valid session:
 *
 *   → /login
 *
 * User with AAL1:
 *
 *   → /login?step=mfa
 *
 * User with AAL2:
 *
 *   → protected LIFE OS page
 *
 * The redirect target is fixed by application code and never
 * accepts a user-controlled destination.
 */
export async function requireAAL2Identity():
Promise<VerifiedAuthIdentity> {
  const identity =
    await getVerifiedAuthIdentity();

  if (!identity) {
    redirect(LOGIN_ROUTE);
  }

  if (
    identity.aal !==
    REQUIRED_AUTHENTICATION_LEVEL
  ) {
    redirect(
      `${LOGIN_ROUTE}?step=mfa`,
    );
  }

  return identity;
}


/* =========================================================
 * 12. LOGIN PAGE REDIRECT
 * ======================================================= */

/**
 * Prevents a fully authenticated AAL2 user from unnecessarily
 * remaining on the login page.
 */
export async function redirectIfFullyAuthenticated():
Promise<void> {
  const identity =
    await getVerifiedAuthIdentity();

  if (
    identity?.aal ===
    REQUIRED_AUTHENTICATION_LEVEL
  ) {
    redirect(
      DEFAULT_AUTHENTICATED_ROUTE,
    );
  }
}


/* =========================================================
 * 13. FRESH USER RECORD
 * ======================================================= */

/**
 * Use only when current Auth-server user metadata is actually
 * needed.
 *
 * getClaims() remains the normal identity verification path.
 *
 * getUser() performs an Auth server request and gives us the
 * current user record.
 */
export async function getFreshAuthenticatedUser():
Promise<User | null> {
  const supabase =
    await createClient();

  const identity =
    await getVerifiedIdentityFromClient(
      supabase,
    );

  if (!identity) {
    return null;
  }

  const {
    data,
    error,
  } =
    await supabase.auth.getUser();

  if (
    error ||
    !data.user ||
    data.user.id !== identity.id
  ) {
    return null;
  }

  return data.user;
}


/* =========================================================
 * 14. REQUIRE FRESH USER
 * ======================================================= */

export async function requireFreshAuthenticatedUser():
Promise<User> {
  const user =
    await getFreshAuthenticatedUser();

  if (!user) {
    redirect(LOGIN_ROUTE);
  }

  return user;
}


/* =========================================================
 * 15. USER ID CONVENIENCE
 * ======================================================= */

/**
 * Safe convenience helper for server-side data functions.
 *
 * user_id is always obtained from verified authentication,
 * never from browser input or AI arguments.
 */
export async function requireAAL2UserId():
Promise<UUID> {
  const identity =
    await assertAAL2Identity();

  return identity.id;
}


/* =========================================================
 * 16. FINAL SECURITY RULE
 * ======================================================= */

/**
 * LIFE OS Authentication Boundary
 *
 * Authentication:
 *
 * Supabase Auth
 *      ↓
 * getClaims() verifies JWT
 *      ↓
 * user ID derived from verified `sub`
 *      ↓
 * AAL2 required
 *      ↓
 * Server data layer
 *      ↓
 * PostgreSQL RLS verifies ownership again
 *
 *
 * NEVER:
 *
 * - trust user_id from request input
 * - trust user_id generated by AI
 * - use getSession() user data as authorization proof
 * - bypass MFA for convenience
 * - expose service_role
 * - weaken RLS because application auth exists
 *
 *
 * Defense in depth:
 *
 * Verified JWT
 * +
 * MFA / AAL2
 * +
 * Server authorization
 * +
 * PostgreSQL RLS
 */