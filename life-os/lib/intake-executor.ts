import {
  getIntakeItem,
} from "@/lib/intake-data";

import {
  createClient,
} from "@/lib/supabase/server";

import type {
  IntakeKind,
  IntakeTargetEntityType,
  UUID,
} from "@/lib/types";

import {
  uuidSchema,
} from "@/lib/validation";


/* =========================================================
 * LIFE OS V2
 * UNIVERSAL INTAKE EXECUTOR
 *
 * Purpose:
 *
 * approved intake
 *      ↓
 * TypeScript dispatcher
 *      ↓
 * exact deterministic executor
 *      ↓
 * final LIFE OS entity
 *
 *
 * Current support:
 *
 * note
 *   → execute_note_intake()
 *   → memory_items
 *
 *
 * Unsupported for now:
 *
 * finance
 * plan
 * travel
 * growth
 * document
 *
 *
 * Permanent rule:
 *
 * Never guess an executor.
 * ======================================================= */


/* =========================================================
 * 1. EXECUTION RESULT
 * ======================================================= */

export interface IntakeExecutionResult {
  intake_id:
    UUID;

  kind:
    IntakeKind;

  status:
    "applied";

  target_entity_type:
    IntakeTargetEntityType;

  target_entity_id:
    UUID;
}


/* =========================================================
 * 2. EXECUTOR ERROR CODES
 * ======================================================= */

export type IntakeExecutorErrorCode =
  | "INVALID_INTAKE_ID"
  | "INTAKE_NOT_FOUND"
  | "INTAKE_NOT_APPROVED"
  | "INTAKE_CANCELLED"
  | "INTAKE_FAILED"
  | "UNSUPPORTED_KIND"
  | "INVALID_EXECUTOR_RESULT"
  | "EXECUTION_CONFLICT"
  | "EXECUTION_FAILED";


/* =========================================================
 * 3. EXECUTOR ERROR
 * ======================================================= */

export class IntakeExecutorError extends Error {
  readonly code:
    IntakeExecutorErrorCode;


  constructor(
    code:
      IntakeExecutorErrorCode,
  ) {
    const messages:
      Record<
        IntakeExecutorErrorCode,
        string
      > = {
        INVALID_INTAKE_ID:
          "معرّف الإضافة غير صالح.",

        INTAKE_NOT_FOUND:
          "الإضافة غير موجودة.",

        INTAKE_NOT_APPROVED:
          "الإضافة تحتاج موافقة قبل التنفيذ.",

        INTAKE_CANCELLED:
          "الإضافة ملغاة ولا يمكن تنفيذها.",

        INTAKE_FAILED:
          "تعذر تنفيذ الإضافة سابقًا وتحتاج مراجعة.",

        UNSUPPORTED_KIND:
          "هذا النوع غير جاهز للتنفيذ الآمن حاليًا.",

        INVALID_EXECUTOR_RESULT:
          "نتيجة التنفيذ غير صالحة.",

        EXECUTION_CONFLICT:
          "تغيرت حالة الإضافة أثناء التنفيذ.",

        EXECUTION_FAILED:
          "تعذر تنفيذ الإضافة حاليًا.",
      };


    super(
      messages[
        code
      ],
    );


    this.name =
      "IntakeExecutorError";


    this.code =
      code;
  }
}


/* =========================================================
 * 4. SAFE RPC ERROR SHAPE
 * ======================================================= */

interface RpcErrorLike {
  code?:
    string |
    null;

  message?:
    string |
    null;
}


/* =========================================================
 * 5. SAFE RECORD HELPER
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
 * 6. MAP DATABASE ERROR
 * ======================================================= */

/**
 * PostgreSQL may return one of our controlled LIFE_OS_*
 * exception codes.
 *
 * Raw database messages are NEVER returned to the UI.
 */
function mapExecutorError(
  error:
    RpcErrorLike |
    null,
): IntakeExecutorError {
  const message =
    error?.message ??
    "";


  if (
    message.includes(
      "LIFE_OS_INTAKE_NOT_FOUND",
    )
  ) {
    return new IntakeExecutorError(
      "INTAKE_NOT_FOUND",
    );
  }


  if (
    message.includes(
      "LIFE_OS_INTAKE_NOT_APPROVED",
    ) ||
    message.includes(
      "LIFE_OS_INTAKE_APPROVAL_MISSING",
    )
  ) {
    return new IntakeExecutorError(
      "INTAKE_NOT_APPROVED",
    );
  }


  if (
    message.includes(
      "LIFE_OS_UNSUPPORTED_INTAKE_KIND",
    )
  ) {
    return new IntakeExecutorError(
      "UNSUPPORTED_KIND",
    );
  }


  if (
    message.includes(
      "LIFE_OS_INTAKE_APPLY_CONFLICT",
    ) ||
    message.includes(
      "LIFE_OS_INTAKE_TARGET_CONFLICT",
    )
  ) {
    return new IntakeExecutorError(
      "EXECUTION_CONFLICT",
    );
  }


  return new IntakeExecutorError(
    "EXECUTION_FAILED",
  );
}


