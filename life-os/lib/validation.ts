import {
  z,
} from "zod";

import {
  AI_MAX_RECOMMENDATIONS,
  AI_MAX_USER_MESSAGE_LENGTH,
  AI_RECOMMENDATION_CATEGORIES,
  AI_RECOMMENDATION_ENTITY_TYPES,
  AI_RECOMMENDATION_MAX_LENGTH,
  AI_RECOMMENDATION_STATUSES,
  AUDIT_METADATA_MAX_KEYS,
  AUDIT_METADATA_MAX_STRING_LENGTH,
  BUDGET_CATEGORIES,
  BUDGET_ITEM_TYPES,
  CAREER_ITEM_TYPES,
  CAREER_RATING_MAX,
  CAREER_RATING_MIN,
  CAREER_STATUSES,
  DECISION_MAX_SCENARIOS,
  DEFAULT_PAGE_SIZE,
  DUE_DAY_MAX,
  DUE_DAY_MIN,
  FORBIDDEN_AUDIT_METADATA_KEYS,
  FREQUENCIES,
  GOAL_CATEGORIES,
  GOAL_STATUSES,
  INVESTMENT_ASSET_TYPES,
  INVESTMENT_TRANSACTION_TYPES,
  LEARNING_ITEM_TYPES,
  LEARNING_STATUSES,
  MAX_PAGE_SIZE,
  MEMORY_CATEGORIES,
  MEMORY_CONTENT_MAX_LENGTH,
  NOTES_MAX_LENGTH,
  OPPORTUNITY_CATEGORIES,
  OPPORTUNITY_MAX_FIT_SCORE,
  OPPORTUNITY_MAX_RESULTS,
  OPPORTUNITY_MIN_FIT_SCORE,
  OPPORTUNITY_RECOMMENDATIONS,
  PRIORITIES,
  PROGRESS_MAX,
  PROGRESS_MIN,
  PROJECT_CATEGORIES,
  PROJECT_STATUSES,
  SHORT_TEXT_MAX_LENGTH,
  TASK_STATUSES,
  TITLE_MAX_LENGTH,
  TITLE_MIN_LENGTH,
} from "@/lib/constants";

import type {
  JsonValue,
} from "@/lib/types";


/* =========================================================
 * LIFE OS
 * SHARED VALIDATION
 *
 * V1 domains
 * +
 * V2 Universal Intake
 * +
 * V2 Structured Proposals
 * +
 * V2 Travel OS
 * +
 * V2 Private Documents
 *
 * Permanent rule:
 *
 * AI Suggests
 *      ↓
 * Validation
 *      ↓
 * User Reviews Exact Values
 *      ↓
 * User Approves
 *      ↓
 * Deterministic Executor
 * ======================================================= */


/* =========================================================
 * 1. INTERNAL HELPERS
 * ======================================================= */

function isValidISODate(
  value:
    string,
): boolean {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      value,
    );


  if (
    !match
  ) {
    return false;
  }


  const year =
    Number(
      match[1],
    );


  const month =
    Number(
      match[2],
    );


  const day =
    Number(
      match[3],
    );


  if (
    !Number.isInteger(
      year,
    ) ||
    !Number.isInteger(
      month,
    ) ||
    !Number.isInteger(
      day,
    )
  ) {
    return false;
  }


  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return false;
  }


  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day,
      ),
    );


  return (
    date.getUTCFullYear() ===
      year &&
    date.getUTCMonth() ===
      month - 1 &&
    date.getUTCDate() ===
      day
  );
}


function isValidTimeZone(
  value:
    string,
): boolean {
  try {
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone:
          value,
      },
    ).format();


    return true;
  } catch {
    return false;
  }
}


function isHttpUrl(
  value:
    string,
): boolean {
  try {
    const url =
      new URL(
        value,
      );


    return (
      url.protocol ===
        "https:" ||
      url.protocol ===
        "http:"
    );
  } catch {
    return false;
  }
}


function isDateRangeValid(
  startDate:
    string |
    null |
    undefined,

  targetDate:
    string |
    null |
    undefined,
): boolean {
  if (
    !startDate ||
    !targetDate
  ) {
    return true;
  }


  return (
    targetDate >=
    startDate
  );
}


function normalizeAuditKey(
  value:
    string,
): string {
  return value
    .trim()
    .toLowerCase();
}


function isSafeStoragePath(
  value:
    string,
): boolean {
  if (
    value.startsWith(
      "/",
    ) ||
    value.endsWith(
      "/",
    ) ||
    value.includes(
      "\\",
    )
  ) {
    return false;
  }


  const segments =
    value.split(
      "/",
    );


  if (
    segments.length <
    2
  ) {
    return false;
  }


  return segments.every(
    (
      segment,
    ) =>
      segment.length >
        0 &&
      segment !==
        "." &&
      segment !==
        "..",
  );
}


const forbiddenAuditKeys =
  new Set(
    FORBIDDEN_AUDIT_METADATA_KEYS.map(
      normalizeAuditKey,
    ),
  );


/* =========================================================
 * 2. GENERIC SCHEMAS
 * ======================================================= */

export const uuidSchema =
  z
    .string()
    .trim()
    .uuid(
      "المعرّف غير صالح.",
    );


export const isoDateSchema =
  z
    .string()
    .trim()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      "التاريخ يجب أن يكون بصيغة YYYY-MM-DD.",
    )
    .refine(
      isValidISODate,
      "التاريخ غير صالح.",
    );


export const isoDateTimeSchema =
  z
    .string()
    .trim()
    .datetime({
      offset:
        true,
    });


export const monthDateSchema =
  isoDateSchema.refine(
    (
      value,
    ) =>
      value.endsWith(
        "-01",
      ),

    "الشهر يجب أن يمثل اليوم الأول من الشهر.",
  );


export const currencyCodeSchema =
  z
    .string()
    .trim()
    .regex(
      /^[A-Z]{3}$/,
      "رمز العملة يجب أن يتكون من ثلاثة أحرف كبيرة.",
    );


export const prioritySchema =
  z.enum(
    PRIORITIES,
  );


export const frequencySchema =
  z.enum(
    FREQUENCIES,
  );


export const progressPercentSchema =
  z
    .number()
    .finite()
    .int()
    .min(
      PROGRESS_MIN,
    )
    .max(
      PROGRESS_MAX,
    );


export const nonNegativeNumberSchema =
  z
    .number()
    .finite()
    .min(
      0,
    );


export const positiveNumberSchema =
  z
    .number()
    .finite()
    .gt(
      0,
    );


export const finiteNumberSchema =
  z
    .number()
    .finite();


export const moneySchema =
  z
    .number()
    .finite()
    .min(
      0,
    )
    .max(
      999_999_999_999.99,
    );


export const positiveMoneySchema =
  moneySchema.refine(
    (
      value,
    ) =>
      value >
      0,

    "المبلغ يجب أن يكون أكبر من صفر.",
  );


export const signedMoneySchema =
  z
    .number()
    .finite()
    .min(
      -999_999_999_999.99,
    )
    .max(
      999_999_999_999.99,
    );


export const titleSchema =
  z
    .string()
    .trim()
    .min(
      TITLE_MIN_LENGTH,
      "العنوان مطلوب.",
    )
    .max(
      TITLE_MAX_LENGTH,
      "العنوان طويل جدًا.",
    );


export const shortTextSchema =
  z
    .string()
    .trim()
    .min(
      1,
    )
    .max(
      SHORT_TEXT_MAX_LENGTH,
    );


export const notesSchema =
  z
    .string()
    .trim()
    .min(
      1,
    )
    .max(
      NOTES_MAX_LENGTH,
    );


export const optionalNullableNotesSchema =
  notesSchema
    .nullable()
    .optional();


export const optionalNullableShortTextSchema =
  shortTextSchema
    .nullable()
    .optional();


export const httpUrlSchema =
  z
    .string()
    .trim()
    .url(
      "الرابط غير صالح.",
    )
    .refine(
      isHttpUrl,
      "يسمح فقط بروابط HTTP أو HTTPS.",
    );


export const optionalNullableHttpUrlSchema =
  httpUrlSchema
    .nullable()
    .optional();


/* =========================================================
 * 3. AUTHENTICATION
 * ======================================================= */

export const loginInputSchema =
  z
    .object({
      email:
        z
          .string()
          .trim()
          .email(
            "البريد الإلكتروني غير صالح.",
          )
          .max(
            254,
          ),

      password:
        z
          .string()
          .min(
            1,
            "كلمة المرور مطلوبة.",
          )
          .max(
            1_024,
          ),
    })
    .strict();


export const mfaCodeSchema =
  z
    .string()
    .trim()
    .regex(
      /^\d{6}$/,
      "رمز التحقق يجب أن يتكون من 6 أرقام.",
    );


export const mfaVerificationSchema =
  z
    .object({
      factorId:
        uuidSchema,

      challengeId:
        uuidSchema,

      code:
        mfaCodeSchema,
    })
    .strict();


export const authCallbackQuerySchema =
  z
    .object({
      code:
        z
          .string()
          .trim()
          .min(
            1,
          )
          .max(
            2_048,
          ),
    })
    .strict();


/* =========================================================
 * 4. PROFILE
 * ======================================================= */

export const profileInsertSchema =
  z
    .object({
      display_name:
        titleSchema
          .nullable()
          .optional(),

      default_currency:
        currencyCodeSchema
          .optional(),

      timezone:
        z
          .string()
          .trim()
          .min(
            1,
          )
          .max(
            100,
          )
          .refine(
            isValidTimeZone,
            "المنطقة الزمنية غير صالحة.",
          )
          .optional(),

      locale:
        z
          .string()
          .trim()
          .min(
            2,
          )
          .max(
            35,
          )
          .regex(
            /^[a-z]{2,3}(?:-[A-Z]{2})?$/,
            "صيغة اللغة غير صالحة.",
          )
          .optional(),
    })
    .strict();


export const profileUpdateSchema =
  profileInsertSchema
    .partial()
    .strict();


/* =========================================================
 * 5. INCOME SOURCES
 * ======================================================= */

export const incomeSourceInsertSchema =
  z
    .object({
      name:
        titleSchema,

      amount:
        moneySchema,

      frequency:
        frequencySchema
          .optional(),

      is_active:
        z
          .boolean()
          .optional(),

      next_expected_date:
        isoDateSchema
          .nullable()
          .optional(),

      notes:
        optionalNullableNotesSchema,
    })
    .strict();


export const incomeSourceUpdateSchema =
  incomeSourceInsertSchema
    .partial()
    .strict();


/* =========================================================
 * 6. BUDGET ITEMS
 * ======================================================= */

