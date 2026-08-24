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
  StructuredIntakeProposal,
} from "@/lib/types";


/* =========================================================
 * LIFE OS V2
 * UNIVERSAL ADD
 *
 * User input
 *      ↓
 * AI preview
 *      ↓
 * exact structured proposal
 *      ↓
 * user reviews exact values
 *      ↓
 * explicit confirmation
 *      ↓
 * approved intake
 *      ↓
 * deterministic executor
 *
 *
 * Permanent UI rule:
 *
 * finance / plan / growth
 *
 * CANNOT be confirmed unless their exact structured proposal
 * is visible to the user.
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

  proposal?: {
    structured:
      boolean;

    action:
      string | null;
  };

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
 * 2. PROPOSAL REVIEW
 * ======================================================= */

interface ProposalReviewRow {
  label:
    string;

  value:
    string;
}


interface ProposalReview {
  title:
    string;

  rows:
    ProposalReviewRow[];
}


/* =========================================================
 * 3. CONSTANTS
 * ======================================================= */

const MAX_TEXT_LENGTH =
  4_000;


const MAX_FILE_SIZE_BYTES =
  15 * 1024 * 1024;


const PDF_MIME =
  "application/pdf";


/* =========================================================
 * 4. BASIC HELPERS
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


function formatAmount(
  amount:
    number,

  currency:
    string,
): string {
  try {
    return new Intl.NumberFormat(
      "ar-AE",
      {
        style:
          "currency",

        currency,

        maximumFractionDigits:
          2,
      },
    ).format(
      amount,
    );
  } catch {
    return `${amount.toLocaleString(
      "ar-AE",
    )} ${currency}`;
  }
}


function displayNullable(
  value:
    string |
    number |
    null |
    undefined,

  fallback:
    string =
      "غير محدد",
): string {
  if (
    value ===
      null ||
    value ===
      undefined ||
    value ===
      ""
  ) {
    return fallback;
  }


  return String(
    value,
  );
}


/* =========================================================
 * 5. LABEL HELPERS
 * ======================================================= */

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


function getFrequencyLabel(
  value:
    string,
): string {
  switch (
    value
  ) {
    case "monthly":
      return "شهري";

    case "annual":
      return "سنوي";

    case "one_time":
      return "مرة واحدة";

    case "other":
    default:
      return "أخرى";
  }
}


function getPriorityLabel(
  value:
    string,
): string {
  switch (
    value
  ) {
    case "high":
      return "عالية";

    case "medium":
      return "متوسطة";

    case "low":
    default:
      return "منخفضة";
  }
}


function getStatusLabel(
  value:
    string,
): string {
  switch (
    value
  ) {
    case "planned":
      return "مخطط";

    case "active":
      return "نشط";

    case "paused":
      return "متوقف مؤقتًا";

    case "blocked":
      return "متعطل";

    case "completed":
      return "مكتمل";

    case "cancelled":
      return "ملغي";

    case "archived":
      return "مؤرشف";

    case "dropped":
      return "متروك";

    default:
      return value;
  }
}


function getBudgetItemTypeLabel(
  value:
    string,
): string {
  switch (
    value
  ) {
    case "expense":
      return "مصروف";

    case "saving":
      return "ادخار";

    case "investment":
      return "استثمار";

    case "debt":
      return "قرض / التزام";

    default:
      return value;
  }
}


function getBudgetCategoryLabel(
  value:
    string,
): string {
  switch (
    value
  ) {
    case "family":
      return "العائلة";

    case "housing":
      return "السكن";

    case "debt":
      return "القروض";

    case "transport":
      return "النقل";

    case "personal":
      return "شخصي";

    case "travel":
      return "السفر";

    case "emergency":
      return "الطوارئ";

    case "investments":
      return "الاستثمارات";

    case "education":
      return "التعليم";

    case "business":
      return "البزنس";

    case "other":
    default:
      return "أخرى";
  }
}


function getGoalCategoryLabel(
  value:
    string,
): string {
  switch (
    value
  ) {
    case "finance":
      return "المال";

    case "investments":
      return "الاستثمارات";

    case "career":
      return "المسار المهني";

    case "learning":
      return "التطوير";

    case "education":
      return "التعليم";

    case "business":
      return "البزنس";

    case "travel":
      return "السفر";

    case "fitness":
      return "اللياقة";

    case "personal":
      return "شخصي";

    case "other":
    default:
      return "أخرى";
  }
}