/* =========================================================
 * 7. NOTE RPC RESULT
 * ======================================================= */

interface NoteExecutorResult {
  intake_id:
    UUID;

  memory_item_id:
    UUID;

  intake_status:
    "applied";
}


/* =========================================================
 * 8. PARSE NOTE RPC RESULT
 * ======================================================= */

function parseNoteExecutorResult(
  value:
    unknown,
): NoteExecutorResult {
  if (
    !Array.isArray(
      value,
    ) ||
    value.length !==
      1
  ) {
    throw new IntakeExecutorError(
      "INVALID_EXECUTOR_RESULT",
    );
  }


  const row =
    value[0];


  if (
    !isRecord(
      row,
    )
  ) {
    throw new IntakeExecutorError(
      "INVALID_EXECUTOR_RESULT",
    );
  }


  const intakeIdValidation =
    uuidSchema.safeParse(
      row.intake_id,
    );


  const memoryIdValidation =
    uuidSchema.safeParse(
      row.memory_item_id,
    );


  if (
    !intakeIdValidation.success ||
    !memoryIdValidation.success ||
    row.intake_status !==
      "applied"
  ) {
    throw new IntakeExecutorError(
      "INVALID_EXECUTOR_RESULT",
    );
  }


  return {
    intake_id:
      intakeIdValidation.data,

    memory_item_id:
      memoryIdValidation.data,

    intake_status:
      "applied",
  };
}


/* =========================================================
 * 9. EXECUTE NOTE
 * ======================================================= */

async function executeNoteIntake(
  intakeId:
    UUID,
): Promise<IntakeExecutionResult> {
  const supabase =
    await createClient();


  /*
   * The PostgreSQL function:
   *
   * public.execute_note_intake(uuid)
   *
   * is:
   *
   * - SECURITY INVOKER
   * - authenticated only
   * - RLS protected
   * - atomic
   * - idempotent
   */
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "execute_note_intake",
      {
        p_intake_id:
          intakeId,
      },
    );


  if (
    error
  ) {
    throw mapExecutorError(
      error,
    );
  }


  const result =
    parseNoteExecutorResult(
      data,
    );


  /*
   * Defensive consistency check:
   *
   * Database must return the exact intake id that was
   * requested.
   */
  if (
    result.intake_id !==
    intakeId
  ) {
    throw new IntakeExecutorError(
      "INVALID_EXECUTOR_RESULT",
    );
  }


  return {
    intake_id:
      result.intake_id,

    kind:
      "note",

    status:
      "applied",

    target_entity_type:
      "memory_item",

    target_entity_id:
      result.memory_item_id,
  };
}


/* =========================================================
 * 10. MAIN DISPATCHER
 * ======================================================= */