export const budgetItemInsertSchema =
  z
    .object({
      name:
        titleSchema,

      category:
        z.enum(
          BUDGET_CATEGORIES,
        ),

      item_type:
        z.enum(
          BUDGET_ITEM_TYPES,
        ),

      amount:
        moneySchema,

      frequency:
        frequencySchema
          .optional(),

      due_day:
        z
          .number()
          .finite()
          .int()
          .min(
            DUE_DAY_MIN,
          )
          .max(
            DUE_DAY_MAX,
          )
          .nullable()
          .optional(),

      is_active:
        z
          .boolean()
          .optional(),

      notes:
        optionalNullableNotesSchema,
    })
    .strict();


export const budgetItemUpdateSchema =
  budgetItemInsertSchema
    .partial()
    .strict();


/* =========================================================
 * 7. MONTHLY SNAPSHOTS
 * ======================================================= */

export const monthlySnapshotInsertSchema =
  z
    .object({
      month:
        monthDateSchema,

      total_income:
        moneySchema
          .optional(),

      total_budget:
        moneySchema
          .optional(),

      total_savings:
        moneySchema
          .optional(),

      total_investments:
        moneySchema
          .optional(),

      available_amount:
        signedMoneySchema
          .optional(),

      emergency_fund_balance:
        moneySchema
          .optional(),

      travel_savings_balance:
        moneySchema
          .optional(),

      notes:
        optionalNullableNotesSchema,
    })
    .strict();


export const monthlySnapshotUpdateSchema =
  z
    .object({
      total_income:
        moneySchema
          .optional(),

      total_budget:
        moneySchema
          .optional(),

      total_savings:
        moneySchema
          .optional(),

      total_investments:
        moneySchema
          .optional(),

      available_amount:
        signedMoneySchema
          .optional(),

      emergency_fund_balance:
        moneySchema
          .optional(),

      travel_savings_balance:
        moneySchema
          .optional(),

      notes:
        optionalNullableNotesSchema,
    })
    .strict();


/* =========================================================
 * 8. INVESTMENT ASSETS
 * ======================================================= */

const tickerSchema =
  z
    .string()
    .trim()
    .min(
      1,
      "الرمز مطلوب.",
    )
    .max(
      32,
    )
    .refine(
      (
        value,
      ) =>
        value ===
        value.toUpperCase(),

      "رمز الاستثمار يجب أن يكون بأحرف كبيرة.",
    );


export const investmentAssetInsertSchema =
  z
    .object({
      ticker:
        tickerSchema,

      name:
        titleSchema,

      market:
        z
          .string()
          .trim()
          .min(
            1,
          )
          .max(
            80,
          ),

      asset_type:
        z.enum(
          INVESTMENT_ASSET_TYPES,
        ),

      currency:
        currencyCodeSchema
          .optional(),

      quantity:
        nonNegativeNumberSchema
          .optional(),

      average_cost:
        nonNegativeNumberSchema
          .optional(),

      reference_price:
        nonNegativeNumberSchema
          .nullable()
          .optional(),

      monthly_contribution_target:
        moneySchema
          .nullable()
          .optional(),

      target_quantity:
        nonNegativeNumberSchema
          .nullable()
          .optional(),

      is_active:
        z
          .boolean()
          .optional(),

      notes:
        optionalNullableNotesSchema,
    })
    .strict();


export const investmentAssetUpdateSchema =
  investmentAssetInsertSchema
    .partial()
    .strict();


/* =========================================================
 * 9. INVESTMENT TRANSACTIONS
 * ======================================================= */

const investmentTransactionBaseSchema =
  z
    .object({
      asset_id:
        uuidSchema,

      transaction_type:
        z.enum(
          INVESTMENT_TRANSACTION_TYPES,
        ),

      transaction_date:
        isoDateSchema,

      quantity:
        nonNegativeNumberSchema
          .nullable()
          .optional(),

      unit_price:
        nonNegativeNumberSchema
          .nullable()
          .optional(),

      total_amount:
        moneySchema,

      fees:
        moneySchema
          .optional(),

      notes:
        optionalNullableNotesSchema,
    })
    .strict();


export const investmentTransactionInsertSchema =
  investmentTransactionBaseSchema
    .superRefine(
      (
        value,
        context,
      ) => {
        if (
          value.transaction_type ===
            "buy" ||
          value.transaction_type ===
            "sell"
        ) {
          if (
            value.quantity ===
              null ||
            value.quantity ===
              undefined ||
            value.quantity <=
              0
          ) {
            context.addIssue({
              code:
                "custom",

              path: [
                "quantity",
              ],

              message:
                "الكمية مطلوبة ويجب أن تكون أكبر من صفر لعمليات الشراء والبيع.",
            });
          }


          if (
            value.unit_price ===
              null ||
            value.unit_price ===
              undefined ||
            value.unit_price <=
              0
          ) {
            context.addIssue({
              code:
                "custom",

              path: [
                "unit_price",
              ],

              message:
                "سعر الوحدة مطلوب ويجب أن يكون أكبر من صفر لعمليات الشراء والبيع.",
            });
          }
        }
      },
    );


export const investmentTransactionUpdateSchema =
  investmentTransactionBaseSchema
    .partial()
    .strict();


/* =========================================================
 * 10. GOALS
 * ======================================================= */

export const goalInsertSchema =
  z
    .object({
      title:
        titleSchema,

      category:
        z.enum(
          GOAL_CATEGORIES,
        ),

      description:
        optionalNullableShortTextSchema,

      target_value:
        finiteNumberSchema
          .nullable()
          .optional(),

      current_value:
        finiteNumberSchema
          .nullable()
          .optional(),

      unit:
        z
          .string()
          .trim()
          .min(
            1,
          )
          .max(
            30,
          )
          .nullable()
          .optional(),

      progress_percent:
        progressPercentSchema
          .optional(),

      target_date:
        isoDateSchema
          .nullable()
          .optional(),

      priority:
        prioritySchema
          .optional(),

      status:
        z
          .enum(
            GOAL_STATUSES,
          )
          .optional(),

      next_action:
        optionalNullableShortTextSchema,

      sort_order:
        z
          .number()
          .finite()
          .int()
          .min(
            0,
          )
          .optional(),
    })
    .strict();


export const goalUpdateSchema =
  goalInsertSchema
    .partial()
    .strict();


/* =========================================================
 * 11. PROJECTS
 * ======================================================= */

const projectBaseSchema =
  z
    .object({
      goal_id:
        uuidSchema
          .nullable()
          .optional(),

      title:
        titleSchema,

      description:
        optionalNullableShortTextSchema,

      category:
        z.enum(
          PROJECT_CATEGORIES,
        ),

      status:
        z
          .enum(
            PROJECT_STATUSES,
          )
          .optional(),

      progress_percent:
        progressPercentSchema
          .optional(),

      priority:
        prioritySchema
          .optional(),

      start_date:
        isoDateSchema
          .nullable()
          .optional(),

      target_date:
        isoDateSchema
          .nullable()
          .optional(),

      next_action:
        optionalNullableShortTextSchema,
    })
    .strict();


export const projectInsertSchema =
  projectBaseSchema
    .superRefine(
      (
        value,
        context,
      ) => {
        if (
          !isDateRangeValid(
            value.start_date,
            value.target_date,
          )
        ) {
          context.addIssue({
            code:
              "custom",

            path: [
              "target_date",
            ],

            message:
              "تاريخ الهدف لا يمكن أن يسبق تاريخ البداية.",
          });
        }
      },
    );


export const projectUpdateSchema =
  projectBaseSchema
    .partial()
    .strict()
    .superRefine(
      (
        value,
        context,
      ) => {
        if (
          !isDateRangeValid(
            value.start_date,
            value.target_date,
          )
        ) {
          context.addIssue({
            code:
              "custom",

            path: [
              "target_date",
            ],

            message:
              "تاريخ الهدف لا يمكن أن يسبق تاريخ البداية.",
          });
        }
      },
    );


/* =========================================================
 * 12. TASKS
 * ======================================================= */

const taskBaseSchema =
  z
    .object({
      goal_id:
        uuidSchema
          .nullable()
          .optional(),

      project_id:
        uuidSchema
          .nullable()
          .optional(),

      title:
        titleSchema,

      notes:
        optionalNullableNotesSchema,

      priority:
        prioritySchema
          .optional(),

      status:
        z
          .enum(
            TASK_STATUSES,
          )
          .optional(),

      due_date:
        isoDateSchema
          .nullable()
          .optional(),

      completed_at:
        isoDateTimeSchema
          .nullable()
          .optional(),
    })
    .strict();


export const taskInsertSchema =
  taskBaseSchema
    .superRefine(
      (
        value,
        context,
      ) => {
        const status =
          value.status ??
          "pending";


        const completedAt =
          value.completed_at ??
          null;


        if (
          status ===
            "completed" &&
          completedAt ===
            null
        ) {
          context.addIssue({
            code:
              "custom",

            path: [
              "completed_at",
            ],

            message:
              "وقت الإكمال مطلوب للمهمة المكتملة.",
          });
        }


        if (
          status !==
            "completed" &&
          completedAt !==
            null
        ) {
          context.addIssue({
            code:
              "custom",

            path: [
              "completed_at",
            ],

            message:
              "لا يمكن إضافة وقت إكمال لمهمة غير مكتملة.",
          });
        }
      },
    );


export const taskUpdateSchema =
  taskBaseSchema
    .partial()
    .strict()
    .superRefine(
      (
        value,
        context,
      ) => {
        if (
          value.completed_at !==
            undefined &&
          value.status ===
            undefined
        ) {
          context.addIssue({
            code:
              "custom",

            path: [
              "status",
            ],

            message:
              "يجب إرسال حالة المهمة عند تغيير وقت الإكمال.",
          });
        }


        if (
          value.status ===
            "completed" &&
          (
            value.completed_at ===
              undefined ||
            value.completed_at ===
              null
          )
        ) {
          context.addIssue({
            code:
              "custom",

            path: [
              "completed_at",
            ],

            message:
              "وقت الإكمال مطلوب عند إكمال المهمة.",
          });
        }


        if (
          value.status !==
            undefined &&
          value.status !==
            "completed" &&
          value.completed_at !==
            undefined &&
          value.completed_at !==
            null
        ) {
          context.addIssue({
            code:
              "custom",

            path: [
              "completed_at",
            ],

            message:
              "المهمة غير المكتملة لا يمكن أن تحتوي وقت إكمال.",
          });
        }
      },
    );


/* =========================================================
 * 13. LEARNING ITEMS
 * ======================================================= */

