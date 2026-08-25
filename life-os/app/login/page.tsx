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
  LOGIN_ROUTE,
} from "@/lib/constants";

import {
  createClient,
} from "@/lib/supabase/client";

import {
  loginInputSchema,
} from "@/lib/validation";


/* =========================================================
 * 1. ROUTES
 * ======================================================= */

const AFTER_PASSWORD_ROUTE =
  "/mfa";


/* =========================================================
 * 2. AUTH FLOW
 * ======================================================= */

type AuthFlow =
  | "checking"
  | "login"
  | "submitting";


/* =========================================================
 * 3. SAFE MESSAGES
 * ======================================================= */

const AUTH_MESSAGES = {
  loginFailed:
    "تعذر تسجيل الدخول. تحقق من البريد الإلكتروني وكلمة المرور.",

  authCheckFailed:
    "تعذر التحقق من حالة الدخول. حاول مرة أخرى.",

  invalidLogin:
    "أدخل البريد الإلكتروني وكلمة المرور بشكل صحيح.",

  submitting:
    "جاري التحقق من بيانات الدخول...",
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
    message,
    setMessage,
  ] =
    useState("");


  /* =======================================================
   * 5. EXISTING SESSION CHECK
   * ===================================================== */

  useEffect(
    () => {
      let active =
        true;


      async function checkAuthentication():
      Promise<void> {
        const {
          data,
          error,
        } =
          await supabase.auth
            .getClaims();


        if (
          !active
        ) {
          return;
        }


        if (
          error
        ) {
          setFlow(
            "login",
          );

          setMessage(
            AUTH_MESSAGES
              .authCheckFailed,
          );

          return;
        }


        if (
          data?.claims
        ) {
          router.replace(
            AFTER_PASSWORD_ROUTE,
          );

          router.refresh();

          return;
        }


        setFlow(
          "login",
        );
      }


      void checkAuthentication();


      return () => {
        active =
          false;
      };
    },
    [
      router,
      supabase,
    ],
  );


  /* =======================================================
   * 6. LOGIN
   * ===================================================== */

  async function handleLogin(
    event:
      FormEvent<
        HTMLFormElement
      >,
  ):
  Promise<void> {
    event.preventDefault();


    const parsed =
      loginInputSchema.safeParse({
        email:
          email.trim(),

        password,
      });


    if (
      !parsed.success
    ) {
      setMessage(
        AUTH_MESSAGES
          .invalidLogin,
      );

      return;
    }


    setFlow(
      "submitting",
    );

    setMessage(
      AUTH_MESSAGES
        .submitting,
    );


    const {
      error,
    } =
      await supabase.auth
        .signInWithPassword({
          email:
            parsed.data.email,

          password:
            parsed.data.password,
        });


    if (
      error
    ) {
      setPassword(
        "",
      );

      setFlow(
        "login",
      );

      setMessage(
        AUTH_MESSAGES
          .loginFailed,
      );

      return;
    }


    router.replace(
      AFTER_PASSWORD_ROUTE,
    );

    router.refresh();
  }


  /* =======================================================
   * 7. FIELD CHANGES
   * ===================================================== */

  function handleEmailChange(
    value:
      string,
  ):
  void {
    setEmail(
      value,
    );


    if (
      message
    ) {
      setMessage(
        "",
      );
    }
  }


  function handlePasswordChange(
    value:
      string,
  ):
  void {
    setPassword(
      value,
    );


    if (
      message
    ) {
      setMessage(
        "",
      );
    }
  }


  /* =======================================================
   * 8. RENDER
   * ===================================================== */

  const isChecking =
    flow ===
      "checking";


  const isSubmitting =
    flow ===
      "submitting";


  return (
    <main className="auth-page">
      <section
        className="auth-card"
        aria-labelledby="login-title"
      >
        <div className="auth-card__header">
          <div
            className="brand-mark"
            aria-hidden="true"
          >
            ✦
          </div>

          <div>
            <p className="eyebrow">
              {APP_NAME}
            </p>

            <h1
              id="login-title"
              className="auth-card__title"
            >
              تسجيل الدخول
            </h1>

            <p className="auth-card__description">
              منظومتك الشخصية الخاصة لإدارة المال والأهداف والاستثمارات والتطوير.
            </p>
          </div>
        </div>


        {isChecking ? (
          <div
            className="notice"
            role="status"
            aria-live="polite"
          >
            جاري التحقق من حالة الدخول...
          </div>
        ) : (
          <form
            className="stack"
            onSubmit={
              handleLogin
            }
            noValidate
          >
            <label
              className="field"
              htmlFor="email"
            >
              <span className="field__label">
                البريد الإلكتروني
              </span>

              <input
                id="email"
                className="input ltr"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                value={email}
                onChange={
                  (
                    event,
                  ) => {
                    handleEmailChange(
                      event.target.value,
                    );
                  }
                }
                placeholder="name@example.com"
                disabled={
                  isSubmitting
                }
                required
                autoFocus
              />
            </label>


            <label
              className="field"
              htmlFor="password"
            >
              <span className="field__label">
                كلمة المرور
              </span>

              <input
                id="password"
                className="input ltr"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={
                  (
                    event,
                  ) => {
                    handlePasswordChange(
                      event.target.value,
                    );
                  }
                }
                placeholder="••••••••"
                disabled={
                  isSubmitting
                }
                required
              />
            </label>


            {message ? (
              <div
                className="notice"
                role="alert"
                aria-live="polite"
              >
                {message}
              </div>
            ) : null}


            <button
              className="button button--primary"
              type="submit"
              disabled={
                isSubmitting
              }
            >
              {isSubmitting
                ? "جاري تسجيل الدخول..."
                : "متابعة"}
            </button>
          </form>
        )}


        <div className="stack stack--small">
          <div className="space-between">
            <span className="text-muted text-small">
              كلمة المرور
            </span>

            <span className="badge badge--positive">
              الخطوة الأولى
            </span>
          </div>

          <div className="space-between">
            <span className="text-muted text-small">
              TOTP / MFA
            </span>

            <span className="badge badge--positive">
              إلزامي
            </span>
          </div>

          <div className="space-between">
            <span className="text-muted text-small">
              مستوى الوصول النهائي
            </span>

            <strong className="ltr">
              AAL2
            </strong>
          </div>
        </div>


        <p className="text-muted text-small">
          بعد التحقق من كلمة المرور ستنتقل إلى رمز المصادقة. لن تُفتح البيانات الخاصة قبل اكتمال الخطوتين.
        </p>


        <span
          aria-hidden="true"
          style={{
            display:
              "none",
          }}
        >
          {LOGIN_ROUTE}
        </span>
      </section>
    </main>
  );
}