import type {
  Metadata,
} from "next";

import {
  redirect,
} from "next/navigation";

import {
  APP_LOCALE,
  APP_NAME,
  DEFAULT_AUTHENTICATED_ROUTE,
  DEFAULT_CURRENCY,
  DEFAULT_TIMEZONE,
  TITLE_MAX_LENGTH,
} from "@/lib/constants";

import {
  requireAuthenticatedIdentity,
} from "@/lib/auth";

import {
  getProfile,
  saveProfile,
} from "@/lib/data";


/* =========================================================
 * LIFE OS V2
 * ONBOARDING
 *
 * Goal:
 *
 * Create the minimum LIFE OS profile.
 *
 * We do NOT ask the user to fill:
 *
 * - salary
 * - expenses
 * - investments
 * - goals
 * - travel
 * - career
 *
 * Those will be added naturally through Universal Add.
 * ======================================================= */


/* =========================================================
 * 1. METADATA
 * ======================================================= */

export const metadata: Metadata = {
  title:
    "ابدأ LIFE OS",
};


/* =========================================================
 * 2. SERVER ACTION
 * ======================================================= */

async function completeOnboarding(
  formData: FormData,
) {
  "use server";


  /*
   * Never trust a browser-supplied user id.
   *
   * saveProfile derives ownership from the authenticated
   * Supabase session.
   */
  await requireAuthenticatedIdentity();


  const rawDisplayName =
    formData.get(
      "display_name",
    );


  const displayName =
    typeof rawDisplayName ===
      "string"
      ? rawDisplayName
          .trim()
          .slice(
            0,
            TITLE_MAX_LENGTH,
          )
      : "";


  /*
   * LIFE OS V2 starts with UAE defaults.
   *
   * These can later be changed from Settings.
   */
  await saveProfile({
    display_name:
      displayName.length > 0
        ? displayName
        : null,

    default_currency:
      DEFAULT_CURRENCY,

    timezone:
      DEFAULT_TIMEZONE,

    locale:
      APP_LOCALE,
  });


  redirect(
    DEFAULT_AUTHENTICATED_ROUTE,
  );
}


/* =========================================================
 * 3. ONBOARDING PAGE
 * ======================================================= */

