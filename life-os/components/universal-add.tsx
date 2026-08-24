"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  ChangeEvent,
  FormEvent,
} from "react";

import type {
  IntakeKind,
  IntakePreview,
  IntakeTargetEntityType,
} from "@/lib/types";


/* =========================================================
 * LIFE OS V2
 * UNIVERSAL ADD
 *
 * Flow:
 *
 * User input
 *      ↓
 * AI preview
 *      ↓
 * User review
 *      ↓
 * Explicit confirmation
 *      ↓
 * Approved intake
 *      ↓
 * Supported executor?
 *
 * YES → applied
 * NO  → remains approved safely
 * ======================================================= */


/* =========================================================
 * 1. API TYPES
 * ======================================================= */

interface PreviewApiResponse {
  ok:
    boolean;

  preview?:
    IntakePreview;

  error?:
    string;
}


type ConfirmedIntakeStatus =
  | "approved"
  | "applied";


interface ConfirmedIntake {
  id:
    string;

  kind:
    IntakeKind;

  title:
    string;

  status:
    ConfirmedIntakeStatus;

  approved_at:
    string | null;

  target_entity_type:
    IntakeTargetEntityType | null;

  target_entity_id:
    string | null;
}


interface IntakeExecutionState {
  attempted:
    boolean;

  applied:
    boolean;

  reason?:
    "EXECUTOR_NOT_AVAILABLE" |
    "EXECUTION_PENDING";

  target_entity_type?:
    IntakeTargetEntityType;

  target_entity_id?:
    string;
}


interface ConfirmApiResponse {
  ok:
    boolean;

  intake?:
    ConfirmedIntake;

  execution?:
    IntakeExecutionState;

  message?:
    string;

  error?:
    string;
}


interface ConfirmationState {
  intake:
    ConfirmedIntake;

  execution:
    IntakeExecutionState;

  message:
    string;
}


/* =========================================================
 * 2. CONSTANTS
 * ======================================================= */

const MAX_TEXT_LENGTH =
  4_000;


const MAX_FILE_SIZE_BYTES =
  15 * 1024 * 1024;


const PDF_MIME =
  "application/pdf";


/* =========================================================
 * 3. HELPERS
 * ======================================================= */

function formatFileSize(
  bytes:
    number,
): string {
  if (
    bytes <
    1024
  ) {
    return `${bytes} B`;
  }


  if (
    bytes <
    1024 * 1024
  ) {
    return `${(
      bytes /
      1024
    ).toFixed(
      1,
    )} KB`;
  }


  return `${(
    bytes /
    (
      1024 *
      1024
    )
  ).toFixed(
    1,
  )} MB`;
}


function getKindIcon(
  kind:
    IntakeKind,
): string {
  switch (
    kind
  ) {
    case "finance":
      return "◈";

    case "plan":
      return "◎";

    case "travel":
      return "✈";

    case "growth":
      return "◉";

    case "document":
      return "▤";

    case "note":
    default:
      return "✦";
  }
}


function getKindLabel(
  kind:
    IntakeKind,
): string {
  switch (
    kind
  ) {
    case "finance":
      return "المال";

    case "plan":
      return "الخطط";

    case "travel":
      return "السفر";

    case "growth":
      return "التطوير";

    case "document":
      return "المستندات";

    case "note":
    default:
      return "الملاحظات";
  }
}


function getExecutionTargetLabel(
  target:
    IntakeTargetEntityType |
    null,
): string | null {
  switch (
    target
  ) {
    case "memory_item":
      return "الذاكرة الشخصية";

    case "income_source":
      return "مصدر دخل";

    case "budget_item":
      return "بند مالي";

    case "investment_asset":
      return "أصل استثماري";

    case "investment_transaction":
      return "عملية استثمارية";

    case "goal":
      return "هدف";

    case "project":
      return "مشروع";

    case "task":
      return "مهمة";

    case "learning_item":
      return "عنصر تطوير";

    case "career_item":
      return "عنصر مهني";

    case "trip":
      return "رحلة";

    case "document":
      return "مستند";

    case null:
    default:
      return null;
  }
}


