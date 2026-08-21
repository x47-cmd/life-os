import { z } from "zod";
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
import type { JsonValue } from "@/lib/types";
/* =========================================================
 * 1. INTERNAL HELPERS
 * ======================================================= */
function isValidISODate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return false;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}
function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", {
      timeZone: value,
    }).format();
    return true;
  } catch {
    return false;
  }
}
function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
function isDateRangeValid(
  startDate: string | null | undefined,
  targetDate: string | null | undefined,
): boolean {
  if (!startDate || !targetDate) {
    return true;
  }
  return targetDate >= startDate;
}
function normalizeAuditKey(value: string): string {
  return value.trim().toLowerCase();
}
const forbiddenAuditKeys = new Set(
  FORBIDDEN_AUDIT_METADATA_KEYS.map(normalizeAuditKey),
);
/* =========================================================
 * 2. GENERIC SCHEMAS
 * ======================================================= */
export const uuidSchema = z
  .string()
  .trim()
  .uuid("المعرّف غير صالح.");
export const isoDateSchema = z
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
export const isoDateTimeSchema = z
  .string()
  .trim()
  .datetime({
    offset: true,
  });
export const monthDateSchema = isoDateSchema.refine(
  (value) => value.endsWith("-01"),
  "الشهر يجب أن يمثل اليوم الأول من الشهر.",
);
export const currencyCodeSchema = z
  .string()
  .trim()
  .regex(
    /^[A-Z]{3}$/,
    "رمز العملة يجب أن يتكون من ثلاثة أحرف كبيرة.",
  );
export const prioritySchema = z.enum(PRIORITIES);
export const frequencySchema = z.enum(FREQUENCIES);
export const progressPercentSchema = z
  .number()
  .finite()
  .int()
  .min(PROGRESS_MIN)
  .max(PROGRESS_MAX);
export const nonNegativeNumberSchema = z
  .number()
  .finite()
  .min(0);
export const positiveNumberSchema = z
  .number()
  .finite()
  .gt(0);
export const finiteNumberSchema = z
  .number()
  .finite();
export const moneySchema = z
  .number()
  .finite()
  .min(0)
  .max(999_999_999_999.99);
export const signedMoneySchema = z
  .number()
  .finite()
  .min(-999_999_999_999.99)
  .max(999_999_999_999.99);
export const titleSchema = z
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
export const shortTextSchema = z
  .string()
  .trim()
  .min(1)
  .max(SHORT_TEXT_MAX_LENGTH);
export const notesSchema = z
  .string()
  .trim()
  .min(1)
  .max(NOTES_MAX_LENGTH);
export const optionalNullableNotesSchema =
  notesSchema.nullable().optional();
export const optionalNullableShortTextSchema =
  shortTextSchema.nullable().optional();
export const httpUrlSchema = z
  .string()
  .trim()
  .url("الرابط غير صالح.")
  .refine(
    isHttpUrl,
    "يسمح فقط بروابط HTTP أو HTTPS.",
  );
export const optionalNullableHttpUrlSchema =
  httpUrlSchema.nullable().optional();
/* =========================================================
 * 3. AUTHENTICATION
 * ======================================================= */
export const loginInputSchema = z
  .object({
    email: z
      .string()
      .trim()
      .email("البريد الإلكتروني غير صالح.")
      .max(254),
    password: z
      .string()
      .min(1, "كلمة المرور مطلوبة.")
      .max(1_024),
  })
  .strict();
export const mfaCodeSchema = z
  .string()
  .trim()
  .regex(
    /^\d{6}$/,
    "رمز التحقق يجب أن يتكون من 6 أرقام.",
  );
export const mfaVerificationSchema = z
  .object({
    factorId: uuidSchema,
    challengeId: uuidSchema,
    code: mfaCodeSchema,
  })
  .strict();
export const authCallbackQuerySchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1)
      .max(2_048),
  })
  .strict();
/* =========================================================
 * 4. PROFILE
 * ======================================================= */
export const profileInsertSchema = z
  .object({
    display_name: titleSchema
      .nullable()
      .optional(),
    default_currency:
      currencyCodeSchema.optional(),
    timezone: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .refine(
        isValidTimeZone,
        "المنطقة الزمنية غير صالحة.",
      )
      .optional(),
    locale: z
      .string()
      .trim()
      .min(2)
      .max(35)
      .regex(
        /^[a-z]{2,3}(?:-[A-Z]{2})?$/,
        "صيغة اللغة غير صالحة.",
      )
      .optional(),
  })
  .strict();
