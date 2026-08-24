import {
  describe,
  expect,
  it,
} from "vitest";

import {
  careerIntakeProposalSchema,
  financeBudgetItemProposalSchema,
  financeIncomeSourceProposalSchema,
  getStructuredProposalTarget,
  goalIntakeProposalSchema,
  intakePreviewSchema,
  learningIntakeProposalSchema,
  projectIntakeProposalSchema,
  strictIntakePreviewSchema,
  structuredIntakeProposalSchema,
  validateStructuredProposalForIntakeKind,
} from "@/lib/validation";


/* =========================================================
 * LIFE OS V2
 * STRUCTURED INTAKE TESTS
 *
 * Purpose:
 *
 * Verify the safety boundary between:
 *
 * AI proposal
 *      ↓
 * validation
 *      ↓
 * user review
 *      ↓
 * confirmation
 *      ↓
 * deterministic execution
 *
 *
 * IMPORTANT:
 *
 * - Synthetic data only.
 * - No Supabase writes.
 * - No OpenAI calls.
 * - No real personal data.
 * ======================================================= */


/* =========================================================
 * 1. SYNTHETIC PROPOSALS
 * ======================================================= */

const VALID_INCOME_PROPOSAL = {
  version:
    1,

  kind:
    "finance",

  action:
    "create_income_source",

  data: {
    name:
      "Synthetic Salary",

    amount:
      12_000,

    currency:
      "AED",

    frequency:
      "monthly",

    next_expected_date:
      null,

    notes:
      null,
  },
} as const;


const VALID_BUDGET_PROPOSAL = {
  version:
    1,

  kind:
    "finance",

  action:
    "create_budget_item",

  data: {
    name:
      "Synthetic Investment Allocation",

    category:
      "investments",

    item_type:
      "investment",

    amount:
      2_000,

    currency:
      "AED",

    frequency:
      "monthly",

    due_day:
      null,

    notes:
      null,
  },
} as const;


const VALID_GOAL_PROPOSAL = {
  version:
    1,

  kind:
    "plan",

  action:
    "create_goal",

  data: {
    title:
      "Synthetic Goal",

    category:
      "finance",

    description:
      null,

    target_value:
      100_000,

    current_value:
      0,

    unit:
      "AED",

    progress_percent:
      0,

    target_date:
      "2027-12-31",

    priority:
      "medium",

    status:
      "planned",

    next_action:
      null,

    sort_order:
      0,
  },
} as const;


const VALID_PROJECT_PROPOSAL = {
  version:
    1,

  kind:
    "plan",

  action:
    "create_project",

  data: {
    goal_id:
      null,

    title:
      "Synthetic Project",

    description:
      null,

    category:
      "business",

    status:
      "planned",

    progress_percent:
      0,

    priority:
      "medium",

    start_date:
      "2027-01-01",

    target_date:
      "2027-06-01",

    next_action:
      null,
  },
} as const;


const VALID_LEARNING_PROPOSAL = {
  version:
    1,

  kind:
    "growth",

  action:
    "create_learning_item",

  data: {
    goal_id:
      null,

    title:
      "Synthetic AI Course",

    provider:
      "Synthetic Academy",

    item_type:
      "course",

    status:
      "planned",

    priority:
      "medium",

    progress_percent:
      0,

    start_date:
      "2027-01-01",

    target_date:
      "2027-03-01",

    completed_date:
      null,

    url:
      null,

    cost:
      500,

    currency:
      "AED",

    notes:
      null,
  },
} as const;


const VALID_CAREER_PROPOSAL = {
  version:
    1,

  kind:
    "growth",

  action:
    "create_career_item",

  data: {
    goal_id:
      null,

    item_type:
      "skill",

    title:
      "Synthetic Skill",

    description:
      null,

    status:
      "planned",

    priority:
      "medium",

    rating:
      null,

    event_date:
      null,

    target_date:
      "2027-12-31",

    evidence_url:
      null,

    notes:
      null,
  },
} as const;


