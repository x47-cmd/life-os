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
  growthIntakeProposalSchema,
  planIntakeProposalSchema,
  uuidSchema,
} from "@/lib/validation";


/* =========================================================
 * LIFE OS V2
 * UNIVERSAL INTAKE EXECUTOR
 *
 * Current deterministic execution:
 *
 * note
 *      → memory_item
 *
 * finance
 *      → income_source / budget_item
 *
 * plan
 *      → goal / project
 *
 * growth
 *      → learning_item / career_item
 *
 *
 * Pending:
 *
 * travel
 * document
 *
 *
 * Permanent rule:
 *
 * AI proposes.
 * User reviews.
 * User approves.
 * Deterministic code executes.
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
 * 2. ERROR CODES
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
 * 4. RPC ERROR SHAPE
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
 * 6. DATABASE ERROR MAPPING
 * ======================================================= */

function mapExecutorError(
  error:
    RpcErrorLike |
    null,
): IntakeExecutorError {
  const message =
    error?.message ??
    "";


  /* -------------------------------------------------------
   * Ownership / existence
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
   * Finance currency
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
   * Unsupported domain
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
   * Execution conflicts
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
    ) ||
    message.includes(
      "LIFE_OS_PLAN_TARGET_CONFLICT",
    ) ||
    message.includes(
      "LIFE_OS_GROWTH_TARGET_CONFLICT",
    )
  ) {
    return new IntakeExecutorError(
      "EXECUTION_CONFLICT",
    );
  }


  /* -------------------------------------------------------
   * Finance structured proposal
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


  /* -------------------------------------------------------
   * Plan structured proposal
   * ---------------------------------------------------- */

  if (
    message.includes(
      "LIFE_OS_PLAN_",
    )
  ) {
    return new IntakeExecutorError(
      "INVALID_PROPOSAL",
    );
  }


  /* -------------------------------------------------------
   * Growth structured proposal
   * ---------------------------------------------------- */

  if (
    message.includes(
      "LIFE_OS_GROWTH_",
    )
  ) {
    return new IntakeExecutorError(
      "INVALID_PROPOSAL",
    );
  }


  /* -------------------------------------------------------
   * Safe generic fallback
   * ---------------------------------------------------- */

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
 * 9. PLAN RPC RESULT
 * ======================================================= */

interface PlanExecutorResult {
  intake_id:
    UUID;

  target_entity_type:
    "goal" |
    "project";

  target_entity_id:
    UUID;

  intake_status:
    "applied";
}


/* =========================================================
 * 10. GROWTH RPC RESULT
 * ======================================================= */

interface GrowthExecutorResult {
  intake_id:
    UUID;

  target_entity_type:
    "learning_item" |
    "career_item";

  target_entity_id:
    UUID;

  intake_status:
    "applied";
}


/* =========================================================
 * 11. PARSE NOTE RESULT
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
 * 12. PARSE FINANCE RESULT
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
 * 13. PARSE PLAN RESULT
 * ======================================================= */

function parsePlanExecutorResult(
  value:
    unknown,
): PlanExecutorResult {
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
        "goal" &&
      targetType !==
        "project"
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
 * 14. PARSE GROWTH RESULT
 * ======================================================= */

function parseGrowthExecutorResult(
  value:
    unknown,
): GrowthExecutorResult {
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
        "learning_item" &&
      targetType !==
        "career_item"
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
 * 15. EXECUTE NOTE
 * ======================================================= */

async function executeNoteIntake(
  intakeId:
    UUID,
): Promise<IntakeExecutionResult> {
  const supabase =
    await createClient();


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
 * 16. VALIDATE FINANCE PROPOSAL
 * ======================================================= */

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
 * 17. EXECUTE FINANCE
 * ======================================================= */

async function executeFinanceIntake(
  intakeId:
    UUID,

  proposedPayload:
    JsonObject,
): Promise<IntakeExecutionResult> {
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


  if (
    result.intake_id !==
    intakeId
  ) {
    throw new IntakeExecutorError(
      "INVALID_EXECUTOR_RESULT",
    );
  }


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
 * 18. VALIDATE PLAN PROPOSAL
 * ======================================================= */

function validatePlanProposal(
  proposedPayload:
    JsonObject,
) {
  const validation =
    planIntakeProposalSchema
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
 * 19. EXECUTE PLAN
 * ======================================================= */

async function executePlanIntake(
  intakeId:
    UUID,

  proposedPayload:
    JsonObject,
): Promise<IntakeExecutionResult> {
  const proposal =
    validatePlanProposal(
      proposedPayload,
    );


  const expectedTarget =
    getStructuredProposalTarget(
      proposal,
    );


  if (
    expectedTarget !==
      "goal" &&
    expectedTarget !==
      "project"
  ) {
    throw new IntakeExecutorError(
      "INVALID_PROPOSAL",
    );
  }


  const supabase =
    await createClient();


  const {
    data,
    error,
  } =
    await supabase.rpc(
      "execute_plan_intake",
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
    parsePlanExecutorResult(
      data,
    );


  if (
    result.intake_id !==
    intakeId
  ) {
    throw new IntakeExecutorError(
      "INVALID_EXECUTOR_RESULT",
    );
  }


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
      "plan",

    status:
      "applied",

    target_entity_type:
      result.target_entity_type,

    target_entity_id:
      result.target_entity_id,
  };
}


/* =========================================================
 * 20. VALIDATE GROWTH PROPOSAL
 * ======================================================= */

function validateGrowthProposal(
  proposedPayload:
    JsonObject,
) {
  const validation =
    growthIntakeProposalSchema
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
 * 21. EXECUTE GROWTH
 * ======================================================= */

async function executeGrowthIntake(
  intakeId:
    UUID,

  proposedPayload:
    JsonObject,
): Promise<IntakeExecutionResult> {
  /*
   * Validate exact user-reviewed proposal again before RPC.
   */
  const proposal =
    validateGrowthProposal(
      proposedPayload,
    );


  const expectedTarget =
    getStructuredProposalTarget(
      proposal,
    );


  if (
    expectedTarget !==
      "learning_item" &&
    expectedTarget !==
      "career_item"
  ) {
    throw new IntakeExecutorError(
      "INVALID_PROPOSAL",
    );
  }


  const supabase =
    await createClient();


  /*
   * PostgreSQL:
   *
   * execute_growth_intake(uuid)
   *
   *
   * Supports exactly:
   *
   * create_learning_item
   * create_career_item
   */
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "execute_growth_intake",
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
    parseGrowthExecutorResult(
      data,
    );


  /*
   * The RPC must return the exact intake requested.
   */
  if (
    result.intake_id !==
    intakeId
  ) {
    throw new IntakeExecutorError(
      "INVALID_EXECUTOR_RESULT",
    );
  }


  /*
   * Proposal action and returned table target must match.
   *
   * create_learning_item
   *      → learning_item
   *
   * create_career_item
   *      → career_item
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
      "growth",

    status:
      "applied",

    target_entity_type:
      result.target_entity_type,

    target_entity_id:
      result.target_entity_id,
  };
}


/* =========================================================
 * 22. MAIN DISPATCHER
 * ======================================================= */

export async function executeIntakeItem(
  id:
    UUID,
): Promise<IntakeExecutionResult> {

  /* -------------------------------------------------------
   * Validate identifier
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
   * Load authenticated user's intake only
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
   * Terminal states
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
     * All currently enabled PostgreSQL executors are
     * idempotent.
     *
     * Re-running them returns the existing target.
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
        return executePlanIntake(
          safeId,
          intake.proposed_payload,
        );


      case "growth":
        return executeGrowthIntake(
          safeId,
          intake.proposed_payload,
        );


      case "travel":
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
   * Execution requires approval
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
   * Exact deterministic dispatcher
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
      return executePlanIntake(
        safeId,
        intake.proposed_payload,
      );


    case "growth":
      return executeGrowthIntake(
        safeId,
        intake.proposed_payload,
      );


    case "travel":
    case "document":
      /*
       * No deterministic domain executor exists yet.
       *
       * Approval alone never grants generic write access.
       */
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


/* =========================================================
 * 23. EXECUTABLE SUPPORT CHECK
 * ======================================================= */

export function isIntakeKindExecutable(
  kind:
    IntakeKind,
): boolean {
  return (
    kind ===
      "note" ||
    kind ===
      "finance" ||
    kind ===
      "plan" ||
    kind ===
      "growth"
  );
}


/* =========================================================
 * 24. EXECUTION TARGET BY KIND
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
       * Exact proposal selects:
       *
       * income_source
       * budget_item
       */
      return null;


    case "plan":
      /*
       * Exact proposal selects:
       *
       * goal
       * project
       */
      return null;


    case "growth":
      /*
       * Exact proposal selects:
       *
       * learning_item
       * career_item
       */
      return null;


    case "travel":
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
 * 25. NOTE EXECUTION
 * ======================================================= */

/**
 * note
 *      ↓
 * execute_note_intake()
 *      ↓
 * memory_items
 *
 *
 * The original approved text becomes the memory fact.
 */


/* =========================================================
 * 26. FINANCE EXECUTION
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
 * Currency safety:
 *
 * V1 financial rows do not contain their own currency.
 *
 * Therefore proposal currency must equal:
 *
 * profiles.default_currency
 */


/* =========================================================
 * 27. PLAN EXECUTION
 * ======================================================= */

/**
 * plan
 *
 * create_goal
 *      ↓
 * goals
 *
 *
 * create_project
 *      ↓
 * projects
 *
 *
 * Linked goal ownership is revalidated by PostgreSQL.
 */


/* =========================================================
 * 28. GROWTH EXECUTION
 * ======================================================= */

/**
 * growth
 *
 * create_learning_item
 *      ↓
 * learning_items
 *
 *
 * create_career_item
 *      ↓
 * career_items
 *
 *
 * Learning supports:
 *
 * course
 * certification
 * learning_path
 * masters
 * university_program
 * other
 *
 *
 * Career supports:
 *
 * current_role
 * target_role
 * skill
 * achievement
 * milestone
 * gap
 */


/* =========================================================
 * 29. GROWTH RELATIONSHIP SAFETY
 * ======================================================= */

/**
 * Learning and career proposals may optionally contain:
 *
 * goal_id
 *
 *
 * PostgreSQL verifies:
 *
 * goal exists
 * AND
 * goal.user_id = auth.uid()
 *
 *
 * An AI proposal cannot link a learning/career record to
 * another user's goal.
 */


/* =========================================================
 * 30. GROWTH DATE SAFETY
 * ======================================================= */

/**
 * Learning:
 *
 * target_date >= start_date
 *
 * completed_date >= start_date
 *
 *
 * Career:
 *
 * target_date >= event_date
 *
 *
 * Invalid relationships are rejected before persistence.
 */


/* =========================================================
 * 31. URL SAFETY
 * ======================================================= */

/**
 * Learning URL and career evidence URL accept:
 *
 * http://
 * https://
 *
 *
 * They reject values such as:
 *
 * javascript:
 * data:
 * file:
 */


/* =========================================================
 * 32. MULTIPLE VALIDATION BOUNDARIES
 * ======================================================= */

/**
 * Example growth flow:
 *
 * User:
 *
 * "أبغي أبدأ ماجستير ذكاء اصطناعي"
 *
 *
 * AI structured output
 *      ↓
 * strictIntakePreviewSchema
 *      ↓
 * exact values shown to user
 *      ↓
 * explicit confirmation
 *      ↓
 * proposed_payload
 *      ↓
 * growthIntakeProposalSchema
 *      ↓
 * execute_growth_intake()
 *      ↓
 * PostgreSQL validation
 *      ↓
 * learning_items
 *
 *
 * No single AI response becomes authoritative.
 */


/* =========================================================
 * 33. NO ARBITRARY EXECUTION
 * ======================================================= */

/**
 * Never:
 *
 * select table based on AI string
 *
 * Never:
 *
 * generate SQL from AI output
 *
 * Never:
 *
 * accept user_id from proposal
 *
 * Never:
 *
 * fallback unknown kinds into memory
 *
 *
 * Unsupported means:
 *
 * STOP.
 */


/* =========================================================
 * 34. DATABASE SECURITY
 * ======================================================= */

/**
 * Enabled PostgreSQL executors:
 *
 * execute_note_intake()
 * execute_finance_intake()
 * execute_plan_intake()
 * execute_growth_intake()
 *
 *
 * All are called using the normal authenticated Supabase
 * server client.
 *
 *
 * No:
 *
 * service_role
 * admin credentials
 * database password
 *
 *
 * Authorization remains:
 *
 * authenticated session
 *      ↓
 * auth.uid()
 *      ↓
 * PostgreSQL RLS
 *      ↓
 * SECURITY INVOKER
 */


/* =========================================================
 * 35. IDEMPOTENCY
 * ======================================================= */

/**
 * Successful retry:
 *
 * note
 * finance
 * plan
 * growth
 *
 *
 * returns the already-linked final entity.
 *
 * It does not create another record.
 */


/* =========================================================
 * 36. CURRENT EXECUTION MATRIX
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
 *
 * create_goal
 *      → goal ✅
 *
 * create_project
 *      → project ✅
 *
 *
 * growth
 *
 * create_learning_item
 *      → learning_item ✅
 *
 * create_career_item
 *      → career_item ✅
 *
 *
 * travel
 *      → blocked
 *
 *
 * document
 *      → blocked
 */


/* =========================================================
 * 37. FINAL V2 RULE
 * ======================================================= */

/**
 * Approved does NOT mean:
 *
 * "AI has write access."
 *
 *
 * Approved means:
 *
 * "LIFE OS may call the deterministic executor explicitly
 * implemented for the exact reviewed proposal."
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