function getProjectCategoryLabel(
  value:
    string,
): string {
  switch (
    value
  ) {
    case "ai":
      return "ذكاء اصطناعي";

    case "career":
      return "المسار المهني";

    case "education":
      return "التعليم";

    case "finance":
      return "المال";

    case "investments":
      return "الاستثمارات";

    case "business":
      return "البزنس";

    case "travel":
      return "السفر";

    case "fitness":
      return "اللياقة";

    case "personal":
      return "شخصي";

    case "other":
    default:
      return "أخرى";
  }
}


function getLearningTypeLabel(
  value:
    string,
): string {
  switch (
    value
  ) {
    case "course":
      return "دورة";

    case "certification":
      return "شهادة مهنية";

    case "learning_path":
      return "مسار تعليمي";

    case "masters":
      return "ماجستير";

    case "university_program":
      return "برنامج جامعي";

    case "other":
    default:
      return "أخرى";
  }
}


function getCareerTypeLabel(
  value:
    string,
): string {
  switch (
    value
  ) {
    case "current_role":
      return "الوظيفة الحالية";

    case "target_role":
      return "وظيفة مستهدفة";

    case "skill":
      return "مهارة";

    case "achievement":
      return "إنجاز";

    case "milestone":
      return "مرحلة مهنية";

    case "gap":
      return "فجوة تطوير";

    default:
      return value;
  }
}


/* =========================================================
 * 6. EXECUTION TARGET LABEL
 * ======================================================= */

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
 * 7. STRUCTURED KIND RULE
 * ======================================================= */

function requiresStructuredProposal(
  kind:
    IntakeKind,
): boolean {
  return (
    kind ===
      "finance" ||
    kind ===
      "plan" ||
    kind ===
      "growth"
  );
}


/* =========================================================
 * 8. PROPOSAL REVIEW BUILDER
 * ======================================================= */