export async function executeIntakeItem(
  id:
    UUID,
): Promise<IntakeExecutionResult> {

  /* -------------------------------------------------------
   * Validate id
   * ---------------------------------------------------- */

  const idValidation =
    uuidSchema.safeParse(
      id,
    );


  if (
    !idValidation.success
  ) {
    throw new IntakeExecutorError(
      "INVALID_INTAKE_ID",
    );
  }


  const safeId =
    idValidation.data;


  /* -------------------------------------------------------
   * Fetch owned intake
   * ---------------------------------------------------- */

  const intake =
    await getIntakeItem(
      safeId,
    );


  if (
    !intake
  ) {
    throw new IntakeExecutorError(
      "INTAKE_NOT_FOUND",
    );
  }


  /* -------------------------------------------------------
   * Terminal / invalid states
   * ---------------------------------------------------- */

  if (
    intake.status ===
    "cancelled"
  ) {
    throw new IntakeExecutorError(
      "INTAKE_CANCELLED",
    );
  }


  if (
    intake.status ===
    "failed"
  ) {
    throw new IntakeExecutorError(
      "INTAKE_FAILED",
    );
  }


  if (
    intake.status ===
    "previewed"
  ) {
    throw new IntakeExecutorError(
      "INTAKE_NOT_APPROVED",
    );
  }


  /* -------------------------------------------------------
   * Already applied
   * ---------------------------------------------------- */

  if (
    intake.status ===
    "applied"
  ) {
    /*
     * Only NOTE has a verified idempotent executor today.
     *
     * Calling it again is safe because the PostgreSQL
     * function returns the existing memory item instead of
     * creating another one.
     */
    if (
      intake.kind ===
      "note"
    ) {
      return executeNoteIntake(
        safeId,
      );
    }


    throw new IntakeExecutorError(
      "UNSUPPORTED_KIND",
    );
  }


  /* -------------------------------------------------------
   * Must now be approved
   * ---------------------------------------------------- */

  if (
    intake.status !==
    "approved"
  ) {
    throw new IntakeExecutorError(
      "INTAKE_NOT_APPROVED",
    );
  }


  /* -------------------------------------------------------
   * Exact dispatcher
   * ---------------------------------------------------- */

  switch (
    intake.kind
  ) {
    case "note":
      return executeNoteIntake(
        safeId,
      );


    case "finance":
    case "plan":
    case "travel":
    case "growth":
    case "document":
      /*
       * Deliberate refusal.
       *
       * An approved AI classification is NOT enough to
       * invent a domain write.
       *
       * Each category receives its own deterministic
       * executor later.
       */
      throw new IntakeExecutorError(
        "UNSUPPORTED_KIND",
      );


    default: {
      /*
       * Compile-time exhaustiveness protection.
       *
       * If IntakeKind gains a new value later, TypeScript
       * should force this dispatcher to be reviewed.
       */
      const exhaustiveCheck:
        never =
        intake.kind;


      void exhaustiveCheck;


      throw new IntakeExecutorError(
        "UNSUPPORTED_KIND",
      );
    }
  }
}


/* =========================================================
 * 11. SAFE SUPPORT CHECK
 * ======================================================= */

/**
 * Useful for future UI/API layers.
 *
 * This function does not read the database and does not
 * execute anything.
 */
export function isIntakeKindExecutable(
  kind:
    IntakeKind,
): boolean {
  return (
    kind ===
    "note"
  );
}


/* =========================================================
 * 12. EXECUTION TARGET
 * ======================================================= */

export function getIntakeExecutionTarget(
  kind:
    IntakeKind,
): IntakeTargetEntityType | null {
  switch (
    kind
  ) {
    case "note":
      return "memory_item";


    case "finance":
    case "plan":
    case "travel":
    case "growth":
    case "document":
      return null;


    default: {
      const exhaustiveCheck:
        never =
        kind;


      void exhaustiveCheck;


      return null;
    }
  }
}


/* =========================================================
 * 13. NO AI INSIDE EXECUTION
 * ======================================================= */

/**
 * This module deliberately imports:
 *
 * no OpenAI client
 * no prompts
 * no classification model
 *
 *
 * Execution receives an already reviewed intake and routes
 * it only to an explicitly supported deterministic executor.
 */


/* =========================================================
 * 14. NO ARBITRARY DOMAIN FALLBACK
 * ======================================================= */

/**
 * Never implement logic such as:
 *
 * if kind is unknown:
 *   save as memory
 *
 *
 * or:
 *
 * ask AI what table to write to
 *
 *
 * Unsupported means:
 *
 * STOP.
 *
 * This protects personal financial and planning data from
 * incorrect AI classification.
 */


/* =========================================================
 * 15. DATABASE SECURITY
 * ======================================================= */

/**
 * execute_note_intake() is called through the normal
 * authenticated Supabase server client.
 *
 * It does NOT use:
 *
 * service_role
 * admin credentials
 * database password
 *
 *
 * Therefore:
 *
 * Auth session
 *      ↓
 * auth.uid()
 *      ↓
 * RLS
 *      ↓
 * SECURITY INVOKER executor
 */


/* =========================================================
 * 16. IDEMPOTENCY
 * ======================================================= */

/**
 * Calling executeIntakeItem() twice for the same successfully
 * applied note does not create two memory records.
 *
 * PostgreSQL returns the existing linked memory_item.
 */


/* =========================================================
 * 17. FINAL V2 RULE
 * ======================================================= */

/**
 * Approved
 *
 * does NOT mean:
 *
 * "AI may write anywhere."
 *
 *
 * Approved means:
 *
 * "The system may attempt the exact executor explicitly
 * implemented for this intake kind."
 *
 *
 * Current execution matrix:
 *
 * note
 *      → memory_item ✅
 *
 * finance
 *      → blocked
 *
 * plan
 *      → blocked
 *
 * travel
 *      → blocked
 *
 * growth
 *      → blocked
 *
 * document
 *      → blocked
 *
 *
 * AI Suggests
 *      ↓
 * User Reviews
 *      ↓
 * User Approves
 *      ↓
 * Deterministic Dispatcher
 *      ↓
 * Exact Executor
 */