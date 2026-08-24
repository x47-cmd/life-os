import {
  NextResponse,
} from "next/server";

import {
  requireAAL2UserId,
} from "@/lib/auth";

import {
  approveIntakeItem,
  createIntakeItem,
} from "@/lib/intake-data";

import {
  executeIntakeItem,
  isIntakeKindExecutable,
} from "@/lib/intake-executor";

import type {
  IntakePreview,
  StructuredIntakeProposal,
} from "@/lib/types";

import {
  getFirstValidationError,
  intakeFileMimeSchema,
  intakeFileNameSchema,
  intakeFileSizeSchema,
  intakePreviewSchema,
  intakeSourceTextSchema,
  strictIntakePreviewSchema,
} from "@/lib/validation";


/* =========================================================
 * LIFE OS V2
 * UNIVERSAL INTAKE — CONFIRM API
 *
 * Supports BOTH:
 *
 * 1. Transitional preview
 *    - no structured proposal
 *
 * 2. Strict V2 preview
 *    - exact structured proposal
 *
 *
 * This allows safe one-file-at-a-time migration.
 *
 *
 * Flow:
 *
 * AI Preview
 *      ↓
 * User Reviews
 *      ↓
 * User Confirms
 *      ↓
 * Server validates preview again
 *      ↓
 * Structured proposal persisted
 *      ↓
 * Intake approved
 *      ↓
 * Exact executor if available
 * ======================================================= */


/* =========================================================
 * 1. ROUTE CONFIGURATION
 * ======================================================= */

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

export const maxDuration =
  30;


/* =========================================================
 * 2. LIMITS
 * ======================================================= */

const MAX_MULTIPART_BYTES =
  16 * 1024 * 1024;


const MAX_PREVIEW_JSON_LENGTH =
  12_000;


/* =========================================================
 * 3. PRIVATE RESPONSE HEADERS
 * ======================================================= */

const PRIVATE_RESPONSE_HEADERS = {
  "Cache-Control":
    "no-store, max-age=0",

  "X-Content-Type-Options":
    "nosniff",
} as const;


/* =========================================================
 * 4. CONFIRMABLE PREVIEW
 * ======================================================= */

/**
 * Internal normalized preview.
 *
 * Old preview:
 *
 * proposal = null
 *
 *
 * New V2 preview:
 *
 * proposal = exact validated StructuredIntakeProposal
 */
interface ConfirmablePreview
  extends IntakePreview {

  proposal:
    StructuredIntakeProposal |
    null;
}


/* =========================================================
 * 5. RESPONSE HELPERS
 * ======================================================= */

function errorResponse(
  status:
    number,

  error:
    string,
) {
  return NextResponse.json(
    {
      ok:
        false,

      error,
    },
    {
      status,

      headers:
        PRIVATE_RESPONSE_HEADERS,
    },
  );
}


/* =========================================================
 * 6. RECORD HELPER
 * ======================================================= */

function isRecord(
  value:
    unknown,
): value is Record<string, unknown> {
  return (
    typeof value ===
      "object" &&
    value !==
      null &&
    !Array.isArray(
      value,
    )
  );
}


/* =========================================================
 * 7. SAME-ORIGIN PROTECTION
 * ======================================================= */

function hasValidOrigin(
  request:
    Request,
): boolean {
  const origin =
    request.headers.get(
      "origin",
    );


  /*
   * Server-to-server requests may omit Origin.
   */
  if (
    !origin
  ) {
    return true;
  }


  try {
    const requestUrl =
      new URL(
        request.url,
      );


    const originUrl =
      new URL(
        origin,
      );


    return (
      requestUrl.origin ===
      originUrl.origin
    );
  } catch {
    return false;
  }
}


/* =========================================================
 * 8. CONTENT TYPE
 * ======================================================= */

function isMultipartRequest(
  request:
    Request,
): boolean {
  const contentType =
    request.headers.get(
      "content-type",
    );


  if (
    !contentType
  ) {
    return false;
  }


  return contentType
    .toLowerCase()
    .includes(
      "multipart/form-data",
    );
}


/* =========================================================
 * 9. DECLARED REQUEST SIZE
 * ======================================================= */

function isDeclaredRequestTooLarge(
  request:
    Request,
): boolean {
  const contentLength =
    request.headers.get(
      "content-length",
    );


  if (
    !contentLength
  ) {
    return false;
  }


  const parsed =
    Number(
      contentLength,
    );


  return (
    Number.isFinite(
      parsed,
    ) &&
    parsed >
      MAX_MULTIPART_BYTES
  );
}


