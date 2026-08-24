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
  planIntakeProposalSchema,
  uuidSchema,
} from "@/lib/validation";


/* =========================================================
 * LIFE OS V2
 * UNIVERSAL INTAKE EXECUTOR
 *
 * Current support:
 *
 * note
 *   → memory_items
 *
 * finance
 *   → income_sources / budget_items
 *
 * plan
 *   → goals / projects
 *
 *
 * Pending:
 *
 * growth
 * travel
 * document
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
 * 4. RPC ERROR
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
 * 5. RECORD HELPER
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
      "LIFE_OS_PROFILE_REQUIRED",
    )
  ) {
    return new IntakeExecutorError(
      "PROFILE_REQUIRED",
    );
  }


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
    ) ||
    message.includes(
      "LIFE_OS_FINANCE_TARGET_CONFLICT",
    ) ||
    message.includes(
      "LIFE_OS_PLAN_TARGET_CONFLICT",
    )
  ) {
    return new IntakeExecutorError(
      "EXECUTION_CONFLICT",
    );
  }


  /*
   * Finance proposal validation errors.
   */
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


  /*
   * All controlled plan-validation failures use the
   * LIFE_OS_PLAN_* namespace.
   *
   * Target conflicts were handled above first.
   */
  if (
    message.includes(
      "LIFE_OS_PLAN_",
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
 * 10. PARSE NOTE RESULT
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
 * 11. PARSE FINANCE RESULT
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
 * 12. PARSE PLAN RESULT
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
 * 13. EXECUTE NOTE
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
 * 14. VALIDATE FINANCE PROPOSAL
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
 * 15. EXECUTE FINANCE
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
 * 16. VALIDATE PLAN PROPOSAL
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
 * 17. EXECUTE PLAN
 * ======================================================= */

async function executePlanIntake(
  intakeId:
    UUID,

  proposedPayload:
    JsonObject,
): Promise<IntakeExecutionResult> {
  /*
   * Validate the exact proposal again before PostgreSQL.
   */
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


  /*
   * PostgreSQL:
   *
   * execute_plan_intake(uuid)
   *
   * Supports exactly:
   *
   * create_goal
   * create_project
   */
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


  /*
   * RPC must return the same intake we asked it to execute.
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
   * create_goal may only result in goal.
   *
   * create_project may only result in project.
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
 * 18. MAIN DISPATCHER
 * ======================================================= */

export async function executeIntakeItem(
  id:
    UUID,
): Promise<IntakeExecutionResult> {
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
     * All three currently supported executors are
     * idempotent.
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
      return executePlanIntake(
        safeId,
        intake.proposed_payload,
      );


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


/* =========================================================
 * 19. EXECUTABLE SUPPORT CHECK
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
      "plan"
  );
}


/* =========================================================
 * 20. EXECUTION TARGET BY KIND
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
       * finance has two possible targets:
       *
       * income_source
       * budget_item
       *
       * Proposal action selects the exact target.
       */
      return null;


    case "plan":
      /*
       * plan has two possible targets:
       *
       * goal
       * project
       *
       * Proposal action selects the exact target.
       */
      return null;


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
 * 21. CURRENT EXECUTION MATRIX
 * ======================================================= */

/**
 * note
 *      ↓
 * memory_item ✅
 *
 *
 * finance
 *
 * create_income_source
 *      ↓
 * income_source ✅
 *
 * create_budget_item
 *      ↓
 * budget_item ✅
 *
 *
 * plan
 *
 * create_goal
 *      ↓
 * goal ✅
 *
 * create_project
 *      ↓
 * project ✅
 *
 *
 * growth
 *      ↓
 * blocked
 *
 * travel
 *      ↓
 * blocked
 *
 * document
 *      ↓
 * blocked
 */


/* =========================================================
 * 22. PROPOSAL TRUST
 * ======================================================= */

/**
 * AI output is never trusted directly.
 *
 *
 * Example Plan flow:
 *
 * OpenAI structured proposal
 *      ↓
 * strictIntakePreviewSchema
 *      ↓
 * user sees exact values
 *      ↓
 * explicit confirmation
 *      ↓
 * proposed_payload stored
 *      ↓
 * planIntakeProposalSchema
 *      ↓
 * execute_plan_intake()
 *      ↓
 * PostgreSQL validation again
 *      ↓
 * goals / projects
 */


/* =========================================================
 * 23. RELATIONSHIP SAFETY
 * ======================================================= */

/**
 * A create_project proposal may contain:
 *
 * goal_id
 *
 *
 * PostgreSQL verifies that:
 *
 * goal exists
 * AND
 * goal belongs to auth.uid()
 *
 *
 * Therefore a proposal cannot link a project to another
 * user's goal.
 */


/* =========================================================
 * 24. NO AI DURING EXECUTION
 * ======================================================= */

/**
 * This module imports:
 *
 * no OpenAI client
 * no prompts
 * no classification model
 *
 *
 * AI finishes its role before confirmation.
 *
 * Execution is deterministic.
 */


/* =========================================================
 * 25. DATABASE SECURITY
 * ======================================================= */

/**
 * Executors:
 *
 * execute_note_intake()
 * execute_finance_intake()
 * execute_plan_intake()
 *
 *
 * are called through the normal authenticated Supabase
 * server client.
 *
 *
 * No:
 *
 * service_role
 * admin key
 * database password
 *
 *
 * Authorization:
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
 * 26. IDEMPOTENCY
 * ======================================================= */

/**
 * Repeating execution for an already applied:
 *
 * note
 * finance
 * plan
 *
 * returns the existing target entity.
 *
 *
 * It does not create duplicates.
 */


/* =========================================================
 * 27. PERMANENT RULE
 * ======================================================= */

/**
 * Approved does NOT mean:
 *
 * "AI can write anywhere."
 *
 *
 * It means:
 *
 * "The deterministic executor explicitly implemented for
 * this exact intake kind may execute the exact reviewed
 * proposal."
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