import {
  assertAAL2Identity,
} from "@/lib/auth";

import {
  createClient,
  type ServerSupabaseClient,
} from "@/lib/supabase/server";

import type {
  IntakeItem,
  IntakeItemInsert,
  IntakeStatus,
  IntakeTargetEntityType,
  UUID,
} from "@/lib/types";

import {
  intakeItemInsertSchema,
  intakeItemUpdateSchema,
  intakeTargetEntityTypeSchema,
  uuidSchema,
} from "@/lib/validation";


/* =========================================================
 * LIFE OS V2
 * UNIVERSAL INTAKE DATA LAYER
 *
 * Responsibilities:
 *
 * - Create intake proposal
 * - Read owned intake
 * - List recent intake
 * - Approve proposal
 * - Cancel proposal
 * - Mark execution applied
 * - Mark execution failed
 *
 * This module does NOT:
 *
 * - call OpenAI
 * - parse PDFs
 * - create financial records
 * - create goals
 * - create trips
 *
 * Domain execution will be handled separately.
 * ======================================================= */


/* =========================================================
 * 1. DATA ACCESS ERROR
 * ======================================================= */

export class IntakeDataError extends Error {
  readonly operation:
    string;

  readonly databaseCode:
    string | null;


  constructor(
    operation:
      string,

    databaseCode:
      string | null =
      null,
  ) {
    super(
      `LIFE OS intake operation failed: ${operation}.`,
    );


    this.name =
      "IntakeDataError";


    this.operation =
      operation;


    this.databaseCode =
      databaseCode;
  }
}


/* =========================================================
 * 2. DATA CONTEXT
 * ======================================================= */

interface IntakeDataContext {
  supabase:
    ServerSupabaseClient;

  userId:
    UUID;
}


async function getIntakeDataContext():
Promise<IntakeDataContext> {
  /*
   * Identity always comes from the verified server session.
   *
   * Browser input never chooses user_id.
   */
  const identity =
    await assertAAL2Identity();


  const supabase =
    await createClient();


  return {
    supabase,

    userId:
      identity.id,
  };
}


/* =========================================================
 * 3. DATABASE ERROR HANDLING
 * ======================================================= */

interface DatabaseErrorLike {
  code?:
    string |
    null;
}


function throwIntakeDataError(
  operation:
    string,

  error:
    DatabaseErrorLike |
    null,
): never {
  throw new IntakeDataError(
    operation,

    error?.code ??
      null,
  );
}


/* =========================================================
 * 4. ROW CASTING
 * ======================================================= */

/**
 * Generated Supabase database types are not currently
 * committed in LIFE OS.
 *
 * All untyped PostgREST values remain isolated at this
 * boundary.
 */
function asIntakeRow(
  value:
    unknown,
): IntakeItem {
  return value as IntakeItem;
}


function asIntakeRows(
  value:
    unknown,
): IntakeItem[] {
  if (
    !Array.isArray(
      value,
    )
  ) {
    return [];
  }


  return value as IntakeItem[];
}


/* =========================================================
 * 5. ID VALIDATION
 * ======================================================= */

function validateId(
  id:
    UUID,
): UUID {
  return uuidSchema.parse(
    id,
  );
}


/* =========================================================
 * 6. OWNED FETCH
 * ======================================================= */

async function fetchOwnedIntakeById(
  supabase:
    ServerSupabaseClient,

  userId:
    UUID,

  id:
    UUID,
): Promise<IntakeItem | null> {
  const safeId =
    validateId(
      id,
    );


  const {
    data,
    error,
  } =
    await supabase
      .from(
        "intake_items",
      )
      .select(
        "*",
      )
      .eq(
        "id",
        safeId,
      )
      .eq(
        "user_id",
        userId,
      )
      .maybeSingle();


  if (
    error
  ) {
    throwIntakeDataError(
      "fetch_intake_item",
      error,
    );
  }


  return data
    ? asIntakeRow(
        data,
      )
    : null;
}