const learningItemBaseSchema =
  z
    .object({
      goal_id:
        uuidSchema
          .nullable()
          .optional(),

      title:
        titleSchema,

      provider:
        z
          .string()
          .trim()
          .min(
            1,
          )
          .max(
            120,
          )
          .nullable()
          .optional(),

      item_type:
        z.enum(
          LEARNING_ITEM_TYPES,
        ),

      status:
        z
          .enum(
            LEARNING_STATUSES,
          )
          .optional(),

      priority:
        prioritySchema
          .optional(),

      progress_percent:
        progressPercentSchema
          .optional(),

      start_date:
        isoDateSchema
          .nullable()
          .optional(),

      target_date:
        isoDateSchema
          .nullable()
          .optional(),

      completed_date:
        isoDateSchema
          .nullable()
          .optional(),

      url:
        optionalNullableHttpUrlSchema,

      cost:
        moneySchema
          .nullable()
          .optional(),

      currency:
        currencyCodeSchema
          .optional(),

      notes:
        optionalNullableNotesSchema,
    })
    .strict();


function validateLearningDates(
  value: {
    start_date?:
      string |
      null;

    target_date?:
      string |
      null;

    completed_date?:
      string |
      null;
  },

  addIssue: (
    path:
      string[],

    message:
      string,
  ) => void,
): void {
  if (
    !isDateRangeValid(
      value.start_date,
      value.target_date,
    )
  ) {
    addIssue(
      [
        "target_date",
      ],
      "تاريخ الهدف لا يمكن أن يسبق تاريخ البداية.",
    );
  }


  if (
    value.start_date &&
    value.completed_date &&
    value.completed_date <
      value.start_date
  ) {
    addIssue(
      [
        "completed_date",
      ],
      "تاريخ الإكمال لا يمكن أن يسبق تاريخ البداية.",
    );
  }
}


export const learningItemInsertSchema =
  learningItemBaseSchema
    .superRefine(
      (
        value,
        context,
      ) => {
        validateLearningDates(
          value,
          (
            path,
            message,
          ) => {
            context.addIssue({
              code:
                "custom",

              path,

              message,
            });
          },
        );
      },
    );


export const learningItemUpdateSchema =
  learningItemBaseSchema
    .partial()
    .strict()
    .superRefine(
      (
        value,
        context,
      ) => {
        validateLearningDates(
          value,
          (
            path,
            message,
          ) => {
            context.addIssue({
              code:
                "custom",

              path,

              message,
            });
          },
        );
      },
    );


/* =========================================================
 * 14. CAREER ITEMS
 * ======================================================= */

const careerItemBaseSchema =
  z
    .object({
      goal_id:
        uuidSchema
          .nullable()
          .optional(),

      item_type:
        z.enum(
          CAREER_ITEM_TYPES,
        ),

      title:
        titleSchema,

      description:
        optionalNullableShortTextSchema,

      status:
        z
          .enum(
            CAREER_STATUSES,
          )
          .optional(),

      priority:
        prioritySchema
          .optional(),

      rating:
        z
          .number()
          .finite()
          .int()
          .min(
            CAREER_RATING_MIN,
          )
          .max(
            CAREER_RATING_MAX,
          )
          .nullable()
          .optional(),

      event_date:
        isoDateSchema
          .nullable()
          .optional(),

      target_date:
        isoDateSchema
          .nullable()
          .optional(),

      evidence_url:
        optionalNullableHttpUrlSchema,

      notes:
        optionalNullableNotesSchema,
    })
    .strict();


export const careerItemInsertSchema =
  careerItemBaseSchema
    .superRefine(
      (
        value,
        context,
      ) => {
        if (
          !isDateRangeValid(
            value.event_date,
            value.target_date,
          )
        ) {
          context.addIssue({
            code:
              "custom",

            path: [
              "target_date",
            ],

            message:
              "تاريخ الهدف لا يمكن أن يسبق تاريخ الحدث.",
          });
        }
      },
    );


export const careerItemUpdateSchema =
  careerItemBaseSchema
    .partial()
    .strict()
    .superRefine(
      (
        value,
        context,
      ) => {
        if (
          !isDateRangeValid(
            value.event_date,
            value.target_date,
          )
        ) {
          context.addIssue({
            code:
              "custom",

            path: [
              "target_date",
            ],

            message:
              "تاريخ الهدف لا يمكن أن يسبق تاريخ الحدث.",
          });
        }
      },
    );


/* =========================================================
 * 14A. TRAVEL OS — DOMAIN VALUES
 * ======================================================= */

export const TRIP_STATUSES = [
  "planned",
  "booked",
  "active",
  "completed",
  "cancelled",
] as const;


export const DOCUMENT_CATEGORIES = [
  "travel",
  "education",
  "career",
  "finance",
  "personal",
  "general",
  "other",
] as const;


export const DOCUMENT_STATUSES = [
  "active",
  "archived",
] as const;


export const PRIVATE_DOCUMENT_STORAGE_BUCKET =
  "life-os-private-documents" as const;


export const PRIVATE_DOCUMENT_MIME_TYPE =
  "application/pdf" as const;


export const PRIVATE_DOCUMENT_MAX_SIZE_BYTES =
  15 * 1024 * 1024;


/* =========================================================
 * 14B. TRAVEL OS — TRIPS
 * ======================================================= */

export const tripStatusSchema =
  z.enum(
    TRIP_STATUSES,
  );


export const tripDestinationSchema =
  z
    .string()
    .trim()
    .min(
      1,
      "الوجهة مطلوبة.",
    )
    .max(
      160,
      "اسم الوجهة طويل جدًا.",
    );


const tripBaseSchema =
  z
    .object({
      title:
        titleSchema,

      destination:
        tripDestinationSchema,

      start_date:
        isoDateSchema
          .nullable()
          .optional(),

      end_date:
        isoDateSchema
          .nullable()
          .optional(),

      status:
        tripStatusSchema
          .optional(),

      budget_total:
        moneySchema
          .nullable()
          .optional(),

      currency:
        currencyCodeSchema
          .optional(),

      readiness_percent:
        progressPercentSchema
          .optional(),

      notes:
        optionalNullableNotesSchema,
    })
    .strict();


function validateTripDates(
  value: {
    start_date?:
      string |
      null;

    end_date?:
      string |
      null;
  },

  addIssue: (
    path:
      string[],

    message:
      string,
  ) => void,
): void {
  if (
    !isDateRangeValid(
      value.start_date,
      value.end_date,
    )
  ) {
    addIssue(
      [
        "end_date",
      ],
      "تاريخ نهاية الرحلة لا يمكن أن يسبق تاريخ البداية.",
    );
  }
}


export const tripInsertSchema =
  tripBaseSchema
    .superRefine(
      (
        value,
        context,
      ) => {
        validateTripDates(
          value,
          (
            path,
            message,
          ) => {
            context.addIssue({
              code:
                "custom",

              path,

              message,
            });
          },
        );
      },
    );


export const tripUpdateSchema =
  tripBaseSchema
    .partial()
    .strict()
    .superRefine(
      (
        value,
        context,
      ) => {
        validateTripDates(
          value,
          (
            path,
            message,
          ) => {
            context.addIssue({
              code:
                "custom",

              path,

              message,
            });
          },
        );
      },
    );


/* =========================================================
 * 14C. PRIVATE DOCUMENTS
 * ======================================================= */

export const documentCategorySchema =
  z.enum(
    DOCUMENT_CATEGORIES,
  );


export const documentStatusSchema =
  z.enum(
    DOCUMENT_STATUSES,
  );


export const documentFileNameSchema =
  z
    .string()
    .trim()
    .min(
      1,
      "اسم الملف مطلوب.",
    )
    .max(
      255,
      "اسم الملف طويل جدًا.",
    )
    .refine(
      (
        value,
      ) =>
        !value.includes(
          "/",
        ) &&
        !value.includes(
          "\\",
        ),

      "اسم الملف لا يمكن أن يحتوي مسارًا.",
    )
    .refine(
      (
        value,
      ) =>
        value
          .toLowerCase()
          .endsWith(
            ".pdf",
          ),

      "يسمح حاليًا بملفات PDF فقط.",
    );


export const documentMimeTypeSchema =
  z.literal(
    PRIVATE_DOCUMENT_MIME_TYPE,
  );


export const documentFileSizeSchema =
  z
    .number()
    .finite()
    .int()
    .positive(
      "حجم الملف غير صالح.",
    )
    .max(
      PRIVATE_DOCUMENT_MAX_SIZE_BYTES,
      "حجم ملف PDF أكبر من 15 MB.",
    );


export const documentStorageBucketSchema =
  z.literal(
    PRIVATE_DOCUMENT_STORAGE_BUCKET,
  );


export const documentStoragePathSchema =
  z
    .string()
    .trim()
    .min(
      1,
      "مسار الملف مطلوب.",
    )
    .max(
      1_024,
      "مسار الملف طويل جدًا.",
    )
    .refine(
      isSafeStoragePath,
      "مسار الملف الخاص غير صالح.",
    );


/**
 * Metadata schema only.
 *
 * This does NOT upload a PDF.
 *
 * Ownership is not accepted here.
 *
 * user_id must be derived by authenticated server code.
 */
export const documentInsertSchema =
  z
    .object({
      trip_id:
        uuidSchema
          .nullable()
          .optional(),

      title:
        titleSchema,

      category:
        documentCategorySchema
          .optional(),

      file_name:
        documentFileNameSchema,

      mime_type:
        documentMimeTypeSchema
          .optional(),

      file_size_bytes:
        documentFileSizeSchema,

      storage_bucket:
        documentStorageBucketSchema
          .optional(),

      storage_path:
        documentStoragePathSchema,

      status:
        documentStatusSchema
          .optional(),

      notes:
        optionalNullableNotesSchema,
    })
    .strict();


/**
 * Generic metadata updates intentionally cannot modify:
 *
 * file_name
 * mime_type
 * file_size_bytes
 * storage_bucket
 * storage_path
 *
 * File replacement requires a coordinated Storage operation.
 */
export const documentUpdateSchema =
  z
    .object({
      trip_id:
        uuidSchema
          .nullable()
          .optional(),

      title:
        titleSchema
          .optional(),

      category:
        documentCategorySchema
          .optional(),

      status:
        documentStatusSchema
          .optional(),

      notes:
        optionalNullableNotesSchema,
    })
    .strict();


/* =========================================================
 * 15. MEMORY
 * ======================================================= */

export const memoryItemInsertSchema =
  z
    .object({
      category:
        z.enum(
          MEMORY_CATEGORIES,
        ),

      title:
        titleSchema,

      content:
        z
          .string()
          .trim()
          .min(
            1,
            "محتوى الذاكرة مطلوب.",
          )
          .max(
            MEMORY_CONTENT_MAX_LENGTH,
          ),

      importance:
        prioritySchema
          .optional(),

      is_active:
        z
          .boolean()
          .optional(),
    })
    .strict();


export const memoryItemUpdateSchema =
  memoryItemInsertSchema
    .partial()
    .strict();


/* =========================================================
 * 16. AI RECOMMENDATIONS
 * ======================================================= */

