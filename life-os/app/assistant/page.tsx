"use client";

import {
  useState,
} from "react";

import type {
  FormEvent,
} from "react";

import {
  AppShell,
} from "@/components/app-shell";

import {
  PageHeader,
} from "@/components/page-header";


/* =========================================================
 * 1. WORKSPACE MODES
 * ======================================================= */

type WorkspaceMode =
  | "chief"
  | "decision"
  | "opportunity";


/* =========================================================
 * 2. SHARED API TYPES
 * ======================================================= */

interface ApiErrorResponse {
  ok?: false;
  error?: string;
  message?: string;
}


interface ChiefOfStaffResult {
  situation: string;
  recommendation: string;
  next_action: string;
}


interface DecisionScenarioView {
  id: string;
  title: string;
  summary: string | null;
  monthly_available_after: number | null;
  affordable: boolean | null;
  changes: string[];
}


interface DecisionResultView {
  summary: string;
  recommendation: string;
  best_scenario_id: string | null;
  scenarios: DecisionScenarioView[];
}


interface OpportunityView {
  title: string;
  provider: string | null;
  description: string;
  url: string;
  fit_score: number;
  recommendation: string;
  reason: string;
  priority:
    | "high"
    | "medium"
    | "low";
}


interface OpportunityResultView {
  opportunities: OpportunityView[];
}


/* =========================================================
 * 3. REQUEST HELPERS
 * ======================================================= */

function getErrorMessage(
  value: unknown,
): string {
  if (
    typeof value ===
      "object" &&
    value !== null
  ) {
    const record =
      value as ApiErrorResponse;

    if (
      typeof record.message ===
        "string" &&
      record.message.trim()
    ) {
      return record.message;
    }

    if (
      typeof record.error ===
        "string" &&
      record.error.trim()
    ) {
      return record.error;
    }
  }

  return "تعذر إكمال الطلب. حاول مرة أخرى.";
}


async function postJson<T>(
  url: string,
  body: unknown,
): Promise<T> {
  const controller =
    new AbortController();

  const timeout =
    window.setTimeout(
      () => {
        controller.abort();
      },
      90_000,
    );

  try {
    const response =
      await fetch(
        url,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          credentials:
            "same-origin",

          cache:
            "no-store",

          signal:
            controller.signal,

          body:
            JSON.stringify(
              body,
            ),
        },
      );

    const data:
      unknown =
      await response.json();

    if (
      !response.ok
    ) {
      throw new Error(
        getErrorMessage(
          data,
        ),
      );
    }

    return data as T;
  } catch (
    error
  ) {
    if (
      error instanceof
        DOMException &&
      error.name ===
        "AbortError"
    ) {
      throw new Error(
        "استغرق الطلب وقتًا أطول من المتوقع. حاول مرة أخرى.",
      );
    }

    throw error;
  } finally {
    window.clearTimeout(
      timeout,
    );
  }
}


/* =========================================================
 * 4. NUMBER INPUT NORMALIZATION
 * ======================================================= */

function parseOptionalMoney(
  value: string,
): number {
  const trimmed =
    value.trim();

  if (
    trimmed.length ===
    0
  ) {
    return 0;
  }

  const parsed =
    Number(
      trimmed,
    );

  if (
    !Number.isFinite(
      parsed,
    )
  ) {
    return 0;
  }

  return parsed;
}


/* =========================================================
 * 5. SCORE HELPERS
 * ======================================================= */

function getScoreBadgeClass(
  score: number,
): string {
  if (
    score >= 80
  ) {
    return "badge badge--positive";
  }

  if (
    score >= 50
  ) {
    return "badge badge--warning";
  }

  return "badge";
}


function getPriorityLabel(
  priority:
    OpportunityView["priority"],
): string {
  switch (
    priority
  ) {
    case "high":
      return "عالية";

    case "medium":
      return "متوسطة";

    case "low":
      return "منخفضة";
  }
}