export default async function OnboardingPage() {

  /* -------------------------------------------------------
   * Authentication
   * ---------------------------------------------------- */

  await requireAuthenticatedIdentity();


  /* -------------------------------------------------------
   * Existing profile
   * ---------------------------------------------------- */

  const existingProfile =
    await getProfile();


  /*
   * Onboarding is a one-time setup.
   *
   * Existing users should not repeatedly see it.
   */
  if (
    existingProfile
  ) {
    redirect(
      DEFAULT_AUTHENTICATED_ROUTE,
    );
  }


  /* -------------------------------------------------------
   * UI
   * ---------------------------------------------------- */

  return (
    <main
      style={{
        minHeight:
          "100dvh",

        display:
          "grid",

        placeItems:
          "center",

        padding:
          "24px",

        background:
          "var(--background, #f8fafc)",

        color:
          "var(--text, #0f172a)",
      }}
    >
      <div
        style={{
          width:
            "min(560px, 100%)",
        }}
      >

        {/* ===============================================
         * BRAND
         * ============================================= */}

        <div
          style={{
            textAlign:
              "center",

            marginBottom:
              "24px",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width:
                "54px",

              height:
                "54px",

              margin:
                "0 auto 14px",

              display:
                "grid",

              placeItems:
                "center",

              borderRadius:
                "18px",

              background:
                "var(--accent, #2563eb)",

              color:
                "#ffffff",

              fontSize:
                "22px",

              fontWeight:
                800,

              boxShadow:
                "0 14px 34px rgba(37, 99, 235, 0.22)",
            }}
          >
            L
          </div>


          <span
            style={{
              fontSize:
                "12px",

              fontWeight:
                800,

              letterSpacing:
                "0.08em",

              color:
                "var(--text-tertiary, #64748b)",
            }}
          >
            {APP_NAME}
          </span>
        </div>


        {/* ===============================================
         * CARD
         * ============================================= */}

        <section
          style={{
            padding:
              "30px",

            background:
              "var(--surface, #ffffff)",

            border:
              "1px solid var(--border, #e2e8f0)",

            borderRadius:
              "28px",

            boxShadow:
              "0 24px 70px rgba(15, 23, 42, 0.08)",
          }}
        >

          {/* =============================================
           * TITLE
           * =========================================== */}

          <div
            style={{
              textAlign:
                "center",

              marginBottom:
                "28px",
            }}
          >
            <span
              style={{
                display:
                  "inline-flex",

                alignItems:
                  "center",

                minHeight:
                  "28px",

                padding:
                  "4px 10px",

                borderRadius:
                  "999px",

                background:
                  "var(--surface-soft, #f1f5f9)",

                color:
                  "var(--text-secondary, #475569)",

                fontSize:
                  "12px",

                fontWeight:
                  700,
              }}
            >
              إعداد أول مرة
            </span>


            <h1
              style={{
                margin:
                  "14px 0 0",

                fontSize:
                  "30px",

                lineHeight:
                  1.35,

                letterSpacing:
                  "-0.02em",
              }}
            >
              خلنا نبدأ LIFE OS
            </h1>


            <p
              style={{
                margin:
                  "10px auto 0",

                maxWidth:
                  "420px",

                color:
                  "var(--text-secondary, #64748b)",

                fontSize:
                  "15px",

                lineHeight:
                  1.8,
              }}
            >
              ما بنعطيك فورم طويل.
              بس نجهز حسابك، وبعدها تضيف أي شيء
              بالطريقة الطبيعية.
            </p>
          </div>


          {/* =============================================
           * FORM
           * =========================================== */}

          <form
            action={
              completeOnboarding
            }
          >
            <label
              htmlFor="display_name"
              style={{
                display:
                  "block",

                marginBottom:
                  "8px",

                fontSize:
                  "13px",

                fontWeight:
                  700,
              }}
            >
              شو تحب LIFE OS يناديك؟
            </label>


            <input
              id="display_name"
              name="display_name"
              type="text"
              autoComplete="name"
              maxLength={
                TITLE_MAX_LENGTH
              }
              placeholder="مثال: يوسف"
              style={{
                width:
                  "100%",

                minHeight:
                  "54px",

                boxSizing:
                  "border-box",

                border:
                  "1px solid var(--border, #dbe2ea)",

                borderRadius:
                  "16px",

                background:
                  "var(--surface-soft, #f8fafc)",

                color:
                  "inherit",

                font:
                  "inherit",

                fontSize:
                  "15px",

                padding:
                  "0 16px",

                outline:
                  "none",
              }}
            />


            <p
              style={{
                margin:
                  "8px 2px 0",

                color:
                  "var(--text-tertiary, #94a3b8)",

                fontSize:
                  "12px",

                lineHeight:
                  1.6,
              }}
            >
              اختياري. تقدر تغيره لاحقًا.
            </p>


            {/* ===========================================
             * DEFAULTS
             * ========================================= */}

            <div
              style={{
                marginTop:
                  "22px",

                padding:
                  "16px",

                borderRadius:
                  "18px",

                background:
                  "var(--surface-soft, #f8fafc)",

                border:
                  "1px solid var(--border, #e2e8f0)",
              }}
            >
              <div
                style={{
                  display:
                    "flex",

                  justifyContent:
                    "space-between",

                  gap:
                    "12px",

                  fontSize:
                    "13px",
                }}
              >
                <span
                  style={{
                    color:
                      "var(--text-secondary, #64748b)",
                  }}
                >
                  العملة
                </span>

                <strong>
                  AED
                </strong>
              </div>


              <div
                style={{
                  display:
                    "flex",

                  justifyContent:
                    "space-between",

                  gap:
                    "12px",

                  marginTop:
                    "10px",

                  fontSize:
                    "13px",
                }}
              >
                <span
                  style={{
                    color:
                      "var(--text-secondary, #64748b)",
                  }}
                >
                  المنطقة
                </span>

                <strong>
                  الإمارات
                </strong>
              </div>


              <div
                style={{
                  display:
                    "flex",

                  justifyContent:
                    "space-between",

                  gap:
                    "12px",

                  marginTop:
                    "10px",

                  fontSize:
                    "13px",
                }}
              >
                <span
                  style={{
                    color:
                      "var(--text-secondary, #64748b)",
                  }}
                >
                  اللغة
                </span>

                <strong>
                  العربية
                </strong>
              </div>
            </div>


            {/* ===========================================
             * NEXT
             * ========================================= */}

            <div
              style={{
                marginTop:
                  "22px",
              }}
            >
              <button
                type="submit"
                style={{
                  width:
                    "100%",

                  minHeight:
                    "56px",

                  border:
                    0,

                  borderRadius:
                    "16px",

                  background:
                    "var(--accent, #2563eb)",

                  color:
                    "#ffffff",

                  font:
                    "inherit",

                  fontSize:
                    "15px",

                  fontWeight:
                    800,

                  cursor:
                    "pointer",

                  boxShadow:
                    "0 12px 28px rgba(37, 99, 235, 0.20)",
                }}
              >
                ابدأ LIFE OS
              </button>
            </div>
          </form>


          {/* =============================================
           * WHAT HAPPENS NEXT
           * =========================================== */}

          <div
            style={{
              marginTop:
                "24px",

              paddingTop:
                "20px",

              borderTop:
                "1px solid var(--border, #e2e8f0)",
            }}
          >
            <p
              style={{
                margin:
                  0,

                textAlign:
                  "center",

                color:
                  "var(--text-secondary, #64748b)",

                fontSize:
                  "13px",

                lineHeight:
                  1.8,
              }}
            >
              عقبها استخدم زر{" "}
              <strong>
                ＋
              </strong>{" "}
              واكتب راتبك، هدفك، مشروعك أو ارفع PDF.
              LIFE OS بيرتب الباقي.
            </p>
          </div>

        </section>


        {/* ===============================================
         * FOOTER
         * ============================================= */}

        <p
          style={{
            margin:
              "18px 0 0",

            textAlign:
              "center",

            color:
              "var(--text-tertiary, #94a3b8)",

            fontSize:
              "12px",
          }}
        >
          Simple outside. Intelligent underneath.
        </p>

      </div>
    </main>
  );
}