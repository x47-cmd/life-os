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
 * Purpose:
 *
 * User reviews AI preview
 *      ↓
 * User presses Confirm
 *      ↓
 * This endpoint validates everything again
 *      ↓
 * Creates intake proposal
 *      ↓
 * Marks proposal approved
 *
 * IMPORTANT:
 *
 * Approval is NOT domain execution.
 *
 * This endpoint does NOT yet create:
 *
 * - income
 * - expense
 * - investment
 * - goal
 * - project
 * - trip
 * - learning item
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
    /*
     * Explicit confirmation can only come from an
     * authenticated LIFE OS session.
     */
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
   * Persist + approve proposal
   * ---------------------------------------------------- */

  try {
    /*
     * First:
     *
     * create a durable PREVIEWED proposal.
     *
     * Then:
     *
     * this explicit Confirm request moves it to APPROVED.
     *
     * Neither step executes the final domain action.
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
         * Detailed domain extraction will be added later.
         *
         * The human-readable preview already lives in the
         * dedicated intake columns.
         */
        proposed_payload:
          {},
      });


    const approved =
      await approveIntakeItem(
        created.id,
      );


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
        },

        message:
          "تم اعتماد الإضافة داخل LIFE OS.",
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
     * Never expose:
     *
     * database errors
     * Supabase internals
     * SQL
     * stack traces
     * user ids
     * secrets
     */
    return errorResponse(
      500,
      "تعذر اعتماد الإضافة حاليًا. حاول مرة أخرى.",
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
 * 14. CONFIRMATION MEANING
 * ======================================================= */

/**
 * A successful response from this endpoint means:
 *
 * ✅ user reviewed the AI interpretation
 * ✅ proposal was persisted
 * ✅ proposal status became approved
 *
 *
 * It does NOT mean:
 *
 * ❌ salary was changed
 * ❌ expense was added
 * ❌ goal was created
 * ❌ project was created
 * ❌ trip was created
 * ❌ investment was changed
 */


/* =========================================================
 * 15. FILE RULE
 * ======================================================= */

/**
 * The PDF is sent again during confirmation so that the
 * confirmation request remains tied to the user's explicit
 * source.
 *
 * At this stage only file metadata is persisted:
 *
 * - name
 * - MIME
 * - size
 *
 *
 * PDF bytes are NOT permanently stored yet.
 *
 * A later private Storage layer will persist documents.
 */


/* =========================================================
 * 16. TRUST BOUNDARY
 * ======================================================= */

/**
 * Browser preview data is never trusted automatically.
 *
 * It must pass:
 *
 * intakePreviewSchema
 *
 * again before persistence.
 *
 *
 * Later domain execution will perform a separate validation
 * against the exact target domain schema.
 */


/* =========================================================
 * 17. OWNERSHIP
 * ======================================================= */

/**
 * The request never accepts:
 *
 * user_id
 *
 *
 * Ownership is derived by intake-data.ts from the verified
 * authenticated Supabase session.
 *
 * PostgreSQL RLS then enforces ownership again.
 */


/* =========================================================
 * 18. FAILURE SAFETY
 * ======================================================= */

/**
 * If proposal creation succeeds but approval fails, the
 * proposal remains in:
 *
 * previewed
 *
 * state.
 *
 * It is NOT executed.
 *
 * Therefore partial failure remains safe and recoverable.
 */


/* =========================================================
 * 19. FINAL V2 RULE
 * ======================================================= */

/**
 * AI preview
 *      ↓
 * User reviews
 *      ↓
 * User presses Confirm
 *      ↓
 * Proposal becomes approved
 *      ↓
 * Separate domain executor
 *      ↓
 * Final validated write
 *
 *
 * Approval ≠ Execution.
 *
 * Simple outside.
 * Intelligent underneath.
 */