/* =========================================================
 * 10. TEXT NORMALIZATION
 * ======================================================= */

function normalizeText(
  value:
    FormDataEntryValue |
    null,
): string {
  if (
    typeof value !==
    "string"
  ) {
    return "";
  }


  return value.trim();
}


/* =========================================================
 * 11. FILE NORMALIZATION
 * ======================================================= */

function normalizeFile(
  value:
    FormDataEntryValue |
    null,
): File | null {
  if (
    !value ||
    typeof value ===
      "string"
  ) {
    return null;
  }


  if (
    value.size ===
    0
  ) {
    return null;
  }


  return value;
}


/* =========================================================
 * 12. PREVIEW FIELD NORMALIZATION
 * ======================================================= */

function normalizePreviewField(
  value:
    FormDataEntryValue |
    null,
): string | null {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }


  const normalized =
    value.trim();


  if (
    normalized.length ===
    0
  ) {
    return null;
  }


  return normalized;
}


/* =========================================================
 * 13. PREVIEW NORMALIZER
 * ======================================================= */

/**
 * First try the authoritative V2 schema.
 *
 * If that fails because the request came from the currently
 * deployed legacy preview API, try the transitional schema.
 *
 *
 * IMPORTANT:
 *
 * A request containing a `proposal` property NEVER falls
 * back to legacy validation.
 *
 * This prevents a malformed V2 proposal from bypassing the
 * strict validator.
 */
function parseConfirmablePreview(
  value:
    unknown,
):
  | {
      success:
        true;

      data:
        ConfirmablePreview;
    }
  | {
      success:
        false;

      error:
        string;
    } {

  /* -------------------------------------------------------
   * Strict V2
   * ---------------------------------------------------- */

  const strictValidation =
    strictIntakePreviewSchema
      .safeParse(
        value,
      );


  if (
    strictValidation.success
  ) {
    const preview =
      strictValidation.data;


    return {
      success:
        true,

      data: {
        kind:
          preview.kind,

        label:
          preview.label,

        title:
          preview.title,

        summary:
          preview.summary,

        confidence:
          preview.confidence,

        next_action:
          preview.next_action,

        proposal:
          preview.proposal,

        requires_confirmation:
          true,
      },
    };
  }


  /* -------------------------------------------------------
   * If proposal exists, strict validation is mandatory.
   * ---------------------------------------------------- */

  if (
    isRecord(
      value,
    ) &&
    Object.prototype.hasOwnProperty.call(
      value,
      "proposal",
    )
  ) {
    return {
      success:
        false,

      error:
        getFirstValidationError(
          strictValidation.error,
        ),
    };
  }


  /* -------------------------------------------------------
   * Transitional preview
   * ---------------------------------------------------- */

  const legacyValidation =
    intakePreviewSchema
      .safeParse(
        value,
      );


  if (
    !legacyValidation.success
  ) {
    return {
      success:
        false,

      error:
        getFirstValidationError(
          legacyValidation.error,
        ),
    };
  }


  const preview =
    legacyValidation.data;


  return {
    success:
      true,

    data: {
      kind:
        preview.kind,

      label:
        preview.label,

      title:
        preview.title,

      summary:
        preview.summary,

      confidence:
        preview.confidence,

      next_action:
        preview.next_action,

      /*
       * Transitional previews were created before the
       * structured proposal pipeline existed.
       */
      proposal:
        null,

      requires_confirmation:
        true,
    },
  };
}


/* =========================================================
 * 14. FILE VALIDATION
 * ======================================================= */

function validateFile(
  file:
    File,
):
  | {
      valid:
        true;
    }
  | {
      valid:
        false;

      status:
        number;

      error:
        string;
    } {

  /* -------------------------------------------------------
   * Size
   * ---------------------------------------------------- */

  const sizeValidation =
    intakeFileSizeSchema
      .safeParse(
        file.size,
      );


  if (
    !sizeValidation.success
  ) {
    return {
      valid:
        false,

      status:
        file.size >
        15 * 1024 * 1024
          ? 413
          : 400,

      error:
        getFirstValidationError(
          sizeValidation.error,
        ),
    };
  }


  /* -------------------------------------------------------
   * Filename
   * ---------------------------------------------------- */

  const nameValidation =
    intakeFileNameSchema
      .safeParse(
        file.name,
      );


  if (
    !nameValidation.success
  ) {
    return {
      valid:
        false,

      status:
        415,

      error:
        getFirstValidationError(
          nameValidation.error,
        ),
    };
  }


  /* -------------------------------------------------------
   * MIME
   * ---------------------------------------------------- */

  const mimeValidation =
    intakeFileMimeSchema
      .safeParse(
        file.type,
      );


  if (
    !mimeValidation.success
  ) {
    return {
      valid:
        false,

      status:
        415,

      error:
        "حالياً يدعم LIFE OS ملفات PDF فقط.",
    };
  }


  return {
    valid:
      true,
  };
}