/* =========================================================
 * 7. REQUIRE OWNED INTAKE
 * ======================================================= */

async function requireOwnedIntakeById(
  supabase:
    ServerSupabaseClient,

  userId:
    UUID,

  id:
    UUID,
): Promise<IntakeItem> {
  const item =
    await fetchOwnedIntakeById(
      supabase,
      userId,
      id,
    );


  if (
    !item
  ) {
    throw new IntakeDataError(
      "intake_item_not_found",
    );
  }


  return item;
}


/* =========================================================
 * 8. CREATE PROPOSAL
 * ======================================================= */

/**
 * Creates a durable proposal only.
 *
 * It does NOT create the final LIFE OS domain record.
 */
export async function createIntakeItem(
  input:
    IntakeItemInsert,
): Promise<IntakeItem> {
  const parsed =
    intakeItemInsertSchema.parse({
      ...input,

      /*
       * New intake always starts in previewed state.
       *
       * Client/model input cannot skip approval.
       */
      status:
        "previewed",

      approved_at:
        null,

      applied_at:
        null,

      target_entity_type:
        null,

      target_entity_id:
        null,

      error_code:
        null,
    });


  const {
    supabase,
    userId,
  } =
    await getIntakeDataContext();


  const {
    data,
    error,
  } =
    await supabase
      .from(
        "intake_items",
      )
      .insert({
        ...parsed,

        user_id:
          userId,
      })
      .select(
        "*",
      )
      .single();


  if (
    error ||
    !data
  ) {
    throwIntakeDataError(
      "create_intake_item",
      error,
    );
  }


  return asIntakeRow(
    data,
  );
}


/* =========================================================
 * 9. GET ONE
 * ======================================================= */

export async function getIntakeItem(
  id:
    UUID,
): Promise<IntakeItem | null> {
  const {
    supabase,
    userId,
  } =
    await getIntakeDataContext();


  return fetchOwnedIntakeById(
    supabase,
    userId,
    id,
  );
}


/* =========================================================
 * 10. LIST RECENT
 * ======================================================= */

export async function listRecentIntakeItems(
  limit:
    number =
    20,
): Promise<IntakeItem[]> {
  const safeLimit =
    Math.min(
      Math.max(
        Math.trunc(
          limit,
        ),
        1,
      ),
      100,
    );


  const {
    supabase,
    userId,
  } =
    await getIntakeDataContext();


  const {
    data,
    error,
  } =
    await supabase
      .from(
        "intake_items",
      )
      .select(
        "*",
      )
      .eq(
        "user_id",
        userId,
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        },
      )
      .limit(
        safeLimit,
      );


  if (
    error
  ) {
    throwIntakeDataError(
      "list_recent_intake_items",
      error,
    );
  }


  return asIntakeRows(
    data,
  );
}


/* =========================================================
 * 11. LIST BY STATUS
 * ======================================================= */

export async function listIntakeItemsByStatus(
  status:
    IntakeStatus,

  limit:
    number =
    50,
): Promise<IntakeItem[]> {
  const allowedStatuses:
    readonly IntakeStatus[] = [
      "previewed",
      "approved",
      "applied",
      "failed",
      "cancelled",
    ];


  if (
    !allowedStatuses.includes(
      status,
    )
  ) {
    throw new IntakeDataError(
      "invalid_intake_status",
    );
  }


  const safeLimit =
    Math.min(
      Math.max(
        Math.trunc(
          limit,
        ),
        1,
      ),
      100,
    );


  const {
    supabase,
    userId,
  } =
    await getIntakeDataContext();


  const {
    data,
    error,
  } =
    await supabase
      .from(
        "intake_items",
      )
      .select(
        "*",
      )
      .eq(
        "user_id",
        userId,
      )
      .eq(
        "status",
        status,
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        },
      )
      .limit(
        safeLimit,
      );


  if (
    error
  ) {
    throwIntakeDataError(
      "list_intake_items_by_status",
      error,
    );
  }


  return asIntakeRows(
    data,
  );
}


