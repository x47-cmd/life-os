import {
  assertAAL2Identity,
} from "@/lib/auth";

import {
  createClient,
} from "@/lib/supabase/server";

import type {
  AuditAction,
  AuditLog,
  AuditLogInsert,
  JsonObject,
  UUID,
} from "@/lib/types";

import {
  auditLogInsertSchema,
} from "@/lib/validation";


/* =========================================================
 * 1. AUDIT ERROR
 * ======================================================= */

export class AuditError extends Error {
  readonly databaseCode: string | null;

  constructor(
    databaseCode: string | null = null,
  ) {
    super(
      "LIFE OS audit operation failed.",
    );

    this.name = "AuditError";

    this.databaseCode =
      databaseCode;
  }
}


/* =========================================================
 * 2. AUDIT EVENT INPUT
 * ======================================================= */

export interface AuditEventInput {
  action: AuditAction;

  entity_type?: string | null;

  entity_id?: UUID | null;

  metadata?: JsonObject;
}


/* =========================================================
 * 3. INTERNAL DATABASE ERROR
 * ======================================================= */

interface DatabaseErrorLike {
  code?: string | null;
}


function throwAuditError(
  error: DatabaseErrorLike | null,
): never {
  throw new AuditError(
    error?.code ?? null,
  );
}


/* =========================================================
 * 4. RECORD AUDIT EVENT
 * ======================================================= */

/**
 * Strict audit writer.
 *
 * Security flow:
 *
 * verified user
 *      ↓
 * AAL2
 *      ↓
 * validated audit input
 *      ↓
 * authenticated Supabase client
 *      ↓
 * INSERT only
 *      ↓
 * PostgreSQL RLS
 *
 * user_id is NEVER accepted from the caller.
 */
export async function recordAuditEvent(
  input: AuditEventInput,
): Promise<AuditLog> {
  const identity =
    await assertAAL2Identity();

  const parsed =
    auditLogInsertSchema.parse({
      action:
        input.action,

      entity_type:
        input.entity_type,

      entity_id:
        input.entity_id,

      metadata:
        input.metadata,
    });

  const supabase =
    await createClient();

  const payload: AuditLogInsert = {
    action:
      parsed.action,

    entity_type:
      parsed.entity_type ?? null,

    entity_id:
      parsed.entity_id ?? null,

    metadata:
      parsed.metadata ?? {},
  };

  const {
    data,
    error,
  } = await supabase
    .from("audit_logs")
    .insert({
      user_id:
        identity.id,

      action:
        payload.action,

      entity_type:
        payload.entity_type,

      entity_id:
        payload.entity_id,

      metadata:
        payload.metadata,
    })
    .select("*")
    .single();

  if (
    error ||
    !data
  ) {
    throwAuditError(
      error,
    );
  }

  return data as AuditLog;
}


/* =========================================================
 * 5. RECORD SIMPLE AUDIT EVENT
 * ======================================================= */

/**
 * Convenience helper for events that do not require entity
 * metadata.
 */
export async function recordSimpleAuditEvent(
  action: AuditAction,
): Promise<AuditLog> {
  return recordAuditEvent({
    action,
  });
}


/* =========================================================
 * 6. RECORD ENTITY AUDIT EVENT
 * ======================================================= */

/**
 * Convenience helper for common entity actions.
 */
export async function recordEntityAuditEvent(
  action: AuditAction,
  entityType: string,
  entityId: UUID,
  metadata: JsonObject = {},
): Promise<AuditLog> {
  return recordAuditEvent({
    action,
    entity_type:
      entityType,

    entity_id:
      entityId,

    metadata,
  });
}


/* =========================================================
 * 7. SAFE NON-BLOCKING AUDIT
 * ======================================================= */

/**
 * Some informational events should not break the primary
 * user flow if audit persistence temporarily fails.
 *
 * This helper intentionally returns false instead of exposing
 * database details.
 *
 * IMPORTANT:
 *
 * Security-critical flows may choose the strict
 * recordAuditEvent() function instead.
 */
export async function tryRecordAuditEvent(
  input: AuditEventInput,
): Promise<boolean> {
  try {
    await recordAuditEvent(
      input,
    );

    return true;
  } catch {
    return false;
  }
}


/* =========================================================
 * 8. AI AUDIT HELPERS
 * ======================================================= */

