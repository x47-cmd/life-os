"use client";

import Image from "next/image";
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
  loginSchema,
  mfaCodeSchema,
} from "@/lib/validation";


/* =========================================================
 * 1. AUTH FLOW
 * ======================================================= */

type AuthFlow =
  | "checking"
  | "login"
  | "enroll"
  | "verify";


/* =========================================================
 * 2. ENROLLMENT STATE
 * ======================================================= */

interface EnrollmentState {
  factorId: string;
  qrCode: string;
  secret: string;
}


/* =========================================================
 * 3. SAFE USER MESSAGES
 * ======================================================= */

const AUTH_MESSAGES = {
  loginFailed:
    "تعذر تسجيل الدخول. تحقق من البيانات وحاول مرة أخرى.",

  authCheckFailed:
    "تعذر التحقق من حالة الدخول. حاول تسجيل الدخول مرة أخرى.",

  mfaLoadFailed:
    "تعذر تحميل إعدادات التحقق بخطوتين.",

  mfaEnrollFailed:
    "تعذر بدء إعداد التحقق بخطوتين. حاول مرة أخرى.",

  mfaVerifyFailed:
    "رمز التحقق غير صحيح أو انتهت صلاحيته. حاول مرة أخرى.",

  invalidLogin:
    "أدخل البريد الإلكتروني وكلمة المرور بشكل صحيح.",

  invalidCode:
    "أدخل رمز التحقق المكوّن من 6 أرقام.",
} as const;


/* =========================================================
 * 4. QR CODE NORMALIZATION
 * ======================================================= */

/**
 * Supabase normally returns a QR value usable by an image
 * element.
 *
 * If an SVG string is returned instead, LIFE OS converts it
 * locally into a data URL.
 *
 * No remote QR service is used.
 */
function normalizeQrCode(
  value: string,
): string | null {
  const trimmed =
    value.trim();

  if (
    trimmed.startsWith(
      "data:image/",
    )
  ) {
    return trimmed;
  }

  if (
    trimmed.startsWith(
      "<svg",
    )
  ) {
    return (
      "data:image/svg+xml;charset=utf-8," +
      encodeURIComponent(
        trimmed,
      )
    );
  }

  return null;
}


/* =========================================================
 * 5. TOTP CODE VALIDATION
 * ======================================================= */

function isValidTotpCode(
  code: string,
): boolean {
  const normalized =
    code.trim();

  /**
   * Support the exact locked validation schema whether it was
   * defined as a direct code schema or a form-object schema.
   */
  const directResult =
    mfaCodeSchema.safeParse(
      normalized,
    );

  const objectResult =
    mfaCodeSchema.safeParse({
      code:
        normalized,
    });

  return (
    (
      directResult.success ||
      objectResult.success
    ) &&
    /^\d{6}$/.test(
      normalized,
    )
  );
}


