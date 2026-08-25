"use client";

import {
  useCallback,
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

import Image from "next/image";

import {
  APP_NAME,
  DEFAULT_AUTHENTICATED_ROUTE,
  LOGIN_ROUTE,
} from "@/lib/constants";

import {
  createClient,
} from "@/lib/supabase/client";


/* =========================================================
 * 1. MFA FLOW
 * ======================================================= */

type MfaFlow =
  | "checking"
  | "enroll"
  | "verify"
  | "submitting"
  | "error";


/* =========================================================
 * 2. SAFE MESSAGES
 * ======================================================= */

const MFA_MESSAGES = {
  checking:
    "جاري التحقق من مستوى حماية الحساب...",

  enrollmentFailed:
    "تعذر تجهيز المصادقة الثنائية. حاول مرة أخرى.",

  verificationFailed:
    "رمز التحقق غير صحيح أو انتهت صلاحيته.",

  factorsFailed:
    "تعذر تحميل وسائل التحقق المرتبطة بالحساب.",

  sessionFailed:
    "انتهت جلسة تسجيل الدخول. سجل الدخول مرة أخرى.",

  invalidCode:
    "أدخل رمز التحقق المكون من 6 أرقام.",

  unexpected:
    "حدث خطأ غير متوقع. لم يتم فتح بيانات LIFE OS.",
} as const;


/* =========================================================
 * 3. CODE NORMALIZATION
 * ======================================================= */

function normalizeVerificationCode(
  value:
    string,
): string {
  return value
    .replace(
      /\D/g,
      "",
    )
    .slice(
      0,
      6,
    );
}


/* =========================================================
 * 4. QR SOURCE
 * ======================================================= */

function createQrSource(
  value:
    string,
): string {
  if (
    value.startsWith(
      "data:image/",
    )
  ) {
    return value;
  }


  return (
    "data:image/svg+xml;charset=utf-8," +
    encodeURIComponent(
      value,
    )
  );
}


/* =========================================================
 * 5. MFA PAGE
 * ======================================================= */

export default function MfaPage() {
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
    useState<MfaFlow>(
      "checking",
    );


  const [
    factorId,
    setFactorId,
  ] =
    useState("");


  const [
    qrCode,
    setQrCode,
  ] =
    useState("");


  const [
    secret,
    setSecret,
  ] =
    useState("");


  const [
    verificationCode,
    setVerificationCode,
  ] =
    useState("");


  const [
    message,
    setMessage,
  ] =
    useState<string>(
      MFA_MESSAGES.checking,
    );


  /* =======================================================
   * 6. START ENROLLMENT
   * ===================================================== */

  const startEnrollment =
    useCallback(
      async ():
      Promise<void> => {
    setFlow(
      "checking",
    );

    setMessage(
      "جاري تجهيز رمز المصادقة الثنائية...",
    );


    const {
      data,
      error,
    } =
      await supabase.auth.mfa
        .enroll({
          factorType:
            "totp",

          friendlyName:
            `${APP_NAME} Authenticator`,
        });


    if (
      error ||
      !data?.id ||
      !data.totp?.qr_code ||
      !data.totp.secret
    ) {
      setFlow(
        "error",
      );

      setMessage(
        MFA_MESSAGES
          .enrollmentFailed,
      );

      return;
    }


    setFactorId(
      data.id,
    );

    setQrCode(
      createQrSource(
        data.totp.qr_code,
      ),
    );

    setSecret(
      data.totp.secret,
    );

    setFlow(
      "enroll",
    );

        setMessage(
          "امسح رمز QR بتطبيق المصادقة، ثم أدخل الرمز الظاهر في التطبيق.",
        );
      },
      [
        supabase,
      ],
    );


  /* =======================================================
   * 7. LOAD AUTHENTICATION STATE
   * ===================================================== */

  useEffect(
    () => {
      let active =
        true;


      async function loadMfaState():
      Promise<void> {
        const {
          data:
            claimsData,
          error:
            claimsError,
        } =
          await supabase.auth
            .getClaims();


        if (
          !active
        ) {
          return;
        }


        if (
          claimsError ||
          !claimsData?.claims
        ) {
          router.replace(
            LOGIN_ROUTE,
          );

          router.refresh();

          return;
        }


        const {
          data:
            assuranceData,
          error:
            assuranceError,
        } =
          await supabase.auth.mfa
            .getAuthenticatorAssuranceLevel();


        if (
          !active
        ) {
          return;
        }


        if (
          assuranceError
        ) {
          setFlow(
            "error",
          );

          setMessage(
            MFA_MESSAGES
              .sessionFailed,
          );

          return;
        }


        if (
          assuranceData
            .currentLevel ===
          "aal2"
        ) {
          router.replace(
            DEFAULT_AUTHENTICATED_ROUTE,
          );

          router.refresh();

          return;
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
          !active
        ) {
          return;
        }


        if (
          factorsError
        ) {
          setFlow(
            "error",
          );

          setMessage(
            MFA_MESSAGES
              .factorsFailed,
          );

          return;
        }


        const verifiedFactor =
          factorsData.totp[0];


        if (
          verifiedFactor
        ) {
          setFactorId(
            verifiedFactor.id,
          );

          setFlow(
            "verify",
          );

          setMessage(
            "أدخل الرمز الحالي من تطبيق المصادقة.",
          );

          return;
        }

        if (
          !active
        ) {
          return;
        }


        await startEnrollment();
      }


      void loadMfaState();


      return () => {
        active =
          false;
      };
    },
    [
      router,
      startEnrollment,
      supabase,
    ],
  );


  /* =======================================================
   * 8. VERIFY TOTP
   * ===================================================== */

  async function handleVerification(
    event:
      FormEvent<
        HTMLFormElement
      >,
  ):
  Promise<void> {
    event.preventDefault();


    const code =
      normalizeVerificationCode(
        verificationCode,
      );


    if (
      code.length !==
        6 ||
      factorId.length ===
        0
    ) {
      setMessage(
        MFA_MESSAGES.invalidCode,
      );

      return;
    }


    setFlow(
      "submitting",
    );

    setMessage(
      "جاري التحقق من الرمز...",
    );


    const {
      error,
    } =
      await supabase.auth.mfa
        .challengeAndVerify({
          factorId,

          code,
        });


    if (
      error
    ) {
      setFlow(
        qrCode
          ? "enroll"
          : "verify",
      );

      setMessage(
        MFA_MESSAGES
          .verificationFailed,
      );

      setVerificationCode(
        "",
      );

      return;
    }


    const {
      data:
        assuranceData,
      error:
        assuranceError,
    } =
      await supabase.auth.mfa
        .getAuthenticatorAssuranceLevel();


    if (
      assuranceError ||
      assuranceData
        .currentLevel !==
        "aal2"
    ) {
      setFlow(
        "error",
      );

      setMessage(
        MFA_MESSAGES.unexpected,
      );

      return;
    }


    router.replace(
      "/onboarding",
    );

    router.refresh();
  }


  /* =======================================================
   * 9. SIGN OUT
   * ===================================================== */

  async function handleSignOut():
  Promise<void> {
    await supabase.auth
      .signOut({
        scope:
          "local",
      });


    router.replace(
      LOGIN_ROUTE,
    );

    router.refresh();
  }


  /* =======================================================
   * 10. RETRY
   * ===================================================== */

  function handleRetry():
  void {
    window.location.reload();
  }


  /* =======================================================
   * 11. RENDER
   * ===================================================== */

  const isBusy =
    flow ===
      "checking" ||
    flow ===
      "submitting";


  const showVerificationForm =
    flow ===
      "enroll" ||
    flow ===
      "verify" ||
    flow ===
      "submitting";


  return (
    <main className="auth-page">
      <section
        className="auth-card"
        aria-labelledby="mfa-title"
      >
        <div className="auth-card__header">
          <div className="brand-mark">
            ✦
          </div>

          <div>
            <p className="eyebrow">
              {APP_NAME}
            </p>

            <h1
              id="mfa-title"
              className="auth-card__title"
            >
              التحقق بخطوتين
            </h1>

            <p className="auth-card__description">
              بياناتك الخاصة لا تُفتح بكلمة المرور وحدها.
            </p>
          </div>
        </div>


        <div
          className="notice"
          role="status"
          aria-live="polite"
        >
          {message}
        </div>


        {flow ===
          "enroll" &&
        qrCode ? (
          <div className="stack">
            <div
              className="card"
              style={{
                textAlign:
                  "center",
              }}
            >
              <h2 className="card__title">
                اربط تطبيق المصادقة
              </h2>

              <p className="card__description">
                امسح الرمز باستخدام Microsoft Authenticator أو Google Authenticator.
              </p>

              <Image
                src={qrCode}
                alt="رمز QR لإعداد المصادقة الثنائية"
                width={220}
                height={220}
                unoptimized
                style={{
                  display:
                    "block",

                  maxWidth:
                    "100%",

                  margin:
                    "20px auto",

                  background:
                    "#ffffff",

                  padding:
                    "12px",

                  borderRadius:
                    "16px",
                }}
              />

              <p className="text-muted text-small">
                إذا تعذر مسح الرمز، أدخل المفتاح يدويًا:
              </p>

              <code
                className="ltr"
                style={{
                  display:
                    "block",

                  marginTop:
                    "8px",

                  overflowWrap:
                    "anywhere",

                  userSelect:
                    "all",
                }}
              >
                {secret}
              </code>
            </div>
          </div>
        ) : null}


        {showVerificationForm ? (
          <form
            className="stack"
            onSubmit={
              handleVerification
            }
          >
            <label
              className="field"
              htmlFor="mfa-code"
            >
              <span className="field__label">
                رمز التحقق
              </span>

              <input
                id="mfa-code"
                className="input ltr"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={
                  verificationCode
                }
                onChange={
                  (
                    event,
                  ) => {
                    setVerificationCode(
                      normalizeVerificationCode(
                        event.target.value,
                      ),
                    );
                  }
                }
                placeholder="000000"
                disabled={isBusy}
                required
                autoFocus={
                  flow ===
                    "verify"
                }
              />
            </label>


            <button
              className="button button--primary"
              type="submit"
              disabled={
                isBusy ||
                verificationCode.length !==
                  6
              }
            >
              {flow ===
                "submitting"
                ? "جاري التحقق..."
                : "تأكيد الرمز"}
            </button>
          </form>
        ) : null}


        {flow ===
          "error" ? (
          <button
            className="button button--primary"
            type="button"
            onClick={
              handleRetry
            }
          >
            إعادة المحاولة
          </button>
        ) : null}


        <button
          className="button button--secondary"
          type="button"
          onClick={
            handleSignOut
          }
          disabled={
            flow ===
              "submitting"
          }
        >
          تسجيل الخروج
        </button>


        <p className="text-muted text-small">
          لن تتمكن أي جلسة AAL1 من قراءة بياناتك المالية أو الاستثمارية أو الشخصية.
        </p>
      </section>
    </main>
  );
}