/* =========================================================
 * 6. ASSISTANT PAGE
 * ======================================================= */

export default function AssistantPage() {

  /* =======================================================
   * MODE
   * ===================================================== */

  const [
    mode,
    setMode,
  ] =
    useState<WorkspaceMode>(
      "chief",
    );


  /* =======================================================
   * SHARED STATE
   * ===================================================== */

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
   * CHIEF OF STAFF STATE
   * ===================================================== */

  const [
    chiefPrompt,
    setChiefPrompt,
  ] =
    useState("");

  const [
    chiefResult,
    setChiefResult,
  ] =
    useState<ChiefOfStaffResult | null>(
      null,
    );


  /* =======================================================
   * DECISION STATE
   * ===================================================== */

  const [
    decisionTitle,
    setDecisionTitle,
  ] =
    useState("");

  const [
    decisionDescription,
    setDecisionDescription,
  ] =
    useState("");

  const [
    oneTimeCost,
    setOneTimeCost,
  ] =
    useState("");

  const [
    monthlyCost,
    setMonthlyCost,
  ] =
    useState("");

  const [
    monthlyInvestmentChange,
    setMonthlyInvestmentChange,
  ] =
    useState("");

  const [
    decisionResult,
    setDecisionResult,
  ] =
    useState<DecisionResultView | null>(
      null,
    );


  /* =======================================================
   * OPPORTUNITY STATE
   * ===================================================== */

  const [
    opportunityQuery,
    setOpportunityQuery,
  ] =
    useState("");

  const [
    opportunityCategory,
    setOpportunityCategory,
  ] =
    useState(
      "course",
    );

  const [
    opportunityResult,
    setOpportunityResult,
  ] =
    useState<OpportunityResultView | null>(
      null,
    );


  /* =======================================================
   * MODE CHANGE
   * ===================================================== */

  function changeMode(
    nextMode:
      WorkspaceMode,
  ):
  void {
    if (
      isBusy
    ) {
      return;
    }

    setMode(
      nextMode,
    );

    setErrorMessage(
      null,
    );
  }


  /* =======================================================
   * CHIEF OF STAFF SUBMIT
   * ===================================================== */

  async function handleChiefSubmit(
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

    const message =
      chiefPrompt.trim();

    if (
      message.length <
      2
    ) {
      setErrorMessage(
        "اكتب ما تريد تحليله أولًا.",
      );

      return;
    }

    setIsBusy(
      true,
    );

    setErrorMessage(
      null,
    );

    setChiefResult(
      null,
    );

    try {
      const response =
        await postJson<{
          ok: true;
          result: ChiefOfStaffResult;
        }>(
          "/api/ai",
          {
            mode:
              "chief_of_staff",

            message,
          },
        );

      setChiefResult(
        response.result,
      );
    } catch (
      error
    ) {
      setErrorMessage(
        error instanceof
          Error
          ? error.message
          : "تعذر الحصول على التحليل.",
      );
    } finally {
      setIsBusy(
        false,
      );
    }
  }


  /* =======================================================
   * DECISION SUBMIT
   * ===================================================== */

  async function handleDecisionSubmit(
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

    const title =
      decisionTitle.trim();

    const description =
      decisionDescription.trim();

    if (
      title.length <
        2 ||
      description.length <
        5
    ) {
      setErrorMessage(
        "اكتب القرار ووصفه بشكل واضح.",
      );

      return;
    }

    setIsBusy(
      true,
    );

    setErrorMessage(
      null,
    );

    setDecisionResult(
      null,
    );

    try {
      const response =
        await postJson<{
          ok: true;
          result: DecisionResultView;
        }>(
          "/api/ai",
          {
            mode:
              "decision",

            decision: {
              title,

              description,

              proposed_one_time_cost:
                parseOptionalMoney(
                  oneTimeCost,
                ),

              proposed_monthly_cost:
                parseOptionalMoney(
                  monthlyCost,
                ),

              proposed_monthly_investment_change:
                parseOptionalMoney(
                  monthlyInvestmentChange,
                ),
            },
          },
        );

      setDecisionResult(
        response.result,
      );
    } catch (
      error
    ) {
      setErrorMessage(
        error instanceof
          Error
          ? error.message
          : "تعذر تحليل القرار.",
      );
    } finally {
      setIsBusy(
        false,
      );
    }
  }


  /* =======================================================
   * OPPORTUNITY SUBMIT
   * ===================================================== */

  async function handleOpportunitySubmit(
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

    const query =
      opportunityQuery.trim();

    if (
      query.length <
      2
    ) {
      setErrorMessage(
        "اكتب ما الذي تريد البحث عنه.",
      );

      return;
    }

    setIsBusy(
      true,
    );

    setErrorMessage(
      null,
    );

    setOpportunityResult(
      null,
    );

    try {
      const response =
        await postJson<{
          ok: true;
          result: OpportunityResultView;
        }>(
          "/api/opportunities",
          {
            query,

            category:
              opportunityCategory,
          },
        );

      setOpportunityResult(
        response.result,
      );
    } catch (
      error
    ) {
      setErrorMessage(
        error instanceof
          Error
          ? error.message
          : "تعذر البحث عن الفرص.",
      );
    } finally {
      setIsBusy(
        false,
      );
    }
  }


  /* =======================================================
   * PAGE
   * ===================================================== */

  return (
    <AppShell>
      <div className="page">

        {/* =================================================
         * HEADER
         * =============================================== */}

        <PageHeader
          eyebrow="AI Chief of Staff"
          title="LIFE OS"
          description="حلّل وضعك، قارن قرارًا، أو ابحث عن فرصة — بدون تنفيذ أي إجراء نيابة عنك."
        />


        {/* =================================================
         * SECURITY PRINCIPLE
         * =============================================== */}

        <section className="page-section">
          <div
            className="alert"
            role="note"
          >
            <strong>
              AI يقترح
            </strong>
            {" → "}
            أنت تراجع
            {" → "}
            أنت توافق
            {" → "}
            النظام ينفذ فقط ما تسمح به صلاحيات V1.
          </div>
        </section>


        {/* =================================================
         * MODE SELECTOR
         * =============================================== */}

        <section
          className="page-section"
          aria-label="أدوات LIFE OS الذكية"
        >
          <div className="inline">

            <button
              type="button"
              className={
                mode ===
                "chief"
                  ? "button button--primary"
                  : "button button--secondary"
              }
              disabled={isBusy}
              onClick={() => {
                changeMode(
                  "chief",
                );
              }}
            >
              Chief of Staff
            </button>


            <button
              type="button"
              className={
                mode ===
                "decision"
                  ? "button button--primary"
                  : "button button--secondary"
              }
              disabled={isBusy}
              onClick={() => {
                changeMode(
                  "decision",
                );
              }}
            >
              محاكي القرار
            </button>


            <button
              type="button"
              className={
                mode ===
                "opportunity"
                  ? "button button--primary"
                  : "button button--secondary"
              }
              disabled={isBusy}
              onClick={() => {
                changeMode(
                  "opportunity",
                );
              }}
            >
              بحث الفرص
            </button>

          </div>
        </section>


        {/* =================================================
         * ERROR
         * =============================================== */}

        {errorMessage ? (
          <section className="page-section">
            <div
              className="alert alert--negative"
              role="alert"
            >
              {errorMessage}
            </div>
          </section>
        ) : null}


        {/* =================================================
         * CHIEF OF STAFF
         * =============================================== */}

        {mode ===
        "chief" ? (
          <section
            className="page-section"
            aria-labelledby="chief-title"
          >
            <div className="grid grid--2">

              <article className="ai-panel">
                <div className="section-header">
                  <div className="section-header__content">
                    <h2
                      id="chief-title"
                      className="section-title"
                    >
                      شو تبا تعرف؟
                    </h2>

                    <p className="section-description">
                      LIFE OS يستخدم أقل قدر لازم من بياناتك لفهم السؤال.
                    </p>
                  </div>
                </div>


                <form
                  className="form"
                  onSubmit={
                    handleChiefSubmit
                  }
                >
                  <div className="form-field">
                    <label
                      className="form-label"
                      htmlFor="chief-prompt"
                    >
                      سؤالك
                    </label>

                    <textarea
                      id="chief-prompt"
                      className="textarea"
                      maxLength={4000}
                      required
                      value={
                        chiefPrompt
                      }
                      disabled={
                        isBusy
                      }
                      placeholder="مثال: بناءً على وضعي الحالي، شو أهم 3 أشياء أركز عليها هذا الشهر؟"
                      onChange={(
                        event,
                      ) => {
                        setChiefPrompt(
                          event.target
                            .value,
                        );
                      }}
                    />

                    <span className="form-hint">
                      لا تدخل كلمات مرور أو أسرار أو مفاتيح API.
                    </span>
                  </div>


                  <button
                    type="submit"
                    className="button button--primary"
                    disabled={isBusy}
                  >
                    {isBusy
                      ? "جارٍ التحليل..."
                      : "حلّل وضعي"}
                  </button>
                </form>
              </article>


              <article className="ai-panel">
                <div className="section-header">
                  <div className="section-header__content">
                    <h2 className="section-title">
                      النتيجة
                    </h2>
                  </div>
                </div>


                {chiefResult ? (
                  <div className="ai-response">

                    <div className="ai-response__section">
                      <span className="ai-response__label">
                        وضعك
                      </span>

                      <p className="ai-response__text">
                        {
                          chiefResult
                            .situation
                        }
                      </p>
                    </div>


                    <div className="divider" />


                    <div className="ai-response__section">
                      <span className="ai-response__label">
                        التوصية
                      </span>

                      <p className="ai-response__text">
                        {
                          chiefResult
                            .recommendation
                        }
                      </p>
                    </div>


                    <div className="divider" />


                    <div className="ai-response__section">
                      <span className="ai-response__label">
                        الخطوة التالية
                      </span>

                      <p className="ai-response__text font-semibold">
                        {
                          chiefResult
                            .next_action
                        }
                      </p>
                    </div>

                  </div>
                ) : (
                  <div className="empty-state empty-state--compact">
                    <div className="empty-state__icon">
                      ✦
                    </div>

                    <div className="empty-state__content">
                      <h2 className="empty-state__title">
                        النتيجة بتظهر هنا
                      </h2>

                      <p className="empty-state__description">
                        اسأل سؤالًا محددًا بدل طلب تحليل حياتك كلها دفعة واحدة.
                      </p>
                    </div>
                  </div>
                )}
              </article>

            </div>
          </section>
        ) : null}


        {/* =================================================
         * DECISION SIMULATOR
         * =============================================== */}

        {mode ===
        "decision" ? (
          <section
            className="page-section"
            aria-labelledby="decision-title"
          >
            <div className="grid grid--2">

              <article className="ai-panel">
                <div className="section-header">
                  <div className="section-header__content">
                    <h2
                      id="decision-title"
                      className="section-title"
                    >
                      القرار
                    </h2>

                    <p className="section-description">
                      نعطي LIFE OS المعلومات المهمة فقط، والحساب المالي يبقى Deterministic.
                    </p>
                  </div>
                </div>


                <form
                  className="form"
                  onSubmit={
                    handleDecisionSubmit
                  }
                >
                  <div className="form-field">
                    <label
                      className="form-label"
                      htmlFor="decision-name"
                    >
                      القرار
                    </label>

                    <input
                      id="decision-name"
                      className="input"
                      type="text"
                      maxLength={200}
                      required
                      value={
                        decisionTitle
                      }
                      disabled={
                        isBusy
                      }
                      placeholder="مثال: أبدأ الماجستير الآن"
                      onChange={(
                        event,
                      ) => {
                        setDecisionTitle(
                          event.target
                            .value,
                        );
                      }}
                    />
                  </div>


                  <div className="form-field">
                    <label
                      className="form-label"
                      htmlFor="decision-description"
                    >
                      التفاصيل
                    </label>

                    <textarea
                      id="decision-description"
                      className="textarea"
                      maxLength={2500}
                      required
                      value={
                        decisionDescription
                      }
                      disabled={
                        isBusy
                      }
                      placeholder="اشرح القرار، الهدف منه، وتأثيره المتوقع."
                      onChange={(
                        event,
                      ) => {
                        setDecisionDescription(
                          event.target
                            .value,
                        );
                      }}
                    />
                  </div>


                  <div className="form-grid">

                    <div className="form-field">
                      <label
                        className="form-label"
                        htmlFor="one-time-cost"
                      >
                        تكلفة مرة واحدة
                      </label>

                      <input
                        id="one-time-cost"
                        className="input ltr"
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        value={
                          oneTimeCost
                        }
                        disabled={
                          isBusy
                        }
                        placeholder="0"
                        onChange={(
                          event,
                        ) => {
                          setOneTimeCost(
                            event.target
                              .value,
                          );
                        }}
                      />
                    </div>


                    <div className="form-field">
                      <label
                        className="form-label"
                        htmlFor="monthly-cost"
                      >
                        تكلفة شهرية جديدة
                      </label>

                      <input
                        id="monthly-cost"
                        className="input ltr"
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        value={
                          monthlyCost
                        }
                        disabled={
                          isBusy
                        }
                        placeholder="0"
                        onChange={(
                          event,
                        ) => {
                          setMonthlyCost(
                            event.target
                              .value,
                          );
                        }}
                      />
                    </div>
                  </div>


                  <div className="form-field">
                    <label
                      className="form-label"
                      htmlFor="investment-change"
                    >
                      تغيير الاستثمار الشهري
                    </label>

                    <input
                      id="investment-change"
                      className="input ltr"
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      value={
                        monthlyInvestmentChange
                      }
                      disabled={
                        isBusy
                      }
                      placeholder="مثال: -1000 أو 500"
                      onChange={(
                        event,
                      ) => {
                        setMonthlyInvestmentChange(
                          event.target
                            .value,
                        );
                      }}
                    />

                    <span className="form-hint">
                      موجب = زيادة الاستثمار، سالب = خفض الاستثمار.
                    </span>
                  </div>


                  <button
                    type="submit"
                    className="button button--primary"
                    disabled={isBusy}
                  >
                    {isBusy
                      ? "جارٍ بناء السيناريوهات..."
                      : "قارن السيناريوهات"}
                  </button>
                </form>
              </article>


              <article className="ai-panel">
                <div className="section-header">
                  <div className="section-header__content">
                    <h2 className="section-title">
                      نتيجة القرار
                    </h2>
                  </div>
                </div>


                {decisionResult ? (
                  <div className="stack">

                    <div className="ai-response__section">
                      <span className="ai-response__label">
                        الخلاصة
                      </span>

                      <p className="ai-response__text">
                        {
                          decisionResult
                            .summary
                        }
                      </p>
                    </div>


                    <div className="ai-response__section">
                      <span className="ai-response__label">
                        التوصية
                      </span>

                      <p className="ai-response__text font-semibold">
                        {
                          decisionResult
                            .recommendation
                        }
                      </p>
                    </div>


                    <div className="divider" />


                    <div className="stack">
                      {decisionResult
                        .scenarios
                        .map(
                          (
                            scenario,
                          ) => {
                            const best =
                              scenario.id ===
                              decisionResult
                                .best_scenario_id;

                            return (
                              <article
                                key={
                                  scenario.id
                                }
                                className="card card--compact"
                              >
                                <div className="space-between">
                                  <h3 className="card__title">
                                    {
                                      scenario
                                        .title
                                    }
                                  </h3>

                                  {best ? (
                                    <span className="badge badge--positive">
                                      الأفضل
                                    </span>
                                  ) : null}
                                </div>


                                {scenario.summary ? (
                                  <p className="card__description">
                                    {
                                      scenario
                                        .summary
                                    }
                                  </p>
                                ) : null}


                                {scenario
                                  .affordable !==
                                null ? (
                                  <div
                                    style={{
                                      marginTop:
                                        "12px",
                                    }}
                                  >
                                    <span
                                      className={
                                        scenario
                                          .affordable
                                          ? "badge badge--positive"
                                          : "badge badge--negative"
                                      }
                                    >
                                      {scenario
                                        .affordable
                                        ? "شهريًا قابل للتحمل"
                                        : "ضغط مالي شهري"}
                                    </span>
                                  </div>
                                ) : null}


                                {scenario
                                  .changes
                                  .length >
                                0 ? (
                                  <div
                                    className="stack stack--small"
                                    style={{
                                      marginTop:
                                        "14px",
                                    }}
                                  >
                                    {scenario
                                      .changes
                                      .map(
                                        (
                                          change,
                                          index,
                                        ) => (
                                          <div
                                            key={
                                              `${scenario.id}-${index}`
                                            }
                                            className="text-muted text-small"
                                          >
                                            •{" "}
                                            {
                                              change
                                            }
                                          </div>
                                        ),
                                      )}
                                  </div>
                                ) : null}
                              </article>
                            );
                          },
                        )}
                    </div>

                  </div>
                ) : (
                  <div className="empty-state empty-state--compact">
                    <div className="empty-state__icon">
                      ⇄
                    </div>

                    <div className="empty-state__content">
                      <h2 className="empty-state__title">
                        قارن قبل ما تقرر
                      </h2>

                      <p className="empty-state__description">
                        LIFE OS يبني السيناريو الحالي والمقترح ويعرض الفرق بدل إعطائك رأيًا مجردًا.
                      </p>
                    </div>
                  </div>
                )}
              </article>

            </div>
          </section>
        ) : null}


        {/* =================================================
         * OPPORTUNITY SEARCH
         * =============================================== */}

        {mode ===
        "opportunity" ? (
          <section
            className="page-section"
            aria-labelledby="opportunity-title"
          >
            <div className="grid grid--2">

              <article className="ai-panel">
                <div className="section-header">
                  <div className="section-header__content">
                    <h2
                      id="opportunity-title"
                      className="section-title"
                    >
                      ابحث عن فرصة
                    </h2>

                    <p className="section-description">
                      بحث خارجي عند الطلب، ثم مقارنة النتائج بأهدافك ومسارك الحالي.
                    </p>
                  </div>
                </div>


                <form
                  className="form"
                  onSubmit={
                    handleOpportunitySubmit
                  }
                >
                  <div className="form-field">
                    <label
                      className="form-label"
                      htmlFor="opportunity-category"
                    >
                      النوع
                    </label>

                    <select
                      id="opportunity-category"
                      className="select"
                      value={
                        opportunityCategory
                      }
                      disabled={
                        isBusy
                      }
                      onChange={(
                        event,
                      ) => {
                        setOpportunityCategory(
                          event.target
                            .value,
                        );
                      }}
                    >
                      <option value="course">
                        دورة
                      </option>

                      <option value="certification">
                        شهادة مهنية
                      </option>

                      <option value="job">
                        وظيفة
                      </option>

                      <option value="education">
                        تعليم / جامعة
                      </option>

                      <option value="professional_program">
                        برنامج مهني
                      </option>

                      <option value="development">
                        تطوير مهني
                      </option>
                    </select>
                  </div>


                  <div className="form-field">
                    <label
                      className="form-label"
                      htmlFor="opportunity-query"
                    >
                      شو تبحث عنه؟
                    </label>

                    <textarea
                      id="opportunity-query"
                      className="textarea"
                      maxLength={1000}
                      required
                      value={
                        opportunityQuery
                      }
                      disabled={
                        isBusy
                      }
                      placeholder="مثال: شهادة AI قوية ومناسبة لمساري الحالي وتستحق الإضافة للسيرة الذاتية."
                      onChange={(
                        event,
                      ) => {
                        setOpportunityQuery(
                          event.target
                            .value,
                        );
                      }}
                    />
                  </div>


                  <button
                    type="submit"
                    className="button button--primary"
                    disabled={isBusy}
                  >
                    {isBusy
                      ? "جارٍ البحث والتقييم..."
                      : "ابحث وقيّم"}
                  </button>
                </form>
              </article>


              <article className="ai-panel">
                <div className="section-header">
                  <div className="section-header__content">
                    <h2 className="section-title">
                      أفضل النتائج
                    </h2>

                    <p className="section-description">
                      النتيجة الأعلى ليست دائمًا الأنسب؛ LIFE OS يقارنها بوضعك.
                    </p>
                  </div>
                </div>


                {opportunityResult ? (
                  opportunityResult
                    .opportunities
                    .length >
                  0 ? (
                    <div className="stack">
                      {opportunityResult
                        .opportunities
                        .map(
                          (
                            opportunity,
                            index,
                          ) => (
                            <article
                              key={
                                `${opportunity.url}-${index}`
                              }
                              className="card card--compact"
                            >
                              <div className="space-between">
                                <div className="inline">
                                  <span
                                    className={
                                      getScoreBadgeClass(
                                        opportunity
                                          .fit_score,
                                      )
                                    }
                                  >
                                    ملاءمة{" "}
                                    {
                                      opportunity
                                        .fit_score
                                    }
                                    /100
                                  </span>

                                  <span className="badge">
                                    {
                                      getPriorityLabel(
                                        opportunity
                                          .priority,
                                      )
                                    }
                                  </span>
                                </div>
                              </div>


                              <h3
                                className="card__title"
                                style={{
                                  marginTop:
                                    "12px",
                                }}
                              >
                                {
                                  opportunity
                                    .title
                                }
                              </h3>


                              {opportunity.provider ? (
                                <p
                                  className="text-subtle text-small"
                                  style={{
                                    margin:
                                      "4px 0 0",
                                  }}
                                >
                                  {
                                    opportunity
                                      .provider
                                  }
                                </p>
                              ) : null}


                              <p className="card__description">
                                {
                                  opportunity
                                    .description
                                }
                              </p>


                              <div
                                className="stack stack--small"
                                style={{
                                  marginTop:
                                    "14px",
                                }}
                              >
                                <div>
                                  <span className="text-subtle text-small">
                                    تقييم LIFE OS
                                  </span>

                                  <p
                                    className="font-semibold"
                                    style={{
                                      margin:
                                        "3px 0 0",
                                    }}
                                  >
                                    {
                                      opportunity
                                        .recommendation
                                    }
                                  </p>
                                </div>


                                <p
                                  className="text-muted text-small"
                                  style={{
                                    margin:
                                      0,
                                  }}
                                >
                                  {
                                    opportunity
                                      .reason
                                  }
                                </p>
                              </div>


                              <div
                                style={{
                                  marginTop:
                                    "16px",
                                }}
                              >
                                <a
                                  href={
                                    opportunity
                                      .url
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer nofollow"
                                  className="button button--secondary button--small"
                                >
                                  فتح المصدر
                                </a>
                              </div>
                            </article>
                          ),
                        )}
                    </div>
                  ) : (
                    <div className="alert alert--warning">
                      لم يتم العثور على فرصة مناسبة بدرجة كافية.
                    </div>
                  )
                ) : (
                  <div className="empty-state empty-state--compact">
                    <div className="empty-state__icon">
                      ⌕
                    </div>

                    <div className="empty-state__content">
                      <h2 className="empty-state__title">
                        البحث يبدأ بطلبك فقط
                      </h2>

                      <p className="empty-state__description">
                        V1 لا يراقب الإنترنت تلقائيًا؛ أنت تبدأ البحث عندما تحتاجه.
                      </p>
                    </div>
                  </div>
                )}
              </article>

            </div>
          </section>
        ) : null}


        {/* =================================================
         * EXECUTION BOUNDARY
         * =============================================== */}

        <section className="page-section">
          <article className="card">
            <h2 className="card__title">
              حدود الذكاء في V1
            </h2>

            <div
              className="grid grid--2"
              style={{
                marginTop:
                  "16px",
              }}
            >
              <div className="stack stack--small">
                <strong className="text-positive">
                  يستطيع
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
                  لا يستطيع
                </strong>

                <span className="text-muted text-small">
                  ✕ تحويل المال
                </span>

                <span className="text-muted text-small">
                  ✕ شراء أو بيع استثمار
                </span>

                <span className="text-muted text-small">
                  ✕ إرسال بريد أو رسالة
                </span>

                <span className="text-muted text-small">
                  ✕ حذف بيانات مهمة
                </span>

                <span className="text-muted text-small">
                  ✕ تغيير إعدادات الأمان
                </span>
              </div>
            </div>
          </article>
        </section>

      </div>
    </AppShell>
  );
}


/* =========================================================
 * 7. CLIENT PAGE RULE
 * ======================================================= */

/**
 * AssistantPage is intentionally interactive and therefore
 * runs as a Client Component.
 *
 * It contains no trusted private data at initial render.
 *
 * Protected AI context is assembled only by server routes.
 */


/* =========================================================
 * 8. SECURITY AUTHORITY
 * ======================================================= */

/**
 * The browser is NOT an authorization authority.
 *
 * Requests go:
 *
 * Assistant UI
 *      ↓
 * /api/ai or /api/opportunities
 *      ↓
 * server-side AAL2 verification
 *      ↓
 * controlled AI context
 *      ↓
 * allow-listed AI workflow
 *
 * API routes must fail closed when AAL2 is unavailable.
 */


/* =========================================================
 * 9. CONTEXT RULE
 * ======================================================= */

/**
 * The client sends only the user's explicit request and
 * structured decision/search inputs.
 *
 * It does NOT send:
 *
 * salary records
 * portfolio records
 * personal memory
 * database rows
 * user_id
 *
 * Server-side context builders decide the minimum necessary
 * context for each AI workflow.
 */


/* =========================================================
 * 10. FINANCIAL CALCULATION RULE
 * ======================================================= */

/**
 * Decision financial arithmetic remains deterministic.
 *
 * AI may explain the trade-off.
 *
 * AI does not become the source of truth for:
 *
 * income
 * available cash
 * costs
 * portfolio arithmetic
 */


/* =========================================================
 * 11. PROMPT-INJECTION RULE
 * ======================================================= */

/**
 * External opportunity content and stored LIFE OS context are
 * treated as untrusted data.
 *
 * They cannot:
 *
 * change system instructions
 * create new tools
 * request secrets
 * bypass execution restrictions
 */


/* =========================================================
 * 12. EXECUTION RULE
 * ======================================================= */

/**
 * V1:
 *
 * AI Suggests
 *      ↓
 * User Reviews
 *      ↓
 * User Approves
 *      ↓
 * Only an explicitly supported system action may execute
 *
 *
 * Financial and security-sensitive execution is not exposed
 * to AI in V1.
 */


/* =========================================================
 * 13. FINAL ASSISTANT RULE
 * ======================================================= */

/**
 * AI should make LIFE OS clearer, not noisier.
 *
 * Chief of Staff:
 *   What matters?
 *
 * Decision Simulator:
 *   What changes if I do this?
 *
 * Opportunity Search:
 *   Is this opportunity worth my time?
 *
 * Simple outside.
 * Intelligent underneath.
 */