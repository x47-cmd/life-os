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
 * LIFE OS V2
 * LOGIN
 *
 * Flow:
 *
 * Email + Password
 *      ↓
 * Supabase Auth
 *      ↓
 * /onboarding
 *      ↓
 * No profile → setup
 * Existing profile → dashboard
 * ======================================================= */


/* =========================================================
 * 1. ROUTES
 * ======================================================= */

const AFTER_LOGIN_ROUTE =
  "/onboarding";


/* =========================================================
 * 2. AUTH FLOW
 * ======================================================= */

type AuthFlow =
  | "checking"
  | "login";


/* =========================================================
 * 3. SAFE USER MESSAGES
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
 * 4. LOGIN PAGE
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
   * 5. ENTER LIFE OS V2
   * ===================================================== */

  function enterLifeOS():
  void {
    /*
     * V2 always resolves onboarding first.
     *
     * /onboarding decides:
     *
     * profile missing
     *      → show first-time setup
     *
     * profile exists
     *      → redirect to DEFAULT_AUTHENTICATED_ROUTE
     *
     *
     * Prefetching the normal authenticated route keeps the
     * returning-user transition fast while preserving the
     * new onboarding decision boundary.
     */

    router.prefetch(
      DEFAULT_AUTHENTICATED_ROUTE,
    );


    router.replace(
      AFTER_LOGIN_ROUTE,
    );


    router.refresh();
  }


  /* =======================================================
   * 6. INITIAL AUTH CHECK
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


          if (
            !active
          ) {
            return;
          }


          /*
           * Already authenticated.
           *
           * Do not guess on the client whether onboarding has
           * been completed.
           *
           * Let /onboarding resolve that on the server.
           */
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
          if (
            !active
          ) {
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
        active =
          false;
      };
    },

    // Supabase client and router remain stable for the
    // lifetime of this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );


  /* =======================================================
   * 7. PASSWORD LOGIN
   * ===================================================== */

  async function handleLogin(
    event:
      FormEvent<HTMLFormElement>,
  ):
  Promise<void> {
    event.preventDefault();


    if (
      isBusy
    ) {
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


      /*
       * Never expose raw Supabase authentication errors.
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


      /*
       * Password is no longer needed after successful login.
       */
      setPassword(
        "",
      );


      /*
       * V2 onboarding router decides whether this is:
       *
       * first setup
       *
       * or:
       *
       * normal returning user.
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
   * 8. CHECKING SCREEN
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
   * 9. LOGIN SCREEN
   * ===================================================== */

  return (
    <main className="auth-page">
      <section className="auth-card">

        {/* ===============================================
         * BRAND
         * ============================================= */}

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
            حياتك. خططك. قراراتك.
          </p>

        </div>


        {/* ===============================================
         * ERROR
         * ============================================= */}

        {errorMessage ? (
          <div
            className="alert alert--negative"
            role="alert"
          >
            {errorMessage}
          </div>
        ) : null}


        {/* ===============================================
         * LOGIN FORM
         * ============================================= */}

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
              value={
                email
              }
              disabled={
                isBusy
              }
              onChange={(
                event,
              ) => {
                setEmail(
                  event.target.value,
                );


                if (
                  errorMessage
                ) {
                  setErrorMessage(
                    null,
                  );
                }
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
              value={
                password
              }
              disabled={
                isBusy
              }
              onChange={(
                event,
              ) => {
                setPassword(
                  event.target.value,
                );


                if (
                  errorMessage
                ) {
                  setErrorMessage(
                    null,
                  );
                }
              }}
            />

          </div>


          <button
            type="submit"
            className="button button--primary button--full"
            disabled={
              isBusy
            }
          >
            {isBusy
              ? "جارٍ تسجيل الدخول..."
              : "تسجيل الدخول"}
          </button>

        </form>


        {/* ===============================================
         * PRIVATE WORKSPACE NOTE
         * ============================================= */}

        <p
          className="text-subtle text-small text-center"
          style={{
            margin:
              "18px 0 0",
          }}
        >
          LIFE OS مساحة شخصية خاصة.
        </p>

      </section>
    </main>
  );
}


/* =========================================================
 * 10. V2 LOGIN FLOW
 * ======================================================= */

/**
 * New user:
 *
 * Login
 *      ↓
 * /onboarding
 *      ↓
 * profile missing
 *      ↓
 * setup
 *      ↓
 * DEFAULT_AUTHENTICATED_ROUTE
 *
 *
 * Returning user:
 *
 * Login
 *      ↓
 * /onboarding
 *      ↓
 * profile exists
 *      ↓
 * DEFAULT_AUTHENTICATED_ROUTE
 */


/* =========================================================
 * 11. SECURITY BOUNDARY
 * ======================================================= */

/**
 * Login establishes authentication only.
 *
 * It does NOT determine database ownership.
 *
 *
 * Protection remains:
 *
 * Supabase Auth
 *      ↓
 * Verified JWT
 *      ↓
 * Server-side identity
 *      ↓
 * PostgreSQL RLS
 *      ↓
 * Row ownership
 */


/* =========================================================
 * 12. CLIENT DATA RULE
 * ======================================================= */

/**
 * The browser does NOT ask:
 *
 * "Does this user have a profile?"
 *
 * That decision belongs to:
 *
 * /onboarding
 *
 * on the server.
 *
 * This keeps V2 routing simple and avoids duplicating
 * sensitive data logic inside the login client.
 */


/* =========================================================
 * 13. ROUTE COMPATIBILITY RULE
 * ======================================================= */

/**
 * DEFAULT_AUTHENTICATED_ROUTE remains the canonical normal
 * private destination for LIFE OS.
 *
 * V2 does not remove that route.
 *
 * Instead:
 *
 * Login
 *      ↓
 * /onboarding
 *      ↓
 * DEFAULT_AUTHENTICATED_ROUTE
 *
 *
 * This preserves compatibility with existing LIFE OS routing
 * and security tests while allowing first-time onboarding.
 */


/* =========================================================
 * 14. SECRET HANDLING
 * ======================================================= */

/**
 * Password:
 *
 * - exists only temporarily in component state
 * - is cleared after successful login
 * - is never stored in LIFE OS tables
 * - is never logged
 * - is never sent to OpenAI
 */


/* =========================================================
 * 15. FINAL V2 LOGIN RULE
 * ======================================================= */

/**
 * Authentication decides:
 *
 * "Who are you?"
 *
 *
 * Onboarding decides:
 *
 * "Is LIFE OS ready for you?"
 *
 *
 * DEFAULT_AUTHENTICATED_ROUTE decides:
 *
 * "Where does the ready workspace begin?"
 *
 *
 * The dashboard should never be responsible for
 * authentication or first-time setup.
 */