const aiRecommendationBaseSchema =
  z
    .object({
      category:
        z.enum(
          AI_RECOMMENDATION_CATEGORIES,
        ),

      title:
        titleSchema,

      recommendation:
        z
          .string()
          .trim()
          .min(
            1,
          )
          .max(
            AI_RECOMMENDATION_MAX_LENGTH,
          ),

      priority:
        prioritySchema
          .optional(),

      status:
        z
          .enum(
            AI_RECOMMENDATION_STATUSES,
          )
          .optional(),

      related_entity_type:
        z
          .enum(
            AI_RECOMMENDATION_ENTITY_TYPES,
          )
          .nullable()
          .optional(),

      related_entity_id:
        uuidSchema
          .nullable()
          .optional(),

      reviewed_at:
        isoDateTimeSchema
          .nullable()
          .optional(),
    })
    .strict();


function validateRecommendationRelationship(
  value: {
    related_entity_type?:
      string |
      null;

    related_entity_id?:
      string |
      null;
  },

  addIssue: (
    path:
      string[],

    message:
      string,
  ) => void,
): void {
  const hasType =
    value.related_entity_type !==
      undefined &&
    value.related_entity_type !==
      null;


  const hasId =
    value.related_entity_id !==
      undefined &&
    value.related_entity_id !==
      null;


  if (
    hasType !==
    hasId
  ) {
    addIssue(
      [
        "related_entity_id",
      ],
      "نوع العنصر ومعرّفه يجب أن يوجدا معًا أو يكونا فارغين معًا.",
    );
  }
}


export const aiRecommendationInsertSchema =
  aiRecommendationBaseSchema
    .superRefine(
      (
        value,
        context,
      ) => {
        validateRecommendationRelationship(
          value,
          (
            path,
            message,
          ) => {
            context.addIssue({
              code:
                "custom",

              path,

              message,
            });
          },
        );


        const status =
          value.status ??
          "new";


        const reviewedAt =
          value.reviewed_at ??
          null;


        if (
          status ===
            "new" &&
          reviewedAt !==
            null
        ) {
          context.addIssue({
            code:
              "custom",

            path: [
              "reviewed_at",
            ],

            message:
              "التوصية الجديدة لا يجب أن تحتوي وقت مراجعة.",
          });
        }


        if (
          status !==
            "new" &&
          reviewedAt ===
            null
        ) {
          context.addIssue({
            code:
              "custom",

            path: [
              "reviewed_at",
            ],

            message:
              "وقت المراجعة مطلوب للتوصية التي تمت مراجعتها.",
          });
        }
      },
    );


export const aiRecommendationUpdateSchema =
  aiRecommendationBaseSchema
    .partial()
    .strict()
    .superRefine(
      (
        value,
        context,
      ) => {
        const relationshipFieldsProvided =
          value.related_entity_type !==
            undefined ||
          value.related_entity_id !==
            undefined;


        if (
          relationshipFieldsProvided
        ) {
          validateRecommendationRelationship(
            value,
            (
              path,
              message,
            ) => {
              context.addIssue({
                code:
                  "custom",

                path,

                message,
              });
            },
          );
        }


        if (
          value.reviewed_at !==
            undefined &&
          value.status ===
            undefined
        ) {
          context.addIssue({
            code:
              "custom",

            path: [
              "status",
            ],

            message:
              "يجب إرسال حالة التوصية عند تغيير وقت المراجعة.",
          });
        }


        if (
          value.status ===
            "new" &&
          value.reviewed_at !==
            undefined &&
          value.reviewed_at !==
            null
        ) {
          context.addIssue({
            code:
              "custom",

            path: [
              "reviewed_at",
            ],

            message:
              "التوصية الجديدة لا يجب أن تحتوي وقت مراجعة.",
          });
        }


        if (
          value.status !==
            undefined &&
          value.status !==
            "new" &&
          (
            value.reviewed_at ===
              undefined ||
            value.reviewed_at ===
              null
          )
        ) {
          context.addIssue({
            code:
              "custom",

            path: [
              "reviewed_at",
            ],

            message:
              "وقت المراجعة مطلوب عند تغيير حالة التوصية.",
          });
        }
      },
    );


/* =========================================================
 * 17. JSON VALUE
 * ======================================================= */

export const jsonValueSchema:
z.ZodType<JsonValue> =
  z.lazy(
    () =>
      z.union([
        z.string(),

        z
          .number()
          .finite(),

        z.boolean(),

        z.null(),

        z.array(
          jsonValueSchema,
        ),

        z.record(
          z.string(),
          jsonValueSchema,
        ),
      ]),
  );


export const jsonObjectSchema =
  z.record(
    z.string(),
    jsonValueSchema,
  );


/* =========================================================
 * 18. AUDIT METADATA
 * ======================================================= */

export const auditMetadataSchema =
  jsonObjectSchema
    .superRefine(
      (
        metadata,
        context,
      ) => {
        const topLevelKeys =
          Object.keys(
            metadata,
          );


        if (
          topLevelKeys.length >
          AUDIT_METADATA_MAX_KEYS
        ) {
          context.addIssue({
            code:
              "custom",

            message:
              `بيانات السجل تتجاوز الحد المسموح وهو ${AUDIT_METADATA_MAX_KEYS} مفاتيح.`,
          });
        }


        const inspectValue = (
          value:
            JsonValue,

          path:
            Array<
              string |
              number
            >,
        ): void => {
          if (
            typeof value ===
            "string"
          ) {
            if (
              value.length >
              AUDIT_METADATA_MAX_STRING_LENGTH
            ) {
              context.addIssue({
                code:
                  "custom",

                path,

                message:
                  "النص داخل بيانات السجل طويل جدًا.",
              });
            }


            return;
          }


          if (
            Array.isArray(
              value,
            )
          ) {
            value.forEach(
              (
                item,
                index,
              ) => {
                inspectValue(
                  item,
                  [
                    ...path,
                    index,
                  ],
                );
              },
            );


            return;
          }


          if (
            value !==
              null &&
            typeof value ===
              "object"
          ) {
            Object.entries(
              value,
            ).forEach(
              (
                [
                  key,
                  childValue,
                ],
              ) => {
                const normalizedKey =
                  normalizeAuditKey(
                    key,
                  );


                if (
                  forbiddenAuditKeys.has(
                    normalizedKey,
                  )
                ) {
                  context.addIssue({
                    code:
                      "custom",

                    path: [
                      ...path,
                      key,
                    ],

                    message:
                      "هذا المفتاح غير مسموح داخل سجل التدقيق.",
                  });
                }


                inspectValue(
                  childValue,
                  [
                    ...path,
                    key,
                  ],
                );
              },
            );
          }
        };


        Object.entries(
          metadata,
        ).forEach(
          (
            [
              key,
              value,
            ],
          ) => {
            const normalizedKey =
              normalizeAuditKey(
                key,
              );


            if (
              forbiddenAuditKeys.has(
                normalizedKey,
              )
            ) {
              context.addIssue({
                code:
                  "custom",

                path: [
                  key,
                ],

                message:
                  "هذا المفتاح غير مسموح داخل سجل التدقيق.",
              });
            }


            inspectValue(
              value,
              [
                key,
              ],
            );
          },
        );
      },
    );


export const auditLogInsertSchema =
  z
    .object({
      action:
        z
          .string()
          .trim()
          .min(
            1,
          )
          .max(
            100,
          )
          .regex(
            /^[A-Z0-9_]+$/,
            "اسم عملية السجل غير صالح.",
          ),

      entity_type:
        z
          .string()
          .trim()
          .min(
            1,
          )
          .max(
            80,
          )
          .nullable()
          .optional(),

      entity_id:
        uuidSchema
          .nullable()
          .optional(),

      metadata:
        auditMetadataSchema
          .optional(),
    })
    .strict()
    .superRefine(
      (
        value,
        context,
      ) => {
        if (
          value.entity_id !==
            undefined &&
          value.entity_id !==
            null &&
          (
            value.entity_type ===
              undefined ||
            value.entity_type ===
              null
          )
        ) {
          context.addIssue({
            code:
              "custom",

            path: [
              "entity_type",
            ],

            message:
              "نوع العنصر مطلوب عند وجود معرّف العنصر.",
          });
        }
      },
    );


/* =========================================================
 * 19. UNIVERSAL INTAKE CONSTANTS
 * ======================================================= */

export const INTAKE_KINDS = [
  "finance",
  "plan",
  "travel",
  "growth",
  "document",
  "note",
] as const;


export const INTAKE_STATUSES = [
  "previewed",
  "approved",
  "applied",
  "failed",
  "cancelled",
] as const;


export const INTAKE_TARGET_ENTITY_TYPES = [
  "income_source",
  "budget_item",
  "investment_asset",
  "investment_transaction",
  "goal",
  "project",
  "task",
  "learning_item",
  "career_item",
  "memory_item",
  "trip",
  "document",
] as const;


/**
 * ACTIVE structured actions only.
 *
 * create_trip is deliberately NOT here yet.
 */
export const STRUCTURED_INTAKE_PROPOSAL_ACTIONS = [
  "create_income_source",
  "create_budget_item",
  "create_goal",
  "create_project",
  "create_learning_item",
  "create_career_item",
] as const;


/**
 * Staged Travel action.
 *
 * Defined and validated, but not yet activated in the
 * master structured proposal union.
 */
export const TRAVEL_INTAKE_PROPOSAL_ACTIONS = [
  "create_trip",
] as const;


const INTAKE_TEXT_MAX_LENGTH =
  4_000;


const INTAKE_FILE_NAME_MAX_LENGTH =
  255;


const INTAKE_FILE_SIZE_MAX_BYTES =
  15 * 1024 * 1024;


const INTAKE_TITLE_MAX_LENGTH =
  160;


const INTAKE_LABEL_MAX_LENGTH =
  60;


const INTAKE_SUMMARY_MAX_LENGTH =
  700;


const INTAKE_NEXT_ACTION_MAX_LENGTH =
  500;


const INTAKE_ERROR_CODE_MAX_LENGTH =
  100;


/* =========================================================
 * 20. UNIVERSAL INTAKE COMMON SCHEMAS
 * ======================================================= */

export const intakeKindSchema =
  z.enum(
    INTAKE_KINDS,
  );


export const intakeStatusSchema =
  z.enum(
    INTAKE_STATUSES,
  );


export const intakeTargetEntityTypeSchema =
  z.enum(
    INTAKE_TARGET_ENTITY_TYPES,
  );


export const structuredIntakeProposalActionSchema =
  z.enum(
    STRUCTURED_INTAKE_PROPOSAL_ACTIONS,
  );


export const travelIntakeProposalActionSchema =
  z.enum(
    TRAVEL_INTAKE_PROPOSAL_ACTIONS,
  );


export const intakeConfidenceSchema =
  z
    .number()
    .finite()
    .min(
      0,
    )
    .max(
      1,
    );