/* =========================================================
 * 4. COMPONENT
 * ======================================================= */

export function UniversalAdd() {
  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null,
    );


  const textareaRef =
    useRef<HTMLTextAreaElement | null>(
      null,
    );


  const [
    open,
    setOpen,
  ] =
    useState(
      false,
    );


  const [
    text,
    setText,
  ] =
    useState(
      "",
    );


  const [
    file,
    setFile,
  ] =
    useState<File | null>(
      null,
    );


  const [
    preview,
    setPreview,
  ] =
    useState<IntakePreview | null>(
      null,
    );


  const [
    confirmation,
    setConfirmation,
  ] =
    useState<ConfirmationState | null>(
      null,
    );


  const [
    analyzing,
    setAnalyzing,
  ] =
    useState(
      false,
    );


  const [
    confirming,
    setConfirming,
  ] =
    useState(
      false,
    );


  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );


  const busy =
    analyzing ||
    confirming;


  /* =======================================================
   * 5. RESET
   * ===================================================== */

  function resetIntake():
  void {
    setText(
      "",
    );


    setFile(
      null,
    );


    setPreview(
      null,
    );


    setConfirmation(
      null,
    );


    setAnalyzing(
      false,
    );


    setConfirming(
      false,
    );


    setError(
      null,
    );


    if (
      fileInputRef.current
    ) {
      fileInputRef.current.value =
        "";
    }
  }


  /* =======================================================
   * 6. OPEN
   * ===================================================== */

  function handleOpen():
  void {
    setOpen(
      true,
    );


    setError(
      null,
    );


    window.setTimeout(
      () => {
        textareaRef
          .current
          ?.focus();
      },
      80,
    );
  }


  /* =======================================================
   * 7. CLOSE
   * ===================================================== */

  function handleClose():
  void {
    if (
      busy
    ) {
      return;
    }


    setOpen(
      false,
    );


    resetIntake();
  }


  /* =======================================================
   * 8. ADD ANOTHER
   * ===================================================== */

  function handleAddAnother():
  void {
    resetIntake();


    window.setTimeout(
      () => {
        textareaRef
          .current
          ?.focus();
      },
      50,
    );
  }


  /* =======================================================
   * 9. ESCAPE KEY
   * ===================================================== */

  useEffect(
    () => {
      if (
        !open
      ) {
        return;
      }


      function handleKeyDown(
        event:
          KeyboardEvent,
      ) {
        if (
          event.key ===
            "Escape" &&
          !busy
        ) {
          setOpen(
            false,
          );


          resetIntake();
        }
      }


      window.addEventListener(
        "keydown",
        handleKeyDown,
      );


      return () => {
        window.removeEventListener(
          "keydown",
          handleKeyDown,
        );
      };
    },

    // resetIntake only manages local state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      open,
      busy,
    ],
  );


  /* =======================================================
   * 10. BODY SCROLL
   * ===================================================== */

  useEffect(
    () => {
      if (
        !open
      ) {
        return;
      }


      const previousOverflow =
        document
          .body
          .style
          .overflow;


      document.body.style.overflow =
        "hidden";


      return () => {
        document.body.style.overflow =
          previousOverflow;
      };
    },
    [
      open,
    ],
  );


  /* =======================================================
   * 11. FILE PICKER
   * ===================================================== */

  function handleFileChange(
    event:
      ChangeEvent<HTMLInputElement>,
  ):
  void {
    const selectedFile =
      event
        .target
        .files
        ?.item(
          0,
        ) ??
      null;


    setPreview(
      null,
    );


    setConfirmation(
      null,
    );


    setError(
      null,
    );


    if (
      !selectedFile
    ) {
      setFile(
        null,
      );

      return;
    }


    const normalizedName =
      selectedFile
        .name
        .trim()
        .toLowerCase();


    if (
      selectedFile.type !==
        PDF_MIME ||
      !normalizedName.endsWith(
        ".pdf",
      )
    ) {
      setFile(
        null,
      );


      setError(
        "حالياً ندعم ملفات PDF فقط.",
      );


      event.target.value =
        "";

      return;
    }


    if (
      selectedFile.size >
      MAX_FILE_SIZE_BYTES
    ) {
      setFile(
        null,
      );


      setError(
        "حجم الملف أكبر من 15 MB.",
      );


      event.target.value =
        "";

      return;
    }


    setFile(
      selectedFile,
    );
  }


  /* =======================================================
   * 12. REMOVE FILE
   * ===================================================== */

  function handleRemoveFile():
  void {
    if (
      busy
    ) {
      return;
    }


    setFile(
      null,
    );


    setPreview(
      null,
    );


    setConfirmation(
      null,
    );


    setError(
      null,
    );


    if (
      fileInputRef.current
    ) {
      fileInputRef.current.value =
        "";
    }
  }


  /* =======================================================
   * 13. ANALYZE
   * ===================================================== */

  async function handleAnalyze(
    event:
      FormEvent<HTMLFormElement>,
  ):
  Promise<void> {
    event.preventDefault();


    if (
      busy
    ) {
      return;
    }


    const cleanText =
      text.trim();


    if (
      !cleanText &&
      !file
    ) {
      setError(
        "اكتب شيء أو ارفع PDF أولاً.",
      );

      return;
    }


    if (
      cleanText.length >
      MAX_TEXT_LENGTH
    ) {
      setError(
        "النص أطول من المسموح.",
      );

      return;
    }


    setAnalyzing(
      true,
    );


    setError(
      null,
    );


    setPreview(
      null,
    );


    setConfirmation(
      null,
    );


    try {
      const formData =
        new FormData();


      if (
        cleanText
      ) {
        formData.append(
          "text",
          cleanText,
        );
      }


      if (
        file
      ) {
        formData.append(
          "file",
          file,
          file.name,
        );
      }


      const response =
        await fetch(
          "/api/intake/preview",
          {
            method:
              "POST",

            body:
              formData,

            credentials:
              "same-origin",

            cache:
              "no-store",
          },
        );


      const result =
        (
          await response.json()
        ) as PreviewApiResponse;


      if (
        !response.ok ||
        !result.ok ||
        !result.preview
      ) {
        throw new Error(
          result.error ??
          "تعذر فهم المدخل الآن.",
        );
      }


      setPreview(
        result.preview,
      );
    } catch (
      caughtError
    ) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "تعذر تحليل المدخل الآن.",
      );
    } finally {
      setAnalyzing(
        false,
      );
    }
  }


  /* =======================================================
   * 14. EDIT
   * ===================================================== */

  function handleEdit():
  void {
    if (
      busy
    ) {
      return;
    }


    setPreview(
      null,
    );


    setConfirmation(
      null,
    );


    setError(
      null,
    );


    window.setTimeout(
      () => {
        textareaRef
          .current
          ?.focus();
      },
      50,
    );
  }


  /* =======================================================
   * 15. CONFIRM
   * ===================================================== */

  async function handleConfirm():
  Promise<void> {
    if (
      !preview ||
      busy
    ) {
      return;
    }


    const cleanText =
      text.trim();


    if (
      !cleanText &&
      !file
    ) {
      setError(
        "المدخل الأصلي غير موجود. ارجع وعدله.",
      );

      return;
    }


    setConfirming(
      true,
    );


    setError(
      null,
    );


    try {
      const formData =
        new FormData();


      if (
        cleanText
      ) {
        formData.append(
          "text",
          cleanText,
        );
      }


      if (
        file
      ) {
        formData.append(
          "file",
          file,
          file.name,
        );
      }


      formData.append(
        "preview",
        JSON.stringify(
          preview,
        ),
      );


      const response =
        await fetch(
          "/api/intake/confirm",
          {
            method:
              "POST",

            body:
              formData,

            credentials:
              "same-origin",

            cache:
              "no-store",
          },
        );


      const result =
        (
          await response.json()
        ) as ConfirmApiResponse;


      if (
        !response.ok ||
        !result.ok ||
        !result.intake ||
        !result.execution
      ) {
        throw new Error(
          result.error ??
          "تعذر اعتماد الإضافة حاليًا.",
        );
      }


      setConfirmation({
        intake:
          result.intake,

        execution:
          result.execution,

        message:
          result.message ??
          "تم اعتماد الإضافة داخل LIFE OS.",
      });


      setError(
        null,
      );
    } catch (
      caughtError
    ) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "تعذر اعتماد الإضافة حاليًا.",
      );
    } finally {
      setConfirming(
        false,
      );
    }
  }


  /* =======================================================
   * 16. SUCCESS VIEW VALUES
   * ===================================================== */

  const wasApplied =
    confirmation?.execution.applied ===
    true;


  const executionPending =
    confirmation?.execution.reason ===
    "EXECUTION_PENDING";


  const executionTargetLabel =
    confirmation
      ? getExecutionTargetLabel(
          confirmation
            .intake
            .target_entity_type,
        )
      : null;


  /* =======================================================
   * 17. RENDER
   * ===================================================== */

  return (
    <>
      {/* ===================================================
       * FLOATING ADD BUTTON
       * ================================================= */}

      <button
        type="button"
        onClick={
          handleOpen
        }
        aria-label="أضف إلى LIFE OS"
        title="أضف إلى LIFE OS"
        style={{
          position:
            "fixed",

          left:
            "max(18px, env(safe-area-inset-left))",

          bottom:
            "max(18px, env(safe-area-inset-bottom))",

          zIndex:
            80,

          width:
            "56px",

          height:
            "56px",

          borderRadius:
            "18px",

          border:
            "1px solid rgba(255,255,255,0.16)",

          background:
            "var(--accent, #2563eb)",

          color:
            "#ffffff",

          display:
            "grid",

          placeItems:
            "center",

          fontSize:
            "30px",

          lineHeight:
            1,

          fontWeight:
            300,

          cursor:
            "pointer",

          boxShadow:
            "0 16px 40px rgba(15, 23, 42, 0.22)",
        }}
      >
        +
      </button>


      {/* ===================================================
       * MODAL
       * ================================================= */}

      {open ? (
        <div
          role="presentation"
          style={{
            position:
              "fixed",

            inset:
              0,

            zIndex:
              100,

            background:
              "rgba(15, 23, 42, 0.44)",

            backdropFilter:
              "blur(10px)",

            WebkitBackdropFilter:
              "blur(10px)",

            display:
              "flex",

            alignItems:
              "flex-end",

            justifyContent:
              "center",

            padding:
              "16px",

            paddingBottom:
              "max(16px, env(safe-area-inset-bottom))",
          }}
          onMouseDown={(
            event,
          ) => {
            if (
              event.target ===
                event.currentTarget &&
              !busy
            ) {
              handleClose();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="universal-add-title"
            style={{
              width:
                "min(720px, 100%)",

              maxHeight:
                "min(760px, 92vh)",

              overflowY:
                "auto",

              background:
                "var(--surface, #ffffff)",

              color:
                "var(--text, #0f172a)",

              border:
                "1px solid var(--border, #e2e8f0)",

              borderRadius:
                "28px",

              boxShadow:
                "0 30px 90px rgba(15, 23, 42, 0.28)",

              padding:
                "22px",
            }}
          >
            {/* =============================================
             * HEADER
             * =========================================== */}

            <div
              className="space-between"
              style={{
                alignItems:
                  "flex-start",

                gap:
                  "16px",
              }}
            >
              <div>
                <span
                  className="text-muted text-small"
                >
                  ＋ LIFE OS
                </span>

                <h2
                  id="universal-add-title"
                  style={{
                    margin:
                      "6px 0 0",

                    fontSize:
                      "24px",

                    lineHeight:
                      1.35,
                  }}
                >
                  أضف أي شيء
                </h2>

                <p
                  className="text-muted"
                  style={{
                    margin:
                      "8px 0 0",

                    lineHeight:
                      1.7,
                  }}
                >
                  اكتب أو ارفع PDF، وLIFE OS
                  يفهم وين مكانه.
                </p>
              </div>


              <button
                type="button"
                aria-label="إغلاق"
                onClick={
                  handleClose
                }
                disabled={
                  busy
                }
                className="button button--ghost button--small"
                style={{
                  minWidth:
                    "42px",

                  minHeight:
                    "42px",

                  fontSize:
                    "22px",
                }}
              >
                ×
              </button>
            </div>


            {/* =============================================
             * SUCCESS MODE
             * =========================================== */}

            {confirmation ? (
              <div
                style={{
                  marginTop:
                    "24px",
                }}
              >
                <div
                  className="card"
                  style={{
                    padding:
                      "24px",

                    textAlign:
                      "center",
                  }}
                >
                  <div
                    aria-hidden="true"
                    style={{
                      width:
                        "56px",

                      height:
                        "56px",

                      margin:
                        "0 auto",

                      borderRadius:
                        "18px",

                      display:
                        "grid",

                      placeItems:
                        "center",

                      background:
                        "var(--surface-soft, #f8fafc)",

                      fontSize:
                        "26px",
                    }}
                  >
                    {wasApplied
                      ? "✓"
                      : executionPending
                        ? "↻"
                        : "✓"}
                  </div>


                  <h3
                    style={{
                      margin:
                        "16px 0 0",

                      fontSize:
                        "20px",
                    }}
                  >
                    {wasApplied
                      ? "تم الحفظ فعليًا ✓"
                      : executionPending
                        ? "تم الاعتماد — التنفيذ معلّق"
                        : "تم الاعتماد ✓"}
                  </h3>


                  <p
                    className="text-muted"
                    style={{
                      margin:
                        "8px auto 0",

                      maxWidth:
                        "500px",

                      lineHeight:
                        1.75,
                    }}
                  >
                    {wasApplied
                      ? confirmation.intake.kind ===
                        "note"
                        ? "تم حفظ الملاحظة فعليًا داخل LIFE OS وربطها بسجل الإضافة."
                        : "تم تنفيذ الإضافة وحفظها فعليًا داخل LIFE OS."
                      : executionPending
                        ? "موافقتك محفوظة بأمان، لكن التنفيذ النهائي ما اكتمل. ما يحتاج تعيد الإضافة من جديد."
                        : `تم اعتمادها ضمن ${getKindLabel(
                            confirmation
                              .intake
                              .kind,
                          )}. التنفيذ النهائي لهذا النوع بيتفعل عند اكتمال الـExecutor الخاص فيه.`}
                  </p>


                  <div
                    style={{
                      marginTop:
                        "18px",

                      padding:
                        "14px 16px",

                      borderRadius:
                        "16px",

                      background:
                        "var(--surface-soft, #f8fafc)",

                      textAlign:
                        "start",
                    }}
                  >
                    <span
                      className="text-muted text-small"
                    >
                      {
                        wasApplied
                          ? "تم التنفيذ"
                          : "تم الاعتماد"
                      }
                    </span>


                    <div
                      style={{
                        display:
                          "flex",

                        alignItems:
                          "center",

                        gap:
                          "9px",

                        marginTop:
                          "6px",
                      }}
                    >
                      <span
                        aria-hidden="true"
                      >
                        {
                          getKindIcon(
                            confirmation
                              .intake
                              .kind,
                          )
                        }
                      </span>

                      <strong>
                        {
                          confirmation
                            .intake
                            .title
                        }
                      </strong>
                    </div>


                    {executionTargetLabel ? (
                      <p
                        className="text-muted text-small"
                        style={{
                          margin:
                            "8px 0 0",

                          lineHeight:
                            1.6,
                        }}
                      >
                        المكان:{" "}
                        {
                          executionTargetLabel
                        }
                      </p>
                    ) : null}


                    {!wasApplied ? (
                      <p
                        className="text-muted text-small"
                        style={{
                          margin:
                            "8px 0 0",

                          lineHeight:
                            1.6,
                        }}
                      >
                        الحالة: معتمد وينتظر التنفيذ الآمن
                      </p>
                    ) : null}
                  </div>


                  <p
                    className="text-muted text-small"
                    style={{
                      margin:
                        "14px 0 0",

                      lineHeight:
                        1.6,
                    }}
                  >
                    {
                      confirmation.message
                    }
                  </p>
                </div>


                <div
                  style={{
                    display:
                      "grid",

                    gridTemplateColumns:
                      "1fr 1fr",

                    gap:
                      "10px",

                    marginTop:
                      "18px",
                  }}
                >
                  <button
                    type="button"
                    className="button button--secondary"
                    onClick={
                      handleAddAnother
                    }
                  >
                    إضافة جديدة
                  </button>

                  <button
                    type="button"
                    className="button button--primary"
                    onClick={
                      handleClose
                    }
                  >
                    تم
                  </button>
                </div>
              </div>
            ) : !preview ? (

              /* ===========================================
               * INPUT MODE
               * ========================================= */

              <form
                onSubmit={
                  handleAnalyze
                }
                style={{
                  marginTop:
                    "24px",
                }}
              >
                <label
                  htmlFor="life-os-universal-input"
                  style={{
                    display:
                      "block",

                    fontSize:
                      "13px",

                    fontWeight:
                      700,

                    marginBottom:
                      "8px",
                  }}
                >
                  شو تبغي تضيف؟
                </label>


                <textarea
                  id="life-os-universal-input"
                  ref={
                    textareaRef
                  }
                  value={
                    text
                  }
                  disabled={
                    busy
                  }
                  onChange={(
                    event,
                  ) => {
                    setText(
                      event.target.value,
                    );

                    setError(
                      null,
                    );
                  }}
                  placeholder={
                    "مثال: راتبي 26,700 درهم\nأو: أبغي أفتح مغسلة في خورفكان في مارس 2027"
                  }
                  maxLength={
                    MAX_TEXT_LENGTH
                  }
                  rows={
                    5
                  }
                  style={{
                    width:
                      "100%",

                    minHeight:
                      "132px",

                    resize:
                      "vertical",

                    border:
                      "1px solid var(--border, #dbe2ea)",

                    borderRadius:
                      "18px",

                    background:
                      "var(--surface-soft, #f8fafc)",

                    color:
                      "inherit",

                    font:
                      "inherit",

                    fontSize:
                      "15px",

                    lineHeight:
                      1.8,

                    padding:
                      "16px",

                    outline:
                      "none",

                    boxSizing:
                      "border-box",
                  }}
                />


                {/* =========================================
                 * FILE UPLOAD
                 * ======================================= */}

                <div
                  style={{
                    marginTop:
                      "14px",
                  }}
                >
                  <input
                    ref={
                      fileInputRef
                    }
                    type="file"
                    accept=".pdf,application/pdf"
                    disabled={
                      busy
                    }
                    onChange={
                      handleFileChange
                    }
                    style={{
                      display:
                        "none",
                    }}
                  />


                  {!file ? (
                    <button
                      type="button"
                      className="button button--secondary"
                      disabled={
                        busy
                      }
                      onClick={() => {
                        fileInputRef
                          .current
                          ?.click();
                      }}
                      style={{
                        width:
                          "100%",

                        minHeight:
                          "56px",
                      }}
                    >
                      ▤ ارفع PDF
                    </button>
                  ) : (
                    <div
                      className="card"
                      style={{
                        padding:
                          "14px 16px",
                      }}
                    >
                      <div
                        className="space-between"
                        style={{
                          gap:
                            "14px",
                        }}
                      >
                        <div
                          style={{
                            minWidth:
                              0,
                          }}
                        >
                          <strong
                            style={{
                              display:
                                "block",

                              overflow:
                                "hidden",

                              textOverflow:
                                "ellipsis",

                              whiteSpace:
                                "nowrap",
                            }}
                          >
                            {file.name}
                          </strong>

                          <span
                            className="text-muted text-small"
                          >
                            PDF ·{" "}
                            {
                              formatFileSize(
                                file.size,
                              )
                            }
                          </span>
                        </div>


                        <button
                          type="button"
                          className="button button--ghost button--small"
                          disabled={
                            busy
                          }
                          onClick={
                            handleRemoveFile
                          }
                        >
                          إزالة
                        </button>
                      </div>
                    </div>
                  )}
                </div>


                {/* =========================================
                 * ERROR
                 * ======================================= */}

                {error ? (
                  <p
                    role="alert"
                    style={{
                      margin:
                        "14px 0 0",

                      fontSize:
                        "13px",

                      color:
                        "var(--negative, #dc2626)",

                      lineHeight:
                        1.6,
                    }}
                  >
                    {error}
                  </p>
                ) : null}


                {/* =========================================
                 * ANALYZE
                 * ======================================= */}

                <div
                  style={{
                    marginTop:
                      "18px",
                  }}
                >
                  <button
                    type="submit"
                    className="button button--primary"
                    disabled={
                      busy ||
                      (
                        !text.trim() &&
                        !file
                      )
                    }
                    style={{
                      width:
                        "100%",

                      minHeight:
                        "54px",
                    }}
                  >
                    {analyzing
                      ? "جاري الفهم..."
                      : "✦ فهم وتحليل"}
                  </button>
                </div>


                <p
                  className="text-muted text-small"
                  style={{
                    textAlign:
                      "center",

                    margin:
                      "12px 0 0",

                    lineHeight:
                      1.6,
                  }}
                >
                  ما ينحفظ أي شيء قبل موافقتك.
                </p>
              </form>
            ) : (

              /* ===========================================
               * PREVIEW MODE
               * ========================================= */

              <div
                style={{
                  marginTop:
                    "24px",
                }}
              >
                <div
                  className="card"
                  style={{
                    padding:
                      "20px",
                  }}
                >
                  <div
                    className="space-between"
                    style={{
                      alignItems:
                        "flex-start",

                      gap:
                        "16px",
                    }}
                  >
                    <div
                      style={{
                        minWidth:
                          0,
                      }}
                    >
                      <span
                        className="text-muted text-small"
                      >
                        LIFE OS فهم:
                      </span>


                      <div
                        style={{
                          display:
                            "flex",

                          alignItems:
                            "center",

                          gap:
                            "10px",

                          marginTop:
                            "7px",
                        }}
                      >
                        <span
                          aria-hidden="true"
                          style={{
                            fontSize:
                              "22px",
                          }}
                        >
                          {
                            getKindIcon(
                              preview.kind,
                            )
                          }
                        </span>

                        <h3
                          className="card__title"
                          style={{
                            margin:
                              0,
                          }}
                        >
                          {
                            preview.label
                          }
                        </h3>
                      </div>
                    </div>


                    <span
                      className="badge badge--neutral"
                    >
                      {
                        Math.round(
                          preview.confidence *
                          100,
                        )
                      }
                      %
                    </span>
                  </div>


                  <div
                    style={{
                      marginTop:
                        "18px",
                    }}
                  >
                    <strong
                      style={{
                        display:
                          "block",

                        fontSize:
                          "17px",
                      }}
                    >
                      {
                        preview.title
                      }
                    </strong>

                    <p
                      className="card__description"
                      style={{
                        margin:
                          "8px 0 0",

                        lineHeight:
                          1.75,
                      }}
                    >
                      {
                        preview.summary
                      }
                    </p>
                  </div>


                  <div
                    style={{
                      marginTop:
                        "18px",

                      padding:
                        "14px 16px",

                      borderRadius:
                        "16px",

                      background:
                        "var(--surface-soft, #f8fafc)",
                    }}
                  >
                    <span
                      className="text-muted text-small"
                    >
                      الخطوة التالية
                    </span>

                    <p
                      style={{
                        margin:
                          "5px 0 0",

                        fontSize:
                          "14px",

                        lineHeight:
                          1.7,

                        fontWeight:
                          600,
                      }}
                    >
                      {
                        preview.next_action
                      }
                    </p>
                  </div>


                  <div
                    style={{
                      marginTop:
                        "14px",

                      padding:
                        "12px 14px",

                      borderRadius:
                        "14px",

                      border:
                        "1px solid var(--border, #e2e8f0)",
                    }}
                  >
                    <span
                      className="text-muted text-small"
                    >
                      بعد التأكيد
                    </span>

                    <p
                      style={{
                        margin:
                          "5px 0 0",

                        fontSize:
                          "13px",

                        lineHeight:
                          1.65,
                      }}
                    >
                      {preview.kind ===
                      "note"
                        ? "الملاحظة جاهزة للتنفيذ والحفظ الفعلي."
                        : "سيتم اعتمادها الآن، والتنفيذ الفعلي يبدأ بعد إضافة الـExecutor المخصص لهذا النوع."}
                    </p>
                  </div>
                </div>


                {error ? (
                  <p
                    role="alert"
                    style={{
                      margin:
                        "14px 0 0",

                      fontSize:
                        "13px",

                      color:
                        "var(--negative, #dc2626)",

                      lineHeight:
                        1.6,
                    }}
                  >
                    {error}
                  </p>
                ) : null}


                <div
                  style={{
                    display:
                      "grid",

                    gridTemplateColumns:
                      "1fr 1fr",

                    gap:
                      "10px",

                    marginTop:
                      "18px",
                  }}
                >
                  <button
                    type="button"
                    className="button button--secondary"
                    disabled={
                      busy
                    }
                    onClick={
                      handleEdit
                    }
                  >
                    تعديل
                  </button>


                  <button
                    type="button"
                    className="button button--primary"
                    disabled={
                      busy
                    }
                    onClick={
                      handleConfirm
                    }
                  >
                    {confirming
                      ? "جاري الاعتماد..."
                      : "تأكيد"}
                  </button>
                </div>


                <p
                  className="text-muted text-small"
                  style={{
                    textAlign:
                      "center",

                    margin:
                      "12px 0 0",

                    lineHeight:
                      1.6,
                  }}
                >
                  LIFE OS ما ينفذ إلا نوع عنده Executor
                  محدد وآمن.
                </p>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}


/* =========================================================
 * FINAL V2 RULE
 * ======================================================= */

/**
 * UI now distinguishes:
 *
 * approved
 *
 * from:
 *
 * applied
 *
 *
 * note:
 *
 * preview
 *      ↓
 * confirm
 *      ↓
 * approved
 *      ↓
 * executor
 *      ↓
 * memory_item
 *      ↓
 * applied
 *
 *
 * unsupported kinds:
 *
 * preview
 *      ↓
 * confirm
 *      ↓
 * approved
 *      ↓
 * STOP
 *
 *
 * The user is never told something was saved to a final
 * domain when only approval happened.
 */