/* =========================================================
 * 12. APPROVE
 * ======================================================= */

/**
 * Explicit user approval boundary.
 *
 * Allowed:
 *
 * previewed → approved
 *
 * Not allowed:
 *
 * applied → approved
 * failed → approved
 * cancelled → approved
 */
export async function approveIntakeItem(
  id:
    UUID,
): Promise<IntakeItem> {
  const safeId =
    validateId(
      id,
    );


  const {
    supabase,
    userId,
  } =
    await getIntakeDataContext();


  const existing =
    await requireOwnedIntakeById(
      supabase,
      userId,
      safeId,
    );


  if (
    existing.status !==
    "previewed"
  ) {
    throw new IntakeDataError(
      "intake_not_previewed",
    );
  }


  const approvedAt =
    new Date()
      .toISOString();


  const parsed =
    intakeItemUpdateSchema.parse({
      status:
        "approved",

      approved_at:
        approvedAt,

      applied_at:
        null,

      error_code:
        null,
    });


  const {
    data,
    error,
  } =
    await supabase
      .from(
        "intake_items",
      )
      .update(
        parsed,
      )
      .eq(
        "id",
        safeId,
      )
      .eq(
        "user_id",
        userId,
      )

      /*
       * Atomic state guard.
       *
       * Prevents stale/double approval from changing an item
       * whose lifecycle changed between read and update.
       */
      .eq(
        "status",
        "previewed",
      )
      .select(
        "*",
      )
      .maybeSingle();


  if (
    error
  ) {
    throwIntakeDataError(
      "approve_intake_item",
      error,
    );
  }


  if (
    !data
  ) {
    throw new IntakeDataError(
      "intake_approval_conflict",
    );
  }


  return asIntakeRow(
    data,
  );
}


/* =========================================================
 * 13. CANCEL
 * ======================================================= */

/**
 * User can cancel:
 *
 * previewed
 * approved
 *
 * Once applied, the domain entity already exists and must be
 * handled through its own domain workflow.
 */
export async function cancelIntakeItem(
  id:
    UUID,
): Promise<IntakeItem> {
  const safeId =
    validateId(
      id,
    );


  const {
    supabase,
    userId,
  } =
    await getIntakeDataContext();


  const existing =
    await requireOwnedIntakeById(
      supabase,
      userId,
      safeId,
    );


  if (
    existing.status !==
      "previewed" &&
    existing.status !==
      "approved"
  ) {
    throw new IntakeDataError(
      "intake_cannot_be_cancelled",
    );
  }


  const {
    data,
    error,
  } =
    await supabase
      .from(
        "intake_items",
      )
      .update({
        status:
          "cancelled",

        error_code:
          null,
      })
      .eq(
        "id",
        safeId,
      )
      .eq(
        "user_id",
        userId,
      )
      .in(
        "status",
        [
          "previewed",
          "approved",
        ],
      )
      .select(
        "*",
      )
      .maybeSingle();


  if (
    error
  ) {
    throwIntakeDataError(
      "cancel_intake_item",
      error,
    );
  }


  if (
    !data
  ) {
    throw new IntakeDataError(
      "intake_cancel_conflict",
    );
  }


  return asIntakeRow(
    data,
  );
}


/* =========================================================
 * 14. MARK APPLIED
 * ======================================================= */

/**
 * Called only AFTER a dedicated domain executor successfully
 * creates/updates the final LIFE OS record.
 *
 * Allowed:
 *
 * approved → applied
 */