export const intakeSourceTextSchema =
  z
    .string()
    .trim()
    .min(
      1,
      "النص لا يمكن أن يكون فارغًا.",
    )
    .max(
      INTAKE_TEXT_MAX_LENGTH,
      "النص أطول من المسموح.",
    );


export const intakeFileNameSchema =
  z
    .string()
    .trim()
    .min(
      1,
      "اسم الملف مطلوب.",
    )
    .max(
      INTAKE_FILE_NAME_MAX_LENGTH,
      "اسم الملف طويل جدًا.",
    )
    .refine(
      (
        value,
      ) =>
        value
          .toLowerCase()
          .endsWith(
            ".pdf",
          ),

      "حالياً يدعم LIFE OS ملفات PDF فقط.",
    );


export const intakeFileMimeSchema =
  z.literal(
    "application/pdf",
  );


export const intakeFileSizeSchema =
  z
    .number()
    .finite()
    .int()
    .positive(
      "حجم الملف غير صالح.",
    )
    .max(
      INTAKE_FILE_SIZE_MAX_BYTES,
      "حجم ملف PDF أكبر من 15 MB.",
    );


export const intakeTitleSchema =
  z
    .string()
    .trim()
    .min(
      1,
      "العنوان مطلوب.",
    )
    .max(
      INTAKE_TITLE_MAX_LENGTH,
      "العنوان طويل جدًا.",
    );


export const intakeLabelSchema =
  z
    .string()
    .trim()
    .min(
      1,
    )
    .max(
      INTAKE_LABEL_MAX_LENGTH,
    );


export const intakeSummarySchema =
  z
    .string()
    .trim()
    .min(
      1,
      "الملخص مطلوب.",
    )
    .max(
      INTAKE_SUMMARY_MAX_LENGTH,
      "الملخص طويل جدًا.",
    );


export const intakeNextActionSchema =
  z
    .string()
    .trim()
    .min(
      1,
      "الخطوة التالية مطلوبة.",
    )
    .max(
      INTAKE_NEXT_ACTION_MAX_LENGTH,
      "الخطوة التالية طويلة جدًا.",
    );


export const intakeErrorCodeSchema =
  z
    .string()
    .trim()
    .min(
      1,
    )
    .max(
      INTAKE_ERROR_CODE_MAX_LENGTH,
    )
    .regex(
      /^[A-Z0-9_]+$/,
      "رمز الخطأ غير صالح.",
    );


/* =========================================================
 * 21. UNIVERSAL INTAKE PREVIEW — TRANSITIONAL
 * ======================================================= */

/**
 * Backwards-compatible preview boundary.
 *
 * It deliberately contains no proposal field.
 */
export const intakePreviewSchema =
  z
    .object({
      kind:
        intakeKindSchema,

      label:
        intakeLabelSchema,

      title:
        intakeTitleSchema,

      summary:
        intakeSummarySchema,

      confidence:
        intakeConfidenceSchema,

      next_action:
        intakeNextActionSchema,

      requires_confirmation:
        z.literal(
          true,
        ),
    })
    .strict();


/* =========================================================
 * 22. STRUCTURED PROPOSAL — FINANCE
 * ======================================================= */

const financeProposalCurrencySchema =
  currencyCodeSchema;


export const financeIncomeSourceProposalDataSchema =
  z
    .object({
      name:
        titleSchema,

      amount:
        positiveMoneySchema,

      currency:
        financeProposalCurrencySchema,

      frequency:
        frequencySchema,

      next_expected_date:
        isoDateSchema
          .nullable(),

      notes:
        notesSchema
          .nullable(),
    })
    .strict();


export const financeIncomeSourceProposalSchema =
  z
    .object({
      version:
        z.literal(
          1,
        ),

      kind:
        z.literal(
          "finance",
        ),

      action:
        z.literal(
          "create_income_source",
        ),

      data:
        financeIncomeSourceProposalDataSchema,
    })
    .strict();


export const financeBudgetItemProposalDataSchema =
  z
    .object({
      name:
        titleSchema,

      category:
        z.enum(
          BUDGET_CATEGORIES,
        ),

      item_type:
        z.enum(
          BUDGET_ITEM_TYPES,
        ),

      amount:
        positiveMoneySchema,

      currency:
        financeProposalCurrencySchema,

      frequency:
        frequencySchema,

      due_day:
        z
          .number()
          .finite()
          .int()
          .min(
            DUE_DAY_MIN,
          )
          .max(
            DUE_DAY_MAX,
          )
          .nullable(),

      notes:
        notesSchema
          .nullable(),
    })
    .strict();


export const financeBudgetItemProposalSchema =
  z
    .object({
      version:
        z.literal(
          1,
        ),

      kind:
        z.literal(
          "finance",
        ),

      action:
        z.literal(
          "create_budget_item",
        ),

      data:
        financeBudgetItemProposalDataSchema,
    })
    .strict();


export const financeIntakeProposalSchema =
  z.discriminatedUnion(
    "action",
    [
      financeIncomeSourceProposalSchema,
      financeBudgetItemProposalSchema,
    ],
  );


/* =========================================================
 * 23. STRUCTURED PROPOSAL — PLAN
 * ======================================================= */

export const goalProposalDataSchema =
  z
    .object({
      title:
        titleSchema,

      category:
        z.enum(
          GOAL_CATEGORIES,
        ),

      description:
        shortTextSchema
          .nullable(),

      target_value:
        finiteNumberSchema
          .nullable(),

      current_value:
        finiteNumberSchema
          .nullable(),

      unit:
        z
          .string()
          .trim()
          .min(
            1,
          )
          .max(
            30,
          )
          .nullable(),

      progress_percent:
        progressPercentSchema,

      target_date:
        isoDateSchema
          .nullable(),

      priority:
        prioritySchema,

      status:
        z.enum(
          GOAL_STATUSES,
        ),

      next_action:
        shortTextSchema
          .nullable(),

      sort_order:
        z
          .number()
          .finite()
          .int()
          .min(
            0,
          ),
    })
    .strict();


export const goalIntakeProposalSchema =
  z
    .object({
      version:
        z.literal(
          1,
        ),

      kind:
        z.literal(
          "plan",
        ),

      action:
        z.literal(
          "create_goal",
        ),

      data:
        goalProposalDataSchema,
    })
    .strict();


const projectProposalDataBaseSchema =
  z
    .object({
      goal_id:
        uuidSchema
          .nullable(),

      title:
        titleSchema,

      description:
        shortTextSchema
          .nullable(),

      category:
        z.enum(
          PROJECT_CATEGORIES,
        ),

      status:
        z.enum(
          PROJECT_STATUSES,
        ),

      progress_percent:
        progressPercentSchema,

      priority:
        prioritySchema,

      start_date:
        isoDateSchema
          .nullable(),

      target_date:
        isoDateSchema
          .nullable(),

      next_action:
        shortTextSchema
          .nullable(),
    })
    .strict();


export const projectProposalDataSchema =
  projectProposalDataBaseSchema
    .superRefine(
      (
        value,
        context,
      ) => {
        if (
          !isDateRangeValid(
            value.start_date,
            value.target_date,
          )
        ) {
          context.addIssue({
            code:
              "custom",

            path: [
              "target_date",
            ],

            message:
              "تاريخ الهدف لا يمكن أن يسبق تاريخ البداية.",
          });
        }
      },
    );


export const projectIntakeProposalSchema =
  z
    .object({
      version:
        z.literal(
          1,
        ),

      kind:
        z.literal(
          "plan",
        ),

      action:
        z.literal(
          "create_project",
        ),

      data:
        projectProposalDataSchema,
    })
    .strict();


export const planIntakeProposalSchema =
  z.discriminatedUnion(
    "action",
    [
      goalIntakeProposalSchema,
      projectIntakeProposalSchema,
    ],
  );


/* =========================================================
 * 24. STRUCTURED PROPOSAL — GROWTH
 * ======================================================= */

const learningProposalDataBaseSchema =
  z
    .object({
      goal_id:
        uuidSchema
          .nullable(),

      title:
        titleSchema,

      provider:
        z
          .string()
          .trim()
          .min(
            1,
          )
          .max(
            120,
          )
          .nullable(),

      item_type:
        z.enum(
          LEARNING_ITEM_TYPES,
        ),

      status:
        z.enum(
          LEARNING_STATUSES,
        ),

      priority:
        prioritySchema,

      progress_percent:
        progressPercentSchema,

      start_date:
        isoDateSchema
          .nullable(),

      target_date:
        isoDateSchema
          .nullable(),

      completed_date:
        isoDateSchema
          .nullable(),

      url:
        httpUrlSchema
          .nullable(),

      cost:
        moneySchema
          .nullable(),

      currency:
        currencyCodeSchema,

      notes:
        notesSchema
          .nullable(),
    })
    .strict();


export const learningProposalDataSchema =
  learningProposalDataBaseSchema
    .superRefine(
      (
        value,
        context,
      ) => {
        validateLearningDates(
          value,
          (
            path,
            message,
          ) => {
            context.addIssue({
              code:
                "custom",

              path,

              message,
            });
          },
        );
      },
    );


export const learningIntakeProposalSchema =
  z
    .object({
      version:
        z.literal(
          1,
        ),

      kind:
        z.literal(
          "growth",
        ),

      action:
        z.literal(
          "create_learning_item",
        ),

      data:
        learningProposalDataSchema,
    })
    .strict();


const careerProposalDataBaseSchema =
  z
    .object({
      goal_id:
        uuidSchema
          .nullable(),

      item_type:
        z.enum(
          CAREER_ITEM_TYPES,
        ),

      title:
        titleSchema,

      description:
        shortTextSchema
          .nullable(),

      status:
        z.enum(
          CAREER_STATUSES,
        ),

      priority:
        prioritySchema,

      rating:
        z
          .number()
          .finite()
          .int()
          .min(
            CAREER_RATING_MIN,
          )
          .max(
            CAREER_RATING_MAX,
          )
          .nullable(),

      event_date:
        isoDateSchema
          .nullable(),

      target_date:
        isoDateSchema
          .nullable(),

      evidence_url:
        httpUrlSchema
          .nullable(),

      notes:
        notesSchema
          .nullable(),
    })
    .strict();


export const careerProposalDataSchema =
  careerProposalDataBaseSchema
    .superRefine(
      (
        value,
        context,
      ) => {
        if (
          !isDateRangeValid(
            value.event_date,
            value.target_date,
          )
        ) {
          context.addIssue({
            code:
              "custom",

            path: [
              "target_date",
            ],

            message:
              "تاريخ الهدف لا يمكن أن يسبق تاريخ الحدث.",
          });
        }
      },
    );