/* =========================================================
 * 2. FINANCE — INCOME
 * ======================================================= */

describe(
  "V2 structured finance income proposal",
  () => {
    it(
      "accepts an exact valid income proposal",
      () => {
        const result =
          financeIncomeSourceProposalSchema.safeParse(
            VALID_INCOME_PROPOSAL,
          );


        expect(
          result.success,
        ).toBe(
          true,
        );
      },
    );


    it(
      "rejects a zero income amount",
      () => {
        const result =
          financeIncomeSourceProposalSchema.safeParse({
            ...VALID_INCOME_PROPOSAL,

            data: {
              ...VALID_INCOME_PROPOSAL.data,

              amount:
                0,
            },
          });


        expect(
          result.success,
        ).toBe(
          false,
        );
      },
    );


    it(
      "rejects a negative income amount",
      () => {
        const result =
          financeIncomeSourceProposalSchema.safeParse({
            ...VALID_INCOME_PROPOSAL,

            data: {
              ...VALID_INCOME_PROPOSAL.data,

              amount:
                -1,
            },
          });


        expect(
          result.success,
        ).toBe(
          false,
        );
      },
    );


    it(
      "rejects malformed lowercase currency",
      () => {
        const result =
          financeIncomeSourceProposalSchema.safeParse({
            ...VALID_INCOME_PROPOSAL,

            data: {
              ...VALID_INCOME_PROPOSAL.data,

              currency:
                "aed",
            },
          });


        expect(
          result.success,
        ).toBe(
          false,
        );
      },
    );


    it(
      "rejects browser-supplied user ownership",
      () => {
        const result =
          financeIncomeSourceProposalSchema.safeParse({
            ...VALID_INCOME_PROPOSAL,

            user_id:
              "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          });


        expect(
          result.success,
        ).toBe(
          false,
        );
      },
    );
  },
);


/* =========================================================
 * 3. FINANCE — BUDGET ITEM
 * ======================================================= */

describe(
  "V2 structured finance budget proposal",
  () => {
    it(
      "accepts an exact valid budget proposal",
      () => {
        const result =
          financeBudgetItemProposalSchema.safeParse(
            VALID_BUDGET_PROPOSAL,
          );


        expect(
          result.success,
        ).toBe(
          true,
        );
      },
    );


    it(
      "rejects unsupported budget categories",
      () => {
        const result =
          financeBudgetItemProposalSchema.safeParse({
            ...VALID_BUDGET_PROPOSAL,

            data: {
              ...VALID_BUDGET_PROPOSAL.data,

              category:
                "made_up_category",
            },
          });


        expect(
          result.success,
        ).toBe(
          false,
        );
      },
    );


    it(
      "rejects an invalid due day",
      () => {
        const result =
          financeBudgetItemProposalSchema.safeParse({
            ...VALID_BUDGET_PROPOSAL,

            data: {
              ...VALID_BUDGET_PROPOSAL.data,

              due_day:
                32,
            },
          });


        expect(
          result.success,
        ).toBe(
          false,
        );
      },
    );


    it(
      "rejects arbitrary hidden fields",
      () => {
        const result =
          financeBudgetItemProposalSchema.safeParse({
            ...VALID_BUDGET_PROPOSAL,

            data: {
              ...VALID_BUDGET_PROPOSAL.data,

              execute_immediately:
                true,
            },
          });


        expect(
          result.success,
        ).toBe(
          false,
        );
      },
    );
  },
);


/* =========================================================
 * 4. PLAN — GOAL
 * ======================================================= */

describe(
  "V2 structured goal proposal",
  () => {
    it(
      "accepts a valid goal proposal",
      () => {
        const result =
          goalIntakeProposalSchema.safeParse(
            VALID_GOAL_PROPOSAL,
          );


        expect(
          result.success,
        ).toBe(
          true,
        );
      },
    );


    it(
      "rejects progress above 100 percent",
      () => {
        const result =
          goalIntakeProposalSchema.safeParse({
            ...VALID_GOAL_PROPOSAL,

            data: {
              ...VALID_GOAL_PROPOSAL.data,

              progress_percent:
                101,
            },
          });


        expect(
          result.success,
        ).toBe(
          false,
        );
      },
    );


    it(
      "rejects an unsupported goal status",
      () => {
        const result =
          goalIntakeProposalSchema.safeParse({
            ...VALID_GOAL_PROPOSAL,

            data: {
              ...VALID_GOAL_PROPOSAL.data,

              status:
                "secret_status",
            },
          });


        expect(
          result.success,
        ).toBe(
          false,
        );
      },
    );
  },
);


/* =========================================================
 * 5. PLAN — PROJECT
 * ======================================================= */

describe(
  "V2 structured project proposal",
  () => {
    it(
      "accepts a valid project proposal",
      () => {
        const result =
          projectIntakeProposalSchema.safeParse(
            VALID_PROJECT_PROPOSAL,
          );


        expect(
          result.success,
        ).toBe(
          true,
        );
      },
    );


    it(
      "rejects a project target date before its start date",
      () => {
        const result =
          projectIntakeProposalSchema.safeParse({
            ...VALID_PROJECT_PROPOSAL,

            data: {
              ...VALID_PROJECT_PROPOSAL.data,

              start_date:
                "2027-06-01",

              target_date:
                "2027-01-01",
            },
          });


        expect(
          result.success,
        ).toBe(
          false,
        );
      },
    );


    it(
      "rejects an invented non-UUID goal relationship",
      () => {
        const result =
          projectIntakeProposalSchema.safeParse({
            ...VALID_PROJECT_PROPOSAL,

            data: {
              ...VALID_PROJECT_PROPOSAL.data,

              goal_id:
                "some-goal",
            },
          });


        expect(
          result.success,
        ).toBe(
          false,
        );
      },
    );
  },
);


/* =========================================================
 * 6. GROWTH — LEARNING
 * ======================================================= */

describe(
  "V2 structured learning proposal",
  () => {
    it(
      "accepts a valid learning proposal",
      () => {
        const result =
          learningIntakeProposalSchema.safeParse(
            VALID_LEARNING_PROPOSAL,
          );


        expect(
          result.success,
        ).toBe(
          true,
        );
      },
    );


    it(
      "rejects completion before the start date",
      () => {
        const result =
          learningIntakeProposalSchema.safeParse({
            ...VALID_LEARNING_PROPOSAL,

            data: {
              ...VALID_LEARNING_PROPOSAL.data,

              start_date:
                "2027-02-01",

              completed_date:
                "2027-01-01",
            },
          });


        expect(
          result.success,
        ).toBe(
          false,
        );
      },
    );


    it(
      "rejects unsafe non-http URLs",
      () => {
        const result =
          learningIntakeProposalSchema.safeParse({
            ...VALID_LEARNING_PROPOSAL,

            data: {
              ...VALID_LEARNING_PROPOSAL.data,

              url:
                "javascript:alert(1)",
            },
          });


        expect(
          result.success,
        ).toBe(
          false,
        );
      },
    );
  },
);


/* =========================================================
 * 7. GROWTH — CAREER
 * ======================================================= */

describe(
  "V2 structured career proposal",
  () => {
    it(
      "accepts a valid career proposal",
      () => {
        const result =
          careerIntakeProposalSchema.safeParse(
            VALID_CAREER_PROPOSAL,
          );


        expect(
          result.success,
        ).toBe(
          true,
        );
      },
    );


    it(
      "rejects target date before event date",
      () => {
        const result =
          careerIntakeProposalSchema.safeParse({
            ...VALID_CAREER_PROPOSAL,

            data: {
              ...VALID_CAREER_PROPOSAL.data,

              event_date:
                "2027-08-01",

              target_date:
                "2027-07-01",
            },
          });


        expect(
          result.success,
        ).toBe(
          false,
        );
      },
    );


    it(
      "rejects unsupported career item types",
      () => {
        const result =
          careerIntakeProposalSchema.safeParse({
            ...VALID_CAREER_PROPOSAL,

            data: {
              ...VALID_CAREER_PROPOSAL.data,

              item_type:
                "admin_override",
            },
          });


        expect(
          result.success,
        ).toBe(
          false,
        );
      },
    );
  },
);


/* =========================================================
 * 8. MASTER STRUCTURED PROPOSAL
 * ======================================================= */

describe(
  "V2 structured proposal master schema",
  () => {
    it(
      "accepts all currently supported exact proposal actions",
      () => {
        const proposals =
          [
            VALID_INCOME_PROPOSAL,
            VALID_BUDGET_PROPOSAL,
            VALID_GOAL_PROPOSAL,
            VALID_PROJECT_PROPOSAL,
            VALID_LEARNING_PROPOSAL,
            VALID_CAREER_PROPOSAL,
          ];


        for (
          const proposal of proposals
        ) {
          expect(
            structuredIntakeProposalSchema.safeParse(
              proposal,
            ).success,
          ).toBe(
            true,
          );
        }
      },
    );


    it(
      "rejects arbitrary execution actions",
      () => {
        const result =
          structuredIntakeProposalSchema.safeParse({
            version:
              1,

            kind:
              "finance",

            action:
              "execute_sql",

            data: {},
          });


        expect(
          result.success,
        ).toBe(
          false,
        );
      },
    );


    it(
      "rejects arbitrary table-write actions",
      () => {
        const result =
          structuredIntakeProposalSchema.safeParse({
            version:
              1,

            kind:
              "finance",

            action:
              "insert_into_any_table",

            data: {
              table:
                "profiles",
            },
          });


        expect(
          result.success,
        ).toBe(
          false,
        );
      },
    );


    it(
      "rejects unsupported proposal versions",
      () => {
        const result =
          structuredIntakeProposalSchema.safeParse({
            ...VALID_INCOME_PROPOSAL,

            version:
              2,
          });


        expect(
          result.success,
        ).toBe(
          false,
        );
      },
    );
  },
);


/* =========================================================
 * 9. STRICT PREVIEW — FINANCE
 * ======================================================= */

describe(
  "V2 strict finance preview",
  () => {
    it(
      "accepts finance only when the exact finance proposal is present",
      () => {
        const result =
          strictIntakePreviewSchema.safeParse({
            kind:
              "finance",

            label:
              "تحديث مالي",

            title:
              "راتب تجريبي",

            summary:
              "تم فهم المدخل كمصدر دخل شهري.",

            confidence:
              0.99,

            next_action:
              "اعتماد مصدر الدخل بالقيم المعروضة.",

            proposal:
              VALID_INCOME_PROPOSAL,

            requires_confirmation:
              true,
          });


        expect(
          result.success,
        ).toBe(
          true,
        );
      },
    );


    it(
      "rejects finance when proposal is null",
      () => {
        const result =
          strictIntakePreviewSchema.safeParse({
            kind:
              "finance",

            label:
              "تحديث مالي",

            title:
              "راتب تجريبي",

            summary:
              "تم فهم المدخل كتحديث مالي.",

            confidence:
              0.99,

            next_action:
              "اعتماد القيم.",

            proposal:
              null,

            requires_confirmation:
              true,
          });


        expect(
          result.success,
        ).toBe(
          false,
        );
      },
    );


    it(
      "rejects finance carrying a plan proposal",
      () => {
        const result =
          strictIntakePreviewSchema.safeParse({
            kind:
              "finance",

            label:
              "تحديث مالي",

            title:
              "بيانات غير متطابقة",

            summary:
              "اختبار عدم تطابق النوع.",

            confidence:
              0.5,

            next_action:
              "لا شيء.",

            proposal:
              VALID_GOAL_PROPOSAL,

            requires_confirmation:
              true,
          });


        expect(
          result.success,
        ).toBe(
          false,
        );
      },
    );
  },
);


/* =========================================================
 * 10. STRICT PREVIEW — PLAN
 * ======================================================= */

describe(
  "V2 strict plan preview",
  () => {
    it(
      "accepts an exact project proposal",
      () => {
        const result =
          strictIntakePreviewSchema.safeParse({
            kind:
              "plan",

            label:
              "خطة أو مشروع",

            title:
              "مشروع تجريبي",

            summary:
              "تم فهم المدخل كمشروع.",

            confidence:
              0.95,

            next_action:
              "اعتماد المشروع بالقيم المعروضة.",

            proposal:
              VALID_PROJECT_PROPOSAL,

            requires_confirmation:
              true,
          });


        expect(
          result.success,
        ).toBe(
          true,
        );
      },
    );


    it(
      "rejects plan carrying a growth proposal",
      () => {
        const result =
          strictIntakePreviewSchema.safeParse({
            kind:
              "plan",

            label:
              "خطة أو مشروع",

            title:
              "بيانات غير متطابقة",

            summary:
              "اختبار عدم تطابق النوع.",

            confidence:
              0.5,

            next_action:
              "لا شيء.",

            proposal:
              VALID_LEARNING_PROPOSAL,

            requires_confirmation:
              true,
          });


        expect(
          result.success,
        ).toBe(
          false,
        );
      },
    );
  },
);


/* =========================================================
 * 11. STRICT PREVIEW — GROWTH
 * ======================================================= */

describe(
  "V2 strict growth preview",
  () => {
    it(
      "accepts an exact learning proposal",
      () => {
        const result =
          strictIntakePreviewSchema.safeParse({
            kind:
              "growth",

            label:
              "تطوير وتعليم",

            title:
              "دورة تجريبية",

            summary:
              "تم فهم المدخل كعنصر تطوير.",

            confidence:
              0.95,

            next_action:
              "اعتماد عنصر التطوير بالقيم المعروضة.",

            proposal:
              VALID_LEARNING_PROPOSAL,

            requires_confirmation:
              true,
          });


        expect(
          result.success,
        ).toBe(
          true,
        );
      },
    );


    it(
      "rejects growth without exact values",
      () => {
        const result =
          strictIntakePreviewSchema.safeParse({
            kind:
              "growth",

            label:
              "تطوير وتعليم",

            title:
              "دورة تجريبية",

            summary:
              "تم فهم المدخل كعنصر تطوير.",

            confidence:
              0.95,

            next_action:
              "اعتماد عنصر التطوير.",

            proposal:
              null,

            requires_confirmation:
              true,
          });


        expect(
          result.success,
        ).toBe(
          false,
        );
      },
    );
  },
);


/* =========================================================
 * 12. NON-STRUCTURED PREVIEW KINDS
 * ======================================================= */

describe(
  "V2 non-structured preview kinds",
  () => {
    it(
      "accepts note with proposal null",
      () => {
        const result =
          strictIntakePreviewSchema.safeParse({
            kind:
              "note",

            label:
              "ملاحظة",

            title:
              "ملاحظة تجريبية",

            summary:
              "معلومة عامة للاحتفاظ بها.",

            confidence:
              0.9,

            next_action:
              "اعتماد الملاحظة.",

            proposal:
              null,

            requires_confirmation:
              true,
          });


        expect(
          result.success,
        ).toBe(
          true,
        );
      },
    );


    it(
      "accepts travel with proposal null",
      () => {
        const result =
          strictIntakePreviewSchema.safeParse({
            kind:
              "travel",

            label:
              "رحلة",

            title:
              "رحلة تجريبية",

            summary:
              "تم فهم المدخل كرحلة.",

            confidence:
              0.9,

            next_action:
              "اعتماد الرحلة.",

            proposal:
              null,

            requires_confirmation:
              true,
          });


        expect(
          result.success,
        ).toBe(
          true,
        );
      },
    );


    it(
      "accepts document with proposal null",
      () => {
        const result =
          strictIntakePreviewSchema.safeParse({
            kind:
              "document",

            label:
              "مستند",

            title:
              "مستند تجريبي",

            summary:
              "تم فهم المدخل كمستند.",

            confidence:
              0.8,

            next_action:
              "اعتماد المستند.",

            proposal:
              null,

            requires_confirmation:
              true,
          });


        expect(
          result.success,
        ).toBe(
          true,
        );
      },
    );


    it(
      "rejects note carrying a finance proposal",
      () => {
        const result =
          strictIntakePreviewSchema.safeParse({
            kind:
              "note",

            label:
              "ملاحظة",

            title:
              "بيانات غير متطابقة",

            summary:
              "اختبار منع الاقتراح المخفي.",

            confidence:
              0.8,

            next_action:
              "لا شيء.",

            proposal:
              VALID_INCOME_PROPOSAL,

            requires_confirmation:
              true,
          });


        expect(
          result.success,
        ).toBe(
          false,
        );
      },
    );
  },
);


/* =========================================================
 * 13. LEGACY PREVIEW ANTI-DOWNGRADE
 * ======================================================= */

describe(
  "V2 transitional preview boundary",
  () => {
    const legacyPreview = {
      kind:
        "note",

      label:
        "ملاحظة",

      title:
        "Legacy Preview",

      summary:
        "Synthetic transitional preview.",

      confidence:
        0.8,

      next_action:
        "اعتماد الملاحظة.",

      requires_confirmation:
        true,
    } as const;


    it(
      "still accepts the old preview shape during rollout",
      () => {
        expect(
          intakePreviewSchema.safeParse(
            legacyPreview,
          ).success,
        ).toBe(
          true,
        );
      },
    );


    it(
      "rejects proposal fields at the legacy validation boundary",
      () => {
        const result =
          intakePreviewSchema.safeParse({
            ...legacyPreview,

            proposal:
              VALID_INCOME_PROPOSAL,
          });


        expect(
          result.success,
        ).toBe(
          false,
        );
      },
    );
  },
);


/* =========================================================
 * 14. KIND CONSISTENCY HELPER
 * ======================================================= */

describe(
  "V2 structured proposal kind consistency",
  () => {
    it(
      "accepts a finance proposal for finance intake",
      () => {
        const result =
          validateStructuredProposalForIntakeKind(
            "finance",
            VALID_INCOME_PROPOSAL,
          );


        expect(
          result.success,
        ).toBe(
          true,
        );
      },
    );


    it(
      "rejects a plan proposal for finance intake",
      () => {
        const result =
          validateStructuredProposalForIntakeKind(
            "finance",
            VALID_GOAL_PROPOSAL,
          );


        expect(
          result.success,
        ).toBe(
          false,
        );
      },
    );


    it(
      "rejects arbitrary unknown proposal data",
      () => {
        const result =
          validateStructuredProposalForIntakeKind(
            "finance",
            {
              action:
                "do_whatever",
            },
          );


        expect(
          result.success,
        ).toBe(
          false,
        );
      },
    );
  },
);


/* =========================================================
 * 15. EXECUTION TARGET MAPPING
 * ======================================================= */

describe(
  "V2 structured proposal execution targets",
  () => {
    it(
      "maps income proposal only to income_source",
      () => {
        const parsed =
          structuredIntakeProposalSchema.parse(
            VALID_INCOME_PROPOSAL,
          );


        expect(
          getStructuredProposalTarget(
            parsed,
          ),
        ).toBe(
          "income_source",
        );
      },
    );


    it(
      "maps budget proposal only to budget_item",
      () => {
        const parsed =
          structuredIntakeProposalSchema.parse(
            VALID_BUDGET_PROPOSAL,
          );


        expect(
          getStructuredProposalTarget(
            parsed,
          ),
        ).toBe(
          "budget_item",
        );
      },
    );


    it(
      "maps goal proposal only to goal",
      () => {
        const parsed =
          structuredIntakeProposalSchema.parse(
            VALID_GOAL_PROPOSAL,
          );


        expect(
          getStructuredProposalTarget(
            parsed,
          ),
        ).toBe(
          "goal",
        );
      },
    );


    it(
      "maps project proposal only to project",
      () => {
        const parsed =
          structuredIntakeProposalSchema.parse(
            VALID_PROJECT_PROPOSAL,
          );


        expect(
          getStructuredProposalTarget(
            parsed,
          ),
        ).toBe(
          "project",
        );
      },
    );


    it(
      "maps learning proposal only to learning_item",
      () => {
        const parsed =
          structuredIntakeProposalSchema.parse(
            VALID_LEARNING_PROPOSAL,
          );


        expect(
          getStructuredProposalTarget(
            parsed,
          ),
        ).toBe(
          "learning_item",
        );
      },
    );


    it(
      "maps career proposal only to career_item",
      () => {
        const parsed =
          structuredIntakeProposalSchema.parse(
            VALID_CAREER_PROPOSAL,
          );


        expect(
          getStructuredProposalTarget(
            parsed,
          ),
        ).toBe(
          "career_item",
        );
      },
    );
  },
);


/* =========================================================
 * 16. FINAL SAFETY CONTRACT
 * ======================================================= */

describe(
  "LIFE OS V2 final intake safety contract",
  () => {
    it(
      "does not allow a structured finance preview without exact reviewable values",
      () => {
        const result =
          strictIntakePreviewSchema.safeParse({
            kind:
              "finance",

            label:
              "تحديث مالي",

            title:
              "Hidden Values",

            summary:
              "Synthetic safety test.",

            confidence:
              1,

            next_action:
              "اعتماد.",

            proposal: {
              version:
                1,

              kind:
                "finance",

              action:
                "create_income_source",

              data: {
                name:
                  "Synthetic Salary",

                /*
                 * amount intentionally missing
                 */
                currency:
                  "AED",

                frequency:
                  "monthly",

                next_expected_date:
                  null,

                notes:
                  null,
              },
            },

            requires_confirmation:
              true,
          });


        expect(
          result.success,
        ).toBe(
          false,
        );
      },
    );


    it(
      "requires explicit confirmation flag to remain true",
      () => {
        const result =
          strictIntakePreviewSchema.safeParse({
            kind:
              "finance",

            label:
              "تحديث مالي",

            title:
              "Synthetic Salary",

            summary:
              "Synthetic test.",

            confidence:
              1,

            next_action:
              "اعتماد مصدر الدخل.",

            proposal:
              VALID_INCOME_PROPOSAL,

            requires_confirmation:
              false,
          });


        expect(
          result.success,
        ).toBe(
          false,
        );
      },
    );
  },
);


/* =========================================================
 * 17. PERMANENT V2 RULE
 * ======================================================= */

/**
 * These tests protect:
 *
 * AI Suggests
 *      ↓
 * Exact Values
 *      ↓
 * Schema Validation
 *      ↓
 * User Reviews
 *      ↓
 * User Approves
 *      ↓
 * Deterministic Executor
 *
 *
 * If a future change accidentally allows:
 *
 * - hidden monetary values
 * - arbitrary actions
 * - arbitrary tables
 * - injected user_id
 * - mismatched proposal kinds
 * - finance without a proposal
 * - malformed dates
 * - unsupported categories
 *
 * this suite should fail before that behavior reaches the
 * execution layer.
 */