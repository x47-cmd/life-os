import {
  NextResponse,
} from "next/server";

import {
  assertAuthenticatedIdentity,
} from "@/lib/auth";

import {
  approveIntakeItem,
  createIntakeItem,
  getIntakeItem,
  markIntakeItemApplied,
} from "@/lib/intake-data";

import {
  executeIntakeItem,
  isIntakeKindExecutable,
} from "@/lib/intake-executor";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  uploadPrivatePdfDocument,
} from "@/lib/travel-data";

import type {
  Document,
  DocumentCategory,
  IntakeTargetEntityType,
  StructuredIntakeProposal,
  UUID,
} from "@/lib/types";

import {
  activeStrictIntakePreviewSchema,
  getFirstValidationError,
  intakeFileMimeSchema,
  intakeFileNameSchema,
  intakeFileSizeSchema,
  intakeSourceTextSchema,
  type ActiveStrictIntakePreview,
} from "@/lib/validation";


/* =========================================================
 * LIFE OS V2
 * UNIVERSAL INTAKE — FINAL CONFIRM API
 *
 * AI preview
 *      ↓
 * User reviews exact values
 *      ↓
 * User explicitly confirms
 *      ↓
 * Server validates everything again
 *      ↓
 * Durable intake created
 *      ↓
 * Intake explicitly approved
 *      ↓
 *
 * note
 * finance
 * plan
 * growth
 * travel
 *      ↓
 * deterministic executor
 *
 *
 * document
 *      ↓
 * private PDF Storage
 *      ↓
 * documents metadata
 *      ↓
 * intake marked applied
 *
 *
 * PDF attached to another supported kind:
 *
 * final domain record
 *      +
 * private PDF copy
 *
 *
 * No public files.
 * No service_role.
 * No AI write authority.
 * ======================================================= */


/* =========================================================
 * 1. ROUTE CONFIGURATION
 * ======================================================= */

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

export const maxDuration =
  60;


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
 * 4. RESPONSE TYPES
 * ======================================================= */

interface ConfirmedIntakeResponse {
  id:
    UUID;

  kind:
    ActiveStrictIntakePreview["kind"];

  title:
    string;

  status:
    "approved" |
    "applied";

  approved_at:
    string |
    null;

  target_entity_type:
    IntakeTargetEntityType |
    null;

  target_entity_id:
    UUID |
    null;
}


interface ExecutionResponse {
  attempted:
    boolean;

  applied:
    boolean;

  reason?:
    "EXECUTION_PENDING" |
    "EXECUTOR_NOT_AVAILABLE";

  target_entity_type?:
    IntakeTargetEntityType;

  target_entity_id?:
    UUID;
}


interface AttachmentResponse {
  attempted:
    boolean;

  saved:
    boolean;

  document_id?:
    UUID;

  category?:
    DocumentCategory;

  linked_trip_id?:
    UUID |
    null;

  reason?:
    "NO_FILE" |
    "DOCUMENT_UPLOAD_PENDING";
}


/* =========================================================
 * 5. ERROR RESPONSE
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
 * 6. SUCCESS RESPONSE
 * ======================================================= */