export const careerIntakeProposalSchema =
  z
    .object({
      version:
        z.literal(
          1,
        ),

      kind:
        z.literal(
          "growth",
        ),

      action:
        z.literal(
          "create_career_item",
        ),

      data:
        careerProposalDataSchema,
    })
    .strict();


export const growthIntakeProposalSchema =
  z.discriminatedUnion(
    "action",
    [
      learningIntakeProposalSchema,
      careerIntakeProposalSchema,
    ],
  );


/* =========================================================
 * 24A. STRUCTURED PROPOSAL — TRAVEL — STAGED
 * ======================================================= */

/**
 * Travel has its own complete validation contract now.
 *
 * IMPORTANT:
 *
 * It is still deliberately excluded from:
 *
 * structuredIntakeProposalSchema
 *
 * strictIntakePreviewSchema structured kinds
 *
 * executeIntakeItem()
 *
 * until the exact proposal is shown in Universal Add.
 */

const tripProposalDataBaseSchema =
  z
    .object({
      title:
        titleSchema,

      destination:
        tripDestinationSchema,

      start_date:
        isoDateSchema
          .nullable(),

      end_date:
        isoDateSchema
          .nullable(),

      status:
        tripStatusSchema,

      budget_total:
        moneySchema
          .nullable(),

      currency:
        currencyCodeSchema,

      readiness_percent:
        progressPercentSchema,

      notes:
        notesSchema
          .nullable(),
    })
    .strict();


export const tripProposalDataSchema =
  tripProposalDataBaseSchema
    .superRefine(
      (
        value,
        context,
      ) => {
        if (
          !isDateRangeValid(
            value.start_date,
            value.end_date,
          )
        ) {
          context.addIssue({
            code:
              "custom",

            path: [
              "end_date",
            ],

            message:
              "تاريخ نهاية الرحلة لا يمكن أن يسبق تاريخ البداية.",
          });
        }
      },
    );


export const travelIntakeProposalSchema =
  z
    .object({
      version:
        z.literal(
          1,
        ),

      kind:
        z.literal(
          "travel",
        ),

      action:
        z.literal(
          "create_trip",
        ),

      data:
        tripProposalDataSchema,
    })
    .strict();


/* =========================================================
 * 24B. TRAVEL PROPOSAL SAFETY
 * ======================================================= */

/**
 * Example valid staged proposal:
 *
 * {
 *   version: 1,
 *   kind: "travel",
 *   action: "create_trip",
 *   data: {
 *     title: "رحلة سلوفينيا",
 *     destination: "Slovenia",
 *     start_date: "2027-01-09",
 *     end_date: "2027-01-16",
 *     status: "planned",
 *     budget_total: 12000,
 *     currency: "AED",
 *     readiness_percent: 0,
 *     notes: null
 *   }
 * }
 *
 *
 * Still NOT executable merely because this validates.
 */


/* =========================================================
 * 25. STRUCTURED PROPOSAL — ACTIVE MASTER UNION
 * ======================================================= */

/**
 * Active exact AI proposal actions.
 *
 * Travel is deliberately staged outside this union.
 *
 * Document is also deliberately absent.
 *
 * Note executes directly from approved source text.
 */
export const structuredIntakeProposalSchema =
  z.union([
    financeIncomeSourceProposalSchema,
    financeBudgetItemProposalSchema,
    goalIntakeProposalSchema,
    projectIntakeProposalSchema,
    learningIntakeProposalSchema,
    careerIntakeProposalSchema,
  ]);


/* =========================================================
 * 25A. STRICT UNIVERSAL INTAKE PREVIEW
 * ======================================================= */

/**
 * ACTIVE structured kinds:
 *
 * finance
 * plan
 * growth
 *
 * require an exact structured proposal.
 *
 *
 * Staged / non-structured kinds:
 *
 * travel
 * document
 * note
 *
 * must still contain proposal: null.
 *
 *
 * Travel changes only after its review UI is ready.
 */
export const strictIntakePreviewSchema =
  z
    .object({
      kind:
        intakeKindSchema,

      label:
        intakeLabelSchema,

      title:
        intakeTitleSchema,

      summary:
        intakeSummarySchema,

      confidence:
        intakeConfidenceSchema,

      next_action:
        intakeNextActionSchema,

      proposal:
        structuredIntakeProposalSchema
          .nullable(),

      requires_confirmation:
        z.literal(
          true,
        ),
    })
    .strict()
    .superRefine(
      (
        value,
        context,
      ) => {
        if (
          value.kind ===
            "finance" ||
          value.kind ===
            "plan" ||
          value.kind ===
            "growth"
        ) {
          if (
            value.proposal ===
            null
          ) {
            context.addIssue({
              code:
                "custom",

              path: [
                "proposal",
              ],

              message:
                "هذا النوع يحتاج اقتراحًا منظمًا قبل التأكيد.",
            });


            return;
          }


          if (
            value.proposal.kind !==
            value.kind
          ) {
            context.addIssue({
              code:
                "custom",

              path: [
                "proposal",
                "kind",
              ],

              message:
                "نوع الاقتراح لا يطابق تصنيف الإضافة.",
            });
          }


          return;
        }


        if (
          value.proposal !==
          null
        ) {
          context.addIssue({
            code:
              "custom",

            path: [
              "proposal",
            ],

            message:
              "هذا النوع لا يستخدم اقتراحًا منظمًا حاليًا.",
          });
        }
      },
    );


/* =========================================================
 * 25B. STRICT PREVIEW TYPE
 * ======================================================= */

export type StrictIntakePreview =
  z.infer<
    typeof strictIntakePreviewSchema
  >;


/* =========================================================
 * 25C. TRAVEL STAGING RULE
 * ======================================================= */

/**
 * travelIntakeProposalSchema
 *
 * = valid Travel proposal contract.
 *
 *
 * structuredIntakeProposalSchema
 *
 * = active executable/reviewable proposal union.
 *
 *
 * They remain separate for one reason:
 *
 * User must be able to see every exact Travel value before
 * Travel becomes confirmable.
 */


/* =========================================================
 * 26. STRUCTURED PROPOSAL — KIND CONSISTENCY
 * ======================================================= */

export function validateStructuredProposalForIntakeKind(
  intakeKind:
    "finance" |
    "plan" |
    "travel" |
    "growth" |
    "document" |
    "note",

  proposal:
    unknown,
):
  | {
      success:
        true;

      data:
        z.infer<
          typeof structuredIntakeProposalSchema
        >;
    }
  | {
      success:
        false;

      error:
        string;
    } {
  const validation =
    structuredIntakeProposalSchema.safeParse(
      proposal,
    );


  if (
    !validation.success
  ) {
    return {
      success:
        false,

      error:
        getFirstValidationError(
          validation.error,
        ),
    };
  }


  if (
    validation.data.kind !==
    intakeKind
  ) {
    return {
      success:
        false,

      error:
        "نوع الاقتراح لا يطابق تصنيف الإضافة.",
    };
  }


  return {
    success:
      true,

    data:
      validation.data,
  };
}


/* =========================================================
 * 26A. STAGED TRAVEL PROPOSAL VALIDATOR
 * ======================================================= */

/**
 * This helper validates Travel values only.
 *
 * It does NOT make Travel executable.
 */
export function validateTravelIntakeProposal(
  proposal:
    unknown,
):
  | {
      success:
        true;

      data:
        z.infer<
          typeof travelIntakeProposalSchema
        >;
    }
  | {
      success:
        false;

      error:
        string;
    } {
  const validation =
    travelIntakeProposalSchema.safeParse(
      proposal,
    );


  if (
    !validation.success
  ) {
    return {
      success:
        false,

      error:
        getFirstValidationError(
          validation.error,
        ),
    };
  }


  return {
    success:
      true,

    data:
      validation.data,
  };
}


/* =========================================================
 * 27. STRUCTURED PROPOSAL — EXECUTION TARGET
 * ======================================================= */

export function getStructuredProposalTarget(
  proposal:
    z.infer<
      typeof structuredIntakeProposalSchema
    >,
):
  | "income_source"
  | "budget_item"
  | "goal"
  | "project"
  | "learning_item"
  | "career_item" {
  switch (
    proposal.action
  ) {
    case "create_income_source":
      return "income_source";

    case "create_budget_item":
      return "budget_item";

    case "create_goal":
      return "goal";

    case "create_project":
      return "project";

    case "create_learning_item":
      return "learning_item";

    case "create_career_item":
      return "career_item";
  }
}


/* =========================================================
 * 27A. STAGED TRAVEL EXECUTION TARGET
 * ======================================================= */

/**
 * This is only a deterministic mapping helper.
 *
 * It does not execute anything.
 */
export function getTravelProposalTarget(
  proposal:
    z.infer<
      typeof travelIntakeProposalSchema
    >,
):
  "trip" {
  switch (
    proposal.action
  ) {
    case "create_trip":
      return "trip";
  }
}


/* =========================================================
 * 28. UNIVERSAL INTAKE VALIDATION HELPERS
 * ======================================================= */

interface IntakeSourceFields {
  source_text?:
    string |
    null;

  source_file_name?:
    string |
    null;

  source_file_mime?:
    string |
    null;

  source_file_size_bytes?:
    number |
    null;
}


interface IntakeTargetFields {
  target_entity_type?:
    string |
    null;

  target_entity_id?:
    string |
    null;
}


interface IntakeLifecycleFields {
  status?:
    string;

  approved_at?:
    string |
    null;

  applied_at?:
    string |
    null;
}


function validateIntakeSource(
  value:
    IntakeSourceFields,

  addIssue: (
    path:
      string[],

    message:
      string,
  ) => void,
): void {
  const hasText =
    typeof value.source_text ===
      "string" &&
    value.source_text
      .trim()
      .length >
      0;


  const fileNamePresent =
    value.source_file_name !==
      undefined &&
    value.source_file_name !==
      null;


  const fileMimePresent =
    value.source_file_mime !==
      undefined &&
    value.source_file_mime !==
      null;


  const fileSizePresent =
    value.source_file_size_bytes !==
      undefined &&
    value.source_file_size_bytes !==
      null;


  const hasAnyFileMetadata =
    fileNamePresent ||
    fileMimePresent ||
    fileSizePresent;


  const hasAllFileMetadata =
    fileNamePresent &&
    fileMimePresent &&
    fileSizePresent;


  if (
    !hasText &&
    !hasAnyFileMetadata
  ) {
    addIssue(
      [
        "source_text",
      ],
      "يجب وجود نص أو ملف PDF.",
    );
  }


  if (
    hasAnyFileMetadata &&
    !hasAllFileMetadata
  ) {
    addIssue(
      [
        "source_file_name",
      ],
      "بيانات ملف PDF يجب أن تكون مكتملة.",
    );
  }
}


