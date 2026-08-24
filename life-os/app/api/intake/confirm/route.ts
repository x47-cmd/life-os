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

import {
  getFirstValidationError,
  intakeFileMimeSchema,
  intakeFileNameSchema,
  intakeFileSizeSchema,
  intakePreviewSchema,
  intakeSourceTextSchema,
} from "@/lib/validation";


/* =========================================================
 * LIFE OS V2
 * UNIVERSAL INTAKE — CONFIRM API
 *
 * Flow:
 *
 * User reviews AI preview
 *      ↓
 * User presses Confirm
 *      ↓
 * Validate source + preview again
 *      ↓
 * Create previewed intake
 *      ↓
 * Explicitly approve intake
 *      ↓
 * Dispatcher checks supported executor
 *      ↓
 * note → memory_item
 *
 *
 * Unsupported kinds remain safely:
 *
 * approved
 *
 * until their deterministic executor exists.
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
  8_000;


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
 * 4. RESPONSE HELPERS
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
 * 5. SAME-ORIGIN PROTECTION
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
 * 6. CONTENT TYPE
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
 * 7. DECLARED REQUEST SIZE
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
 * 8. TEXT NORMALIZATION
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
 * 9. FILE NORMALIZATION
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
 * 10. PREVIEW FIELD
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
 * 11. FILE VALIDATION
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
    intakeFileSizeSchema.safeParse(
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
    intakeFileNameSchema.safeParse(
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
    intakeFileMimeSchema.safeParse(
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
 * 12. POST
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
   * Parse preview JSON
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
   * Shared preview validation
   * ---------------------------------------------------- */

  const previewValidation =
    intakePreviewSchema.safeParse(
      parsedPreviewJson,
    );


  if (
    !previewValidation.success
  ) {
    return errorResponse(
      400,
      getFirstValidationError(
        previewValidation.error,
      ),
    );
  }


  const preview =
    previewValidation.data;


  /* -------------------------------------------------------
   * Source required
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
      intakeSourceTextSchema.safeParse(
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
   * Persist proposal
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
     * Persist the exact proposal the user reviewed.
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

        /*
         * Detailed deterministic domain payloads will be
         * introduced with each dedicated executor.
         */
        proposed_payload:
          {},
      });


    /*
     * STEP 2
     *
     * The current HTTP request represents the user's
     * explicit confirmation.
     */
    approved =
      await approveIntakeItem(
        created.id,
      );
  } catch {
    /*
     * No executor is reached when proposal persistence or
     * explicit approval fails.
     */
    return errorResponse(
      500,
      "تعذر اعتماد الإضافة حاليًا. حاول مرة أخرى.",
    );
  }


  /* -------------------------------------------------------
   * Unsupported kinds remain approved
   * ---------------------------------------------------- */

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

        message:
          "تم اعتماد الإضافة داخل LIFE OS. التنفيذ لهذا النوع بيتفعل بعد إضافة الـExecutor الخاص فيه.",
      },
      {
        status:
          200,

        headers:
          PRIVATE_RESPONSE_HEADERS,
      },
    );
  }


  /* -------------------------------------------------------
   * Execute supported kind
   * ---------------------------------------------------- */

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
     * IMPORTANT:
     *
     * The user's confirmation was already persisted.
     *
     * Therefore we do NOT return a generic failure that might
     * encourage the browser to submit the same source again
     * and create another intake proposal.
     *
     *
     * The proposal remains:
     *
     * approved
     *
     * and can be safely retried later by a dedicated retry
     * flow.
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

        message:
          "تم اعتماد الإضافة، لكن التنفيذ النهائي ما اكتمل. الإضافة محفوظة بأمان للمحاولة لاحقًا.",
      },
      {
        /*
         * 202 means:
         *
         * confirmation was accepted,
         * execution is not fully complete.
         */
        status:
          202,

        headers:
          PRIVATE_RESPONSE_HEADERS,
      },
    );
  }
}


/* =========================================================
 * 13. GET IS NOT SUPPORTED
 * ======================================================= */

export async function GET() {
  return errorResponse(
    405,
    "استخدم زر التأكيد من داخل LIFE OS.",
  );
}


/* =========================================================
 * 14. CURRENT EXECUTION MATRIX
 * ======================================================= */

/**
 * note
 *
 * approved
 *      ↓
 * executeIntakeItem()
 *      ↓
 * execute_note_intake()
 *      ↓
 * memory_items
 *      ↓
 * applied
 *
 *
 * finance
 * plan
 * travel
 * growth
 * document
 *
 * remain:
 *
 * approved
 *
 * until their exact deterministic executors exist.
 */


/* =========================================================
 * 15. CONFIRMATION ≠ GENERIC WRITE AUTHORITY
 * ======================================================= */

/**
 * Confirming:
 *
 * "راتبي 30,000"
 *
 * does NOT grant AI permission to choose arbitrary tables.
 *
 *
 * It only allows:
 *
 * the explicitly implemented executor for that intake kind.
 */


/* =========================================================
 * 16. PARTIAL FAILURE SAFETY
 * ======================================================= */

/**
 * There are two separate boundaries:
 *
 *
 * Boundary A:
 *
 * proposal creation
 * +
 * explicit approval
 *
 *
 * Boundary B:
 *
 * deterministic execution
 *
 *
 * If Boundary B fails:
 *
 * the approved proposal remains available.
 *
 * It is not silently recreated.
 *
 * It is not treated as applied.
 */


/* =========================================================
 * 17. NOTE EXECUTION SAFETY
 * ======================================================= */

/**
 * Note execution itself is atomic inside PostgreSQL:
 *
 * memory_items insert
 *      +
 * intake_items applied state
 *
 *
 * Either both succeed:
 *
 * or both roll back.
 */


/* =========================================================
 * 18. FILE RULE
 * ======================================================= */

/**
 * PDF binary data is still NOT permanently stored by this
 * endpoint.
 *
 * Only:
 *
 * name
 * MIME
 * size
 *
 * are persisted in intake_items.
 *
 *
 * Private Supabase Storage arrives with the document layer.
 */


/* =========================================================
 * 19. TRUST BOUNDARY
 * ======================================================= */

/**
 * Browser preview data is validated again.
 *
 * Source data is validated again.
 *
 * User ownership comes from the authenticated session.
 *
 * Domain execution is selected from server-side code.
 *
 *
 * The browser cannot send:
 *
 * table name
 * RPC name
 * SQL
 * user_id
 * executor name
 */


/* =========================================================
 * 20. NO RETRY DUPLICATION
 * ======================================================= */

/**
 * Once explicit confirmation succeeds, an execution problem
 * returns the already-approved intake rather than pretending
 * the entire confirmation failed.
 *
 * This prevents the UI from encouraging a second Confirm
 * submission that could create another proposal.
 */


/* =========================================================
 * 21. FINAL V2 RULE
 * ======================================================= */

/**
 * AI Suggests
 *      ↓
 * User Reviews
 *      ↓
 * User Approves
 *      ↓
 * Server Dispatcher
 *      ↓
 * Supported?
 *
 * NO
 *      ↓
 * remain approved safely
 *
 * YES
 *      ↓
 * deterministic executor
 *      ↓
 * final LIFE OS entity
 *
 *
 * Simple outside.
 * Intelligent underneath.
 */