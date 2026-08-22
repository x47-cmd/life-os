"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  FormEvent,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  APP_NAME,
  DEFAULT_AUTHENTICATED_ROUTE,
} from "@/lib/constants";

import {
  createClient,
} from "@/lib/supabase/client";

import {
  loginInputSchema,
} from "@/lib/validation";


/* =========================================================
 * 1. AUTH FLOW
 * ======================================================= */

type AuthFlow =
  | "checking"
  | "login";


/* =========================================================
 * 2. SAFE USER MESSAGES
 * ======================================================= */

const AUTH_MESSAGES = {
  loginFailed:
    "تعذر تسجيل الدخول. تحقق من البيانات وحاول مرة أخرى.",

  authCheckFailed:
    "تعذر التحقق من حالة الدخول. حاول تسجيل الدخول مرة أخرى.",

  invalidLogin:
    "أدخل البريد الإلكتروني وكلمة المرور بشكل صحيح.",
} as const;


/* =========================================================
 * 3. LOGIN PAGE
 * ======================================================= */

export default function LoginPage() {
  const router =
    useRouter();

  const supabase =
    useMemo(
      () =>
        createClient(),
      [],
    );

  const [
    flow,
    setFlow,
  ] =
    useState<AuthFlow>(
      "checking",
    );

  const [
    email,
    setEmail,
  ] =
    useState("");

  const [
    password,
    setPassword,
  ] =
    useState("");

  const [
    isBusy,
    setIsBusy,
  ] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState<string | null>(
      null,
    );


  /* =======================================================
   * 4. ENTER PRIVATE WORKSPACE
   * ===================================================== */

  function enterLifeOS():
  void {
    router.replace(
      DEFAULT_AUTHENTICATED_ROUTE,
    );

    router.refresh();
  }


  /* =======================================================
   * 5. INITIAL AUTH CHECK
   * ===================================================== */

  useEffect(
    () => {
      let active =
        true;

      async function initialize():
      Promise<void> {
        try {
          const {
            data,
            error,
          } =
            await supabase.auth
              .getUser();

          if (!active) {
            return;
          }

          if (
            !error &&
            data.user
          ) {
            enterLifeOS();

            return;
          }

          setFlow(
            "login",
          );
        } catch {
          if (!active) {
            return;
          }

          setErrorMessage(
            AUTH_MESSAGES
              .authCheckFailed,
          );

          setFlow(
            "login",
          );
        }
      }

      void initialize();

      return () => {
        active = false;
      };
    },
    // Supabase client and router remain stable for the
    // lifetime of this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );


  /* =======================================================
   * 6. PASSWORD LOGIN
   * ===================================================== */

  async function handleLogin(
    event: FormEvent<HTMLFormElement>,
  ):
  Promise<void> {
    event.preventDefault();

    if (isBusy) {
      return;
    }

    setErrorMessage(
      null,
    );

    const normalizedEmail =
      email
        .trim()
        .toLowerCase();

    const validation =
      loginInputSchema.safeParse({
        email:
          normalizedEmail,

        password,
      });

    if (
      !validation.success
    ) {
      setErrorMessage(
        AUTH_MESSAGES
          .invalidLogin,
      );

      return;
    }

    setIsBusy(
      true,
    );

    try {
      const {
        data,
        error,
      } =
        await supabase.auth
          .signInWithPassword({
            email:
              normalizedEmail,

            password,
          });

      /**
       * Provider-specific authentication errors are never
       * shown directly.
       *
       * This avoids exposing unnecessary account or
       * infrastructure information.
       */
      if (
        error ||
        !data.user ||
        !data.session
      ) {
        setErrorMessage(
          AUTH_MESSAGES
            .loginFailed,
        );

        return;
      }

      /**
       * Password is no longer needed after successful login.
       */
      setPassword(
        "",
      );

      /**
       * LIFE OS V1 uses password-only authentication.
       *
       * A verified Supabase session is sufficient to enter
       * the private workspace.
       *
       * Private database access remains protected separately
       * by PostgreSQL RLS and row ownership.
       */
      enterLifeOS();
    } catch {
      setErrorMessage(
        AUTH_MESSAGES
          .loginFailed,
      );
    } finally {
      setIsBusy(
        false,
      );
    }
  }


  /* =======================================================
   * 7. CHECKING SCREEN
   * ===================================================== */

  if (
    flow ===
    "checking"
  ) {
    return (
      <main className="auth-page">
        <section
          className="auth-card"
          aria-live="polite"
        >
          <div className="auth-brand">
            <div
              className="auth-brand__mark"
              aria-hidden="true"
            >
              L
            </div>

            <h1 className="auth-brand__title">
              {APP_NAME}
            </h1>

            <p className="auth-brand__subtitle">
              جارٍ التحقق من حالة الدخول...
            </p>
          </div>
        </section>
      </main>
    );
  }


  /* =======================================================
   * 8. LOGIN SCREEN
   * ===================================================== */

  return (
    <main className="auth-page">
      <section className="auth-card">

        <div className="auth-brand">
          <div
            className="auth-brand__mark"
            aria-hidden="true"
          >
            L
          </div>

          <h1 className="auth-brand__title">
            {APP_NAME}
          </h1>

          <p className="auth-brand__subtitle">
            مساحة شخصية خاصة
          </p>
        </div>


        {errorMessage ? (
          <div
            className="alert alert--negative"
            role="alert"
          >
            {errorMessage}
          </div>
        ) : null}


        <form
          className="form"
          onSubmit={
            handleLogin
          }
        >
          <div className="form-field">
            <label
              className="form-label"
              htmlFor="life-os-email"
            >
              البريد الإلكتروني
            </label>

            <input
              id="life-os-email"
              className="input ltr"
              type="email"
              inputMode="email"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              value={email}
              disabled={isBusy}
              onChange={(
                event,
              ) => {
                setEmail(
                  event.target
                    .value,
                );
              }}
            />
          </div>


          <div className="form-field">
            <label
              className="form-label"
              htmlFor="life-os-password"
            >
              كلمة المرور
            </label>

            <input
              id="life-os-password"
              className="input ltr"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              disabled={isBusy}
              onChange={(
                event,
              ) => {
                setPassword(
                  event.target
                    .value,
                );
              }}
            />
          </div>


          <button
            type="submit"
            className="button button--primary button--full"
            disabled={isBusy}
          >
            {isBusy
              ? "جارٍ تسجيل الدخول..."
              : "تسجيل الدخول"}
          </button>
        </form>


        <p
          className="text-subtle text-small text-center"
          style={{
            margin:
              "18px 0 0",
          }}
        >
          لا يوجد تسجيل عام في LIFE OS.
        </p>
      </section>
    </main>
  );
}


/* =========================================================
 * 9. SECURITY BOUNDARY
 * ======================================================= */

/**
 * This page establishes a Supabase authenticated session.
 *
 * It does NOT authorize private database rows by itself.
 *
 * LIFE OS protection remains:
 *
 * Email + password
 *      ↓
 * Verified Supabase session
 *      ↓
 * Verified JWT
 *      ↓
 * Server authorization
 *      ↓
 * PostgreSQL RLS
 *      ↓
 * Row ownership
 */


/* =========================================================
 * 10. NO PUBLIC SIGN-UP
 * ======================================================= */

/**
 * LIFE OS V1 contains:
 *
 * Sign in ✅
 *
 * Public sign-up ❌
 * Social sign-up ❌
 * Anonymous account creation ❌
 *
 * The account is provisioned administratively in Supabase.
 */


/* =========================================================
 * 11. SECRET HANDLING
 * ======================================================= */

/**
 * Passwords:
 *
 * - remain only in transient component state
 * - are cleared after successful authentication
 * - are never logged
 * - are never stored in LIFE OS tables
 * - are never sent to OpenAI
 * - are never added to audit metadata
 */


/* =========================================================
 * 12. SAFE AUTH ERRORS
 * ======================================================= */

/**
 * Provider error messages are not displayed directly.
 *
 * This prevents unnecessary disclosure of:
 *
 * - account existence
 * - authentication configuration
 * - internal provider information
 * - infrastructure details
 */


/* =========================================================
 * 13. FINAL LOGIN RULE
 * ======================================================= */

/**
 * Email
 *      +
 * Password
 *      ↓
 * Verified Supabase session
 *      ↓
 * Dashboard
 *
 *
 * No MFA requirement.
 * No QR enrollment.
 * No TOTP verification.
 * No public registration.
 * No secrets in logs.
 * No client-side database authorization assumptions.
 */