/* =========================================================
 * 15. POST
 * ======================================================= */

export async function POST(
  request:
    Request,
) {

  /* -------------------------------------------------------
   * Origin
   * ---------------------------------------------------- */

  if (
    !hasValidOrigin(
      request,
    )
  ) {
    return errorResponse(
      403,
      "تم رفض الطلب.",
    );
  }


  /* -------------------------------------------------------
   * Content type
   * ---------------------------------------------------- */

  if (
    !isMultipartRequest(
      request,
    )
  ) {
    return errorResponse(
      415,
      "صيغة الطلب غير مدعومة.",
    );
  }


  /* -------------------------------------------------------
   * Request size
   * ---------------------------------------------------- */

  if (
    isDeclaredRequestTooLarge(
      request,
    )
  ) {
    return errorResponse(
      413,
      "حجم الطلب أكبر من المسموح.",
    );
  }


  /* -------------------------------------------------------
   * Authentication
   * ---------------------------------------------------- */

  try {
    await requireAAL2UserId();
  } catch {
    return errorResponse(
      401,
      "انتهت الجلسة. سجل الدخول مرة أخرى.",
    );
  }


  /* -------------------------------------------------------
   * Multipart body
   * ---------------------------------------------------- */

  let formData:
    FormData;


  try {
    formData =
      await request.formData();
  } catch {
    return errorResponse(
      400,
      "تعذر قراءة الطلب.",
    );
  }


  const text =
    normalizeText(
      formData.get(
        "text",
      ),
    );


  const file =
    normalizeFile(
      formData.get(
        "file",
      ),
    );


  const rawPreview =
    normalizePreviewField(
      formData.get(
        "preview",
      ),
    );


  /* -------------------------------------------------------
   * Preview required
   * ---------------------------------------------------- */

  if (
    !rawPreview
  ) {
    return errorResponse(
      400,
      "معاينة LIFE OS مطلوبة قبل التأكيد.",
    );
  }


  if (
    rawPreview.length >
    MAX_PREVIEW_JSON_LENGTH
  ) {
    return errorResponse(
      400,
      "بيانات المعاينة أكبر من المسموح.",
    );
  }


  /* -------------------------------------------------------
   * Parse JSON
   * ---------------------------------------------------- */

  let parsedPreviewJson:
    unknown;


  try {
    parsedPreviewJson =
      JSON.parse(
        rawPreview,
      ) as unknown;
  } catch {
    return errorResponse(
      400,
      "معاينة LIFE OS غير صالحة.",
    );
  }


  /* -------------------------------------------------------
   * Preview validation
   * ---------------------------------------------------- */

  const previewValidation =
    parseConfirmablePreview(
      parsedPreviewJson,
    );


  if (
    !previewValidation.success
  ) {
    return errorResponse(
      400,
      previewValidation.error,
    );
  }


  const preview =
    previewValidation.data;


  /* -------------------------------------------------------
   * Original source required
   * ---------------------------------------------------- */

  if (
    text.length ===
      0 &&
    !file
  ) {
    return errorResponse(
      400,
      "النص أو ملف PDF الأصلي مطلوب للتأكيد.",
    );
  }


  /* -------------------------------------------------------
   * Text validation
   * ---------------------------------------------------- */

  if (
    text.length >
    0
  ) {
    const textValidation =
      intakeSourceTextSchema
        .safeParse(
          text,
        );


    if (
      !textValidation.success
    ) {
      return errorResponse(
        400,
        getFirstValidationError(
          textValidation.error,
        ),
      );
    }
  }


  /* -------------------------------------------------------
   * File validation
   * ---------------------------------------------------- */

  if (
    file
  ) {
    const fileValidation =
      validateFile(
        file,
      );


    if (
      !fileValidation.valid
    ) {
      return errorResponse(
        fileValidation.status,
        fileValidation.error,
      );
    }
  }


  /* -------------------------------------------------------
   * Persist + approve
   * ---------------------------------------------------- */

  let approved:
    Awaited<
      ReturnType<
        typeof approveIntakeItem
      >
    >;


  try {
    /*
     * STEP 1
     *
     * Create the durable intake proposal.
     *
     *
     * Structured preview:
     *
     * proposed_payload = exact proposal reviewed by user
     *
     *
     * Transitional preview:
     *
     * proposed_payload = {}
     */
    const created =
      await createIntakeItem({
        kind:
          preview.kind,

        source_text:
          text.length >
          0
            ? text
            : null,

        source_file_name:
          file
            ? file.name
            : null,

        source_file_mime:
          file
            ? file.type
            : null,

        source_file_size_bytes:
          file
            ? file.size
            : null,

        title:
          preview.title,

        summary:
          preview.summary,

        confidence:
          preview.confidence,

        next_action:
          preview.next_action,

        proposed_payload:
          preview.proposal ??
          {},
      });


    /*
     * STEP 2
     *
     * This request exists only because the user explicitly
     * pressed Confirm.
     */
    approved =
      await approveIntakeItem(
        created.id,
      );
  } catch {
    return errorResponse(
      500,
      "تعذر اعتماد الإضافة حاليًا. حاول مرة أخرى.",
    );
  }


  /* =======================================================
   * 16. NO EXECUTOR AVAILABLE
   * ===================================================== */

  if (
    !isIntakeKindExecutable(
      approved.kind,
    )
  ) {
    return NextResponse.json(
      {
        ok:
          true,

        intake: {
          id:
            approved.id,

          kind:
            approved.kind,

          title:
            approved.title,

          status:
            approved.status,

          approved_at:
            approved.approved_at,

          target_entity_type:
            null,

          target_entity_id:
            null,
        },

        execution: {
          attempted:
            false,

          applied:
            false,

          reason:
            "EXECUTOR_NOT_AVAILABLE",
        },

        proposal: {
          structured:
            preview.proposal !==
            null,

          action:
            preview.proposal
              ? preview.proposal.action
              : null,
        },

        message:
          preview.proposal
            ? "تم اعتماد القيم التي راجعتها وحفظ الاقتراح داخل LIFE OS. التنفيذ الفعلي لهذا النوع بيتفعل بعد إضافة الـExecutor الخاص فيه."
            : "تم اعتماد الإضافة داخل LIFE OS. التنفيذ لهذا النوع بيتفعل بعد إضافة الـExecutor الخاص فيه.",
      },
      {
        status:
          200,

        headers:
          PRIVATE_RESPONSE_HEADERS,
      },
    );
  }


  /* =======================================================
   * 17. EXECUTE SUPPORTED KIND
   * ===================================================== */

  try {
    const execution =
      await executeIntakeItem(
        approved.id,
      );


    return NextResponse.json(
      {
        ok:
          true,

        intake: {
          id:
            execution.intake_id,

          kind:
            execution.kind,

          title:
            approved.title,

          status:
            execution.status,

          approved_at:
            approved.approved_at,

          target_entity_type:
            execution.target_entity_type,

          target_entity_id:
            execution.target_entity_id,
        },

        execution: {
          attempted:
            true,

          applied:
            true,

          target_entity_type:
            execution.target_entity_type,

          target_entity_id:
            execution.target_entity_id,
        },

        proposal: {
          structured:
            preview.proposal !==
            null,

          action:
            preview.proposal
              ? preview.proposal.action
              : null,
        },

        message:
          execution.kind ===
          "note"
            ? "تم حفظ الملاحظة داخل LIFE OS."
            : "تم تنفيذ الإضافة داخل LIFE OS.",
      },
      {
        status:
          200,

        headers:
          PRIVATE_RESPONSE_HEADERS,
      },
    );
  } catch {
    /*
     * Confirmation already succeeded.
     *
     * Never tell the client to create another proposal.
     *
     * The approved intake stays available for a controlled
     * retry later.
     */
    return NextResponse.json(
      {
        ok:
          true,

        intake: {
          id:
            approved.id,

          kind:
            approved.kind,

          title:
            approved.title,

          status:
            approved.status,

          approved_at:
            approved.approved_at,

          target_entity_type:
            null,

          target_entity_id:
            null,
        },

        execution: {
          attempted:
            true,

          applied:
            false,

          reason:
            "EXECUTION_PENDING",
        },

        proposal: {
          structured:
            preview.proposal !==
            null,

          action:
            preview.proposal
              ? preview.proposal.action
              : null,
        },

        message:
          "تم اعتماد الإضافة، لكن التنفيذ النهائي ما اكتمل. الإضافة محفوظة بأمان للمحاولة لاحقًا.",
      },
      {
        status:
          202,

        headers:
          PRIVATE_RESPONSE_HEADERS,
      },
    );
  }
}


