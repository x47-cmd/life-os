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
  travelIntakeProposalSchema,
  uuidSchema,
} from "@/lib/validation";


/* =========================================================
 * LIFE OS V2
 * UNIVERSAL INTAKE EXECUTOR
 *
 * Deterministic execution:
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
 * travel
 *      → trip
 *
 *
 * document
 *      → handled by the dedicated private document pipeline
 *
 *
 * Permanent rule:
 *
 * AI proposes.
 * User reviews exact values.
 * User approves.
 * Deterministic code executes.
 * PostgreSQL RLS enforces ownership.
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
          "هذا النوع لا يملك منفذًا آمنًا عبر هذا المسار.",

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
   * Finance profile
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
   *
   * These checks MUST appear before the generic domain
   * validation prefixes below.
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
    ) ||
    message.includes(
      "LIFE_OS_TRAVEL_TARGET_CONFLICT",
    )
  ) {
    return new IntakeExecutorError(
      "EXECUTION_CONFLICT",
    );
  }


  /* -------------------------------------------------------
   * Domain creation failures
   * ---------------------------------------------------- */

  if (
    message.includes(
      "LIFE_OS_TRAVEL_CREATE_FAILED",
    ) ||
    message.includes(
      "LIFE_OS_LEARNING_CREATE_FAILED",
    ) ||
    message.includes(
      "LIFE_OS_CAREER_CREATE_FAILED",
    )
  ) {
    return new IntakeExecutorError(
      "EXECUTION_FAILED",
    );
  }


  /* -------------------------------------------------------
   * Finance proposal validation
   * ---------------------------------------------------- */

  if (
    message.includes(
      "LIFE_OS_FINANCE_",
    )
  ) {
    return new IntakeExecutorError(
      "INVALID_PROPOSAL",
    );
  }


  /* -------------------------------------------------------
   * Plan proposal validation
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
   * Growth proposal validation
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
   * Travel proposal validation
   * ---------------------------------------------------- */

  if (
    message.includes(
      "LIFE_OS_TRAVEL_",
    )
  ) {
    return new IntakeExecutorError(
      "INVALID_PROPOSAL",
    );
  }


  /* -------------------------------------------------------
   * Safe fallback
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
 * 8. STRUCTURED RPC RESULT
 * ======================================================= */

interface StructuredExecutorResult {
  intake_id:
    UUID;

  target_entity_type:
    IntakeTargetEntityType;

  target_entity_id:
    UUID;

  intake_status:
    "applied";
}


/* =========================================================
 * 9. PARSE NOTE RESULT
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
 * 10. PARSE STRUCTURED RESULT
 * ======================================================= */

