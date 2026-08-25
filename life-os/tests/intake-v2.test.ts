import {
  describe,
  expect,
  it,
} from "vitest";

import {
  getIntakeExecutionTarget,
  isIntakeKindExecutable,
} from "@/lib/intake-executor";

import {
  activeStrictIntakePreviewSchema,
  careerIntakeProposalSchema,
  documentFileSizeSchema,
  documentMimeTypeSchema,
  documentStorageBucketSchema,
  documentStoragePathSchema,
  financeBudgetItemProposalSchema,
  financeIncomeSourceProposalSchema,
  getStructuredProposalTarget,
  getTravelProposalTarget,
  goalIntakeProposalSchema,
  intakePreviewSchema,
  learningIntakeProposalSchema,
  PRIVATE_DOCUMENT_MAX_SIZE_BYTES,
  PRIVATE_DOCUMENT_MIME_TYPE,
  PRIVATE_DOCUMENT_STORAGE_BUCKET,
  projectIntakeProposalSchema,
  structuredIntakeProposalSchema,
  travelIntakeProposalSchema,
  validateStructuredProposalForIntakeKind,
} from "@/lib/validation";


/* =========================================================
 * LIFE OS V2
 * FINAL UNIVERSAL INTAKE CONTRACT TESTS
 *
 * Covers:
 *
 * finance
 * plan
 * growth
 * travel
 * document boundary
 * note boundary
 * executor support
 * private PDF validation
 *
 *
 * Synthetic data only.
 *
 * No:
 *
 * Supabase writes
 * OpenAI calls
 * real personal data
 * real PDF uploads
 * ======================================================= */


/* =========================================================
 * 1. SYNTHETIC FINANCE — INCOME
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


/* =========================================================
 * 2. SYNTHETIC FINANCE — BUDGET
 * ======================================================= */

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


/* =========================================================
 * 3. SYNTHETIC PLAN — GOAL
 * ======================================================= */

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


/* =========================================================
 * 4. SYNTHETIC PLAN — PROJECT
 * ======================================================= */

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


/* =========================================================
 * 5. SYNTHETIC GROWTH — LEARNING
 * ======================================================= */

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


/* =========================================================
 * 6. SYNTHETIC GROWTH — CAREER
 * ======================================================= */

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
 * 7. SYNTHETIC TRAVEL
 * ======================================================= */

const VALID_TRAVEL_PROPOSAL = {
  version:
    1,

  kind:
    "travel",

  action:
    "create_trip",

  data: {
    title:
      "Synthetic Slovenia Trip",

    destination:
      "Slovenia",

    start_date:
      "2027-01-09",

    end_date:
      "2027-01-16",

    status:
      "planned",

    budget_total:
      12_000,

    currency:
      "AED",

    readiness_percent:
      0,

    notes:
      null,
  },
} as const;


/* =========================================================
 * 8. PREVIEW FACTORY
 * ======================================================= */

function buildPreview(
  input: {
    kind:
      | "finance"
      | "plan"
      | "growth"
      | "travel"
      | "document"
      | "note";

    proposal:
      unknown;
  },
) {
  return {
    kind:
      input.kind,

    label:
      "Synthetic Preview",

    title:
      "Synthetic Title",

    summary:
      "Synthetic reviewable preview.",

    confidence:
      0.95,

    next_action:
      "Review and confirm.",

    proposal:
      input.proposal,

    requires_confirmation:
      true,
  };
}


/* =========================================================
 * 9. FINANCE — INCOME
 * ======================================================= */