function buildProposalReview(
  proposal:
    StructuredIntakeProposal,
): ProposalReview {
  switch (
    proposal.action
  ) {

    /* -----------------------------------------------------
     * INCOME
     * -------------------------------------------------- */

    case "create_income_source": {
      const data =
        proposal.data;


      return {
        title:
          "مصدر دخل جديد",

        rows: [
          {
            label:
              "الاسم",

            value:
              data.name,
          },
          {
            label:
              "المبلغ",

            value:
              formatAmount(
                data.amount,
                data.currency,
              ),
          },
          {
            label:
              "الدورية",

            value:
              getFrequencyLabel(
                data.frequency,
              ),
          },
          {
            label:
              "الدفعة القادمة",

            value:
              displayNullable(
                data.next_expected_date,
              ),
          },
          {
            label:
              "ملاحظات",

            value:
              displayNullable(
                data.notes,
                "لا توجد",
              ),
          },
        ],
      };
    }


    /* -----------------------------------------------------
     * BUDGET ITEM
     * -------------------------------------------------- */

    case "create_budget_item": {
      const data =
        proposal.data;


      return {
        title:
          "بند مالي جديد",

        rows: [
          {
            label:
              "الاسم",

            value:
              data.name,
          },
          {
            label:
              "النوع",

            value:
              getBudgetItemTypeLabel(
                data.item_type,
              ),
          },
          {
            label:
              "التصنيف",

            value:
              getBudgetCategoryLabel(
                data.category,
              ),
          },
          {
            label:
              "المبلغ",

            value:
              formatAmount(
                data.amount,
                data.currency,
              ),
          },
          {
            label:
              "الدورية",

            value:
              getFrequencyLabel(
                data.frequency,
              ),
          },
          {
            label:
              "يوم الاستحقاق",

            value:
              data.due_day ===
              null
                ? "غير محدد"
                : `يوم ${data.due_day}`,
          },
          {
            label:
              "ملاحظات",

            value:
              displayNullable(
                data.notes,
                "لا توجد",
              ),
          },
        ],
      };
    }


    /* -----------------------------------------------------
     * GOAL
     * -------------------------------------------------- */

    case "create_goal": {
      const data =
        proposal.data;


      return {
        title:
          "هدف جديد",

        rows: [
          {
            label:
              "العنوان",

            value:
              data.title,
          },
          {
            label:
              "التصنيف",

            value:
              getGoalCategoryLabel(
                data.category,
              ),
          },
          {
            label:
              "الحالة",

            value:
              getStatusLabel(
                data.status,
              ),
          },
          {
            label:
              "الأولوية",

            value:
              getPriorityLabel(
                data.priority,
              ),
          },
          {
            label:
              "التقدم",

            value:
              `${data.progress_percent}%`,
          },
          {
            label:
              "قيمة الهدف",

            value:
              displayNullable(
                data.target_value,
              ),
          },
          {
            label:
              "القيمة الحالية",

            value:
              displayNullable(
                data.current_value,
              ),
          },
          {
            label:
              "الوحدة",

            value:
              displayNullable(
                data.unit,
              ),
          },
          {
            label:
              "تاريخ الهدف",

            value:
              displayNullable(
                data.target_date,
              ),
          },
          {
            label:
              "الخطوة التالية",

            value:
              displayNullable(
                data.next_action,
              ),
          },
          {
            label:
              "الوصف",

            value:
              displayNullable(
                data.description,
                "لا يوجد",
              ),
          },
        ],
      };
    }


    /* -----------------------------------------------------
     * PROJECT
     * -------------------------------------------------- */

    case "create_project": {
      const data =
        proposal.data;


      return {
        title:
          "مشروع جديد",

        rows: [
          {
            label:
              "العنوان",

            value:
              data.title,
          },
          {
            label:
              "التصنيف",

            value:
              getProjectCategoryLabel(
                data.category,
              ),
          },
          {
            label:
              "الحالة",

            value:
              getStatusLabel(
                data.status,
              ),
          },
          {
            label:
              "الأولوية",

            value:
              getPriorityLabel(
                data.priority,
              ),
          },
          {
            label:
              "التقدم",

            value:
              `${data.progress_percent}%`,
          },
          {
            label:
              "تاريخ البداية",

            value:
              displayNullable(
                data.start_date,
              ),
          },
          {
            label:
              "تاريخ الهدف",

            value:
              displayNullable(
                data.target_date,
              ),
          },
          {
            label:
              "الخطوة التالية",

            value:
              displayNullable(
                data.next_action,
              ),
          },
          {
            label:
              "الهدف المرتبط",

            value:
              data.goal_id ??
              "بدون ربط تلقائي",
          },
          {
            label:
              "الوصف",

            value:
              displayNullable(
                data.description,
                "لا يوجد",
              ),
          },
        ],
      };
    }


    /* -----------------------------------------------------
     * LEARNING
     * -------------------------------------------------- */

    case "create_learning_item": {
      const data =
        proposal.data;


      return {
        title:
          "عنصر تطوير جديد",

        rows: [
          {
            label:
              "العنوان",

            value:
              data.title,
          },
          {
            label:
              "الجهة",

            value:
              displayNullable(
                data.provider,
              ),
          },
          {
            label:
              "النوع",

            value:
              getLearningTypeLabel(
                data.item_type,
              ),
          },
          {
            label:
              "الحالة",

            value:
              getStatusLabel(
                data.status,
              ),
          },
          {
            label:
              "الأولوية",

            value:
              getPriorityLabel(
                data.priority,
              ),
          },
          {
            label:
              "التقدم",

            value:
              `${data.progress_percent}%`,
          },
          {
            label:
              "البداية",

            value:
              displayNullable(
                data.start_date,
              ),
          },
          {
            label:
              "الهدف",

            value:
              displayNullable(
                data.target_date,
              ),
          },
          {
            label:
              "الإكمال",

            value:
              displayNullable(
                data.completed_date,
              ),
          },
          {
            label:
              "التكلفة",

            value:
              data.cost ===
              null
                ? "غير محددة"
                : formatAmount(
                    data.cost,
                    data.currency,
                  ),
          },
          {
            label:
              "الرابط",

            value:
              displayNullable(
                data.url,
              ),
          },
          {
            label:
              "الهدف المرتبط",

            value:
              data.goal_id ??
              "بدون ربط تلقائي",
          },
          {
            label:
              "ملاحظات",

            value:
              displayNullable(
                data.notes,
                "لا توجد",
              ),
          },
        ],
      };
    }


    /* -----------------------------------------------------
     * CAREER
     * -------------------------------------------------- */

    case "create_career_item": {
      const data =
        proposal.data;


      return {
        title:
          "عنصر مهني جديد",

        rows: [
          {
            label:
              "العنوان",

            value:
              data.title,
          },
          {
            label:
              "النوع",

            value:
              getCareerTypeLabel(
                data.item_type,
              ),
          },
          {
            label:
              "الحالة",

            value:
              getStatusLabel(
                data.status,
              ),
          },
          {
            label:
              "الأولوية",

            value:
              getPriorityLabel(
                data.priority,
              ),
          },
          {
            label:
              "التقييم",

            value:
              data.rating ===
              null
                ? "غير محدد"
                : `${data.rating}`,
          },
          {
            label:
              "تاريخ الحدث",

            value:
              displayNullable(
                data.event_date,
              ),
          },
          {
            label:
              "تاريخ الهدف",

            value:
              displayNullable(
                data.target_date,
              ),
          },
          {
            label:
              "الدليل",

            value:
              displayNullable(
                data.evidence_url,
              ),
          },
          {
            label:
              "الهدف المرتبط",

            value:
              data.goal_id ??
              "بدون ربط تلقائي",
          },
          {
            label:
              "الوصف",

            value:
              displayNullable(
                data.description,
                "لا يوجد",
              ),
          },
          {
            label:
              "ملاحظات",

            value:
              displayNullable(
                data.notes,
                "لا توجد",
              ),
          },
        ],
      };
    }
  }
}