export const profileUpdateSchema =
  profileInsertSchema.partial().strict();
/* =========================================================
 * 5. INCOME SOURCES
 * ======================================================= */
export const incomeSourceInsertSchema = z
  .object({
    name: titleSchema,
    amount: moneySchema,
    frequency:
      frequencySchema.optional(),
    is_active:
      z.boolean().optional(),
    next_expected_date:
      isoDateSchema.nullable().optional(),
    notes:
      optionalNullableNotesSchema,
  })
  .strict();
export const incomeSourceUpdateSchema =
  incomeSourceInsertSchema.partial().strict();
/* =========================================================
 * 6. BUDGET ITEMS
 * ======================================================= */
export const budgetItemInsertSchema = z
  .object({
    name: titleSchema,
    category:
      z.enum(BUDGET_CATEGORIES),
    item_type:
      z.enum(BUDGET_ITEM_TYPES),
    amount:
      moneySchema,
    frequency:
      frequencySchema.optional(),
    due_day: z
      .number()
      .finite()
      .int()
      .min(DUE_DAY_MIN)
      .max(DUE_DAY_MAX)
      .nullable()
      .optional(),
    is_active:
      z.boolean().optional(),
    notes:
      optionalNullableNotesSchema,
  })
  .strict();
export const budgetItemUpdateSchema =
  budgetItemInsertSchema.partial().strict();
/* =========================================================
 * 7. MONTHLY SNAPSHOTS
 * ======================================================= */
export const monthlySnapshotInsertSchema = z
  .object({
    month:
      monthDateSchema,
    total_income:
      moneySchema.optional(),
    total_budget:
      moneySchema.optional(),
    total_savings:
      moneySchema.optional(),
    total_investments:
      moneySchema.optional(),
    available_amount:
      signedMoneySchema.optional(),
    emergency_fund_balance:
      moneySchema.optional(),
    travel_savings_balance:
      moneySchema.optional(),
    notes:
      optionalNullableNotesSchema,
  })
  .strict();
export const monthlySnapshotUpdateSchema = z
  .object({
    total_income:
      moneySchema.optional(),
    total_budget:
      moneySchema.optional(),
    total_savings:
      moneySchema.optional(),
    total_investments:
      moneySchema.optional(),
    available_amount:
      signedMoneySchema.optional(),
    emergency_fund_balance:
      moneySchema.optional(),
    travel_savings_balance:
      moneySchema.optional(),
    notes:
      optionalNullableNotesSchema,
  })
  .strict();
/* =========================================================
 * 8. INVESTMENT ASSETS
 * ======================================================= */
const tickerSchema = z
  .string()
  .trim()
  .min(1, "الرمز مطلوب.")
  .max(32)
  .refine(
    (value) => value === value.toUpperCase(),
    "رمز الاستثمار يجب أن يكون بأحرف كبيرة.",
  );
export const investmentAssetInsertSchema = z
  .object({
    ticker:
      tickerSchema,
    name:
      titleSchema,
    market: z
      .string()
      .trim()
      .min(1)
      .max(80),
    asset_type:
      z.enum(INVESTMENT_ASSET_TYPES),
    currency:
      currencyCodeSchema.optional(),
    quantity:
      nonNegativeNumberSchema.optional(),
    average_cost:
      nonNegativeNumberSchema.optional(),
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
      z.boolean().optional(),
    notes:
      optionalNullableNotesSchema,
  })
  .strict();
export const investmentAssetUpdateSchema =
  investmentAssetInsertSchema.partial().strict();
/* =========================================================
 * 9. INVESTMENT TRANSACTIONS
 * ======================================================= */
const investmentTransactionBaseSchema = z
  .object({
    asset_id:
      uuidSchema,
    transaction_type:
      z.enum(INVESTMENT_TRANSACTION_TYPES),
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
      moneySchema.optional(),
    notes:
      optionalNullableNotesSchema,
  })
  .strict();