/* =========================================================
 * 6. LOGIN PAGE
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
    verificationCode,
    setVerificationCode,
  ] =
    useState("");

  const [
    factorId,
    setFactorId,
  ] =
    useState<string | null>(
      null,
    );

  const [
    enrollment,
    setEnrollment,
  ] =
    useState<EnrollmentState | null>(
      null,
    );

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
   * 7. ENTER PRIVATE WORKSPACE
   * ===================================================== */

  function enterLifeOS():
  void {
    router.replace(
      DEFAULT_AUTHENTICATED_ROUTE,
    );

    router.refresh();
  }


  /* =======================================================
   * 8. RESOLVE CURRENT AUTH STATE
   * ===================================================== */

  async function resolveAuthFlow():
  Promise<void> {
    setErrorMessage(
      null,
    );

    const {
      data: aal,
      error: aalError,
    } =
      await supabase.auth.mfa
        .getAuthenticatorAssuranceLevel();

    if (aalError) {
      setFlow(
        "login",
      );

      return;
    }


    /* -----------------------------------------------------
     * Already fully authenticated
     * -------------------------------------------------- */

    if (
      aal.currentLevel ===
      "aal2"
    ) {
      enterLifeOS();

      return;
    }


    /* -----------------------------------------------------
     * No authenticated AAL1 session
     * -------------------------------------------------- */

    if (
      aal.currentLevel !==
      "aal1"
    ) {
      setFlow(
        "login",
      );

      return;
    }


    /* -----------------------------------------------------
     * AAL1 exists — determine whether TOTP is enrolled
     * -------------------------------------------------- */

    const {
      data: factors,
      error: factorsError,
    } =
      await supabase.auth.mfa
        .listFactors();

    if (
      factorsError ||
      !factors
    ) {
      setErrorMessage(
        AUTH_MESSAGES
          .mfaLoadFailed,
      );

      setFlow(
        "login",
      );

      return;
    }

    const verifiedTotp =
      factors.totp.find(
        (factor) =>
          factor.status ===
          "verified",
      );

    if (
      verifiedTotp
    ) {
      setFactorId(
        verifiedTotp.id,
      );

      setFlow(
        "verify",
      );

      return;
    }


    /* -----------------------------------------------------
     * No verified TOTP factor → mandatory enrollment
     * -------------------------------------------------- */

    setFactorId(
      null,
    );

    setFlow(
      "enroll",
    );
  }


  /* =======================================================
   * 9. INITIAL AUTH CHECK
   * ===================================================== */

  useEffect(
    () => {
      let active =
        true;

      async function initialize():
      Promise<void> {
        try {
          await resolveAuthFlow();
        } catch {
          if (
            active
          ) {
            setErrorMessage(
              AUTH_MESSAGES
                .authCheckFailed,
            );

            setFlow(
              "login",
            );
          }
        }
      }

      void initialize();

      return () => {
        active = false;
      };
    },
    // Supabase client and router are intentionally stable for
    // the lifetime of this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );


  /* =======================================================
   * 10. PASSWORD LOGIN
   * ===================================================== */

  async function handleLogin(
    event: FormEvent<HTMLFormElement>,
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
      loginSchema.safeParse({
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
        error,
      } =
        await supabase.auth
          .signInWithPassword({
            email:
              normalizedEmail,

            password,
          });

      /**
       * Do not expose whether:
       *
       * - account exists
       * - password was wrong
       * - authentication configuration rejected the login
       */
      if (error) {
        setErrorMessage(
          AUTH_MESSAGES
            .loginFailed,
        );

        return;
      }

      setPassword(
        "",
      );

      await resolveAuthFlow();
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
   * 11. START TOTP ENROLLMENT
   * ===================================================== */

  async function handleStartEnrollment():
  Promise<void> {
    if (
      isBusy ||
      enrollment
    ) {
      return;
    }

    setErrorMessage(
      null,
    );

    setIsBusy(
      true,
    );

    try {

      /* ---------------------------------------------------
       * Re-check before creating a new factor.
       *
       * Another tab may already have completed enrollment.
       * ------------------------------------------------ */

      const {
        data: factors,
        error: factorsError,
      } =
        await supabase.auth.mfa
          .listFactors();

      if (
        factorsError ||
        !factors
      ) {
        setErrorMessage(
          AUTH_MESSAGES
            .mfaEnrollFailed,
        );

        return;
      }

      const verifiedTotp =
        factors.totp.find(
          (factor) =>
            factor.status ===
            "verified",
        );

      if (
        verifiedTotp
      ) {
        setFactorId(
          verifiedTotp.id,
        );

        setFlow(
          "verify",
        );

        return;
      }


      /* ---------------------------------------------------
       * Explicit user action creates the new TOTP factor.
       * ------------------------------------------------ */

      const {
        data,
        error,
      } =
        await supabase.auth.mfa
          .enroll({
            factorType:
              "totp",

            friendlyName:
              "LIFE OS",
          });

      if (
        error ||
        !data?.totp
      ) {
        setErrorMessage(
          AUTH_MESSAGES
            .mfaEnrollFailed,
        );

        return;
      }

      const qrCode =
        normalizeQrCode(
          data.totp.qr_code,
        );

      if (
        !qrCode
      ) {
        setErrorMessage(
          AUTH_MESSAGES
            .mfaEnrollFailed,
        );

        return;
      }

      setFactorId(
        data.id,
      );

      setEnrollment({
        factorId:
          data.id,

        qrCode,

        secret:
          data.totp.secret,
      });

      setVerificationCode(
        "",
      );
    } catch {
      setErrorMessage(
        AUTH_MESSAGES
          .mfaEnrollFailed,
      );
    } finally {
      setIsBusy(
        false,
      );
    }
  }


  /* =======================================================
   * 12. VERIFY TOTP
   * ===================================================== */

  async function handleVerify(
    event: FormEvent<HTMLFormElement>,
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

    const code =
      verificationCode.trim();

    if (
      !isValidTotpCode(
        code,
      )
    ) {
      setErrorMessage(
        AUTH_MESSAGES
          .invalidCode,
      );

      return;
    }

    const activeFactorId =
      enrollment?.factorId ??
      factorId;

    if (
      !activeFactorId
    ) {
      setErrorMessage(
        AUTH_MESSAGES
          .mfaLoadFailed,
      );

      return;
    }

    setIsBusy(
      true,
    );

    try {
      /**
       * Supabase creates the challenge and verifies the TOTP
       * code in one supported operation.
       *
       * Successful verification upgrades the session to AAL2.
       */
      const {
        error,
      } =
        await supabase.auth.mfa
          .challengeAndVerify({
            factorId:
              activeFactorId,

            code,
          });

      if (error) {
        setErrorMessage(
          AUTH_MESSAGES
            .mfaVerifyFailed,
        );

        setVerificationCode(
          "",
        );

        return;
      }

      /**
       * Remove sensitive enrollment material from component
       * state immediately after successful verification.
       */
      setEnrollment(
        null,
      );

      setVerificationCode(
        "",
      );

      enterLifeOS();
    } catch {
      setErrorMessage(
        AUTH_MESSAGES
          .mfaVerifyFailed,
      );

      setVerificationCode(
        "",
      );
    } finally {
      setIsBusy(
        false,
      );
    }
  }


  /* =======================================================
   * 13. RETURN TO LOGIN
   * ===================================================== */

  async function handleReturnToLogin():
  Promise<void> {
    if (
      isBusy
    ) {
      return;
    }

    setIsBusy(
      true,
    );

    setErrorMessage(
      null,
    );

    try {
      /**
       * End only this browser session.
       *
       * Do not unnecessarily invalidate sessions on every
       * other device.
       */
      await supabase.auth.signOut({
        scope:
          "local",
      });
    } catch {
      // Local UI still returns to the signed-out state.
    } finally {
      setEmail(
        "",
      );

      setPassword(
        "",
      );

      setVerificationCode(
        "",
      );

      setFactorId(
        null,
      );

      setEnrollment(
        null,
      );

      setFlow(
        "login",
      );

      setIsBusy(
        false,
      );
    }
  }


  /* =======================================================
   * 14. CHECKING SCREEN
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
   * 15. LOGIN SCREEN
   * ===================================================== */

  if (
    flow ===
    "login"
  ) {
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
                ? "جارٍ التحقق..."
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


  /* =======================================================
   * 16. MFA ENROLLMENT SCREEN
   * ===================================================== */

  if (
    flow ===
    "enroll"
  ) {
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
              حماية LIFE OS
            </h1>

            <p className="auth-brand__subtitle">
              التحقق بخطوتين إلزامي
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


          {!enrollment ? (
            <div className="stack">
              <div className="alert">
                أضف LIFE OS إلى تطبيق المصادقة قبل الدخول إلى بياناتك الخاصة.
              </div>

              <button
                type="button"
                className="button button--primary button--full"
                disabled={isBusy}
                onClick={() => {
                  void handleStartEnrollment();
                }}
              >
                {isBusy
                  ? "جارٍ الإعداد..."
                  : "بدء إعداد التحقق بخطوتين"}
              </button>

              <button
                type="button"
                className="button button--ghost button--full"
                disabled={isBusy}
                onClick={() => {
                  void handleReturnToLogin();
                }}
              >
                العودة لتسجيل الدخول
              </button>
            </div>
          ) : (
            <div className="stack">
              <div className="card card--compact">
                <p
                  className="font-semibold text-center"
                  style={{
                    marginBottom:
                      "14px",
                  }}
                >
                  امسح الرمز بتطبيق المصادقة
                </p>

                <Image
                  src={
                    enrollment
                      .qrCode
                  }
                  alt="رمز QR لإضافة LIFE OS إلى تطبيق المصادقة"
                  width={220}
                  height={220}
                  unoptimized
                  priority
                  style={{
                    width:
                      "220px",

                    height:
                      "220px",

                    marginInline:
                      "auto",

                    borderRadius:
                      "12px",

                    background:
                      "#ffffff",
                  }}
                />
              </div>


              <details className="card card--compact">
                <summary
                  className="font-semibold"
                  style={{
                    cursor:
                      "pointer",
                  }}
                >
                  لا تستطيع مسح QR؟
                </summary>

                <div
                  className="stack stack--small"
                  style={{
                    marginTop:
                      "12px",
                  }}
                >
                  <p
                    className="text-muted text-small"
                    style={{
                      margin:
                        0,
                    }}
                  >
                    أدخل هذا المفتاح يدويًا في تطبيق المصادقة. لا تشاركه مع أي شخص.
                  </p>

                  <code
                    className="ltr"
                    style={{
                      display:
                        "block",

                      overflowWrap:
                        "anywhere",

                      padding:
                        "10px",

                      borderRadius:
                        "8px",

                      background:
                        "var(--surface-secondary)",

                      fontSize:
                        "12px",
                    }}
                  >
                    {
                      enrollment
                        .secret
                    }
                  </code>
                </div>
              </details>


              <form
                className="form"
                onSubmit={
                  handleVerify
                }
              >
                <div className="form-field">
                  <label
                    className="form-label"
                    htmlFor="life-os-enrollment-code"
                  >
                    رمز التحقق
                  </label>

                  <input
                    id="life-os-enrollment-code"
                    className="input ltr"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                    value={
                      verificationCode
                    }
                    disabled={isBusy}
                    onChange={(
                      event,
                    ) => {
                      setVerificationCode(
                        event.target
                          .value
                          .replace(
                            /\D/g,
                            "",
                          )
                          .slice(
                            0,
                            6,
                          ),
                      );
                    }}
                  />

                  <span className="form-hint">
                    أدخل الرمز المكوّن من 6 أرقام من تطبيق المصادقة.
                  </span>
                </div>


                <button
                  type="submit"
                  className="button button--primary button--full"
                  disabled={isBusy}
                >
                  {isBusy
                    ? "جارٍ التحقق..."
                    : "تفعيل والدخول"}
                </button>
              </form>


              <button
                type="button"
                className="button button--ghost button--full"
                disabled={isBusy}
                onClick={() => {
                  void handleReturnToLogin();
                }}
              >
                إلغاء وتسجيل الخروج
              </button>
            </div>
          )}
        </section>
      </main>
    );
  }


  /* =======================================================
   * 17. EXISTING MFA VERIFICATION SCREEN
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
            التحقق الأمني
          </h1>

          <p className="auth-brand__subtitle">
            الخطوة الثانية للدخول إلى LIFE OS
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
            handleVerify
          }
        >
          <div className="form-field">
            <label
              className="form-label"
              htmlFor="life-os-mfa-code"
            >
              رمز تطبيق المصادقة
            </label>

            <input
              id="life-os-mfa-code"
              className="input ltr"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              autoFocus
              required
              value={
                verificationCode
              }
              disabled={isBusy}
              onChange={(
                event,
              ) => {
                setVerificationCode(
                  event.target
                    .value
                    .replace(
                      /\D/g,
                      "",
                    )
                    .slice(
                      0,
                      6,
                    ),
                );
              }}
            />

            <span className="form-hint">
              افتح تطبيق المصادقة وأدخل الرمز الحالي.
            </span>
          </div>


          <button
            type="submit"
            className="button button--primary button--full"
            disabled={isBusy}
          >
            {isBusy
              ? "جارٍ التحقق..."
              : "دخول"}
          </button>
        </form>


        <button
          type="button"
          className="button button--ghost button--full"
          style={{
            marginTop:
              "10px",
          }}
          disabled={isBusy}
          onClick={() => {
            void handleReturnToLogin();
          }}
        >
          تسجيل الخروج
        </button>
      </section>
    </main>
  );
}


/* =========================================================
 * 18. SECURITY BOUNDARY
 * ======================================================= */

/**
 * This page may establish authentication state.
 *
 * It does NOT authorize private database rows by itself.
 *
 * Real LIFE OS protection remains:
 *
 * Password authentication
 *      ↓
 * TOTP verification
 *      ↓
 * AAL2 JWT
 *      ↓
 * Server authorization
 *      ↓
 * PostgreSQL RLS
 */


/* =========================================================
 * 19. NO PUBLIC SIGN-UP
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
 * 20. SECRET HANDLING
 * ======================================================= */

/**
 * Passwords and TOTP codes:
 *
 * - remain only in transient component state
 * - are never logged
 * - are never stored in LIFE OS tables
 * - are never sent to OpenAI
 * - are never added to audit metadata
 *
 * The TOTP enrollment secret is displayed only during the
 * explicit enrollment flow and is removed from component
 * state after successful verification.
 */


/* =========================================================
 * 21. SAFE AUTH ERRORS
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
 * 22. MFA RULE
 * ======================================================= */

/**
 * AAL1 is never enough for the private LIFE OS workspace.
 *
 * A valid session must reach:
 *
 * aal2
 *
 * before protected data can pass the server and database
 * security boundaries.
 */


/* =========================================================
 * 23. FINAL LOGIN RULE
 * ======================================================= */

/**
 * Password
 *      ↓
 * AAL1
 *      ↓
 * TOTP enrollment or verification
 *      ↓
 * AAL2
 *      ↓
 * Dashboard
 *
 *
 * No MFA bypass.
 * No public registration.
 * No secrets in logs.
 * No client-side authorization assumptions.
 */