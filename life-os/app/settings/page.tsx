import type {
  Metadata,
} from "next";

import Link from "next/link";

import {
  redirect,
} from "next/navigation";

import {
  AppShell,
} from "@/components/app-shell";

import {
  PageHeader,
} from "@/components/page-header";

import {
  requireAAL2Identity,
} from "@/lib/auth";

import {
  getProfile,
} from "@/lib/data";

import {
  createClient,
} from "@/lib/supabase/server";


/* =========================================================
 * 1. METADATA
 * ======================================================= */

export const metadata: Metadata = {
  title:
    "الإعدادات",
};


/* =========================================================
 * 2. SAFE RECORD READERS
 * ======================================================= */

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value ===
      "object" &&
    value !== null &&
    !Array.isArray(
      value,
    )
  );
}


function readString(
  value: unknown,
  key: string,
): string | null {
  if (
    !isRecord(
      value,
    )
  ) {
    return null;
  }

  const field =
    value[key];

  if (
    typeof field !==
      "string"
  ) {
    return null;
  }

  const trimmed =
    field.trim();

  return trimmed.length >
    0
    ? trimmed
    : null;
}


/* =========================================================
 * 3. DISPLAY HELPERS
 * ======================================================= */

function getTimezone(
  profile: unknown,
): string {
  return (
    readString(
      profile,
      "timezone",
    ) ??
    "Asia/Dubai"
  );
}


function getLocale(
  profile: unknown,
): string {
  return (
    readString(
      profile,
      "locale",
    ) ??
    "ar-AE"
  );
}


function getCurrency(
  profile: unknown,
): string {
  return (
    readString(
      profile,
      "currency",
    ) ??
    "AED"
  );
}


function getDisplayName(
  profile: unknown,
): string | null {
  return (
    readString(
      profile,
      "display_name",
    ) ??
    readString(
      profile,
      "full_name",
    ) ??
    readString(
      profile,
      "name",
    )
  );
}


/* =========================================================
 * 4. SIGN OUT ACTION
 * ======================================================= */

async function signOutAction():
Promise<never> {
  "use server";

  /**
   * The user must currently have an authenticated LIFE OS
   * session before this action is accepted.
   */
  await requireAAL2Identity();

  const supabase =
    await createClient();

  await supabase.auth.signOut({
    scope:
      "local",
  });

  redirect(
    "/login",
  );
}


/* =========================================================
 * 5. SETTINGS PAGE
 * ======================================================= */

