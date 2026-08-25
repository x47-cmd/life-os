import type {
  User,
} from "@supabase/supabase-js";

import {
  redirect,
} from "next/navigation";

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
 * 1. AUTHENTICATION ROUTES
 * ======================================================= */

export const MFA_ROUTE =
  "/mfa";


/* =========================================================
 * 2. AUTHENTICATION TYPES
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
 * 3. AUTHENTICATION ERRORS
 * ======================================================= */

export type AuthenticationErrorCode =
  | "UNAUTHENTICATED"
  | "MFA_REQUIRED";


export class AuthenticationError
  extends Error {
  readonly code:
    AuthenticationErrorCode;


  constructor(
    code:
      AuthenticationErrorCode,
  ) {
    super(
      code ===
        "MFA_REQUIRED"
        ? "Multi-factor authentication is required."
        : "Authentication is required.",
    );


    this.name =
      "AuthenticationError";


    this.code =
      code;
  }
}


/* =========================================================
 * 4. CLAIM HELPERS
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


  const {
    data:
      assuranceData,
    error:
      assuranceError,
  } =
    await supabase.auth.mfa
      .getAuthenticatorAssuranceLevel();


  const currentLevel =
    assuranceError
      ? identity.aal
      : normalizeAal(
          assuranceData
            ?.currentLevel,
        ) ??
        identity.aal;


  const nextLevel =
    assuranceError
      ? currentLevel
      : normalizeAal(
          assuranceData
            ?.nextLevel,
        ) ??
        currentLevel;


  if (
    currentLevel ===
      REQUIRED_AUTHENTICATION_LEVEL
  ) {
    return {
      authenticated:
        true,

      identity: {
        ...identity,

        aal:
          currentLevel,
      },

      current_level:
        currentLevel,

      next_level:
        nextLevel,

      mfa_action:
        "none",
    };
  }


  const {
    data:
      factorsData,
    error:
      factorsError,
  } =
    await supabase.auth.mfa
      .listFactors();


  if (
    factorsError
  ) {
    return {
      authenticated:
        true,

      identity: {
        ...identity,

        aal:
          currentLevel,
      },

      current_level:
        currentLevel,

      next_level:
        nextLevel,

      mfa_action:
        "unknown",
    };
  }


  const hasVerifiedTotp =
    factorsData
      ?.totp
      ?.some(
        (
          factor,
        ) =>
          factor.status ===
            "verified",
      ) ??
    false;


  return {
    authenticated:
      true,

    identity: {
      ...identity,

      aal:
        currentLevel,
    },

    current_level:
      currentLevel,

    next_level:
      nextLevel,

    mfa_action:
      hasVerifiedTotp
        ? "verify"
        : "enroll",
  };
}


/* =========================================================
 * 8. ASSERT AUTHENTICATED IDENTITY
 * ======================================================= */

/**
 * Canonical private API and data-layer assertion.
 *
 * A verified session is not sufficient until the current JWT
 * has been promoted to the required AAL2 level.
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
 * 9. ASSERT AAL2 IDENTITY
 * ======================================================= */

/**
 * Required by private APIs and private data operations.
 */
export async function assertAAL2Identity():
Promise<VerifiedAuthIdentity> {
  return assertAuthenticatedIdentity();
}


/* =========================================================
 * 10. OPTIONAL AAL2 IDENTITY
 * ======================================================= */

export async function getAAL2Identity():
Promise<
  VerifiedAuthIdentity |
  null
> {
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
 * 11. PAGE GUARD — AUTHENTICATED
 * ======================================================= */

/**
 * Canonical private page guard.
 *
 * The /mfa browser flow uses the browser client directly and
 * therefore does not call this private-page guard.
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


  if (
    state.current_level !==
      REQUIRED_AUTHENTICATION_LEVEL
  ) {
    redirect(
      MFA_ROUTE,
    );
  }


  return state.identity;
}


/* =========================================================
 * 12. PAGE GUARD — AAL2
 * ======================================================= */

/**
 * Private LIFE OS pages require AAL2.
 */
export async function requireAAL2Identity():
Promise<VerifiedAuthIdentity> {
  return requireAuthenticatedIdentity();
}


/* =========================================================
 * 13. LOGIN PAGE REDIRECT
 * ======================================================= */

export async function redirectIfFullyAuthenticated():
Promise<void> {
  const state =
    await getAuthenticationState();


  if (
    !state.authenticated
  ) {
    return;
  }


  if (
    state.current_level ===
      REQUIRED_AUTHENTICATION_LEVEL
  ) {
    redirect(
      DEFAULT_AUTHENTICATED_ROUTE,
    );
  }


  redirect(
    MFA_ROUTE,
  );
}


/* =========================================================
 * 14. FRESH AUTHENTICATED USER
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
 * Private data operations derive user_id from a verified AAL2
 * identity.
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
 * Password verified
 *      ↓
 * AAL1
 *      ↓
 * /mfa
 *
 *
 * TOTP enrolled and verified
 *      ↓
 * AAL2
 *      ↓
 * private LIFE OS access
 *
 *
 * Authorization proof:
 *
 * verified JWT claims
 * +
 * AAL2
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