function validateIntakeTarget(
  value:
    IntakeTargetFields,

  addIssue: (
    path:
      string[],

    message:
      string,
  ) => void,
): void {
  const hasType =
    value.target_entity_type !==
      undefined &&
    value.target_entity_type !==
      null;


  const hasId =
    value.target_entity_id !==
      undefined &&
    value.target_entity_id !==
      null;


  if (
    hasType !==
    hasId
  ) {
    addIssue(
      [
        "target_entity_id",
      ],
      "نوع العنصر الناتج ومعرّفه يجب أن يوجدا معًا.",
    );
  }
}


function validateIntakeLifecycle(
  value:
    IntakeLifecycleFields,

  addIssue: (
    path:
      string[],

    message:
      string,
  ) => void,

  defaultStatus:
    string =
      "previewed",
): void {
  const status =
    value.status ??
    defaultStatus;


  const approvedAt =
    value.approved_at ??
    null;


  const appliedAt =
    value.applied_at ??
    null;


  if (
    (
      status ===
        "approved" ||
      status ===
        "applied" ||
      status ===
        "failed"
    ) &&
    approvedAt ===
      null
  ) {
    addIssue(
      [
        "approved_at",
      ],
      "وقت الموافقة مطلوب لهذه الحالة.",
    );
  }


  if (
    status ===
      "applied" &&
    appliedAt ===
      null
  ) {
    addIssue(
      [
        "applied_at",
      ],
      "وقت التنفيذ مطلوب عند اكتمال التنفيذ.",
    );
  }


  if (
    status ===
      "previewed" &&
    approvedAt !==
      null
  ) {
    addIssue(
      [
        "approved_at",
      ],
      "المعاينة غير المعتمدة لا يجب أن تحتوي وقت موافقة.",
    );
  }
}


/* =========================================================
 * 29. UNIVERSAL INTAKE ITEM BASE
 * ======================================================= */

const intakeItemBaseSchema =
  z
    .object({
      kind:
        intakeKindSchema,

      source_text:
        intakeSourceTextSchema
          .nullable()
          .optional(),

      source_file_name:
        intakeFileNameSchema
          .nullable()
          .optional(),

      source_file_mime:
        intakeFileMimeSchema
          .nullable()
          .optional(),

      source_file_size_bytes:
        intakeFileSizeSchema
          .nullable()
          .optional(),

      title:
        intakeTitleSchema,

      summary:
        intakeSummarySchema,

      confidence:
        intakeConfidenceSchema,

      next_action:
        intakeNextActionSchema,

      proposed_payload:
        jsonObjectSchema
          .optional(),

      status:
        intakeStatusSchema
          .optional(),

      approved_at:
        isoDateTimeSchema
          .nullable()
          .optional(),

      applied_at:
        isoDateTimeSchema
          .nullable()
          .optional(),

      target_entity_type:
        intakeTargetEntityTypeSchema
          .nullable()
          .optional(),

      target_entity_id:
        uuidSchema
          .nullable()
          .optional(),

      error_code:
        intakeErrorCodeSchema
          .nullable()
          .optional(),
    })
    .strict();


/* =========================================================
 * 30. UNIVERSAL INTAKE INSERT
 * ======================================================= */

export const intakeItemInsertSchema =
  intakeItemBaseSchema
    .superRefine(
      (
        value,
        context,
      ) => {
        validateIntakeSource(
          value,
          (
            path,
            message,
          ) => {
            context.addIssue({
              code:
                "custom",

              path,

              message,
            });
          },
        );


        validateIntakeTarget(
          value,
          (
            path,
            message,
          ) => {
            context.addIssue({
              code:
                "custom",

              path,

              message,
            });
          },
        );


        validateIntakeLifecycle(
          value,
          (
            path,
            message,
          ) => {
            context.addIssue({
              code:
                "custom",

              path,

              message,
            });
          },
        );
      },
    );


/* =========================================================
 * 31. UNIVERSAL INTAKE UPDATE
 * ======================================================= */

export const intakeItemUpdateSchema =
  intakeItemBaseSchema
    .partial()
    .strict()
    .superRefine(
      (
        value,
        context,
      ) => {
        const sourceFieldsProvided =
          value.source_text !==
            undefined ||
          value.source_file_name !==
            undefined ||
          value.source_file_mime !==
            undefined ||
          value.source_file_size_bytes !==
            undefined;


        if (
          sourceFieldsProvided
        ) {
          const fileFieldsProvided =
            value.source_file_name !==
              undefined ||
            value.source_file_mime !==
              undefined ||
            value.source_file_size_bytes !==
              undefined;


          if (
            fileFieldsProvided
          ) {
            const completeFileUpdate =
              value.source_file_name !==
                undefined &&
              value.source_file_mime !==
                undefined &&
              value.source_file_size_bytes !==
                undefined;


            if (
              !completeFileUpdate
            ) {
              context.addIssue({
                code:
                  "custom",

                path: [
                  "source_file_name",
                ],

                message:
                  "عند تغيير بيانات الملف يجب إرسال اسم الملف ونوعه وحجمه معًا.",
              });
            }
          }
        }


        const targetFieldsProvided =
          value.target_entity_type !==
            undefined ||
          value.target_entity_id !==
            undefined;


        if (
          targetFieldsProvided
        ) {
          validateIntakeTarget(
            value,
            (
              path,
              message,
            ) => {
              context.addIssue({
                code:
                  "custom",

                path,

                message,
              });
            },
          );
        }


        const lifecycleFieldsProvided =
          value.status !==
            undefined ||
          value.approved_at !==
            undefined ||
          value.applied_at !==
            undefined;


        if (
          lifecycleFieldsProvided
        ) {
          if (
            value.approved_at !==
              undefined &&
            value.status ===
              undefined
          ) {
            context.addIssue({
              code:
                "custom",

              path: [
                "status",
              ],

              message:
                "يجب إرسال حالة الـIntake عند تغيير وقت الموافقة.",
            });
          }


          if (
            value.applied_at !==
              undefined &&
            value.status ===
              undefined
          ) {
            context.addIssue({
              code:
                "custom",

              path: [
                "status",
              ],

              message:
                "يجب إرسال حالة الـIntake عند تغيير وقت التنفيذ.",
            });
          }


          if (
            value.status !==
              undefined
          ) {
            validateIntakeLifecycle(
              value,
              (
                path,
                message,
              ) => {
                context.addIssue({
                  code:
                    "custom",

                  path,

                  message,
                });
              },
              value.status,
            );
          }
        }
      },
    );


/* =========================================================
 * 32. UNIVERSAL INTAKE APPROVAL
 * ======================================================= */

export const intakeApprovalSchema =
  z
    .object({
      id:
        uuidSchema,

      approved_at:
        isoDateTimeSchema,
    })
    .strict();


/* =========================================================
 * 33. UNIVERSAL INTAKE CANCELLATION
 * ======================================================= */

export const intakeCancellationSchema =
  z
    .object({
      id:
        uuidSchema,
    })
    .strict();


/* =========================================================
 * 34. ENTITY IDENTIFIERS
 * ======================================================= */

export const entityIdSchema =
  z
    .object({
      id:
        uuidSchema,
    })
    .strict();


/* =========================================================
 * 35. PAGINATION
 * ======================================================= */

export const paginationSchema =
  z
    .object({
      page:
        z
          .coerce
          .number()
          .int()
          .min(
            1,
          )
          .default(
            1,
          ),

      page_size:
        z
          .coerce
          .number()
          .int()
          .min(
            1,
          )
          .max(
            MAX_PAGE_SIZE,
          )
          .default(
            DEFAULT_PAGE_SIZE,
          ),
    })
    .strict();


/* =========================================================
 * 36. AI REQUEST
 * ======================================================= */

export const aiRequestSchema =
  z
    .object({
      mode:
        z.enum([
          "chief_of_staff",
          "summary",
          "recommendation",
          "decision",
        ]),

      message:
        z
          .string()
          .trim()
          .min(
            1,
            "الطلب مطلوب.",
          )
          .max(
            AI_MAX_USER_MESSAGE_LENGTH,
            "الطلب طويل جدًا.",
          ),
    })
    .strict();


/* =========================================================
 * 37. AI RESPONSE
 * ======================================================= */

export const aiResponseSchema =
  z
    .object({
      situation:
        z
          .string()
          .trim()
          .min(
            1,
          )
          .max(
            SHORT_TEXT_MAX_LENGTH,
          )
          .nullable(),

      recommendation:
        z
          .string()
          .trim()
          .min(
            1,
          )
          .max(
            AI_RECOMMENDATION_MAX_LENGTH,
          ),

      next_action:
        z
          .string()
          .trim()
          .min(
            1,
          )
          .max(
            SHORT_TEXT_MAX_LENGTH,
          )
          .nullable(),
    })
    .strict();


/* =========================================================
 * 38. DECISION SIMULATOR INPUT
 * ======================================================= */

export const decisionSimulationInputSchema =
  z
    .object({
      decision:
        z
          .string()
          .trim()
          .min(
            1,
          )
          .max(
            1_000,
          ),

      proposed_monthly_cost:
        moneySchema
          .nullable()
          .optional(),

      proposed_one_time_cost:
        moneySchema
          .nullable()
          .optional(),

      proposed_monthly_investment_change:
        signedMoneySchema
          .nullable()
          .optional(),

      proposed_start_date:
        isoDateSchema
          .nullable()
          .optional(),

      proposed_target_date:
        isoDateSchema
          .nullable()
          .optional(),

      notes:
        z
          .string()
          .trim()
          .min(
            1,
          )
          .max(
            1_000,
          )
          .nullable()
          .optional(),
    })
    .strict()
    .superRefine(
      (
        value,
        context,
      ) => {
        if (
          !isDateRangeValid(
            value.proposed_start_date,
            value.proposed_target_date,
          )
        ) {
          context.addIssue({
            code:
              "custom",

            path: [
              "proposed_target_date",
            ],

            message:
              "تاريخ الهدف لا يمكن أن يسبق تاريخ البداية.",
          });
        }
      },
    );


/* =========================================================
 * 39. DECISION SIMULATOR OUTPUT
 * ======================================================= */

export const decisionChangeSchema =
  z
    .object({
      area:
        z.enum([
          "finance",
          "investments",
          "career",
          "learning",
          "education",
          "travel",
          "time",
          "project",
          "other",
        ]),

      description:
        z
          .string()
          .trim()
          .min(
            1,
          )
          .max(
            SHORT_TEXT_MAX_LENGTH,
          ),

      direction:
        z.enum([
          "positive",
          "negative",
          "neutral",
        ]),
    })
    .strict();


