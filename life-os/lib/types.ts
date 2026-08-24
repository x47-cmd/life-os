/* =========================================================
 * TRAVEL PROPOSAL ACTIVATION RULE
 * ======================================================= */

/**
 * DO NOT add TravelIntakeProposal to StructuredIntakeProposal
 * until the active runtime validation + Universal Add review
 * UI support create_trip.
 *
 *
 * This protects against:
 *
 * TypeScript accepting travel
 *
 * while:
 *
 * UI cannot display its exact values.
 *
 *
 * User review must exist before execution authority exists.
 */


/* =========================================================
 * 4F. STRUCTURED PROPOSAL UNION
 * ======================================================= */

export type StructuredIntakeProposal =
  | FinanceIntakeProposal
  | PlanIntakeProposal
  | GrowthIntakeProposal;


export type StructuredIntakeProposalAction =
  | FinanceProposalAction
  | PlanProposalAction
  | GrowthProposalAction;


/* =========================================================
 * 4G. STRUCTURED PROPOSAL SAFETY MODEL
 * ======================================================= */

/**
 * Structured proposals describe an exact proposed domain
 * operation.
 *
 * They are still untrusted until:
 *
 * schema validation
 *      ↓
 * user review
 *      ↓
 * explicit approval
 *      ↓
 * deterministic executor
 */