export const investmentTransactionInsertSchema =
  investmentTransactionBaseSchema.superRefine(
    (value, context) => {
      if (
        value.transaction_type === "buy" ||
        value.transaction_type === "sell"
      ) {
        if (
          value.quantity === null ||
          value.quantity === undefined ||
          value.quantity <= 0
        ) {
          context.addIssue({
            code: "custom",
            path: ["quantity"],
            message:
              "الكمية مطلوبة ويجب أن تكون أكبر من صفر لعمليات الشراء والبيع.",
          });
        }
        if (
          value.unit_price === null ||
          value.unit_price === undefined ||
          value.unit_price <= 0
        ) {
          context.addIssue({
            code: "custom",
            path: ["unit_price"],
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
export const goalInsertSchema = z
  .object({
    title:
      titleSchema,
    category:
      z.enum(GOAL_CATEGORIES),
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
    unit: z
      .string()
      .trim()
      .min(1)
      .max(30)
      .nullable()
      .optional(),
    progress_percent:
      progressPercentSchema.optional(),
    target_date:
      isoDateSchema
        .nullable()
        .optional(),
    priority:
      prioritySchema.optional(),
    status:
      z.enum(GOAL_STATUSES).optional(),
    next_action:
      optionalNullableShortTextSchema,
    sort_order: z
      .number()
      .finite()
      .int()
      .min(0)
      .optional(),
  })
  .strict();
export const goalUpdateSchema =
  goalInsertSchema.partial().strict();
/* =========================================================
 * 11. PROJECTS
 * ======================================================= */
const projectBaseSchema = z
  .object({
    goal_id:
      uuidSchema.nullable().optional(),
    title:
      titleSchema,
    description:
      optionalNullableShortTextSchema,
    category:
      z.enum(PROJECT_CATEGORIES),
    status:
      z.enum(PROJECT_STATUSES).optional(),
    progress_percent:
      progressPercentSchema.optional(),
    priority:
      prioritySchema.optional(),
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
  projectBaseSchema.superRefine(
    (value, context) => {
      if (
        !isDateRangeValid(
          value.start_date,
          value.target_date,
        )
      ) {
        context.addIssue({
          code: "custom",
          path: ["target_date"],
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
      (value, context) => {
        if (
          !isDateRangeValid(
            value.start_date,
            value.target_date,
          )
        ) {
          context.addIssue({
            code: "custom",
            path: ["target_date"],
            message:
              "تاريخ الهدف لا يمكن أن يسبق تاريخ البداية.",
          });
        }
      },
    );
/* =========================================================
 * 12. TASKS
 * ======================================================= */
const taskBaseSchema = z
  .object({
    goal_id:
      uuidSchema.nullable().optional(),
    project_id:
      uuidSchema.nullable().optional(),
    title:
      titleSchema,
    notes:
      optionalNullableNotesSchema,
    priority:
      prioritySchema.optional(),
    status:
      z.enum(TASK_STATUSES).optional(),
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
  taskBaseSchema.superRefine(
    (value, context) => {
      const status = value.status ?? "pending";
      const completedAt =
        value.completed_at ?? null;
      if (
        status === "completed" &&
        completedAt === null
      ) {
        context.addIssue({
          code: "custom",
          path: ["completed_at"],
          message:
            "وقت الإكمال مطلوب للمهمة المكتملة.",
        });
      }
      if (
        status !== "completed" &&
        completedAt !== null
      ) {
        context.addIssue({
          code: "custom",
          path: ["completed_at"],
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
      (value, context) => {
        if (
          value.completed_at !== undefined &&
          value.status === undefined
        ) {
          context.addIssue({
            code: "custom",
            path: ["status"],
            message:
              "يجب إرسال حالة المهمة عند تغيير وقت الإكمال.",
          });
        }
        if (
          value.status === "completed" &&
          (
            value.completed_at === undefined ||
            value.completed_at === null
          )
        ) {
          context.addIssue({
            code: "custom",
            path: ["completed_at"],
            message:
              "وقت الإكمال مطلوب عند إكمال المهمة.",
          });
        }
        if (
          value.status !== undefined &&
          value.status !== "completed" &&
          value.completed_at !== undefined &&
          value.completed_at !== null
        ) {
          context.addIssue({
            code: "custom",
            path: ["completed_at"],
            message:
              "المهمة غير المكتملة لا يمكن أن تحتوي وقت إكمال.",
          });
        }
      },
    );
/* =========================================================
 * 13. LEARNING ITEMS
 * ======================================================= */
const learningItemBaseSchema = z
  .object({
    goal_id:
      uuidSchema.nullable().optional(),
    title:
      titleSchema,
    provider: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .nullable()
      .optional(),
    item_type:
      z.enum(LEARNING_ITEM_TYPES),
    status:
      z.enum(LEARNING_STATUSES).optional(),
    priority:
      prioritySchema.optional(),
    progress_percent:
      progressPercentSchema.optional(),
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
      currencyCodeSchema.optional(),
    notes:
      optionalNullableNotesSchema,
  })
  .strict();
function validateLearningDates(
  value: {
    start_date?: string | null;
    target_date?: string | null;
    completed_date?: string | null;
  },
  addIssue: (
    path: string[],
    message: string,
  ) => void,
): void {
  if (
    !isDateRangeValid(
      value.start_date,
      value.target_date,
    )
  ) {
    addIssue(
      ["target_date"],
      "تاريخ الهدف لا يمكن أن يسبق تاريخ البداية.",
    );
  }
  if (
    value.start_date &&
    value.completed_date &&
    value.completed_date < value.start_date
  ) {
    addIssue(
      ["completed_date"],
      "تاريخ الإكمال لا يمكن أن يسبق تاريخ البداية.",
    );
  }
}
export const learningItemInsertSchema =
  learningItemBaseSchema.superRefine(
    (value, context) => {
      validateLearningDates(
        value,
        (path, message) => {
          context.addIssue({
            code: "custom",
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
      (value, context) => {
        validateLearningDates(
          value,
          (path, message) => {
            context.addIssue({
              code: "custom",
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
const careerItemBaseSchema = z
  .object({
    goal_id:
      uuidSchema.nullable().optional(),
    item_type:
      z.enum(CAREER_ITEM_TYPES),
    title:
      titleSchema,
    description:
      optionalNullableShortTextSchema,
    status:
      z.enum(CAREER_STATUSES).optional(),
    priority:
      prioritySchema.optional(),
    rating: z
      .number()
      .finite()
      .int()
      .min(CAREER_RATING_MIN)
      .max(CAREER_RATING_MAX)
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
  careerItemBaseSchema.superRefine(
    (value, context) => {
      if (
        !isDateRangeValid(
          value.event_date,
          value.target_date,
        )
      ) {
        context.addIssue({
          code: "custom",
          path: ["target_date"],
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
      (value, context) => {
        if (
          !isDateRangeValid(
            value.event_date,
            value.target_date,
          )
        ) {
          context.addIssue({
            code: "custom",
            path: ["target_date"],
            message:
              "تاريخ الهدف لا يمكن أن يسبق تاريخ الحدث.",
          });
        }
      },
    );
/* =========================================================
 * 15. MEMORY
 * ======================================================= */
export const memoryItemInsertSchema = z
  .object({
    category:
      z.enum(MEMORY_CATEGORIES),
    title:
      titleSchema,
    content: z
      .string()
      .trim()
      .min(1, "محتوى الذاكرة مطلوب.")
      .max(MEMORY_CONTENT_MAX_LENGTH),
    importance:
      prioritySchema.optional(),
    is_active:
      z.boolean().optional(),
  })
  .strict();
export const memoryItemUpdateSchema =
  memoryItemInsertSchema.partial().strict();
/* =========================================================
 * 16. AI RECOMMENDATIONS
 * ======================================================= */
const aiRecommendationBaseSchema = z
  .object({
    category:
      z.enum(AI_RECOMMENDATION_CATEGORIES),
    title:
      titleSchema,
    recommendation: z
      .string()
      .trim()
      .min(1)
      .max(AI_RECOMMENDATION_MAX_LENGTH),
    priority:
      prioritySchema.optional(),
    status:
      z.enum(AI_RECOMMENDATION_STATUSES)
        .optional(),
    related_entity_type:
      z.enum(AI_RECOMMENDATION_ENTITY_TYPES)
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
    related_entity_type?: string | null;
    related_entity_id?: string | null;
  },
  addIssue: (
    path: string[],
    message: string,
  ) => void,
): void {
  const hasType =
    value.related_entity_type !== undefined &&
    value.related_entity_type !== null;
  const hasId =
    value.related_entity_id !== undefined &&
    value.related_entity_id !== null;
  if (hasType !== hasId) {
    addIssue(
      ["related_entity_id"],
      "نوع العنصر ومعرّفه يجب أن يوجدا معًا أو يكونا فارغين معًا.",
    );
  }
}
export const aiRecommendationInsertSchema =
  aiRecommendationBaseSchema.superRefine(
    (value, context) => {
      validateRecommendationRelationship(
        value,
        (path, message) => {
          context.addIssue({
            code: "custom",
            path,
            message,
          });
        },
      );
      const status = value.status ?? "new";
      const reviewedAt =
        value.reviewed_at ?? null;
      if (
        status === "new" &&
        reviewedAt !== null
      ) {
        context.addIssue({
          code: "custom",
          path: ["reviewed_at"],
          message:
            "التوصية الجديدة لا يجب أن تحتوي وقت مراجعة.",
        });
      }
      if (
        status !== "new" &&
        reviewedAt === null
      ) {
        context.addIssue({
          code: "custom",
          path: ["reviewed_at"],
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
      (value, context) => {
        const relationshipFieldsProvided =
          value.related_entity_type !== undefined ||
          value.related_entity_id !== undefined;
        if (relationshipFieldsProvided) {
          validateRecommendationRelationship(
            value,
            (path, message) => {
              context.addIssue({
                code: "custom",
                path,
                message,
              });
            },
          );
        }
        if (
          value.reviewed_at !== undefined &&
          value.status === undefined
        ) {
          context.addIssue({
            code: "custom",
            path: ["status"],
            message:
              "يجب إرسال حالة التوصية عند تغيير وقت المراجعة.",
          });
        }
        if (
          value.status === "new" &&
          value.reviewed_at !== undefined &&
          value.reviewed_at !== null
        ) {
          context.addIssue({
            code: "custom",
            path: ["reviewed_at"],
            message:
              "التوصية الجديدة لا يجب أن تحتوي وقت مراجعة.",
          });
        }
        if (
          value.status !== undefined &&
          value.status !== "new" &&
          (
            value.reviewed_at === undefined ||
            value.reviewed_at === null
          )
        ) {
          context.addIssue({
            code: "custom",
            path: ["reviewed_at"],
            message:
              "وقت المراجعة مطلوب عند تغيير حالة التوصية.",
          });
        }
      },
    );
/* =========================================================
 * 17. JSON / AUDIT METADATA
 * ======================================================= */
export const jsonValueSchema: z.ZodType<JsonValue> =
  z.lazy(() =>
    z.union([
      z.string(),
      z.number().finite(),
      z.boolean(),
      z.null(),
      z.array(jsonValueSchema),
      z.record(
        z.string(),
        jsonValueSchema,
      ),
    ]),
  );
export const auditMetadataSchema = z
  .record(
    z.string(),
    jsonValueSchema,
  )
  .superRefine(
    (metadata, context) => {
      const topLevelKeys =
        Object.keys(metadata);
      if (
        topLevelKeys.length >
        AUDIT_METADATA_MAX_KEYS
      ) {
        context.addIssue({
          code: "custom",
          message:
            `بيانات السجل تتجاوز الحد المسموح وهو ${AUDIT_METADATA_MAX_KEYS} مفاتيح.`,
        });
      }
      const inspectValue = (
        value: JsonValue,
        path: Array<string | number>,
      ): void => {
        if (typeof value === "string") {
          if (
            value.length >
            AUDIT_METADATA_MAX_STRING_LENGTH
          ) {
            context.addIssue({
              code: "custom",
              path,
              message:
                "النص داخل بيانات السجل طويل جدًا.",
            });
          }
          return;
        }
        if (Array.isArray(value)) {
          value.forEach(
            (item, index) => {
              inspectValue(
                item,
                [...path, index],
              );
            },
          );
          return;
        }
        if (
          value !== null &&
          typeof value === "object"
        ) {
          Object.entries(value).forEach(
            ([key, childValue]) => {
              const normalizedKey =
                normalizeAuditKey(key);
              if (
                forbiddenAuditKeys.has(
                  normalizedKey,
                )
              ) {
                context.addIssue({
                  code: "custom",
                  path: [...path, key],
                  message:
                    "هذا المفتاح غير مسموح داخل سجل التدقيق.",
                });
              }
              inspectValue(
                childValue,
                [...path, key],
              );
            },
          );
        }
      };
      Object.entries(metadata).forEach(
        ([key, value]) => {
          const normalizedKey =
            normalizeAuditKey(key);
          if (
            forbiddenAuditKeys.has(
              normalizedKey,
            )
          ) {
            context.addIssue({
              code: "custom",
              path: [key],
              message:
                "هذا المفتاح غير مسموح داخل سجل التدقيق.",
            });
          }
          inspectValue(
            value,
            [key],
          );
        },
      );
    },
  );
export const auditLogInsertSchema = z
  .object({
    action: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .regex(
        /^[A-Z0-9_]+$/,
        "اسم عملية السجل غير صالح.",
      ),
    entity_type: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .nullable()
      .optional(),
    entity_id:
      uuidSchema
        .nullable()
        .optional(),
    metadata:
      auditMetadataSchema.optional(),
  })
  .strict()
  .superRefine(
    (value, context) => {
      if (
        value.entity_id !== undefined &&
        value.entity_id !== null &&
        (
          value.entity_type === undefined ||
          value.entity_type === null
        )
      ) {
        context.addIssue({
          code: "custom",
          path: ["entity_type"],
          message:
            "نوع العنصر مطلوب عند وجود معرّف العنصر.",
        });
      }
    },
  );
/* =========================================================
 * 18. ENTITY IDENTIFIERS
 * ======================================================= */
export const entityIdSchema = z
  .object({
    id: uuidSchema,
  })
  .strict();
/* =========================================================
 * 19. PAGINATION
 * ======================================================= */
export const paginationSchema = z
  .object({
    page: z
      .coerce
      .number()
      .int()
      .min(1)
      .default(1),
    page_size: z
      .coerce
      .number()
      .int()
      .min(1)
      .max(MAX_PAGE_SIZE)
      .default(DEFAULT_PAGE_SIZE),
  })
  .strict();
/* =========================================================
 * 20. AI REQUEST
 * ======================================================= */
export const aiRequestSchema = z
  .object({
    mode: z.enum([
      "chief_of_staff",
      "summary",
      "recommendation",
      "decision",
    ]),
    message: z
      .string()
      .trim()
      .min(1, "الطلب مطلوب.")
      .max(
        AI_MAX_USER_MESSAGE_LENGTH,
        "الطلب طويل جدًا.",
      ),
  })
  .strict();
/* =========================================================
 * 21. AI RESPONSE
 * ======================================================= */
export const aiResponseSchema = z
  .object({
    situation: z
      .string()
      .trim()
      .min(1)
      .max(SHORT_TEXT_MAX_LENGTH)
      .nullable(),
    recommendation: z
      .string()
      .trim()
      .min(1)
      .max(AI_RECOMMENDATION_MAX_LENGTH),
    next_action: z
      .string()
      .trim()
      .min(1)
      .max(SHORT_TEXT_MAX_LENGTH)
      .nullable(),
  })
  .strict();
/* =========================================================
 * 22. DECISION SIMULATOR INPUT
 * ======================================================= */
export const decisionSimulationInputSchema = z
  .object({
    decision: z
      .string()
      .trim()
      .min(1)
      .max(1_000),
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
    notes: z
      .string()
      .trim()
      .min(1)
      .max(1_000)
      .nullable()
      .optional(),
  })
  .strict()
  .superRefine(
    (value, context) => {
      if (
        !isDateRangeValid(
          value.proposed_start_date,
          value.proposed_target_date,
        )
      ) {
        context.addIssue({
          code: "custom",
          path: ["proposed_target_date"],
          message:
            "تاريخ الهدف لا يمكن أن يسبق تاريخ البداية.",
        });
      }
    },
  );
/* =========================================================
 * 23. DECISION SIMULATOR OUTPUT
 * ======================================================= */
export const decisionChangeSchema = z
  .object({
    area: z.enum([
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
    description: z
      .string()
      .trim()
      .min(1)
      .max(SHORT_TEXT_MAX_LENGTH),
    direction: z.enum([
      "positive",
      "negative",
      "neutral",
    ]),
  })
  .strict();
export const decisionScenarioSchema = z
  .object({
    id: z
      .string()
      .trim()
      .min(1)
      .max(80),
    title:
      titleSchema,
    summary: z
      .string()
      .trim()
      .min(1)
      .max(SHORT_TEXT_MAX_LENGTH),
    affordability:
      z.boolean().nullable(),
    monthly_available_after:
      signedMoneySchema.nullable(),
    changes: z
      .array(decisionChangeSchema)
      .max(10),
  })
  .strict();
export const decisionSimulationResultSchema = z
  .object({
    decision: z
      .string()
      .trim()
      .min(1)
      .max(1_000),
    scenarios: z
      .array(decisionScenarioSchema)
      .min(1)
      .max(DECISION_MAX_SCENARIOS),
    recommended_scenario_id: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .nullable(),
    main_tradeoff: z
      .string()
      .trim()
      .min(1)
      .max(SHORT_TEXT_MAX_LENGTH)
      .nullable(),
    next_action: z
      .string()
      .trim()
      .min(1)
      .max(SHORT_TEXT_MAX_LENGTH),
  })
  .strict()
  .superRefine(
    (value, context) => {
      const ids =
        value.scenarios.map(
          (scenario) => scenario.id,
        );
      if (
        new Set(ids).size !== ids.length
      ) {
        context.addIssue({
          code: "custom",
          path: ["scenarios"],
          message:
            "معرّفات سيناريوهات القرار يجب أن تكون فريدة.",
        });
      }
      if (
        value.recommended_scenario_id !== null &&
        !ids.includes(
          value.recommended_scenario_id,
        )
      ) {
        context.addIssue({
          code: "custom",
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
 * 24. OPPORTUNITY SEARCH INPUT
 * ======================================================= */
export const opportunitySearchInputSchema = z
  .object({
    category:
      z.enum(OPPORTUNITY_CATEGORIES),
    query: z
      .string()
      .trim()
      .min(1, "عبارة البحث مطلوبة.")
      .max(500),
  })
  .strict();
/* =========================================================
 * 25. OPPORTUNITY OUTPUT
 * ======================================================= */
export const opportunitySchema = z
  .object({
    title:
      titleSchema,
    provider: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .nullable(),
    category:
      z.enum(OPPORTUNITY_CATEGORIES),
    description: z
      .string()
      .trim()
      .min(1)
      .max(SHORT_TEXT_MAX_LENGTH)
      .nullable(),
    url:
      httpUrlSchema.nullable(),
    fit_score: z
      .number()
      .finite()
      .int()
      .min(OPPORTUNITY_MIN_FIT_SCORE)
      .max(OPPORTUNITY_MAX_FIT_SCORE),
    priority:
      prioritySchema,
    recommendation:
      z.enum(
        OPPORTUNITY_RECOMMENDATIONS,
      ),
    reason: z
      .string()
      .trim()
      .min(1)
      .max(SHORT_TEXT_MAX_LENGTH),
  })
  .strict();
export const opportunitySearchResultSchema = z
  .object({
    query: z
      .string()
      .trim()
      .min(1)
      .max(500),
    category:
      z.enum(OPPORTUNITY_CATEGORIES),
    opportunities: z
      .array(opportunitySchema)
      .max(OPPORTUNITY_MAX_RESULTS),
    searched_at:
      isoDateTimeSchema,
  })
  .strict();
/* =========================================================
 * 26. AI RECOMMENDATION COLLECTION
 * ======================================================= */
export const aiRecommendationCollectionSchema = z
  .array(aiResponseSchema)
  .max(AI_MAX_RECOMMENDATIONS);
/* =========================================================
 * 27. SAFE SEARCH / FILTER INPUTS
 * ======================================================= */
export const searchTextSchema = z
  .string()
  .trim()
  .min(1)
  .max(200);
export const optionalSearchTextSchema =
  searchTextSchema.optional();
/* =========================================================
 * 28. DATE RANGE FILTER
 * ======================================================= */
export const dateRangeSchema = z
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
    (value, context) => {
      if (
        !isDateRangeValid(
          value.from,
          value.to,
        )
      ) {
        context.addIssue({
          code: "custom",
          path: ["to"],
          message:
            "تاريخ النهاية لا يمكن أن يسبق تاريخ البداية.",
        });
      }
    },
  );
/* =========================================================
 * 29. SAFE VALIDATION RESULT HELPER
 * ======================================================= */
export function getFirstValidationError(
  error: z.ZodError,
): string {
  const firstIssue =
    error.issues[0];
  if (!firstIssue) {
    return "البيانات المدخلة غير صحيحة.";
  }
  return firstIssue.message;
}
/* =========================================================
 * 30. FINAL SECURITY RULE
 * ======================================================= */
/**
 * IMPORTANT:
 *
 * None of the user-facing insert/update schemas above
 * accepts `user_id`.
 *
 * Ownership must always be derived server-side from the
 * authenticated Supabase identity.
 *
 * Therefore input such as:
 *
 * {
 *   user_id: "another-user-id",
 *   ...
 * }
 *
 * is rejected by `.strict()`.
 *
 * The same rule applies to AI-generated tool arguments.
 *
 * Final authorization remains enforced again through
 * PostgreSQL Row Level Security.
 */