export const decisionScenarioSchema =
  z
    .object({
      id:
        z
          .string()
          .trim()
          .min(
            1,
          )
          .max(
            80,
          ),

      title:
        titleSchema,

      summary:
        z
          .string()
          .trim()
          .min(
            1,
          )
          .max(
            SHORT_TEXT_MAX_LENGTH,
          ),

      affordability:
        z
          .boolean()
          .nullable(),

      monthly_available_after:
        signedMoneySchema
          .nullable(),

      changes:
        z
          .array(
            decisionChangeSchema,
          )
          .max(
            10,
          ),
    })
    .strict();


export const decisionSimulationResultSchema =
  z
    .object({
      decision:
        z
          .string()
          .trim()
          .min(
            1,
          )
          .max(
            1_000,
          ),

      scenarios:
        z
          .array(
            decisionScenarioSchema,
          )
          .min(
            1,
          )
          .max(
            DECISION_MAX_SCENARIOS,
          ),

      recommended_scenario_id:
        z
          .string()
          .trim()
          .min(
            1,
          )
          .max(
            80,
          )
          .nullable(),

      main_tradeoff:
        z
          .string()
          .trim()
          .min(
            1,
          )
          .max(
            SHORT_TEXT_MAX_LENGTH,
          )
          .nullable(),

      next_action:
        z
          .string()
          .trim()
          .min(
            1,
          )
          .max(
            SHORT_TEXT_MAX_LENGTH,
          ),
    })
    .strict()
    .superRefine(
      (
        value,
        context,
      ) => {
        const ids =
          value.scenarios.map(
            (
              scenario,
            ) =>
              scenario.id,
          );


        if (
          new Set(
            ids,
          ).size !==
          ids.length
        ) {
          context.addIssue({
            code:
              "custom",

            path: [
              "scenarios",
            ],

            message:
              "معرّفات سيناريوهات القرار يجب أن تكون فريدة.",
          });
        }


        if (
          value.recommended_scenario_id !==
            null &&
          !ids.includes(
            value.recommended_scenario_id,
          )
        ) {
          context.addIssue({
            code:
              "custom",

            path: [
              "recommended_scenario_id",
            ],

            message:
              "السيناريو الموصى به غير موجود ضمن السيناريوهات.",
          });
        }
      },
    );


/* =========================================================
 * 40. OPPORTUNITY SEARCH INPUT
 * ======================================================= */

export const opportunitySearchInputSchema =
  z
    .object({
      category:
        z.enum(
          OPPORTUNITY_CATEGORIES,
        ),

      query:
        z
          .string()
          .trim()
          .min(
            1,
            "عبارة البحث مطلوبة.",
          )
          .max(
            500,
          ),
    })
    .strict();


/* =========================================================
 * 41. OPPORTUNITY OUTPUT
 * ======================================================= */

export const opportunitySchema =
  z
    .object({
      title:
        titleSchema,

      provider:
        z
          .string()
          .trim()
          .min(
            1,
          )
          .max(
            120,
          )
          .nullable(),

      category:
        z.enum(
          OPPORTUNITY_CATEGORIES,
        ),

      description:
        z
          .string()
          .trim()
          .min(
            1,
          )
          .max(
            SHORT_TEXT_MAX_LENGTH,
          )
          .nullable(),

      url:
        httpUrlSchema
          .nullable(),

      fit_score:
        z
          .number()
          .finite()
          .int()
          .min(
            OPPORTUNITY_MIN_FIT_SCORE,
          )
          .max(
            OPPORTUNITY_MAX_FIT_SCORE,
          ),

      priority:
        prioritySchema,

      recommendation:
        z.enum(
          OPPORTUNITY_RECOMMENDATIONS,
        ),

      reason:
        z
          .string()
          .trim()
          .min(
            1,
          )
          .max(
            SHORT_TEXT_MAX_LENGTH,
          ),
    })
    .strict();


export const opportunitySearchResultSchema =
  z
    .object({
      query:
        z
          .string()
          .trim()
          .min(
            1,
          )
          .max(
            500,
          ),

      category:
        z.enum(
          OPPORTUNITY_CATEGORIES,
        ),

      opportunities:
        z
          .array(
            opportunitySchema,
          )
          .max(
            OPPORTUNITY_MAX_RESULTS,
          ),

      searched_at:
        isoDateTimeSchema,
    })
    .strict();


/* =========================================================
 * 42. AI RECOMMENDATION COLLECTION
 * ======================================================= */

export const aiRecommendationCollectionSchema =
  z
    .array(
      aiResponseSchema,
    )
    .max(
      AI_MAX_RECOMMENDATIONS,
    );


/* =========================================================
 * 43. SAFE SEARCH / FILTER INPUTS
 * ======================================================= */

export const searchTextSchema =
  z
    .string()
    .trim()
    .min(
      1,
    )
    .max(
      200,
    );


export const optionalSearchTextSchema =
  searchTextSchema
    .optional();


/* =========================================================
 * 44. DATE RANGE FILTER
 * ======================================================= */

export const dateRangeSchema =
  z
    .object({
      from:
        isoDateSchema
          .nullable()
          .optional(),

      to:
        isoDateSchema
          .nullable()
          .optional(),
    })
    .strict()
    .superRefine(
      (
        value,
        context,
      ) => {
        if (
          !isDateRangeValid(
            value.from,
            value.to,
          )
        ) {
          context.addIssue({
            code:
              "custom",

            path: [
              "to",
            ],

            message:
              "تاريخ النهاية لا يمكن أن يسبق تاريخ البداية.",
          });
        }
      },
    );


/* =========================================================
 * 45. SAFE VALIDATION RESULT HELPER
 * ======================================================= */

export function getFirstValidationError(
  error:
    z.ZodError,
): string {
  const firstIssue =
    error.issues[0];


  if (
    !firstIssue
  ) {
    return "البيانات المدخلة غير صحيحة.";
  }


  return firstIssue.message;
}


/* =========================================================
 * 46. TRAVEL VALIDATION RULE
 * ======================================================= */

/**
 * Travel proposal values are now validated exactly:
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
 * Rules:
 *
 * end_date >= start_date
 * budget_total >= 0
 * currency = 3 uppercase letters
 * readiness = integer 0..100
 * status = explicit allowlist
 * unknown object fields = rejected
 *
 *
 * But validation alone does not activate Travel execution.
 */


/* =========================================================
 * 47. PRIVATE DOCUMENT RULE
 * ======================================================= */

/**
 * Private document metadata validates:
 *
 * PDF extension
 * application/pdf
 * file size <= 15 MB
 * fixed private bucket
 * safe Storage path
 *
 *
 * PostgreSQL and Storage RLS additionally enforce:
 *
 * object owner path begins with auth.uid()
 *
 *
 * The AI/browser does not get to choose permanent ownership.
 */


/* =========================================================
 * 48. STRUCTURED PROPOSAL SECURITY RULE
 * ======================================================= */

/**
 * Active structured proposal schemas accept ONLY:
 *
 * exact supported action
 * exact supported fields
 * exact valid values
 *
 *
 * They reject:
 *
 * arbitrary table names
 * arbitrary RPC names
 * user_id
 * SQL
 * unsupported actions
 * extra object fields
 * negative finance amounts
 * malformed currencies
 * malformed dates
 */


/* =========================================================
 * 49. EXACT VALUES RULE
 * ======================================================= */

/**
 * Optional defaults are acceptable in normal domain forms.
 *
 * Structured AI proposals are different:
 *
 * values must be explicit.
 *
 *
 * Example:
 *
 * Instead of:
 *
 * {
 *   amount: 30000
 * }
 *
 *
 * the proposal must contain:
 *
 * {
 *   amount: 30000,
 *   currency: "AED",
 *   frequency: "monthly",
 *   next_expected_date: null,
 *   notes: null
 * }
 *
 *
 * This gives the user a complete review surface before
 * approval.
 */


/* =========================================================
 * 50. PROPOSAL ≠ EXECUTION
 * ======================================================= */

/**
 * finance / plan / growth:
 *
 * structuredIntakeProposalSchema
 *
 * validates the active structured proposal.
 *
 *
 * travel:
 *
 * travelIntakeProposalSchema
 *
 * validates the staged Travel proposal separately.
 *
 *
 * Neither validation grants a database write.
 *
 *
 * Execution still requires:
 *
 * 1. Proposal validates.
 * 2. Proposal matches intake.kind.
 * 3. User sees exact values.
 * 4. User explicitly confirms.
 * 5. Server selects exact executor.
 * 6. Executor validates again.
 * 7. PostgreSQL RLS enforces ownership.
 */


/* =========================================================
 * 51. UNIVERSAL INTAKE SECURITY RULE
 * ======================================================= */

/**
 * Universal Intake schemas deliberately reject:
 *
 * user_id
 *
 * because all user-facing schemas are strict and ownership
 * comes from the authenticated server session.
 *
 *
 * AI output may suggest:
 *
 * classification
 * summary
 * exact proposal values
 *
 *
 * AI output cannot grant:
 *
 * authorization
 * permanent ownership
 * direct database authority
 */


/* =========================================================
 * 52. PREVIEW ≠ DATABASE FACT
 * ======================================================= */

/**
 * intakePreviewSchema:
 *
 * = transitional legacy-compatible AI preview.
 *
 *
 * strictIntakePreviewSchema:
 *
 * = active exact structured AI preview.
 *
 *
 * travelIntakeProposalSchema:
 *
 * = staged Travel contract only.
 *
 *
 * intakeItemInsertSchema:
 *
 * = durable proposal record.
 *
 *
 * None automatically creates a domain fact.
 */


/* =========================================================
 * 53. TRAVEL ACTIVATION ORDER
 * ======================================================= */

/**
 * Current:
 *
 * Travel types ✅
 * Travel database ✅
 * Private Storage ✅
 * Travel validation ✅
 *
 *
 * Still required:
 *
 * AI preview schema output
 *      ↓
 * Universal Add Travel review UI
 *      ↓
 * Travel added to active structured union
 *      ↓
 * confirmation
 *      ↓
 * deterministic Travel executor
 *
 *
 * We intentionally do NOT skip these boundaries.
 */


/* =========================================================
 * 54. FILE SECURITY RULE
 * ======================================================= */

/**
 * Intake file metadata allows only:
 *
 * application/pdf
 *
 * <= 15 MB
 *
 *
 * PDF binary content is not stored inside intake_items.
 *
 *
 * Permanent private documents use:
 *
 * Supabase Storage
 *
 * bucket:
 *
 * life-os-private-documents
 */


/* =========================================================
 * 55. FINAL SECURITY RULE
 * ======================================================= */

/**
 * LIFE OS V2:
 *
 * User Input
 *      ↓
 * AI Interpretation
 *      ↓
 * Structured Proposal
 *      ↓
 * Zod Validation
 *      ↓
 * User Reviews Exact Values
 *      ↓
 * Explicit Approval
 *      ↓
 * Deterministic Executor
 *      ↓
 * RLS-Protected Write
 *
 *
 * Simple outside.
 * Intelligent underneath.
 * Private by default.
 */