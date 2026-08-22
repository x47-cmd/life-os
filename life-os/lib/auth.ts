import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

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


/**
 * Kept for backward compatibility with the existing
 * application routing interfaces.
 *
 * LIFE OS V1 now uses password-only authentication.
 */
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
  | "UNAUTHENTICATED";


export class AuthenticationError extends Error {
  readonly code: AuthenticationErrorCode;

  constructor(
    code: AuthenticationErrorCode,
  ) {
    super(
      "Authentication required.",
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
  const value =
    claims[key];

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
  } =
    await supabase.auth.getClaims();

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
    role !== null &&
    role !== "authenticated"
  ) {
    return null;
  }

  /**
   * Supabase password authentication normally produces AAL1.
   *
   * A session may still be AAL2 if MFA is ever enabled
   * manually in the future.
   *
   * LIFE OS accepts either authenticated level.
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
    id:
      parsedUserId.data,

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
 * LIFE OS V1 authentication state.
 *
 * Password authentication is sufficient.
 *
 * MFA enrollment and MFA verification are not required.
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
 * 7. ASSERT AUTHENTICATED
 * ======================================================= */

/**
 * Server/API-friendly authentication assertion.
 *
 * Throws when there is no verified authenticated user.
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
 * 8. LEGACY AAL2 ASSERTION ALIAS
 * ======================================================= */

/**
 * Backward-compatible alias.
 *
 * Existing LIFE OS modules still call:
 *
 * assertAAL2Identity()
 *
 * The function name is retained temporarily to avoid changing
 * every data module and page at once.
 *
 * Password-authenticated users are now sufficient.
 */
export async function assertAAL2Identity():
Promise<VerifiedAuthIdentity> {
  return assertAuthenticatedIdentity();
}


/* =========================================================
 * 9. LEGACY AAL2 OPTIONAL IDENTITY ALIAS
 * ======================================================= */

/**
 * Backward-compatible alias.
 *
 * Returns any verified authenticated LIFE OS identity.
 */
export async function getAAL2Identity():
Promise<VerifiedAuthIdentity | null> {
  return getVerifiedAuthIdentity();
}


/* =========================================================
 * 10. PAGE GUARD — AUTHENTICATED
 * ======================================================= */

/**
 * Server Component page guard.
 *
 * User without a valid session:
 *
 *   → /login
 *
 * Authenticated user:
 *
 *   → allowed
 */
export async function requireAuthenticatedIdentity():
Promise<VerifiedAuthIdentity> {
  const identity =
    await getVerifiedAuthIdentity();

  if (!identity) {
    redirect(
      LOGIN_ROUTE,
    );
  }

  return identity;
}


/* =========================================================
 * 11. LEGACY AAL2 PAGE GUARD ALIAS
 * ======================================================= */

/**
 * Backward-compatible protected-page guard.
 *
 * Existing private pages still call:
 *
 * requireAAL2Identity()
 *
 * Password authentication is now sufficient.
 *
 * PostgreSQL RLS remains responsible for row ownership
 * enforcement after authentication.
 */
export async function requireAAL2Identity():
Promise<VerifiedAuthIdentity> {
  return requireAuthenticatedIdentity();
}


/* =========================================================
 * 12. LOGIN PAGE REDIRECT
 * ======================================================= */

/**
 * Prevents an already authenticated user from unnecessarily
 * remaining on the login page.
 */
export async function redirectIfFullyAuthenticated():
Promise<void> {
  const identity =
    await getVerifiedAuthIdentity();

  if (identity) {
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
    data.user.id !==
      identity.id
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
    redirect(
      LOGIN_ROUTE,
    );
  }

  return user;
}


/* =========================================================
 * 15. USER ID CONVENIENCE
 * ======================================================= */

/**
 * Safe convenience helper for existing server-side data
 * functions.
 *
 * The legacy function name is intentionally retained so the
 * rest of LIFE OS does not need a broad authorization
 * refactor.
 *
 * user_id is always obtained from verified authentication,
 * never from browser input or AI arguments.
 */
export async function requireAAL2UserId():
Promise<UUID> {
  const identity =
    await assertAuthenticatedIdentity();

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
 * Email + password
 *      ↓
 * getClaims() verifies JWT
 *      ↓
 * user ID derived from verified `sub`
 *      ↓
 * Server authorization
 *      ↓
 * PostgreSQL RLS verifies ownership again
 *
 *
 * NEVER:
 *
 * - trust user_id from request input
 * - trust user_id generated by AI
 * - use getSession() user data as authorization proof
 * - expose service_role
 * - weaken RLS because application auth exists
 *
 *
 * Defense in depth:
 *
 * Verified JWT
 * +
 * Server authorization
 * +
 * PostgreSQL RLS
 * +
 * Ownership constraints
 *
 *
 * LIFE OS V1 authentication:
 *
 * Email
 * +
 * Password
 * =
 * Private workspace access
 */