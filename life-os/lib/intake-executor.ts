import {
  getIntakeItem,
} from "@/lib/intake-data";

import {
  createClient,
} from "@/lib/supabase/server";

import type {
  IntakeKind,
  IntakeTargetEntityType,
  JsonObject,
  UUID,
} from "@/lib/types";

import {
  financeIntakeProposalSchema,
  getStructuredProposalTarget,
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
 * finance
 *   → execute_finance_intake()
 *   → income_sources OR budget_items
 *
 *
 * Unsupported for now:
 *
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
  | "INVALID_PROPOSAL"
  | "PROFILE_REQUIRED"
  | "FINANCE_CURRENCY_MISMATCH"
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

        INVALID_PROPOSAL:
          "القيم المعتمدة للإضافة غير صالحة للتنفيذ.",

        PROFILE_REQUIRED:
          "أكمل إعداد حساب LIFE OS قبل تنفيذ الإضافة المالية.",

        FINANCE_CURRENCY_MISMATCH:
          "عملة الإضافة لا تطابق العملة الأساسية في LIFE OS.",

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
 * PostgreSQL may return controlled LIFE_OS_* exception
 * codes from one of our deterministic executors.
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


  /* -------------------------------------------------------
   * Intake ownership / existence
   * ---------------------------------------------------- */

  if (
    message.includes(
      "LIFE_OS_INTAKE_NOT_FOUND",
    )
  ) {
    return new IntakeExecutorError(
      "INTAKE_NOT_FOUND",
    );
  }


  /* -------------------------------------------------------
   * Approval
   * ---------------------------------------------------- */

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


  /* -------------------------------------------------------
   * Profile
   * ---------------------------------------------------- */

  if (
    message.includes(
      "LIFE_OS_PROFILE_REQUIRED",
    )
  ) {
    return new IntakeExecutorError(
      "PROFILE_REQUIRED",
    );
  }


  /* -------------------------------------------------------
   * Finance currency safety
   * ---------------------------------------------------- */

  if (
    message.includes(
      "LIFE_OS_FINANCE_CURRENCY_MISMATCH",
    ) ||
    message.includes(
      "LIFE_OS_PROFILE_CURRENCY_INVALID",
    )
  ) {
    return new IntakeExecutorError(
      "FINANCE_CURRENCY_MISMATCH",
    );
  }


  /* -------------------------------------------------------
   * Unsupported kind
   * ---------------------------------------------------- */

  if (
    message.includes(
      "LIFE_OS_UNSUPPORTED_INTAKE_KIND",
    )
  ) {
    return new IntakeExecutorError(
      "UNSUPPORTED_KIND",
    );
  }


  /* -------------------------------------------------------
   * Conflicts
   * ---------------------------------------------------- */

  if (
    message.includes(
      "LIFE_OS_INTAKE_APPLY_CONFLICT",
    ) ||
    message.includes(
      "LIFE_OS_INTAKE_TARGET_CONFLICT",
    ) ||
    message.includes(
      "LIFE_OS_FINANCE_TARGET_CONFLICT",
    )
  ) {
    return new IntakeExecutorError(
      "EXECUTION_CONFLICT",
    );
  }


  /* -------------------------------------------------------
   * Structured finance proposal rejection
   * ---------------------------------------------------- */

  if (
    message.includes(
      "LIFE_OS_FINANCE_PAYLOAD_",
    ) ||
    message.includes(
      "LIFE_OS_FINANCE_VERSION_",
    ) ||
    message.includes(
      "LIFE_OS_FINANCE_PROPOSAL_KIND_",
    ) ||
    message.includes(
      "LIFE_OS_FINANCE_ACTION_",
    ) ||
    message.includes(
      "LIFE_OS_FINANCE_DATA_",
    ) ||
    message.includes(
      "LIFE_OS_FINANCE_NAME_",
    ) ||
    message.includes(
      "LIFE_OS_FINANCE_AMOUNT_",
    ) ||
    message.includes(
      "LIFE_OS_FINANCE_CURRENCY_INVALID",
    ) ||
    message.includes(
      "LIFE_OS_FINANCE_FREQUENCY_",
    ) ||
    message.includes(
      "LIFE_OS_FINANCE_NOTES_",
    ) ||
    message.includes(
      "LIFE_OS_FINANCE_INCOME_",
    ) ||
    message.includes(
      "LIFE_OS_FINANCE_BUDGET_",
    ) ||
    message.includes(
      "LIFE_OS_FINANCE_DATE_",
    ) ||
    message.includes(
      "LIFE_OS_FINANCE_CATEGORY_",
    ) ||
    message.includes(
      "LIFE_OS_FINANCE_ITEM_TYPE_",
    ) ||
    message.includes(
      "LIFE_OS_FINANCE_DUE_DAY_",
    )
  ) {
    return new IntakeExecutorError(
      "INVALID_PROPOSAL",
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
 * 8. FINANCE RPC RESULT
 * ======================================================= */

interface FinanceExecutorResult {
  intake_id:
    UUID;

  target_entity_type:
    "income_source" |
    "budget_item";

  target_entity_id:
    UUID;

  intake_status:
    "applied";
}


/* =========================================================
 * 9. PARSE NOTE RPC RESULT
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
 * 10. PARSE FINANCE RPC RESULT
 * ======================================================= */

function parseFinanceExecutorResult(
  value:
    unknown,
): FinanceExecutorResult {
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


  const targetIdValidation =
    uuidSchema.safeParse(
      row.target_entity_id,
    );


  const targetType =
    row.target_entity_type;


  if (
    !intakeIdValidation.success ||
    !targetIdValidation.success ||
    (
      targetType !==
        "income_source" &&
      targetType !==
        "budget_item"
    ) ||
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

    target_entity_type:
      targetType,

    target_entity_id:
      targetIdValidation.data,

    intake_status:
      "applied",
  };
}


/* =========================================================
 * 11. EXECUTE NOTE
 * ======================================================= */

async function executeNoteIntake(
  intakeId:
    UUID,
): Promise<IntakeExecutionResult> {
  const supabase =
    await createClient();


  /*
   * PostgreSQL function:
   *
   * public.execute_note_intake(uuid)
   *
   *
   * Guarantees:
   *
   * SECURITY INVOKER
   * authenticated only
   * RLS protected
   * approval required
   * atomic
   * idempotent
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


  /* -------------------------------------------------------
   * Defensive intake consistency
   * ---------------------------------------------------- */

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
 * 12. VALIDATE FINANCE PROPOSAL
 * ======================================================= */

/**
 * The browser already reviewed the proposal.
 *
 * The confirmation API already validated the proposal.
 *
 * PostgreSQL validates the proposal again.
 *
 *
 * This TypeScript validation exists as an additional
 * dispatcher boundary so the finance RPC is never called
 * for an arbitrary JSON payload.
 */
function validateFinanceProposal(
  proposedPayload:
    JsonObject,
) {
  const validation =
    financeIntakeProposalSchema
      .safeParse(
        proposedPayload,
      );


  if (
    !validation.success
  ) {
    throw new IntakeExecutorError(
      "INVALID_PROPOSAL",
    );
  }


  return validation.data;
}


/* =========================================================
 * 13. EXECUTE FINANCE
 * ======================================================= */

async function executeFinanceIntake(
  intakeId:
    UUID,

  proposedPayload:
    JsonObject,
): Promise<IntakeExecutionResult> {

  /* -------------------------------------------------------
   * Validate exact reviewed proposal before RPC
   * ---------------------------------------------------- */

  const proposal =
    validateFinanceProposal(
      proposedPayload,
    );


  const expectedTarget =
    getStructuredProposalTarget(
      proposal,
    );


  if (
    expectedTarget !==
      "income_source" &&
    expectedTarget !==
      "budget_item"
  ) {
    throw new IntakeExecutorError(
      "INVALID_PROPOSAL",
    );
  }


  const supabase =
    await createClient();


  /*
   * PostgreSQL function:
   *
   * public.execute_finance_intake(uuid)
   *
   *
   * Guarantees:
   *
   * SECURITY INVOKER
   * authenticated only
   * RLS protected
   * finance kind only
   * proposal version 1 only
   * explicit action allowlist
   * exact payload shape
   * profile currency validation
   * atomic write
   * idempotent retry
   */
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "execute_finance_intake",
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
    parseFinanceExecutorResult(
      data,
    );


  /* -------------------------------------------------------
   * Defensive intake consistency
   * ---------------------------------------------------- */

  if (
    result.intake_id !==
    intakeId
  ) {
    throw new IntakeExecutorError(
      "INVALID_EXECUTOR_RESULT",
    );
  }


  /* -------------------------------------------------------
   * Defensive target consistency
   * ---------------------------------------------------- */
  /*
   * Example:
   *
   * create_income_source
   *
   * MUST return:
   *
   * income_source
   *
   *
   * It may never unexpectedly return budget_item.
   */

  if (
    result.target_entity_type !==
    expectedTarget
  ) {
    throw new IntakeExecutorError(
      "INVALID_EXECUTOR_RESULT",
    );
  }


  return {
    intake_id:
      result.intake_id,

    kind:
      "finance",

    status:
      "applied",

    target_entity_type:
      result.target_entity_type,

    target_entity_id:
      result.target_entity_id,
  };
}


/* =========================================================
 * 14. MAIN DISPATCHER
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
     * NOTE and FINANCE both have idempotent PostgreSQL
     * executors.
     *
     * Calling either one again must return the existing
     * linked entity instead of creating a duplicate.
     */

    switch (
      intake.kind
    ) {
      case "note":
        return executeNoteIntake(
          safeId,
        );


      case "finance":
        return executeFinanceIntake(
          safeId,
          intake.proposed_payload,
        );


      case "plan":
      case "travel":
      case "growth":
      case "document":
        throw new IntakeExecutorError(
          "UNSUPPORTED_KIND",
        );


      default: {
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
      return executeFinanceIntake(
        safeId,
        intake.proposed_payload,
      );


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
       * executor.
       */
      throw new IntakeExecutorError(
        "UNSUPPORTED_KIND",
      );


    default: {
      /*
       * Compile-time exhaustiveness protection.
       *
       * If IntakeKind gains a new value later, TypeScript
       * forces this dispatcher to be reviewed.
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
 * 15. SAFE SUPPORT CHECK
 * ======================================================= */

/**
 * This function does not read the database and does not
 * execute anything.
 *
 * It only answers whether LIFE OS has an explicit
 * deterministic executor for the intake kind.
 */
export function isIntakeKindExecutable(
  kind:
    IntakeKind,
): boolean {
  return (
    kind ===
      "note" ||
    kind ===
      "finance"
  );
}


/* =========================================================
 * 16. EXECUTION TARGET
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
      /*
       * Finance has two possible exact targets:
       *
       * create_income_source
       *      → income_source
       *
       * create_budget_item
       *      → budget_item
       *
       *
       * Kind alone is insufficient to select one.
       *
       * Use:
       *
       * getStructuredProposalTarget(proposal)
       *
       * when the exact proposal is available.
       */
      return null;


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
 * 17. FINANCE EXECUTION MATRIX
 * ======================================================= */

/**
 * finance
 *
 * create_income_source
 *      ↓
 * income_sources
 *
 *
 * create_budget_item
 *      ↓
 * budget_items
 *
 *
 * No other finance action is executable.
 */


/* =========================================================
 * 18. CURRENCY SAFETY
 * ======================================================= */

/**
 * V1:
 *
 * income_sources
 * budget_items
 *
 * do not store a per-record currency.
 *
 *
 * Therefore:
 *
 * proposal currency
 *
 * MUST equal:
 *
 * profiles.default_currency
 *
 *
 * Example:
 *
 * profile:
 * AED
 *
 * proposal:
 * 1000 USD
 *
 *
 * Result:
 *
 * REJECT
 *
 *
 * Never silently store:
 *
 * 1000
 *
 * as though it meant AED.
 */


/* =========================================================
 * 19. DOUBLE VALIDATION
 * ======================================================= */

/**
 * Finance structured proposal is validated:
 *
 * AI Structured Output
 *      ↓
 * strictIntakePreviewSchema
 *      ↓
 * Confirm API
 *      ↓
 * financeIntakeProposalSchema here
 *      ↓
 * PostgreSQL execute_finance_intake()
 *
 *
 * No single AI-produced JSON object becomes authoritative.
 */


/* =========================================================
 * 20. NO AI INSIDE EXECUTION
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
 * 21. NO ARBITRARY DOMAIN FALLBACK
 * ======================================================= */

/**
 * Never implement:
 *
 * if kind is unknown:
 *   save as memory
 *
 *
 * Never implement:
 *
 * ask AI what table to write to
 *
 *
 * Unsupported means:
 *
 * STOP.
 */


/* =========================================================
 * 22. DATABASE SECURITY
 * ======================================================= */

/**
 * Both executors are called through the normal authenticated
 * Supabase server client:
 *
 * execute_note_intake()
 * execute_finance_intake()
 *
 *
 * They do NOT use:
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
 * SECURITY INVOKER
 */


/* =========================================================
 * 23. IDEMPOTENCY
 * ======================================================= */

/**
 * Calling executeIntakeItem() twice for the same successfully
 * applied:
 *
 * note
 * finance
 *
 * does not create duplicate domain records.
 *
 *
 * PostgreSQL returns the existing linked target.
 */


/* =========================================================
 * 24. CURRENT EXECUTION MATRIX
 * ======================================================= */

/**
 * note
 *      → memory_item ✅
 *
 *
 * finance
 *
 * create_income_source
 *      → income_source ✅
 *
 * create_budget_item
 *      → budget_item ✅
 *
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
 */


/* =========================================================
 * 25. FINAL V2 RULE
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
 * AI Suggests
 *      ↓
 * Exact Values
 *      ↓
 * User Reviews
 *      ↓
 * User Approves
 *      ↓
 * Deterministic Dispatcher
 *      ↓
 * Exact PostgreSQL Executor
 *      ↓
 * Final LIFE OS Fact
 */