function successResponse(
  intake:
    ConfirmedIntakeResponse,

  execution:
    ExecutionResponse,

  attachment:
    AttachmentResponse,

  proposal:
    StructuredIntakeProposal |
    null,

  message:
    string,

  status:
    number =
    200,
) {
  return NextResponse.json(
    {
      ok:
        true,

      intake,

      execution,

      attachment,

      proposal: {
        structured:
          proposal !==
          null,

        action:
          proposal
            ? proposal.action
            : null,
      },

      message,
    },
    {
      status,

      headers:
        PRIVATE_RESPONSE_HEADERS,
    },
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
   * Internal/server requests may omit Origin.
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


  return normalized.length >
    0
    ? normalized
    : null;
}


/* =========================================================
 * 13. FILE VALIDATION
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
 * 14. PREVIEW PARSING
 * ======================================================= */

function parsePreview(
  raw:
    string,
):
  | {
      success:
        true;

      data:
        ActiveStrictIntakePreview;
    }
  | {
      success:
        false;

      error:
        string;
    } {
  let value:
    unknown;


  try {
    value =
      JSON.parse(
        raw,
      ) as unknown;
  } catch {
    return {
      success:
        false,

      error:
        "معاينة LIFE OS غير صالحة.",
    };
  }


  /*
   * FINAL V2 boundary.
   *
   * No transitional downgrade.
   *
   * finance / plan / growth / travel:
   * exact proposal required.
   *
   * document / note:
   * proposal must be null.
   */
  const validation =
    activeStrictIntakePreviewSchema
      .safeParse(
        value,
      );


  if (
    !validation.success
  ) {
    return {
      success:
        false,

      error:
        getFirstValidationError(
          validation.error,
        ),
    };
  }


  return {
    success:
      true,

    data:
      validation.data,
  };
}


/* =========================================================
 * 15. DOCUMENT CATEGORY
 * ======================================================= */

function getDocumentCategory(
  preview:
    ActiveStrictIntakePreview,
): DocumentCategory {
  switch (
    preview.kind
  ) {
    case "finance":
      return "finance";


    case "travel":
      return "travel";


    case "growth":
      if (
        preview.proposal?.action ===
        "create_career_item"
      ) {
        return "career";
      }


      return "education";


    case "plan":
      return "general";


    case "document":
      return "general";


    case "note":
      return "general";


    default: {
      const exhaustive:
        never =
        preview.kind;


      void exhaustive;


      return "general";
    }
  }
}


/* =========================================================
 * 16. CLEANUP UPLOADED DOCUMENT
 * ======================================================= */

/**
 * Used only as compensating cleanup when:
 *
 * private Storage upload succeeded
 * +
 * document metadata succeeded
 * +
 * intake lifecycle could NOT safely be finalized.
 *
 *
 * Normal user-facing document deletion remains archive-first.
 */
async function cleanupUploadedDocument(
  document:
    Document,
): Promise<void> {
  const supabase =
    await createClient();


  /*
   * Remove metadata first.
   *
   * If this fails, keep the Storage object so a metadata row
   * does not point to a knowingly missing object.
   */
  const {
    error:
      metadataDeleteError,
  } =
    await supabase
      .from(
        "documents",
      )
      .delete()
      .eq(
        "id",
        document.id,
      )
      .eq(
        "user_id",
        document.user_id,
      );


  if (
    metadataDeleteError
  ) {
    return;
  }


  /*
   * Best-effort removal of the private binary.
   */
  try {
    await supabase.storage
      .from(
        document.storage_bucket,
      )
      .remove([
        document.storage_path,
      ]);
  } catch {
    /*
     * The remaining object is still private and protected by
     * Storage RLS.
     */
  }
}


/* =========================================================
 * 17. FINALIZE PRIMARY DOCUMENT INTAKE
 * ======================================================= */

async function finalizePrimaryDocumentIntake(
  intakeId:
    UUID,

  document:
    Document,
) {
  try {
    return await markIntakeItemApplied(
      intakeId,
      "document",
      document.id,
    );
  } catch (
    error
  ) {
    /*
     * Network ambiguity protection:
     *
     * markIntakeItemApplied() may theoretically complete in
     * PostgreSQL before the caller receives the response.
     *
     * Re-read the owned intake before cleanup.
     */
    try {
      const current =
        await getIntakeItem(
          intakeId,
        );


      if (
        current?.status ===
          "applied" &&
        current.target_entity_type ===
          "document" &&
        current.target_entity_id ===
          document.id
      ) {
        return current;
      }
    } catch {
      /*
       * Continue to safe cleanup attempt below.
       */
    }


    await cleanupUploadedDocument(
      document,
    );


    throw error;
  }
}


/* =========================================================
 * 18. UPLOAD CONFIRMED PDF
 * ======================================================= */

async function uploadConfirmedPdf(
  preview:
    ActiveStrictIntakePreview,

  file:
    File,

  tripId:
    UUID |
    null,
): Promise<Document> {
  return uploadPrivatePdfDocument({
    file,

    title:
      preview.title,

    category:
      getDocumentCategory(
        preview,
      ),

    trip_id:
      tripId,

    notes:
      null,
  });
}


/* =========================================================
 * 19. APPROVED RESPONSE HELPER
 * ======================================================= */

function approvedIntakeResponse(
  id:
    UUID,

  preview:
    ActiveStrictIntakePreview,

  approvedAt:
    string |
    null,
): ConfirmedIntakeResponse {
  return {
    id,

    kind:
      preview.kind,

    title:
      preview.title,

    status:
      "approved",

    approved_at:
      approvedAt,

    target_entity_type:
      null,

    target_entity_id:
      null,
  };
}


/* =========================================================
 * 20. POST
 * ======================================================= */

export async function POST(
  request:
    Request,
) {
  /* -------------------------------------------------------
   * Same-origin
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
   * Multipart only
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
   * Declared size
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
   * Verified authentication
   * ---------------------------------------------------- */

  try {
    await assertAuthenticatedIdentity();
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
   * Final preview validation
   * ---------------------------------------------------- */

  const previewValidation =
    parsePreview(
      rawPreview,
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
   * A document intake requires the actual PDF
   * ---------------------------------------------------- */

  if (
    preview.kind ===
      "document" &&
    !file
  ) {
    return errorResponse(
      400,
      "ملف PDF الأصلي مطلوب لحفظ المستند.",
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


  /* =======================================================
   * 21. CREATE + APPROVE DURABLE INTAKE
   * ===================================================== */

  let approved:
    Awaited<
      ReturnType<
        typeof approveIntakeItem
      >
    >;


  try {
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
         * Structured kinds persist exactly what the user saw.
         *
         * note / document persist an empty object because
         * their active preview contract requires proposal:null.
         */
        proposed_payload:
          preview.proposal ??
          {},
      });


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
   * 22. PRIMARY DOCUMENT WORKFLOW
   * ===================================================== */

  if (
    preview.kind ===
    "document"
  ) {
    /*
     * Guaranteed above.
     */
    if (
      !file
    ) {
      return errorResponse(
        400,
        "ملف PDF الأصلي مطلوب لحفظ المستند.",
      );
    }


    try {
      const document =
        await uploadConfirmedPdf(
          preview,
          file,
          null,
        );


      const applied =
        await finalizePrimaryDocumentIntake(
          approved.id,
          document,
        );


      return successResponse(
        {
          id:
            applied.id,

          kind:
            "document",

          title:
            applied.title,

          status:
            "applied",

          approved_at:
            applied.approved_at,

          target_entity_type:
            "document",

          target_entity_id:
            document.id,
        },

        {
          attempted:
            true,

          applied:
            true,

          target_entity_type:
            "document",

          target_entity_id:
            document.id,
        },

        {
          attempted:
            true,

          saved:
            true,

          document_id:
            document.id,

          category:
            document.category,

          linked_trip_id:
            document.trip_id,
        },

        null,

        "تم حفظ المستند بشكل خاص داخل LIFE OS.",
      );
    } catch {
      /*
       * Intake remains approved.
       *
       * We never claim permanent document success unless both
       * private file + metadata + intake lifecycle succeed.
       */
      return successResponse(
        approvedIntakeResponse(
          approved.id,
          preview,
          approved.approved_at,
        ),

        {
          attempted:
            true,

          applied:
            false,

          reason:
            "EXECUTION_PENDING",
        },

        {
          attempted:
            true,

          saved:
            false,

          reason:
            "DOCUMENT_UPLOAD_PENDING",
        },

        null,

        "تم اعتماد المستند، لكن الحفظ الخاص للملف ما اكتمل. ما تم اعتبار المستند محفوظًا نهائيًا.",

        202,
      );
    }
  }


  /* =======================================================
   * 23. EXECUTOR SAFETY CHECK
   * ===================================================== */

  if (
    !isIntakeKindExecutable(
      approved.kind,
    )
  ) {
    return successResponse(
      approvedIntakeResponse(
        approved.id,
        preview,
        approved.approved_at,
      ),

      {
        attempted:
          false,

        applied:
          false,

        reason:
          "EXECUTOR_NOT_AVAILABLE",
      },

      file
        ? {
            attempted:
              false,

            saved:
              false,

            reason:
              "DOCUMENT_UPLOAD_PENDING",
          }
        : {
            attempted:
              false,

            saved:
              false,

            reason:
              "NO_FILE",
          },

      preview.proposal,

      "تم اعتماد الإضافة، لكن ما في Executor آمن لهذا النوع حاليًا.",

      202,
    );
  }


  /* =======================================================
   * 24. EXECUTE DOMAIN RECORD
   * ===================================================== */

  let execution:
    Awaited<
      ReturnType<
        typeof executeIntakeItem
      >
    >;


  try {
    execution =
      await executeIntakeItem(
        approved.id,
      );
  } catch {
    /*
     * Intake was approved successfully but domain execution
     * did not complete.
     *
     * Do not create another proposal automatically.
     */
    return successResponse(
      approvedIntakeResponse(
        approved.id,
        preview,
        approved.approved_at,
      ),

      {
        attempted:
          true,

        applied:
          false,

        reason:
          "EXECUTION_PENDING",
      },

      file
        ? {
            attempted:
              false,

            saved:
              false,

            reason:
              "DOCUMENT_UPLOAD_PENDING",
          }
        : {
            attempted:
              false,

            saved:
              false,

            reason:
              "NO_FILE",
          },

      preview.proposal,

      "تم اعتماد الإضافة، لكن التنفيذ النهائي ما اكتمل. ما تم إنشاء حقيقة جديدة إضافية تلقائيًا.",

      202,
    );
  }


  /* =======================================================
   * 25. OPTIONAL CONFIRMED PDF
   * ===================================================== */

  if (
    file
  ) {
    const linkedTripId =
      execution.kind ===
        "travel" &&
      execution.target_entity_type ===
        "trip"
        ? execution.target_entity_id
        : null;


    try {
      const document =
        await uploadConfirmedPdf(
          preview,
          file,
          linkedTripId,
        );


      const kindMessage =
        execution.kind ===
        "travel"
          ? "تم حفظ الرحلة وملف PDF الخاص بها داخل LIFE OS."
          : execution.kind ===
              "note"
            ? "تم حفظ الملاحظة وملف PDF الخاص بشكل آمن داخل LIFE OS."
            : "تم تنفيذ الإضافة وحفظ ملف PDF بشكل خاص داخل LIFE OS.";


      return successResponse(
        {
          id:
            execution.intake_id,

          kind:
            execution.kind,

          title:
            approved.title,

          status:
            "applied",

          approved_at:
            approved.approved_at,

          target_entity_type:
            execution.target_entity_type,

          target_entity_id:
            execution.target_entity_id,
        },

        {
          attempted:
            true,

          applied:
            true,

          target_entity_type:
            execution.target_entity_type,

          target_entity_id:
            execution.target_entity_id,
        },

        {
          attempted:
            true,

          saved:
            true,

          document_id:
            document.id,

          category:
            document.category,

          linked_trip_id:
            document.trip_id,
        },

        preview.proposal,

        kindMessage,
      );
    } catch {
      /*
       * IMPORTANT:
       *
       * The primary domain fact already succeeded.
       *
       * Do not roll it back and do not pretend the PDF saved.
       */
      return successResponse(
        {
          id:
            execution.intake_id,

          kind:
            execution.kind,

          title:
            approved.title,

          status:
            "applied",

          approved_at:
            approved.approved_at,

          target_entity_type:
            execution.target_entity_type,

          target_entity_id:
            execution.target_entity_id,
        },

        {
          attempted:
            true,

          applied:
            true,

          target_entity_type:
            execution.target_entity_type,

          target_entity_id:
            execution.target_entity_id,
        },

        {
          attempted:
            true,

          saved:
            false,

          reason:
            "DOCUMENT_UPLOAD_PENDING",
        },

        preview.proposal,

        execution.kind ===
          "travel"
          ? "تم حفظ الرحلة، لكن ملف PDF ما اكتمل حفظه الخاص."
          : "تم تنفيذ الإضافة، لكن ملف PDF ما اكتمل حفظه الخاص.",
      );
    }
  }


  /* =======================================================
   * 26. SUCCESS WITHOUT FILE
   * ===================================================== */

  return successResponse(
    {
      id:
        execution.intake_id,

      kind:
        execution.kind,

      title:
        approved.title,

      status:
        "applied",

      approved_at:
        approved.approved_at,

      target_entity_type:
        execution.target_entity_type,

      target_entity_id:
        execution.target_entity_id,
    },

    {
      attempted:
        true,

      applied:
        true,

      target_entity_type:
        execution.target_entity_type,

      target_entity_id:
        execution.target_entity_id,
    },

    {
      attempted:
        false,

      saved:
        false,

      reason:
        "NO_FILE",
    },

    preview.proposal,

    execution.kind ===
      "note"
      ? "تم حفظ الملاحظة داخل LIFE OS."
      : execution.kind ===
          "travel"
        ? "تم حفظ الرحلة داخل LIFE OS."
        : "تم تنفيذ الإضافة داخل LIFE OS.",
  );
}


/* =========================================================
 * 27. GET NOT SUPPORTED
 * ======================================================= */

export async function GET() {
  return errorResponse(
    405,
    "استخدم زر التأكيد من داخل LIFE OS.",
  );
}


/* =========================================================
 * 28. FINAL ACTIVE PREVIEW CONTRACT
 * ======================================================= */

/**
 * No legacy preview fallback remains.
 *
 *
 * Required:
 *
 * finance
 *      → structured proposal
 *
 * plan
 *      → structured proposal
 *
 * growth
 *      → structured proposal
 *
 * travel
 *      → create_trip proposal
 *
 * document
 *      → proposal:null
 *
 * note
 *      → proposal:null
 */


/* =========================================================
 * 29. TRAVEL CONTRACT
 * ======================================================= */

/**
 * Travel confirmation:
 *
 * reviewed create_trip proposal
 *      ↓
 * durable intake
 *      ↓
 * explicit approval
 *      ↓
 * execute_travel_intake()
 *      ↓
 * trips
 *
 *
 * If a PDF is attached:
 *
 * trips.id
 *      ↓
 * documents.trip_id
 *      ↓
 * private Storage object
 */


/* =========================================================
 * 30. PRIMARY DOCUMENT CONTRACT
 * ======================================================= */

/**
 * document:
 *
 * actual PDF required
 *      ↓
 * intake approved
 *      ↓
 * validated PDF
 *      ↓
 * private Storage
 *      ↓
 * documents metadata
 *      ↓
 * intake target = document
 *      ↓
 * status = applied
 *
 *
 * We never mark a document intake applied before the private
 * file and metadata both exist.
 */


/* =========================================================
 * 31. PDF ATTACHMENT CONTRACT
 * ======================================================= */

/**
 * Any confirmed supported intake may include a PDF.
 *
 *
 * The domain fact remains the PRIMARY intake target.
 *
 *
 * The PDF becomes a private supplemental document.
 *
 *
 * Example:
 *
 * travel intake
 * target = trip
 *
 * attached PDF
 *      ↓
 * documents.trip_id = trip.id
 */


/* =========================================================
 * 32. FAILURE BOUNDARY
 * ======================================================= */

/**
 * If domain execution fails:
 *
 * intake remains approved.
 *
 *
 * If primary document persistence fails:
 *
 * intake remains approved.
 *
 *
 * If a supplemental PDF fails AFTER domain execution:
 *
 * the domain fact remains applied.
 *
 * LIFE OS does not lie and claim the PDF was saved.
 */


/* =========================================================
 * 33. OWNERSHIP
 * ======================================================= */

/**
 * Browser never provides:
 *
 * user_id
 *
 *
 * Ownership comes from:
 *
 * verified Supabase auth
 *      ↓
 * auth.uid()
 *      ↓
 * PostgreSQL RLS
 *      ↓
 * Storage RLS
 */


/* =========================================================
 * 34. NO ARBITRARY EXECUTION
 * ======================================================= */

/**
 * Browser / AI cannot choose:
 *
 * table name
 * RPC name
 * SQL
 * executor
 * storage owner
 *
 *
 * The server dispatcher chooses only hard-coded supported
 * operations.
 */


/* =========================================================
 * 35. PRIVATE FILE RULE
 * ======================================================= */

/**
 * PDFs are stored only in:
 *
 * life-os-private-documents
 *
 *
 * public = false
 *
 *
 * Object path starts with:
 *
 * auth.uid()
 *
 *
 * No permanent public URL is created.
 */


/* =========================================================
 * 36. FINAL LIFE OS V2 RULE
 * ======================================================= */

/**
 * AI Suggests
 *      ↓
 * Exact Values
 *      ↓
 * User Reviews
 *      ↓
 * User Confirms
 *      ↓
 * Server Revalidates
 *      ↓
 * Deterministic Execution
 *      ↓
 * RLS-Protected Fact
 *
 *
 * Simple outside.
 * Intelligent underneath.
 * Private by default.
 */