/* =========================================================
 * 9. COMPONENT
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


  const proposal =
    preview?.proposal ??
    null;


  const proposalReview =
    proposal
      ? buildProposalReview(
          proposal,
        )
      : null;


  const structuredProposalRequired =
    preview
      ? requiresStructuredProposal(
          preview.kind,
        )
      : false;


  const structuredProposalMissing =
    Boolean(
      preview &&
      structuredProposalRequired &&
      !proposal,
    );


  const canConfirm =
    Boolean(
      preview &&
      !structuredProposalMissing &&
      !busy,
    );


  /* =======================================================
   * 10. RESET
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
   * 11. OPEN / CLOSE
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
   * 12. ESCAPE
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

    // Local modal state only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      open,
      busy,
    ],
  );


  /* =======================================================
   * 13. BODY SCROLL
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
   * 14. FILE PICKER
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
   * 15. ANALYZE
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
   * 16. EDIT
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
   * 17. CONFIRM
   * ===================================================== */

  async function handleConfirm():
  Promise<void> {
    if (
      !preview ||
      busy
    ) {
      return;
    }


    /*
     * HARD UI SAFETY BOUNDARY
     *
     * Finance / Plan / Growth cannot be confirmed without
     * visible exact proposal values.
     */
    if (
      requiresStructuredProposal(
        preview.kind,
      ) &&
      !preview.proposal
    ) {
      setError(
        "التفاصيل الدقيقة غير جاهزة للتأكيد. أعد التحليل بعد اكتمال تحديث LIFE OS.",
      );

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
   * 18. SUCCESS VALUES
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
   * 19. RENDER
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
                "min(820px, 92vh)",

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
                        ? "تم حفظ الملاحظة فعليًا داخل LIFE OS."
                        : "تم تنفيذ الإضافة وحفظها فعليًا داخل LIFE OS."
                      : executionPending
                        ? "موافقتك محفوظة بأمان، لكن التنفيذ النهائي ما اكتمل. ما يحتاج تعيد الإضافة."
                        : `تم اعتمادها ضمن ${getKindLabel(
                            confirmation
                              .intake
                              .kind,
                          )}.`}
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
                      {wasApplied
                        ? "تم التنفيذ"
                        : "تم الاعتماد"}
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
                  {/* =======================================
                   * CLASSIFICATION
                   * ===================================== */}

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


                  {/* =======================================
                   * SUMMARY
                   * ===================================== */}

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


                  {/* =======================================
                   * EXACT PROPOSAL REVIEW
                   * ===================================== */}

                  {proposalReview ? (
                    <div
                      style={{
                        marginTop:
                          "18px",

                        padding:
                          "16px",

                        borderRadius:
                          "18px",

                        border:
                          "1px solid var(--border, #e2e8f0)",

                        background:
                          "var(--surface-soft, #f8fafc)",
                      }}
                    >
                      <div
                        className="space-between"
                        style={{
                          alignItems:
                            "center",

                          gap:
                            "12px",
                        }}
                      >
                        <div>
                          <span
                            className="text-muted text-small"
                          >
                            راجع قبل التأكيد
                          </span>

                          <strong
                            style={{
                              display:
                                "block",

                              marginTop:
                                "4px",

                              fontSize:
                                "15px",
                            }}
                          >
                            {
                              proposalReview.title
                            }
                          </strong>
                        </div>


                        <span
                          className="badge badge--neutral"
                        >
                          القيم الدقيقة
                        </span>
                      </div>


                      <div
                        style={{
                          marginTop:
                            "14px",

                          display:
                            "grid",

                          gap:
                            "8px",
                        }}
                      >
                        {proposalReview.rows.map(
                          (
                            row,
                            index,
                          ) => (
                            <div
                              key={`${row.label}-${index}`}
                              style={{
                                display:
                                  "grid",

                                gridTemplateColumns:
                                  "minmax(90px, 0.8fr) minmax(0, 1.4fr)",

                                gap:
                                  "12px",

                                alignItems:
                                  "start",

                                padding:
                                  "9px 0",

                                borderBottom:
                                  index ===
                                  proposalReview.rows.length -
                                    1
                                    ? "none"
                                    : "1px solid var(--border, #e2e8f0)",
                              }}
                            >
                              <span
                                className="text-muted text-small"
                              >
                                {
                                  row.label
                                }
                              </span>

                              <strong
                                style={{
                                  fontSize:
                                    "13px",

                                  lineHeight:
                                    1.65,

                                  overflowWrap:
                                    "anywhere",
                                }}
                              >
                                {
                                  row.value
                                }
                              </strong>
                            </div>
                          ),
                        )}
                      </div>


                      <p
                        className="text-muted text-small"
                        style={{
                          margin:
                            "14px 0 0",

                          lineHeight:
                            1.65,
                        }}
                      >
                        هذي هي القيم اللي بتعتمدها إذا ضغطت
                        «تأكيد». راجعها قبل الموافقة.
                      </p>
                    </div>
                  ) : null}


                  {/* =======================================
                   * STRUCTURED PROPOSAL MISSING
                   * ===================================== */}

                  {structuredProposalMissing ? (
                    <div
                      role="alert"
                      style={{
                        marginTop:
                          "18px",

                        padding:
                          "14px 16px",

                        borderRadius:
                          "16px",

                        border:
                          "1px solid var(--border, #e2e8f0)",
                      }}
                    >
                      <strong
                        style={{
                          display:
                            "block",

                          fontSize:
                            "14px",
                        }}
                      >
                        التفاصيل الدقيقة غير جاهزة
                      </strong>

                      <p
                        className="text-muted text-small"
                        style={{
                          margin:
                            "6px 0 0",

                          lineHeight:
                            1.65,
                        }}
                      >
                        هذا النوع يحتاج عرض القيم الدقيقة قبل
                        التأكيد، لذلك زر التأكيد متوقف مؤقتًا
                        للحماية.
                      </p>
                    </div>
                  ) : null}


                  {/* =======================================
                   * NEXT ACTION
                   * ===================================== */}

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


                  {/* =======================================
                   * AFTER CONFIRM
                   * ===================================== */}

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
                        : proposal
                          ? "سيتم اعتماد القيم المعروضة أعلاه. التنفيذ النهائي يبدأ فقط عند وجود Executor محدد وآمن."
                          : preview.kind ===
                              "travel" ||
                            preview.kind ===
                              "document"
                            ? "سيتم اعتماد الإضافة فقط. التنفيذ النهائي لهذا النوع غير مفعّل حاليًا."
                            : "لن يتم التأكيد قبل ظهور القيم الدقيقة."}
                    </p>
                  </div>
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
                 * ACTIONS
                 * ======================================= */}

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
                      !canConfirm
                    }
                    onClick={
                      handleConfirm
                    }
                  >
                    {confirming
                      ? "جاري الاعتماد..."
                      : structuredProposalMissing
                        ? "بانتظار التفاصيل"
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
                  ما يتم اعتماد أي قيمة مخفية عنك.
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
 * finance / plan / growth:
 *
 * AI proposes exact values
 *      ↓
 * UI displays exact values
 *      ↓
 * user reviews
 *      ↓
 * confirm becomes available
 *
 *
 * If exact values are missing:
 *
 * confirm = BLOCKED
 *
 *
 * note:
 *
 * approved source
 *      ↓
 * deterministic memory executor
 *
 *
 * travel / document:
 *
 * may be approved without structured proposal for now,
 * but cannot create a final domain entity yet.
 *
 *
 * Permanent rule:
 *
 * Never approve hidden AI-generated values.
 */