/* =========================================================
 * 18. GET IS NOT SUPPORTED
 * ======================================================= */

export async function GET() {
  return errorResponse(
    405,
    "استخدم زر التأكيد من داخل LIFE OS.",
  );
}


/* =========================================================
 * 19. TRANSITIONAL COMPATIBILITY
 * ======================================================= */

/**
 * CURRENT deployed preview:
 *
 * {
 *   kind,
 *   label,
 *   title,
 *   summary,
 *   confidence,
 *   next_action,
 *   requires_confirmation
 * }
 *
 *
 * Accepted safely.
 *
 *
 * NEW structured preview:
 *
 * {
 *   kind,
 *   label,
 *   title,
 *   summary,
 *   confidence,
 *   next_action,
 *   proposal,
 *   requires_confirmation
 * }
 *
 *
 * Also accepted safely.
 */


/* =========================================================
 * 20. ANTI-DOWNGRADE RULE
 * ======================================================= */

/**
 * Critical:
 *
 * If the browser sends a `proposal` property:
 *
 * strictIntakePreviewSchema MUST pass.
 *
 *
 * We never do:
 *
 * invalid structured preview
 *      ↓
 * remove proposal
 *      ↓
 * accept as legacy
 *
 *
 * That would be a validation downgrade vulnerability.
 */