function parseStructuredExecutorResult(
  value:
    unknown,

  allowedTargets:
    readonly IntakeTargetEntityType[],
): StructuredExecutorResult {
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


  const rawTarget =
    row.target_entity_type;


  if (
    typeof rawTarget !==
      "string"
  ) {
    throw new IntakeExecutorError(
      "INVALID_EXECUTOR_RESULT",
    );
  }


  const target =
    rawTarget as
      IntakeTargetEntityType;


  if (
    !intakeIdValidation.success ||
    !targetIdValidation.success ||
    !allowedTargets.includes(
      target,
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
      target,

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
 * 12. VALIDATE FINANCE PROPOSAL
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
 * 13. EXECUTE FINANCE
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
    parseStructuredExecutorResult(
      data,
      [
        "income_source",
        "budget_item",
      ],
    );


  if (
    result.intake_id !==
      intakeId ||
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
 * 14. VALIDATE PLAN PROPOSAL
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
 * 15. EXECUTE PLAN
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
    parseStructuredExecutorResult(
      data,
      [
        "goal",
        "project",
      ],
    );


  if (
    result.intake_id !==
      intakeId ||
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
 * 16. VALIDATE GROWTH PROPOSAL
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
 * 17. EXECUTE GROWTH
 * ======================================================= */

async function executeGrowthIntake(
  intakeId:
    UUID,

  proposedPayload:
    JsonObject,
): Promise<IntakeExecutionResult> {
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
    parseStructuredExecutorResult(
      data,
      [
        "learning_item",
        "career_item",
      ],
    );


  if (
    result.intake_id !==
      intakeId ||
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
 * 18. VALIDATE TRAVEL PROPOSAL
 * ======================================================= */

function validateTravelProposal(
  proposedPayload:
    JsonObject,
) {
  const validation =
    travelIntakeProposalSchema
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
 * 19. EXECUTE TRAVEL
 * ======================================================= */

async function executeTravelIntake(
  intakeId:
    UUID,

  proposedPayload:
    JsonObject,
): Promise<IntakeExecutionResult> {
  /*
   * Exact user-reviewed proposal is validated again here
   * before PostgreSQL sees the approved intake.
   */
  const proposal =
    validateTravelProposal(
      proposedPayload,
    );


  const expectedTarget =
    getStructuredProposalTarget(
      proposal,
    );


  if (
    expectedTarget !==
    "trip"
  ) {
    throw new IntakeExecutorError(
      "INVALID_PROPOSAL",
    );
  }


  const supabase =
    await createClient();


  /*
   * Migration 010:
   *
   * execute_travel_intake(uuid)
   *
   * supports exactly:
   *
   * create_trip
   */
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "execute_travel_intake",
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
    parseStructuredExecutorResult(
      data,
      [
        "trip",
      ],
    );


  if (
    result.intake_id !==
      intakeId ||
    result.target_entity_type !==
      "trip" ||
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
      "travel",

    status:
      "applied",

    target_entity_type:
      "trip",

    target_entity_id:
      result.target_entity_id,
  };
}


/* =========================================================
 * 20. VALIDATE INTAKE ID
 * ======================================================= */

function validateIntakeId(
  id:
    UUID,
): UUID {
  const validation =
    uuidSchema.safeParse(
      id,
    );


  if (
    !validation.success
  ) {
    throw new IntakeExecutorError(
      "INVALID_INTAKE_ID",
    );
  }


  return validation.data;
}


/* =========================================================
 * 21. EXECUTION LIFECYCLE GUARD
 * ======================================================= */

function assertExecutableLifecycle(
  status:
    "previewed" |
    "approved" |
    "applied" |
    "failed" |
    "cancelled",
): void {
  if (
    status ===
    "cancelled"
  ) {
    throw new IntakeExecutorError(
      "INTAKE_CANCELLED",
    );
  }


  if (
    status ===
    "failed"
  ) {
    throw new IntakeExecutorError(
      "INTAKE_FAILED",
    );
  }


  if (
    status ===
    "previewed"
  ) {
    throw new IntakeExecutorError(
      "INTAKE_NOT_APPROVED",
    );
  }


  /*
   * Allowed:
   *
   * approved
   * applied
   *
   *
   * Applied is intentionally allowed because every enabled
   * PostgreSQL executor is idempotent and returns the already
   * linked target instead of creating a duplicate.
   */
}


/* =========================================================
 * 22. MAIN DISPATCHER
 * ======================================================= */

export async function executeIntakeItem(
  id:
    UUID,
): Promise<IntakeExecutionResult> {
  const safeId =
    validateIntakeId(
      id,
    );


  /*
   * getIntakeItem() loads only the authenticated owner's
   * intake through PostgreSQL RLS.
   */
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


  assertExecutableLifecycle(
    intake.status,
  );


  /*
   * Exact deterministic dispatcher.
   *
   * No table name, function name or action is selected from
   * arbitrary AI strings.
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
      return executeTravelIntake(
        safeId,
        intake.proposed_payload,
      );


    case "document":
      /*
       * Private PDFs require a coordinated Storage +
       * metadata pipeline.
       *
       * Approval must never fall through into a generic
       * database executor.
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
      "growth" ||
    kind ===
      "travel"
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
      /*
       * Travel has only one V2 structured action:
       *
       * create_trip
       *      ↓
       * trip
       */
      return "trip";


    case "document":
      /*
       * Document persistence uses private Storage plus
       * PostgreSQL metadata and therefore has its own
       * coordinated pipeline.
       */
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
 * Original approved source text becomes the memory fact.
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
 * Proposal currency is checked against the owner's LIFE OS
 * profile by the PostgreSQL executor.
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
 * Linked goal ownership is verified by PostgreSQL.
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
 */


/* =========================================================
 * 29. TRAVEL EXECUTION
 * ======================================================= */

/**
 * travel
 *
 * create_trip
 *      ↓
 * execute_travel_intake()
 *      ↓
 * trips
 *
 *
 * Exact values:
 *
 * title
 * destination
 * start_date
 * end_date
 * status
 * budget_total
 * currency
 * readiness_percent
 * notes
 *
 *
 * No AI inference occurs during execution.
 */


/* =========================================================
 * 30. TRAVEL IDEMPOTENCY
 * ======================================================= */

/**
 * execute_travel_intake()
 *
 * locks the owned intake row.
 *
 *
 * approved:
 *
 * creates one trip
 * +
 * marks intake applied
 *
 *
 * applied:
 *
 * returns the already-linked owned trip.
 *
 *
 * It does not create a second trip.
 */


/* =========================================================
 * 31. DOCUMENT PIPELINE SEPARATION
 * ======================================================= */

/**
 * document remains intentionally outside this dispatcher.
 *
 *
 * PDF persistence requires:
 *
 * authenticated owner
 *      ↓
 * validated PDF
 *      ↓
 * server-generated Storage path
 *      ↓
 * private Storage upload
 *      ↓
 * documents metadata insert
 *      ↓
 * rollback/cleanup if metadata fails
 *
 *
 * That workflow belongs to:
 *
 * lib/travel-data.ts
 *
 * and the confirmation route.
 */


/* =========================================================
 * 32. MULTIPLE VALIDATION BOUNDARIES
 * ======================================================= */

/**
 * Example Travel flow:
 *
 * User input
 *      ↓
 * AI structured output
 *      ↓
 * activeStrictIntakePreviewSchema
 *      ↓
 * exact values shown to user
 *      ↓
 * explicit confirmation
 *      ↓
 * proposed_payload
 *      ↓
 * travelIntakeProposalSchema
 *      ↓
 * execute_travel_intake()
 *      ↓
 * PostgreSQL validation
 *      ↓
 * trips
 *
 *
 * No single AI output is authoritative.
 */


/* =========================================================
 * 33. NO ARBITRARY EXECUTION
 * ======================================================= */

/**
 * Never:
 *
 * choose tables from AI strings
 *
 * Never:
 *
 * choose RPC functions from AI strings
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
 * fallback unsupported input into another domain
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
 * execute_travel_intake()
 *
 *
 * All use the normal authenticated Supabase server client.
 *
 *
 * No:
 *
 * service_role
 * admin credential
 * database password
 *
 *
 * Authorization remains:
 *
 * verified authenticated session
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
 * travel
 *
 *
 * returns the existing final entity.
 *
 * It does not create another record.
 */


/* =========================================================
 * 36. CURRENT V2 EXECUTION MATRIX
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
 *
 * create_trip
 *      → trip ✅
 *
 *
 * document
 *      → dedicated private document pipeline
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
 * RLS-Protected LIFE OS Fact
 *
 *
 * Simple outside.
 * Intelligent underneath.
 * Private by default.
 */