export async function recordAIRecommendationAudit(
  recommendationId: UUID,
  metadata: JsonObject = {},
): Promise<AuditLog> {
  return recordEntityAuditEvent(
    "AI_RECOMMENDATION",
    "ai_recommendation",
    recommendationId,
    metadata,
  );
}


export async function recordDecisionSimulationAudit(
  metadata: JsonObject = {},
): Promise<AuditLog> {
  return recordAuditEvent({
    action:
      "AI_DECISION_SIMULATION",

    metadata,
  });
}


export async function recordOpportunitySearchAudit(
  metadata: JsonObject = {},
): Promise<AuditLog> {
  return recordAuditEvent({
    action:
      "OPPORTUNITY_SEARCH",

    metadata,
  });
}


/* =========================================================
 * 9. AUTHENTICATION AUDIT HELPERS
 * ======================================================= */

export async function recordLoginAudit():
Promise<AuditLog> {
  return recordSimpleAuditEvent(
    "AUTH_LOGIN",
  );
}


export async function recordLogoutAudit():
Promise<AuditLog> {
  return recordSimpleAuditEvent(
    "AUTH_LOGOUT",
  );
}


export async function recordMfaEnrolledAudit():
Promise<AuditLog> {
  return recordSimpleAuditEvent(
    "MFA_ENROLLED",
  );
}


export async function recordMfaVerifiedAudit():
Promise<AuditLog> {
  return recordSimpleAuditEvent(
    "MFA_VERIFIED",
  );
}


/* =========================================================
 * 10. SETTINGS AUDIT
 * ======================================================= */

export async function recordSettingChangedAudit(
  settingName: string,
): Promise<AuditLog> {
  return recordAuditEvent({
    action:
      "SETTING_CHANGED",

    metadata: {
      setting:
        settingName,
    },
  });
}


/* =========================================================
 * 11. AUDIT SECURITY BOUNDARY
 * ======================================================= */

/**
 * Audit metadata is validated recursively before insertion.
 *
 * Forbidden examples include keys such as:
 *
 * password
 * otp
 * totp
 * totp_secret
 * api_key
 * access_token
 * refresh_token
 * authorization
 * cookie
 * secret
 * service_role
 * openai_api_key
 *
 * Therefore this is rejected:
 *
 * metadata: {
 *   access_token: "..."
 * }
 *
 * Nested forbidden keys are rejected as well.
 */


/* =========================================================
 * 12. APPEND-ONLY RULE
 * ======================================================= */

/**
 * This module intentionally exposes:
 *
 * INSERT ✅
 *
 * It intentionally does NOT expose:
 *
 * UPDATE ❌
 * DELETE ❌
 *
 * The PostgreSQL privilege layer and RLS migration reinforce
 * this design independently.
 */


/* =========================================================
 * 13. USER OWNERSHIP RULE
 * ======================================================= */

/**
 * The caller cannot provide user_id.
 *
 * It is always derived from:
 *
 * Supabase verified authentication
 *      ↓
 * AAL2
 *      ↓
 * identity.id
 *
 * PostgreSQL RLS then verifies ownership again.
 */


/* =========================================================
 * 14. AUDIT DATA MINIMIZATION
 * ======================================================= */

/**
 * Audit logs should answer:
 *
 * What happened?
 * What entity was involved?
 * When did it happen?
 *
 * They should NOT become a second copy of LIFE OS data.
 *
 * Good:
 *
 * {
 *   source: "assistant"
 * }
 *
 * Avoid:
 *
 * {
 *   full_salary_data: ...,
 *   full_portfolio: ...,
 *   full_personal_memory: ...
 * }
 *
 * Store the minimum metadata required to understand the event.
 */


/* =========================================================
 * 15. FINAL AUDIT RULE
 * ======================================================= */

/**
 * LIFE OS Audit Boundary
 *
 * Important action
 *      ↓
 * Minimal safe metadata
 *      ↓
 * Zod validation
 *      ↓
 * Secret-key rejection
 *      ↓
 * AAL2 verified identity
 *      ↓
 * INSERT
 *      ↓
 * PostgreSQL RLS
 *      ↓
 * Append-oriented audit history
 *
 *
 * Never:
 *
 * - accept user_id from request data
 * - log passwords
 * - log OTP/TOTP values
 * - log authentication tokens
 * - log cookies
 * - log API keys
 * - log service-role credentials
 * - expose raw database errors
 * - provide audit update/delete helpers
 */