/* =========================================================
 * 21. STRUCTURED PAYLOAD STORAGE
 * ======================================================= */

/**
 * New V2 structured proposals are persisted exactly inside:
 *
 * intake_items.proposed_payload
 *
 *
 * Example:
 *
 * {
 *   version: 1,
 *   kind: "finance",
 *   action: "create_income_source",
 *   data: {
 *     name: "الراتب",
 *     amount: 30000,
 *     currency: "AED",
 *     frequency: "monthly",
 *     next_expected_date: null,
 *     notes: null
 *   }
 * }
 *
 *
 * This records exactly what the user reviewed.
 */


/* =========================================================
 * 22. PROPOSAL ≠ EXECUTION
 * ======================================================= */

/**
 * Persisting:
 *
 * proposed_payload
 *
 * does NOT create:
 *
 * income source
 * budget item
 * goal
 * project
 * learning item
 * career item
 *
 *
 * Domain execution still requires its exact executor.
 */


/* =========================================================
 * 23. CURRENT EXECUTION MATRIX
 * ======================================================= */

/**
 * note
 *      ↓
 * memory_item ✅
 *
 *
 * finance
 *      ↓
 * approved structured proposal
 *      ↓
 * executor pending
 *
 *
 * plan
 *      ↓
 * approved structured proposal
 *      ↓
 * executor pending
 *
 *
 * growth
 *      ↓
 * approved structured proposal
 *      ↓
 * executor pending
 *
 *
 * travel
 *      ↓
 * approved
 *      ↓
 * travel domain pending
 *
 *
 * document
 *      ↓
 * approved
 *      ↓
 * private storage layer pending
 */


/* =========================================================
 * 24. SOURCE TRUST RULE
 * ======================================================= */

/**
 * Confirmation revalidates:
 *
 * preview
 * text
 * PDF metadata
 *
 *
 * Browser cannot provide:
 *
 * user_id
 * table name
 * SQL
 * RPC name
 * executor name
 */


/* =========================================================
 * 25. OWNERSHIP
 * ======================================================= */

/**
 * user_id is never accepted from browser input.
 *
 * Ownership comes from:
 *
 * authenticated Supabase session
 *
 * and is enforced again through:
 *
 * PostgreSQL RLS.
 */


/* =========================================================
 * 26. FILE RULE
 * ======================================================= */

/**
 * PDF bytes are still temporary.
 *
 * intake_items stores only:
 *
 * filename
 * MIME
 * size
 *
 *
 * Permanent PDFs will later move to private Supabase
 * Storage.
 */


/* =========================================================
 * 27. FINAL V2 RULE
 * ======================================================= */

/**
 * AI Suggests
 *      ↓
 * Exact Proposal
 *      ↓
 * User Reviews
 *      ↓
 * User Approves
 *      ↓
 * Proposal Persisted
 *      ↓
 * Deterministic Executor
 *      ↓
 * Final Domain Fact
 *
 *
 * Simple outside.
 * Intelligent underneath.
 */