export async function markIntakeItemApplied(
  id:
    UUID,

  targetEntityType:
    IntakeTargetEntityType,

  targetEntityId:
    UUID,
): Promise<IntakeItem> {
  const safeId =
    validateId(
      id,
    );


  const safeTargetId =
    validateId(
      targetEntityId,
    );


  const safeTargetType =
    intakeTargetEntityTypeSchema.parse(
      targetEntityType,
    );


  const {
    supabase,
    userId,
  } =
    await getIntakeDataContext();


  const existing =
    await requireOwnedIntakeById(
      supabase,
      userId,
      safeId,
    );


  if (
    existing.status !==
    "approved"
  ) {
    throw new IntakeDataError(
      "intake_not_approved",
    );
  }


  if (
    !existing.approved_at
  ) {
    throw new IntakeDataError(
      "intake_missing_approval_time",
    );
  }


  const appliedAt =
    new Date()
      .toISOString();


  const parsed =
    intakeItemUpdateSchema.parse({
      status:
        "applied",

      approved_at:
        existing.approved_at,

      applied_at:
        appliedAt,

      target_entity_type:
        safeTargetType,

      target_entity_id:
        safeTargetId,

      error_code:
        null,
    });


  const {
    data,
    error,
  } =
    await supabase
      .from(
        "intake_items",
      )
      .update(
        parsed,
      )
      .eq(
        "id",
        safeId,
      )
      .eq(
        "user_id",
        userId,
      )
      .eq(
        "status",
        "approved",
      )
      .select(
        "*",
      )
      .maybeSingle();


  if (
    error
  ) {
    throwIntakeDataError(
      "mark_intake_item_applied",
      error,
    );
  }


  if (
    !data
  ) {
    throw new IntakeDataError(
      "intake_apply_conflict",
    );
  }


  return asIntakeRow(
    data,
  );
}


/* =========================================================
 * 15. MARK FAILED
 * ======================================================= */

/**
 * Called when domain execution was attempted after approval
 * but could not complete.
 *
 * Error code must be safe and non-sensitive.
 *
 * Never store:
 *
 * - stack traces
 * - provider responses
 * - SQL
 * - secrets
 * - API keys
 */
export async function markIntakeItemFailed(
  id:
    UUID,

  errorCode:
    string,
): Promise<IntakeItem> {
  const safeId =
    validateId(
      id,
    );


  const normalizedErrorCode =
    errorCode
      .trim()
      .toUpperCase();


  if (
    !/^[A-Z0-9_]{1,100}$/.test(
      normalizedErrorCode,
    )
  ) {
    throw new IntakeDataError(
      "invalid_intake_error_code",
    );
  }


  const {
    supabase,
    userId,
  } =
    await getIntakeDataContext();


  const existing =
    await requireOwnedIntakeById(
      supabase,
      userId,
      safeId,
    );


  if (
    existing.status !==
    "approved"
  ) {
    throw new IntakeDataError(
      "intake_not_approved",
    );
  }


  if (
    !existing.approved_at
  ) {
    throw new IntakeDataError(
      "intake_missing_approval_time",
    );
  }


  const parsed =
    intakeItemUpdateSchema.parse({
      status:
        "failed",

      approved_at:
        existing.approved_at,

      applied_at:
        null,

      target_entity_type:
        null,

      target_entity_id:
        null,

      error_code:
        normalizedErrorCode,
    });


  const {
    data,
    error,
  } =
    await supabase
      .from(
        "intake_items",
      )
      .update(
        parsed,
      )
      .eq(
        "id",
        safeId,
      )
      .eq(
        "user_id",
        userId,
      )
      .eq(
        "status",
        "approved",
      )
      .select(
        "*",
      )
      .maybeSingle();


  if (
    error
  ) {
    throwIntakeDataError(
      "mark_intake_item_failed",
      error,
    );
  }


  if (
    !data
  ) {
    throw new IntakeDataError(
      "intake_failure_conflict",
    );
  }


  return asIntakeRow(
    data,
  );
}


/* =========================================================
 * 16. RETRY FAILED PROPOSAL
 * ======================================================= */

/**
 * A failed execution is not silently retried.
 *
 * It must first return to an explicitly approved state.
 *
 * This function is intended for a future user-visible retry
 * action.
 */
