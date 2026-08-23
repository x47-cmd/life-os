"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";


/* =========================================================
 * LIFE OS V2
 * UNIVERSAL ADD
 *
 * One place to add:
 *
 * - money
 * - goals
 * - projects
 * - trips
 * - education
 * - notes
 * - PDF documents
 *
 * Flow:
 *
 * User writes/uploads
 *        ↓
 * LIFE OS understands
 *        ↓
 * Preview
 *        ↓
 * User confirms
 *        ↓
 * Save happens later through secure server action
 * ======================================================= */


/* =========================================================
 * 1. TYPES
 * ======================================================= */

type IntakeKind =
  | "finance"
  | "plan"
  | "travel"
  | "growth"
  | "document"
  | "note";


interface IntakePreview {
  kind: IntakeKind;

  label: string;

  title: string;

  summary: string;

  confidence: number;

  next_action: string;

  requires_confirmation: boolean;
}


interface IntakeApiResponse {
  ok: boolean;

  preview?: IntakePreview;

  error?: string;
}


/* =========================================================
 * 2. CONSTANTS
 * ======================================================= */

const MAX_FILE_SIZE_BYTES =
  15 * 1024 * 1024;


const ACCEPTED_FILE_TYPES = [
  "application/pdf",
] as const;


/* =========================================================
 * 3. HELPERS
 * ======================================================= */

function formatFileSize(
  bytes: number,
): string {
  if (
    bytes < 1024
  ) {
    return `${bytes} B`;
  }


  if (
    bytes <
    1024 * 1024
  ) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`;
  }


  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(1)} MB`;
}


function getKindIcon(
  kind: IntakeKind,
): string {
  switch (kind) {
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


/* =========================================================
 * 4. UNIVERSAL ADD
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
    useState(false);


  const [
    text,
    setText,
  ] =
    useState("");


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
    loading,
    setLoading,
  ] =
    useState(false);


  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );


  /* =======================================================
   * 5. OPEN
   * ===================================================== */

  function handleOpen() {
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
   * 6. RESET
   * ===================================================== */

  function resetIntake() {
    setText(
      "",
    );

    setFile(
      null,
    );

    setPreview(
      null,
    );

    setError(
      null,
    );

    setLoading(
      false,
    );


    if (
      fileInputRef.current
    ) {
      fileInputRef.current.value =
        "";
    }
  }


  /* =======================================================
   * 7. CLOSE
   * ===================================================== */

  function handleClose() {
    setOpen(
      false,
    );

    resetIntake();
  }


  /* =======================================================
   * 8. ESCAPE KEY
   * ===================================================== */

  useEffect(
    () => {
      if (
        !open
      ) {
        return;
      }


      function handleKeyDown(
        event: KeyboardEvent,
      ) {
        if (
          event.key ===
          "Escape"
        ) {
          handleClose();
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
    [
      open,
    ],
  );


  /* =======================================================
   * 9. BODY SCROLL
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
   * 10. FILE PICKER
   * ===================================================== */

  function handleFileChange(
    event:
      ChangeEvent<HTMLInputElement>,
  ) {
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


    if (
      !ACCEPTED_FILE_TYPES.includes(
        selectedFile.type as
          (
            typeof ACCEPTED_FILE_TYPES
          )[number],
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
   * 11. REMOVE FILE
   * ===================================================== */

  function handleRemoveFile() {
    setFile(
      null,
    );

    setPreview(
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
   * 12. ANALYZE
   * ===================================================== */

  async function handleAnalyze(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();


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


    setLoading(
      true,
    );

    setError(
      null,
    );

    setPreview(
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
            method: "POST",

            body: formData,

            credentials:
              "same-origin",

            cache:
              "no-store",
          },
        );


      const result =
        (
          await response.json()
        ) as IntakeApiResponse;


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
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "تعذر تحليل المدخل الآن.";


      setError(
        message,
      );
    } finally {
      setLoading(
        false,
      );
    }
  }


  /* =======================================================
   * 13. EDIT PREVIEW
   * ===================================================== */

  function handleEdit() {
    setPreview(
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
   * 14. CONFIRM — TEMPORARY V2 SAFETY
   * ===================================================== */

  function handleConfirm() {
    /*
     * Deliberately not saving yet.
     *
     * The secure confirmed-write endpoint will be introduced
     * separately.
     *
     * LIFE OS must never allow an AI interpretation to write
     * directly into personal data without explicit approval.
     */

    setError(
      "تم فهم المدخل. الحفظ الآمن سيتم ربطه في خطوة V2 القادمة.",
    );
  }


  /* =======================================================
   * 15. RENDER
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
              event.currentTarget
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
             * INPUT MODE
             * =========================================== */}

            {!preview ? (
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
                    4000
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
                 * ACTION
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
                      loading ||
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
                    {loading
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
                  ما ينحفظ أي تغيير قبل موافقتك.
                </p>
              </form>
            ) : (

              /* ===========================================
               * PREVIEW
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
                      {Math.round(
                        preview.confidence *
                          100,
                      )}
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
                      {preview.title}
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
                      {preview.summary}
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
                        error.startsWith(
                          "تم فهم",
                        )
                          ? "var(--positive, #16a34a)"
                          : "var(--negative, #dc2626)",

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
                    onClick={
                      handleEdit
                    }
                  >
                    تعديل
                  </button>

                  <button
                    type="button"
                    className="button button--primary"
                    onClick={
                      handleConfirm
                    }
                  >
                    تأكيد
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}