describe(
  "V2 finance income proposal",
  () => {
    it(
      "accepts an exact valid income proposal",
      () => {
        expect(
          financeIncomeSourceProposalSchema
            .safeParse(
              VALID_INCOME_PROPOSAL,
            )
            .success,
        ).toBe(
          true,
        );
      },
    );


    it(
      "rejects zero income",
      () => {
        expect(
          financeIncomeSourceProposalSchema
            .safeParse({
              ...VALID_INCOME_PROPOSAL,

              data: {
                ...VALID_INCOME_PROPOSAL.data,

                amount:
                  0,
              },
            })
            .success,
        ).toBe(
          false,
        );
      },
    );


    it(
      "rejects lowercase currency",
      () => {
        expect(
          financeIncomeSourceProposalSchema
            .safeParse({
              ...VALID_INCOME_PROPOSAL,

              data: {
                ...VALID_INCOME_PROPOSAL.data,

                currency:
                  "aed",
              },
            })
            .success,
        ).toBe(
          false,
        );
      },
    );


    it(
      "rejects browser supplied ownership",
      () => {
        expect(
          financeIncomeSourceProposalSchema
            .safeParse({
              ...VALID_INCOME_PROPOSAL,

              user_id:
                "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            })
            .success,
        ).toBe(
          false,
        );
      },
    );
  },
);


/* =========================================================
 * 10. FINANCE — BUDGET
 * ======================================================= */

describe(
  "V2 finance budget proposal",
  () => {
    it(
      "accepts an exact valid budget proposal",
      () => {
        expect(
          financeBudgetItemProposalSchema
            .safeParse(
              VALID_BUDGET_PROPOSAL,
            )
            .success,
        ).toBe(
          true,
        );
      },
    );


    it(
      "rejects an invalid due day",
      () => {
        expect(
          financeBudgetItemProposalSchema
            .safeParse({
              ...VALID_BUDGET_PROPOSAL,

              data: {
                ...VALID_BUDGET_PROPOSAL.data,

                due_day:
                  32,
              },
            })
            .success,
        ).toBe(
          false,
        );
      },
    );


    it(
      "rejects hidden execution fields",
      () => {
        expect(
          financeBudgetItemProposalSchema
            .safeParse({
              ...VALID_BUDGET_PROPOSAL,

              data: {
                ...VALID_BUDGET_PROPOSAL.data,

                execute_immediately:
                  true,
              },
            })
            .success,
        ).toBe(
          false,
        );
      },
    );
  },
);


/* =========================================================
 * 11. PLAN — GOAL
 * ======================================================= */

describe(
  "V2 goal proposal",
  () => {
    it(
      "accepts a valid goal",
      () => {
        expect(
          goalIntakeProposalSchema
            .safeParse(
              VALID_GOAL_PROPOSAL,
            )
            .success,
        ).toBe(
          true,
        );
      },
    );


    it(
      "rejects progress above 100",
      () => {
        expect(
          goalIntakeProposalSchema
            .safeParse({
              ...VALID_GOAL_PROPOSAL,

              data: {
                ...VALID_GOAL_PROPOSAL.data,

                progress_percent:
                  101,
              },
            })
            .success,
        ).toBe(
          false,
        );
      },
    );
  },
);


/* =========================================================
 * 12. PLAN — PROJECT
 * ======================================================= */

describe(
  "V2 project proposal",
  () => {
    it(
      "accepts a valid project",
      () => {
        expect(
          projectIntakeProposalSchema
            .safeParse(
              VALID_PROJECT_PROPOSAL,
            )
            .success,
        ).toBe(
          true,
        );
      },
    );


    it(
      "rejects end before start",
      () => {
        expect(
          projectIntakeProposalSchema
            .safeParse({
              ...VALID_PROJECT_PROPOSAL,

              data: {
                ...VALID_PROJECT_PROPOSAL.data,

                start_date:
                  "2027-06-01",

                target_date:
                  "2027-01-01",
              },
            })
            .success,
        ).toBe(
          false,
        );
      },
    );


    it(
      "rejects non UUID goal relationships",
      () => {
        expect(
          projectIntakeProposalSchema
            .safeParse({
              ...VALID_PROJECT_PROPOSAL,

              data: {
                ...VALID_PROJECT_PROPOSAL.data,

                goal_id:
                  "fake-goal",
              },
            })
            .success,
        ).toBe(
          false,
        );
      },
    );
  },
);


/* =========================================================
 * 13. GROWTH — LEARNING
 * ======================================================= */

describe(
  "V2 learning proposal",
  () => {
    it(
      "accepts a valid learning item",
      () => {
        expect(
          learningIntakeProposalSchema
            .safeParse(
              VALID_LEARNING_PROPOSAL,
            )
            .success,
        ).toBe(
          true,
        );
      },
    );


    it(
      "rejects completion before start",
      () => {
        expect(
          learningIntakeProposalSchema
            .safeParse({
              ...VALID_LEARNING_PROPOSAL,

              data: {
                ...VALID_LEARNING_PROPOSAL.data,

                start_date:
                  "2027-02-01",

                completed_date:
                  "2027-01-01",
              },
            })
            .success,
        ).toBe(
          false,
        );
      },
    );


    it(
      "rejects unsafe javascript URLs",
      () => {
        expect(
          learningIntakeProposalSchema
            .safeParse({
              ...VALID_LEARNING_PROPOSAL,

              data: {
                ...VALID_LEARNING_PROPOSAL.data,

                url:
                  "javascript:alert(1)",
              },
            })
            .success,
        ).toBe(
          false,
        );
      },
    );
  },
);


/* =========================================================
 * 14. GROWTH — CAREER
 * ======================================================= */

describe(
  "V2 career proposal",
  () => {
    it(
      "accepts a valid career item",
      () => {
        expect(
          careerIntakeProposalSchema
            .safeParse(
              VALID_CAREER_PROPOSAL,
            )
            .success,
        ).toBe(
          true,
        );
      },
    );


    it(
      "rejects unsupported career types",
      () => {
        expect(
          careerIntakeProposalSchema
            .safeParse({
              ...VALID_CAREER_PROPOSAL,

              data: {
                ...VALID_CAREER_PROPOSAL.data,

                item_type:
                  "admin_override",
              },
            })
            .success,
        ).toBe(
          false,
        );
      },
    );
  },
);


/* =========================================================
 * 15. TRAVEL — EXACT PROPOSAL
 * ======================================================= */

describe(
  "V2 travel proposal",
  () => {
    it(
      "accepts the exact create_trip contract",
      () => {
        expect(
          travelIntakeProposalSchema
            .safeParse(
              VALID_TRAVEL_PROPOSAL,
            )
            .success,
        ).toBe(
          true,
        );
      },
    );


    it(
      "requires a destination",
      () => {
        expect(
          travelIntakeProposalSchema
            .safeParse({
              ...VALID_TRAVEL_PROPOSAL,

              data: {
                ...VALID_TRAVEL_PROPOSAL.data,

                destination:
                  "",
              },
            })
            .success,
        ).toBe(
          false,
        );
      },
    );


    it(
      "rejects end date before start date",
      () => {
        expect(
          travelIntakeProposalSchema
            .safeParse({
              ...VALID_TRAVEL_PROPOSAL,

              data: {
                ...VALID_TRAVEL_PROPOSAL.data,

                start_date:
                  "2027-01-16",

                end_date:
                  "2027-01-09",
              },
            })
            .success,
        ).toBe(
          false,
        );
      },
    );


    it(
      "rejects readiness above 100",
      () => {
        expect(
          travelIntakeProposalSchema
            .safeParse({
              ...VALID_TRAVEL_PROPOSAL,

              data: {
                ...VALID_TRAVEL_PROPOSAL.data,

                readiness_percent:
                  101,
              },
            })
            .success,
        ).toBe(
          false,
        );
      },
    );


    it(
      "allows unknown dates and budget to remain null",
      () => {
        expect(
          travelIntakeProposalSchema
            .safeParse({
              ...VALID_TRAVEL_PROPOSAL,

              data: {
                ...VALID_TRAVEL_PROPOSAL.data,

                start_date:
                  null,

                end_date:
                  null,

                budget_total:
                  null,
              },
            })
            .success,
        ).toBe(
          true,
        );
      },
    );


    it(
      "rejects arbitrary travel execution fields",
      () => {
        expect(
          travelIntakeProposalSchema
            .safeParse({
              ...VALID_TRAVEL_PROPOSAL,

              data: {
                ...VALID_TRAVEL_PROPOSAL.data,

                book_flight:
                  true,
              },
            })
            .success,
        ).toBe(
          false,
        );
      },
    );
  },
);


/* =========================================================
 * 16. MASTER PROPOSAL UNION
 * ======================================================= */

describe(
  "V2 structured proposal master schema",
  () => {
    it(
      "accepts every supported structured action including travel",
      () => {
        const proposals = [
          VALID_INCOME_PROPOSAL,
          VALID_BUDGET_PROPOSAL,
          VALID_GOAL_PROPOSAL,
          VALID_PROJECT_PROPOSAL,
          VALID_LEARNING_PROPOSAL,
          VALID_CAREER_PROPOSAL,
          VALID_TRAVEL_PROPOSAL,
        ];


        for (
          const proposal of
            proposals
        ) {
          expect(
            structuredIntakeProposalSchema
              .safeParse(
                proposal,
              )
              .success,
          ).toBe(
            true,
          );
        }
      },
    );


    it(
      "rejects arbitrary SQL actions",
      () => {
        expect(
          structuredIntakeProposalSchema
            .safeParse({
              version:
                1,

              kind:
                "finance",

              action:
                "execute_sql",

              data: {},
            })
            .success,
        ).toBe(
          false,
        );
      },
    );


    it(
      "rejects arbitrary table write actions",
      () => {
        expect(
          structuredIntakeProposalSchema
            .safeParse({
              version:
                1,

              kind:
                "travel",

              action:
                "insert_into_any_table",

              data: {
                table:
                  "trips",
              },
            })
            .success,
        ).toBe(
          false,
        );
      },
    );


    it(
      "rejects unsupported proposal versions",
      () => {
        expect(
          structuredIntakeProposalSchema
            .safeParse({
              ...VALID_TRAVEL_PROPOSAL,

              version:
                2,
            })
            .success,
        ).toBe(
          false,
        );
      },
    );
  },
);


/* =========================================================
 * 17. ACTIVE PREVIEW — FINANCE
 * ======================================================= */

describe(
  "V2 active finance preview",
  () => {
    it(
      "requires exact finance proposal values",
      () => {
        expect(
          activeStrictIntakePreviewSchema
            .safeParse(
              buildPreview({
                kind:
                  "finance",

                proposal:
                  VALID_INCOME_PROPOSAL,
              }),
            )
            .success,
        ).toBe(
          true,
        );
      },
    );


    it(
      "rejects finance with proposal null",
      () => {
        expect(
          activeStrictIntakePreviewSchema
            .safeParse(
              buildPreview({
                kind:
                  "finance",

                proposal:
                  null,
              }),
            )
            .success,
        ).toBe(
          false,
        );
      },
    );
  },
);


/* =========================================================
 * 18. ACTIVE PREVIEW — PLAN
 * ======================================================= */

describe(
  "V2 active plan preview",
  () => {
    it(
      "accepts an exact project proposal",
      () => {
        expect(
          activeStrictIntakePreviewSchema
            .safeParse(
              buildPreview({
                kind:
                  "plan",

                proposal:
                  VALID_PROJECT_PROPOSAL,
              }),
            )
            .success,
        ).toBe(
          true,
        );
      },
    );


    it(
      "rejects mismatched growth proposal",
      () => {
        expect(
          activeStrictIntakePreviewSchema
            .safeParse(
              buildPreview({
                kind:
                  "plan",

                proposal:
                  VALID_LEARNING_PROPOSAL,
              }),
            )
            .success,
        ).toBe(
          false,
        );
      },
    );
  },
);


/* =========================================================
 * 19. ACTIVE PREVIEW — GROWTH
 * ======================================================= */

describe(
  "V2 active growth preview",
  () => {
    it(
      "accepts exact learning proposal",
      () => {
        expect(
          activeStrictIntakePreviewSchema
            .safeParse(
              buildPreview({
                kind:
                  "growth",

                proposal:
                  VALID_LEARNING_PROPOSAL,
              }),
            )
            .success,
        ).toBe(
          true,
        );
      },
    );


    it(
      "rejects growth with proposal null",
      () => {
        expect(
          activeStrictIntakePreviewSchema
            .safeParse(
              buildPreview({
                kind:
                  "growth",

                proposal:
                  null,
              }),
            )
            .success,
        ).toBe(
          false,
        );
      },
    );
  },
);


/* =========================================================
 * 20. ACTIVE PREVIEW — TRAVEL
 * ======================================================= */

describe(
  "V2 active travel preview",
  () => {
    it(
      "requires a structured travel proposal",
      () => {
        expect(
          activeStrictIntakePreviewSchema
            .safeParse(
              buildPreview({
                kind:
                  "travel",

                proposal:
                  VALID_TRAVEL_PROPOSAL,
              }),
            )
            .success,
        ).toBe(
          true,
        );
      },
    );


    it(
      "rejects the old travel proposal null behavior",
      () => {
        expect(
          activeStrictIntakePreviewSchema
            .safeParse(
              buildPreview({
                kind:
                  "travel",

                proposal:
                  null,
              }),
            )
            .success,
        ).toBe(
          false,
        );
      },
    );


    it(
      "rejects travel carrying finance proposal",
      () => {
        expect(
          activeStrictIntakePreviewSchema
            .safeParse(
              buildPreview({
                kind:
                  "travel",

                proposal:
                  VALID_INCOME_PROPOSAL,
              }),
            )
            .success,
        ).toBe(
          false,
        );
      },
    );


    it(
      "requires confirmation to remain true",
      () => {
        expect(
          activeStrictIntakePreviewSchema
            .safeParse({
              ...buildPreview({
                kind:
                  "travel",

                proposal:
                  VALID_TRAVEL_PROPOSAL,
              }),

              requires_confirmation:
                false,
            })
            .success,
        ).toBe(
          false,
        );
      },
    );
  },
);


/* =========================================================
 * 21. ACTIVE PREVIEW — NOTE / DOCUMENT
 * ======================================================= */

describe(
  "V2 note and document preview boundary",
  () => {
    it(
      "accepts note only with proposal null",
      () => {
        expect(
          activeStrictIntakePreviewSchema
            .safeParse(
              buildPreview({
                kind:
                  "note",

                proposal:
                  null,
              }),
            )
            .success,
        ).toBe(
          true,
        );
      },
    );


    it(
      "accepts document only with proposal null",
      () => {
        expect(
          activeStrictIntakePreviewSchema
            .safeParse(
              buildPreview({
                kind:
                  "document",

                proposal:
                  null,
              }),
            )
            .success,
        ).toBe(
          true,
        );
      },
    );


    it(
      "rejects note carrying hidden finance proposal",
      () => {
        expect(
          activeStrictIntakePreviewSchema
            .safeParse(
              buildPreview({
                kind:
                  "note",

                proposal:
                  VALID_INCOME_PROPOSAL,
              }),
            )
            .success,
        ).toBe(
          false,
        );
      },
    );


    it(
      "rejects document carrying hidden travel proposal",
      () => {
        expect(
          activeStrictIntakePreviewSchema
            .safeParse(
              buildPreview({
                kind:
                  "document",

                proposal:
                  VALID_TRAVEL_PROPOSAL,
              }),
            )
            .success,
        ).toBe(
          false,
        );
      },
    );
  },
);


/* =========================================================
 * 22. ACTIVE BOUNDARY ANTI-DOWNGRADE
 * ======================================================= */

describe(
  "V2 active preview anti downgrade",
  () => {
    const legacyPreview = {
      kind:
        "note",

      label:
        "ملاحظة",

      title:
        "Legacy Synthetic Preview",

      summary:
        "Synthetic legacy preview.",

      confidence:
        0.8,

      next_action:
        "Review.",

      requires_confirmation:
        true,
    } as const;


    it(
      "keeps the legacy parser available for compatibility",
      () => {
        expect(
          intakePreviewSchema
            .safeParse(
              legacyPreview,
            )
            .success,
        ).toBe(
          true,
        );
      },
    );


    it(
      "rejects the legacy shape at the active V2 boundary",
      () => {
        expect(
          activeStrictIntakePreviewSchema
            .safeParse(
              legacyPreview,
            )
            .success,
        ).toBe(
          false,
        );
      },
    );
  },
);


/* =========================================================
 * 23. KIND CONSISTENCY
 * ======================================================= */

describe(
  "V2 structured proposal kind consistency",
  () => {
    it(
      "accepts finance proposal for finance",
      () => {
        expect(
          validateStructuredProposalForIntakeKind(
            "finance",
            VALID_INCOME_PROPOSAL,
          ).success,
        ).toBe(
          true,
        );
      },
    );


    it(
      "accepts travel proposal for travel",
      () => {
        expect(
          validateStructuredProposalForIntakeKind(
            "travel",
            VALID_TRAVEL_PROPOSAL,
          ).success,
        ).toBe(
          true,
        );
      },
    );


    it(
      "rejects travel proposal for finance",
      () => {
        expect(
          validateStructuredProposalForIntakeKind(
            "finance",
            VALID_TRAVEL_PROPOSAL,
          ).success,
        ).toBe(
          false,
        );
      },
    );


    it(
      "rejects arbitrary unknown proposal",
      () => {
        expect(
          validateStructuredProposalForIntakeKind(
            "travel",
            {
              action:
                "do_whatever",
            },
          ).success,
        ).toBe(
          false,
        );
      },
    );
  },
);


/* =========================================================
 * 24. STRUCTURED TARGET MAPPING
 * ======================================================= */

describe(
  "V2 structured proposal execution targets",
  () => {
    it(
      "maps income to income_source",
      () => {
        const proposal =
          structuredIntakeProposalSchema
            .parse(
              VALID_INCOME_PROPOSAL,
            );


        expect(
          getStructuredProposalTarget(
            proposal,
          ),
        ).toBe(
          "income_source",
        );
      },
    );


    it(
      "maps budget to budget_item",
      () => {
        const proposal =
          structuredIntakeProposalSchema
            .parse(
              VALID_BUDGET_PROPOSAL,
            );


        expect(
          getStructuredProposalTarget(
            proposal,
          ),
        ).toBe(
          "budget_item",
        );
      },
    );


    it(
      "maps goal to goal",
      () => {
        const proposal =
          structuredIntakeProposalSchema
            .parse(
              VALID_GOAL_PROPOSAL,
            );


        expect(
          getStructuredProposalTarget(
            proposal,
          ),
        ).toBe(
          "goal",
        );
      },
    );


    it(
      "maps project to project",
      () => {
        const proposal =
          structuredIntakeProposalSchema
            .parse(
              VALID_PROJECT_PROPOSAL,
            );


        expect(
          getStructuredProposalTarget(
            proposal,
          ),
        ).toBe(
          "project",
        );
      },
    );


    it(
      "maps learning to learning_item",
      () => {
        const proposal =
          structuredIntakeProposalSchema
            .parse(
              VALID_LEARNING_PROPOSAL,
            );


        expect(
          getStructuredProposalTarget(
            proposal,
          ),
        ).toBe(
          "learning_item",
        );
      },
    );


    it(
      "maps career to career_item",
      () => {
        const proposal =
          structuredIntakeProposalSchema
            .parse(
              VALID_CAREER_PROPOSAL,
            );


        expect(
          getStructuredProposalTarget(
            proposal,
          ),
        ).toBe(
          "career_item",
        );
      },
    );


    it(
      "maps travel to trip",
      () => {
        const proposal =
          structuredIntakeProposalSchema
            .parse(
              VALID_TRAVEL_PROPOSAL,
            );


        expect(
          getStructuredProposalTarget(
            proposal,
          ),
        ).toBe(
          "trip",
        );
      },
    );


    it(
      "maps travel domain helper only to trip",
      () => {
        const proposal =
          travelIntakeProposalSchema
            .parse(
              VALID_TRAVEL_PROPOSAL,
            );


        expect(
          getTravelProposalTarget(
            proposal,
          ),
        ).toBe(
          "trip",
        );
      },
    );
  },
);


/* =========================================================
 * 25. EXECUTOR SUPPORT
 * ======================================================= */

describe(
  "V2 deterministic intake executor support",
  () => {
    it(
      "supports note",
      () => {
        expect(
          isIntakeKindExecutable(
            "note",
          ),
        ).toBe(
          true,
        );
      },
    );


    it(
      "supports finance",
      () => {
        expect(
          isIntakeKindExecutable(
            "finance",
          ),
        ).toBe(
          true,
        );
      },
    );


    it(
      "supports plan",
      () => {
        expect(
          isIntakeKindExecutable(
            "plan",
          ),
        ).toBe(
          true,
        );
      },
    );


    it(
      "supports growth",
      () => {
        expect(
          isIntakeKindExecutable(
            "growth",
          ),
        ).toBe(
          true,
        );
      },
    );


    it(
      "supports travel",
      () => {
        expect(
          isIntakeKindExecutable(
            "travel",
          ),
        ).toBe(
          true,
        );
      },
    );


    it(
      "keeps document outside generic executor",
      () => {
        expect(
          isIntakeKindExecutable(
            "document",
          ),
        ).toBe(
          false,
        );
      },
    );
  },
);


/* =========================================================
 * 26. EXECUTOR KIND TARGET
 * ======================================================= */

describe(
  "V2 executor kind target mapping",
  () => {
    it(
      "maps note to memory_item",
      () => {
        expect(
          getIntakeExecutionTarget(
            "note",
          ),
        ).toBe(
          "memory_item",
        );
      },
    );


    it(
      "maps travel directly to trip",
      () => {
        expect(
          getIntakeExecutionTarget(
            "travel",
          ),
        ).toBe(
          "trip",
        );
      },
    );


    it(
      "keeps finance proposal dependent",
      () => {
        expect(
          getIntakeExecutionTarget(
            "finance",
          ),
        ).toBeNull();
      },
    );


    it(
      "keeps plan proposal dependent",
      () => {
        expect(
          getIntakeExecutionTarget(
            "plan",
          ),
        ).toBeNull();
      },
    );


    it(
      "keeps growth proposal dependent",
      () => {
        expect(
          getIntakeExecutionTarget(
            "growth",
          ),
        ).toBeNull();
      },
    );


    it(
      "keeps document in dedicated private file pipeline",
      () => {
        expect(
          getIntakeExecutionTarget(
            "document",
          ),
        ).toBeNull();
      },
    );
  },
);


/* =========================================================
 * 27. PRIVATE DOCUMENT CONSTANTS
 * ======================================================= */

describe(
  "V2 private document constants",
  () => {
    it(
      "uses the private document bucket",
      () => {
        expect(
          PRIVATE_DOCUMENT_STORAGE_BUCKET,
        ).toBe(
          "life-os-private-documents",
        );
      },
    );


    it(
      "allows PDF MIME only",
      () => {
        expect(
          PRIVATE_DOCUMENT_MIME_TYPE,
        ).toBe(
          "application/pdf",
        );
      },
    );


    it(
      "limits private PDFs to 15 MB",
      () => {
        expect(
          PRIVATE_DOCUMENT_MAX_SIZE_BYTES,
        ).toBe(
          15 *
            1024 *
            1024,
        );
      },
    );
  },
);


/* =========================================================
 * 28. PRIVATE DOCUMENT MIME
 * ======================================================= */

describe(
  "V2 private document MIME validation",
  () => {
    it(
      "accepts application/pdf",
      () => {
        expect(
          documentMimeTypeSchema
            .safeParse(
              "application/pdf",
            )
            .success,
        ).toBe(
          true,
        );
      },
    );


    it(
      "rejects image files",
      () => {
        expect(
          documentMimeTypeSchema
            .safeParse(
              "image/png",
            )
            .success,
        ).toBe(
          false,
        );
      },
    );


    it(
      "rejects HTML disguised as document",
      () => {
        expect(
          documentMimeTypeSchema
            .safeParse(
              "text/html",
            )
            .success,
        ).toBe(
          false,
        );
      },
    );
  },
);


/* =========================================================
 * 29. PRIVATE DOCUMENT SIZE
 * ======================================================= */

describe(
  "V2 private document size validation",
  () => {
    it(
      "accepts a normal positive PDF size",
      () => {
        expect(
          documentFileSizeSchema
            .safeParse(
              1_024,
            )
            .success,
        ).toBe(
          true,
        );
      },
    );


    it(
      "accepts exactly 15 MB",
      () => {
        expect(
          documentFileSizeSchema
            .safeParse(
              PRIVATE_DOCUMENT_MAX_SIZE_BYTES,
            )
            .success,
        ).toBe(
          true,
        );
      },
    );


    it(
      "rejects files larger than 15 MB",
      () => {
        expect(
          documentFileSizeSchema
            .safeParse(
              PRIVATE_DOCUMENT_MAX_SIZE_BYTES +
                1,
            )
            .success,
        ).toBe(
          false,
        );
      },
    );


    it(
      "rejects zero byte documents",
      () => {
        expect(
          documentFileSizeSchema
            .safeParse(
              0,
            )
            .success,
        ).toBe(
          false,
        );
      },
    );
  },
);


/* =========================================================
 * 30. PRIVATE STORAGE BUCKET
 * ======================================================= */

describe(
  "V2 private document bucket validation",
  () => {
    it(
      "accepts only the canonical private bucket",
      () => {
        expect(
          documentStorageBucketSchema
            .safeParse(
              PRIVATE_DOCUMENT_STORAGE_BUCKET,
            )
            .success,
        ).toBe(
          true,
        );
      },
    );


    it(
      "rejects arbitrary public bucket names",
      () => {
        expect(
          documentStorageBucketSchema
            .safeParse(
              "public",
            )
            .success,
        ).toBe(
          false,
        );
      },
    );
  },
);


/* =========================================================
 * 31. PRIVATE STORAGE PATH
 * ======================================================= */

describe(
  "V2 private document storage path validation",
  () => {
    it(
      "accepts a normal nested server path",
      () => {
        expect(
          documentStoragePathSchema
            .safeParse(
              "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/travel/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/file.pdf",
            )
            .success,
        ).toBe(
          true,
        );
      },
    );


    it(
      "rejects absolute paths",
      () => {
        expect(
          documentStoragePathSchema
            .safeParse(
              "/private/file.pdf",
            )
            .success,
        ).toBe(
          false,
        );
      },
    );


    it(
      "rejects path traversal",
      () => {
        expect(
          documentStoragePathSchema
            .safeParse(
              "user/../secret/file.pdf",
            )
            .success,
        ).toBe(
          false,
        );
      },
    );


    it(
      "rejects backslash paths",
      () => {
        expect(
          documentStoragePathSchema
            .safeParse(
              "user\\private\\file.pdf",
            )
            .success,
        ).toBe(
          false,
        );
      },
    );
  },
);


/* =========================================================
 * 32. EXACT REVIEWABLE VALUES
 * ======================================================= */

describe(
  "LIFE OS V2 exact reviewable values",
  () => {
    it(
      "rejects finance preview with hidden missing amount",
      () => {
        const proposal = {
          version:
            1,

          kind:
            "finance",

          action:
            "create_income_source",

          data: {
            name:
              "Synthetic Salary",

            currency:
              "AED",

            frequency:
              "monthly",

            next_expected_date:
              null,

            notes:
              null,
          },
        };


        expect(
          activeStrictIntakePreviewSchema
            .safeParse(
              buildPreview({
                kind:
                  "finance",

                proposal,
              }),
            )
            .success,
        ).toBe(
          false,
        );
      },
    );


    it(
      "rejects travel preview missing destination",
      () => {
        const proposal = {
          ...VALID_TRAVEL_PROPOSAL,

          data: {
            title:
              VALID_TRAVEL_PROPOSAL
                .data
                .title,

            start_date:
              VALID_TRAVEL_PROPOSAL
                .data
                .start_date,

            end_date:
              VALID_TRAVEL_PROPOSAL
                .data
                .end_date,

            status:
              VALID_TRAVEL_PROPOSAL
                .data
                .status,

            budget_total:
              VALID_TRAVEL_PROPOSAL
                .data
                .budget_total,

            currency:
              VALID_TRAVEL_PROPOSAL
                .data
                .currency,

            readiness_percent:
              VALID_TRAVEL_PROPOSAL
                .data
                .readiness_percent,

            notes:
              VALID_TRAVEL_PROPOSAL
                .data
                .notes,
          },
        };


        expect(
          activeStrictIntakePreviewSchema
            .safeParse(
              buildPreview({
                kind:
                  "travel",

                proposal,
              }),
            )
            .success,
        ).toBe(
          false,
        );
      },
    );
  },
);


/* =========================================================
 * 33. FINAL V2 INTAKE RULE
 * ======================================================= */

/**
 * These tests protect the final contract:
 *
 *
 * text / PDF
 *      ↓
 * AI preview
 *      ↓
 * exact structured values
 *      ↓
 * activeStrictIntakePreviewSchema
 *      ↓
 * user review
 *      ↓
 * explicit confirmation
 *      ↓
 * deterministic executor
 *
 *
 * finance:
 *
 * proposal required
 *
 *
 * plan:
 *
 * proposal required
 *
 *
 * growth:
 *
 * proposal required
 *
 *
 * travel:
 *
 * create_trip proposal required
 * proposal:null forbidden
 * generic executor enabled
 * target = trip
 *
 *
 * document:
 *
 * proposal = null
 * generic executor disabled
 * dedicated private PDF pipeline
 *
 *
 * note:
 *
 * proposal = null
 * deterministic memory executor
 */


/* =========================================================
 * 34. FINAL SECURITY RULE
 * ======================================================= */

/**
 * A future regression must fail this suite if it allows:
 *
 * arbitrary action
 * arbitrary table write
 * hidden financial values
 * injected user ownership
 * mismatched proposal kinds
 * Travel without exact proposal
 * Travel without destination
 * invalid Travel date range
 * invalid Travel readiness
 * public document bucket
 * non-PDF document type
 * oversized private PDF
 * unsafe Storage path
 * automatic confirmation bypass
 */


/* =========================================================
 * 35. PERMANENT LIFE OS RULE
 * ======================================================= */

/**
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
 * Deterministic System Executes
 *
 *
 * Private by default.
 */