export async function reapproveFailedIntakeItem(
  id:
    UUID,
): Promise<IntakeItem> {
  const safeId =
    validateId(
      id,
    );


  const {
    supabase,
    userId,
  } =
    await getIntakeDataContext();


  const existing =
    await requireOwnedIntakeById(
      supabase,
      userId,
      safeId,
    );


  if (
    existing.status !==
    "failed"
  ) {
    throw new IntakeDataError(
      "intake_not_failed",
    );
  }


  const approvedAt =
    new Date()
      .toISOString();


  const parsed =
    intakeItemUpdateSchema.parse({
      status:
        "approved",

      approved_at:
        approvedAt,

      applied_at:
        null,

      target_entity_type:
        null,

      target_entity_id:
        null,

      error_code:
        null,
    });


  const {
    data,
    error,
  } =
    await supabase
      .from(
        "intake_items",
      )
      .update(
        parsed,
      )
      .eq(
        "id",
        safeId,
      )
      .eq(
        "user_id",
        userId,
      )
      .eq(
        "status",
        "failed",
      )
      .select(
        "*",
      )
      .maybeSingle();


  if (
    error
  ) {
    throwIntakeDataError(
      "reapprove_failed_intake_item",
      error,
    );
  }


  if (
    !data
  ) {
    throw new IntakeDataError(
      "intake_reapproval_conflict",
    );
  }


  return asIntakeRow(
    data,
  );
}


/* =========================================================
 * 17. INTERNAL STATUS HELPER
 * ======================================================= */

export function isIntakeTerminal(
  status:
    IntakeStatus,
): boolean {
  return (
    status ===
      "applied" ||
    status ===
      "cancelled"
  );
}


/* =========================================================
 * 18. LIFECYCLE
 * ======================================================= */

/**
 * Normal:
 *
 * previewed
 *      ↓
 * approved
 *      ↓
 * applied
 *
 *
 * User cancels:
 *
 * previewed
 *      ↓
 * cancelled
 *
 *
 * or:
 *
 * approved
 *      ↓
 * cancelled
 *
 *
 * Execution failure:
 *
 * approved
 *      ↓
 * failed
 *      ↓
 * approved
 *      ↓
 * applied
 */


/* =========================================================
 * 19. AUTHORIZATION RULE
 * ======================================================= */

/**
 * Every query uses BOTH:
 *
 * authenticated identity
 *
 * and:
 *
 * user_id filter
 *
 *
 * PostgreSQL RLS then enforces ownership again.
 *
 * This provides:
 *
 * application authorization
 * +
 * database authorization
 */


/* =========================================================
 * 20. AI SAFETY RULE
 * ======================================================= */

/**
 * AI cannot directly call:
 *
 * markIntakeItemApplied()
 *
 * unless a dedicated server-side executor has already:
 *
 * 1. verified the authenticated user
 * 2. verified status = approved
 * 3. validated the proposed payload
 * 4. executed the correct domain operation
 * 5. received the resulting entity id
 */


/* =========================================================
 * 21. FILE RULE
 * ======================================================= */

/**
 * intake_items stores:
 *
 * file name
 * MIME type
 * file size
 *
 *
 * It does NOT store:
 *
 * PDF bytes
 *
 *
 * Permanent document files will later use:
 *
 * private Supabase Storage.
 */


/* =========================================================
 * 22. DELETE RULE
 * ======================================================= */

/**
 * Universal Intake intentionally has no delete function.
 *
 * User cancellation uses:
 *
 * status = cancelled
 *
 *
 * This keeps lifecycle history available for:
 *
 * audit
 * debugging
 * safety
 */


/* =========================================================
 * 23. FINAL V2 RULE
 * ======================================================= */

/**
 * Proposal creation ≠ domain execution.
 *
 * Approval ≠ execution.
 *
 * Applied = a separate validated domain write succeeded.
 *
 *
 * AI Suggests
 *      ↓
 * User Reviews
 *      ↓
 * User Approves
 *      ↓
 * System Executes
 */