export default async function SettingsPage() {
  await requireAAL2Identity();

  const profile =
    await getProfile();

  const displayName =
    getDisplayName(
      profile,
    );

  const timezone =
    getTimezone(
      profile,
    );

  const locale =
    getLocale(
      profile,
    );

  const currency =
    getCurrency(
      profile,
    );


  return (
    <AppShell>
      <div className="page">

        {/* =================================================
         * HEADER
         * =============================================== */}

        <PageHeader
          eyebrow="LIFE OS"
          title="الإعدادات"
          description="الإعدادات الأساسية، حالة الأمان، وسياسة الخصوصية والذكاء الاصطناعي."
          meta={
            <span>
              الحساب الخاص محمي بـ MFA
            </span>
          }
        />


        {/* =================================================
         * PROFILE / LOCALIZATION
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="settings-profile-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="settings-profile-title"
                className="section-title"
              >
                إعدادات LIFE OS
              </h2>

              <p className="section-description">
                الإعدادات التي يعتمد عليها النظام في عرض معلوماتك وحساباتك.
              </p>
            </div>
          </div>


          <div className="grid grid--2">

            <article className="card">
              <h3 className="card__title">
                الحساب
              </h3>

              <p className="card__description">
                الحساب مخصص للاستخدام الشخصي ولا يوجد تسجيل عام.
              </p>


              <div
                className="stack stack--small"
                style={{
                  marginTop:
                    "18px",
                }}
              >
                <div className="space-between">
                  <span className="text-muted text-small">
                    الاسم
                  </span>

                  <strong>
                    {
                      displayName ??
                      "الحساب الشخصي"
                    }
                  </strong>
                </div>

                <div className="space-between">
                  <span className="text-muted text-small">
                    نوع النظام
                  </span>

                  <span className="badge">
                    Single User
                  </span>
                </div>

                <div className="space-between">
                  <span className="text-muted text-small">
                    التسجيل العام
                  </span>

                  <span className="badge badge--positive">
                    مغلق
                  </span>
                </div>
              </div>
            </article>


            <article className="card">
              <h3 className="card__title">
                المنطقة والتنسيق
              </h3>

              <p className="card__description">
                القيم الأساسية المستخدمة في واجهة LIFE OS.
              </p>


              <div
                className="stack stack--small"
                style={{
                  marginTop:
                    "18px",
                }}
              >
                <div className="space-between">
                  <span className="text-muted text-small">
                    المنطقة الزمنية
                  </span>

                  <strong className="ltr">
                    {timezone}
                  </strong>
                </div>

                <div className="space-between">
                  <span className="text-muted text-small">
                    اللغة / المنطقة
                  </span>

                  <strong className="ltr">
                    {locale}
                  </strong>
                </div>

                <div className="space-between">
                  <span className="text-muted text-small">
                    العملة الأساسية
                  </span>

                  <strong className="ltr">
                    {currency}
                  </strong>
                </div>
              </div>
            </article>

          </div>
        </section>


        {/* =================================================
         * SECURITY
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="settings-security-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="settings-security-title"
                className="section-title"
              >
                الأمان
              </h2>

              <p className="section-description">
                الوصول إلى بيانات LIFE OS يتطلب أكثر من كلمة المرور.
              </p>
            </div>
          </div>


          <div className="grid grid--2">

            <article className="card">
              <div className="space-between">
                <div>
                  <h3 className="card__title">
                    المصادقة
                  </h3>

                  <p className="card__description">
                    الجلسة الحالية اجتازت مستوى الحماية المطلوب.
                  </p>
                </div>

                <span className="badge badge--positive">
                  AAL2
                </span>
              </div>


              <div
                className="stack stack--small"
                style={{
                  marginTop:
                    "18px",
                }}
              >
                <div className="space-between">
                  <span className="text-muted text-small">
                    كلمة المرور
                  </span>

                  <span className="badge badge--positive">
                    مطلوبة
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
                    مستوى الجلسة
                  </span>

                  <strong className="ltr">
                    aal2
                  </strong>
                </div>
              </div>
            </article>


            <article className="card">
              <h3 className="card__title">
                حدود الوصول
              </h3>

              <p className="card__description">
                الحماية لا تعتمد على الواجهة وحدها.
              </p>


              <div
                className="stack stack--small"
                style={{
                  marginTop:
                    "18px",
                }}
              >
                <div className="space-between">
                  <span className="text-muted text-small">
                    Server authorization
                  </span>

                  <span className="badge badge--positive">
                    مفعّل
                  </span>
                </div>

                <div className="space-between">
                  <span className="text-muted text-small">
                    PostgreSQL RLS
                  </span>

                  <span className="badge badge--positive">
                    مفعّل
                  </span>
                </div>

                <div className="space-between">
                  <span className="text-muted text-small">
                    Service Role في التطبيق
                  </span>

                  <span className="badge badge--positive">
                    غير مستخدم
                  </span>
                </div>
              </div>
            </article>

          </div>
        </section>


        {/* =================================================
         * AI POLICY
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="settings-ai-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="settings-ai-title"
                className="section-title"
              >
                سياسة الذكاء الاصطناعي
              </h2>

              <p className="section-description">
                الذكاء يساعدك في القرار، لكنه ليس صاحب القرار.
              </p>
            </div>
          </div>


          <article className="card">

            <div
              className="alert"
              role="note"
            >
              <strong>
                AI Suggests
              </strong>
              {" → "}
              User Reviews
              {" → "}
              User Approves
              {" → "}
              System Executes
            </div>


            <div
              className="grid grid--2"
              style={{
                marginTop:
                  "18px",
              }}
            >

              <div className="stack stack--small">
                <strong className="text-positive">
                  مسموح للـAI
                </strong>

                <span className="text-muted text-small">
                  ✓ قراءة السياق المسموح
                </span>

                <span className="text-muted text-small">
                  ✓ التحليل
                </span>

                <span className="text-muted text-small">
                  ✓ المقارنة
                </span>

                <span className="text-muted text-small">
                  ✓ اقتراح الخطوة التالية
                </span>

                <span className="text-muted text-small">
                  ✓ البحث عن فرص عند الطلب
                </span>
              </div>


              <div className="stack stack--small">
                <strong className="text-negative">
                  غير مسموح
                </strong>

                <span className="text-muted text-small">
                  ✕ تحويل الأموال
                </span>

                <span className="text-muted text-small">
                  ✕ شراء أو بيع الاستثمارات
                </span>

                <span className="text-muted text-small">
                  ✕ إرسال رسائل أو بريد
                </span>

                <span className="text-muted text-small">
                  ✕ حذف السجلات المهمة
                </span>

                <span className="text-muted text-small">
                  ✕ تغيير الأمان أو المصادقة
                </span>
              </div>

            </div>
          </article>
        </section>


        {/* =================================================
         * PRIVACY
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="settings-privacy-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="settings-privacy-title"
                className="section-title"
              >
                الخصوصية والبيانات
              </h2>

              <p className="section-description">
                أين توجد بياناتك، وما الذي لا يجب أن يصل إلى GitHub أو AI.
              </p>
            </div>
          </div>


          <div className="grid grid--2">

            <article className="card">
              <h3 className="card__title">
                قاعدة البيانات
              </h3>

              <div
                className="stack stack--small"
                style={{
                  marginTop:
                    "16px",
                }}
              >
                <div className="space-between">
                  <span className="text-muted text-small">
                    البيانات الشخصية الحقيقية
                  </span>

                  <span className="badge badge--accent">
                    Supabase
                  </span>
                </div>

                <div className="space-between">
                  <span className="text-muted text-small">
                    RLS
                  </span>

                  <span className="badge badge--positive">
                    إلزامي
                  </span>
                </div>

                <div className="space-between">
                  <span className="text-muted text-small">
                    بيانات حقيقية في GitHub
                  </span>

                  <span className="badge badge--positive">
                    ممنوع
                  </span>
                </div>
              </div>
            </article>


            <article className="card">
              <h3 className="card__title">
                سياق AI
              </h3>

              <div
                className="stack stack--small"
                style={{
                  marginTop:
                    "16px",
                }}
              >
                <div className="space-between">
                  <span className="text-muted text-small">
                    السياق
                  </span>

                  <span className="badge">
                    الحد الأدنى اللازم
                  </span>
                </div>

                <div className="space-between">
                  <span className="text-muted text-small">
                    كلمات المرور
                  </span>

                  <span className="badge badge--positive">
                    لا ترسل
                  </span>
                </div>

                <div className="space-between">
                  <span className="text-muted text-small">
                    مفاتيح API
                  </span>

                  <span className="badge badge--positive">
                    لا ترسل
                  </span>
                </div>

                <div className="space-between">
                  <span className="text-muted text-small">
                    Auth tokens
                  </span>

                  <span className="badge badge--positive">
                    لا ترسل
                  </span>
                </div>
              </div>
            </article>

          </div>
        </section>


        {/* =================================================
         * AUDIT
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="settings-audit-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="settings-audit-title"
                className="section-title"
              >
                سجل التدقيق
              </h2>

              <p className="section-description">
                راجع الأحداث المهمة التي سجلها LIFE OS.
              </p>
            </div>
          </div>


          <article className="card">
            <div className="space-between">
              <div>
                <h3 className="card__title">
                  Audit Log
                </h3>

                <p className="card__description">
                  سجل مركزي للأحداث الأمنية والإجراءات المهمة والعمليات المرتبطة بالذكاء الاصطناعي.
                </p>
              </div>


              <Link
                href="/audit"
                className="button button--secondary"
              >
                فتح السجل
              </Link>
            </div>
          </article>
        </section>


        {/* =================================================
         * SESSION
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="settings-session-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="settings-session-title"
                className="section-title"
              >
                الجلسة الحالية
              </h2>
            </div>
          </div>


          <article className="card">
            <div className="space-between">
              <div>
                <h3 className="card__title">
                  تسجيل الخروج
                </h3>

                <p className="card__description">
                  إنهاء جلسة LIFE OS الحالية على هذا المتصفح.
                </p>
              </div>


              <form
                action={
                  signOutAction
                }
              >
                <button
                  type="submit"
                  className="button button--secondary"
                >
                  تسجيل الخروج
                </button>
              </form>
            </div>
          </article>
        </section>

      </div>
    </AppShell>
  );
}


/* =========================================================
 * 6. SETTINGS SCOPE
 * ======================================================= */

/**
 * V1 Settings intentionally stays small.
 *
 * It contains only settings and information that materially
 * affect LIFE OS:
 *
 * account
 * localization
 * security
 * AI policy
 * privacy
 * audit
 * session
 *
 * No configuration clutter.
 */


/* =========================================================
 * 7. SECURITY DISPLAY RULE
 * ======================================================= */

/**
 * This page is protected by AAL2 before rendering.
 *
 * Therefore displaying:
 *
 * Current session → AAL2
 *
 * is based on the fact that the page itself could not render
 * successfully without passing the required page boundary.
 *
 * The visual badge is not the security boundary.
 */


/* =========================================================
 * 8. PROFILE RULE
 * ======================================================= */

/**
 * Profile localization values are read from the authenticated
 * user's protected profile.
 *
 * Safe fallbacks:
 *
 * timezone → Asia/Dubai
 * locale   → ar-AE
 * currency → AED
 *
 * No browser-provided user_id is used.
 */


/* =========================================================
 * 9. AI PRIVACY RULE
 * ======================================================= */

/**
 * LIFE OS does not expose the whole database to AI.
 *
 * Each workflow receives:
 *
 * explicit user request
 *      +
 * minimum relevant context
 *
 * Secrets and authentication material must never enter AI
 * context.
 */


/* =========================================================
 * 10. GITHUB RULE
 * ======================================================= */

/**
 * GitHub contains:
 *
 * source code
 * documentation
 * migrations
 * tests
 * synthetic seed data
 *
 * GitHub must NOT contain:
 *
 * real salary
 * real portfolio
 * personal records
 * credentials
 * production secrets
 */


/* =========================================================
 * 11. SIGN-OUT RULE
 * ======================================================= */

/**
 * Sign out is an explicit user action.
 *
 * It terminates the local authenticated browser session and
 * returns the user to:
 *
 * /login
 *
 * AI cannot invoke this action autonomously.
 */


/* =========================================================
 * 12. FINAL SETTINGS RULE
 * ======================================================= */

/**
 * Settings should answer:
 *
 * How is LIFE OS configured?
 * Is my session protected?
 * What can AI access?
 * What can AI never execute?
 * Where is my data stored?
 * Where can I inspect important activity?
 *
 * Simple outside.
 * Intelligent underneath.
 */