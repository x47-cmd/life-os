import type {
  AIRecommendationCategory,
  AIRecommendationEntityType,
  AIRecommendationStatus,
  AIToolName,
  BudgetCategory,
  BudgetItemType,
  CareerItemType,
  CareerStatus,
  Frequency,
  GoalCategory,
  GoalStatus,
  InvestmentAssetType,
  InvestmentTransactionType,
  LearningItemType,
  LearningStatus,
  MemoryCategory,
  NavigationItem,
  OpportunityCategory,
  OpportunityRecommendation,
  Priority,
  ProjectCategory,
  ProjectStatus,
  ProhibitedAIAction,
  TaskStatus,
} from "@/lib/types";


/* =========================================================
 * LIFE OS V2
 * FINAL APPLICATION CONSTANTS
 *
 * Product structure:
 *
 * الرئيسية
 * المال
 * خططي
 * السفر
 * التطوير
 * LIFE AI
 *
 *
 * Authentication:
 *
 * password-authenticated verified session
 * AAL1 minimum
 *
 *
 * Permanent safety rule:
 *
 * AI Suggests
 *      ↓
 * User Reviews
 *      ↓
 * User Approves
 *      ↓
 * Deterministic System Executes
 *
 *
 * LIFE Invest AI:
 *
 * optional intelligence layer
 * inside Investments
 *
 * no autonomous brokerage execution
 *
 *
 * Simple outside.
 * Intelligent underneath.
 * Private by default.
 * ======================================================= */


/* =========================================================
 * 1. APPLICATION IDENTITY
 * ======================================================= */

export const APP_NAME =
  "LIFE OS";


export const APP_VERSION =
  "2.0.0";


export const APP_PHASE =
  "V2";


export const APP_DESCRIPTION =
  "Personal AI Operating System";


export const APP_LANGUAGE =
  "ar";


export const APP_LOCALE =
  "ar-AE";


export const APP_DIRECTION =
  "rtl";


/* =========================================================
 * 2. DEFAULTS
 * ======================================================= */

export const DEFAULT_CURRENCY =
  "AED";


export const DEFAULT_TIMEZONE =
  "Asia/Dubai";


/* =========================================================
 * 3. PRODUCT PRINCIPLES
 * ======================================================= */

export const PRODUCT_PRINCIPLE =
  "Simple outside. Intelligent underneath.";


export const SECURITY_PRINCIPLE =
  "AI Suggests → User Reviews → User Approves → System Executes";


export const AI_ROLE =
  "advisor";


/* =========================================================
 * 4. DASHBOARD LIMITS
 * ======================================================= */

export const MAX_DASHBOARD_PRIORITIES =
  3;


export const MAX_DASHBOARD_GOALS =
  5;


export const MAX_DASHBOARD_PROJECTS =
  5;


export const MAX_DASHBOARD_TASKS =
  5;


export const MAX_DASHBOARD_LEARNING_ITEMS =
  5;


export const MAX_DASHBOARD_TRIPS =
  5;


/* =========================================================
 * 5. PAGINATION
 * ======================================================= */

export const DEFAULT_PAGE_SIZE =
  20;


export const AUDIT_PAGE_SIZE =
  50;


export const MAX_PAGE_SIZE =
  100;


/* =========================================================
 * 6. AI LIMITS
 * ======================================================= */

export const AI_MAX_USER_MESSAGE_LENGTH =
  4_000;


export const AI_MAX_TOOL_CALLS =
  7;


export const AI_MAX_CONTEXT_ITEMS_PER_CATEGORY =
  10;


export const AI_MAX_RECOMMENDATIONS =
  3;


export const DECISION_MAX_SCENARIOS =
  3;


export const OPPORTUNITY_MAX_RESULTS =
  5;


export const OPPORTUNITY_MIN_FIT_SCORE =
  0;


export const OPPORTUNITY_MAX_FIT_SCORE =
  100;


/* =========================================================
 * 7. PRIORITIES
 * ======================================================= */

export const PRIORITIES = [
  "low",
  "medium",
  "high",
] as const satisfies readonly Priority[];


export const PRIORITY_LABELS:
Record<
  Priority,
  string
> = {
  low:
    "منخفض",

  medium:
    "متوسط",

  high:
    "مرتفع",
};


/* =========================================================
 * 8. FREQUENCIES
 * ======================================================= */

export const FREQUENCIES = [
  "monthly",
  "annual",
  "one_time",
  "other",
] as const satisfies readonly Frequency[];


export const FREQUENCY_LABELS:
Record<
  Frequency,
  string
> = {
  monthly:
    "شهري",

  annual:
    "سنوي",

  one_time:
    "مرة واحدة",

  other:
    "أخرى",
};


/* =========================================================
 * 9. GOAL STATUSES
 * ======================================================= */

export const GOAL_STATUSES = [
  "planned",
  "active",
  "paused",
  "completed",
  "cancelled",
] as const satisfies readonly GoalStatus[];


export const GOAL_STATUS_LABELS:
Record<
  GoalStatus,
  string
> = {
  planned:
    "مخطط",

  active:
    "قيد العمل",

  paused:
    "مؤجل",

  completed:
    "مكتمل",

  cancelled:
    "ملغي",
};


/* =========================================================
 * 10. GOAL CATEGORIES
 * ======================================================= */

export const GOAL_CATEGORIES = [
  "finance",
  "investments",
  "career",
  "learning",
  "education",
  "business",
  "travel",
  "fitness",
  "personal",
  "other",
] as const satisfies readonly GoalCategory[];


export const GOAL_CATEGORY_LABELS:
Record<
  GoalCategory,
  string
> = {
  finance:
    "المالية",

  investments:
    "الاستثمارات",

  career:
    "المسار المهني",

  learning:
    "التعلم",

  education:
    "التعليم",

  business:
    "البزنس",

  travel:
    "السفر",

  fitness:
    "اللياقة",

  personal:
    "شخصي",

  other:
    "أخرى",
};


/* =========================================================
 * 11. PROJECT STATUSES
 * ======================================================= */

export const PROJECT_STATUSES = [
  "planned",
  "active",
  "blocked",
  "paused",
  "completed",
  "cancelled",
] as const satisfies readonly ProjectStatus[];


export const PROJECT_STATUS_LABELS:
Record<
  ProjectStatus,
  string
> = {
  planned:
    "مخطط",

  active:
    "قيد العمل",

  blocked:
    "متعطل",

  paused:
    "مؤجل",

  completed:
    "مكتمل",

  cancelled:
    "ملغي",
};


/* =========================================================
 * 12. PROJECT CATEGORIES
 * ======================================================= */

export const PROJECT_CATEGORIES = [
  "ai",
  "career",
  "education",
  "finance",
  "investments",
  "business",
  "travel",
  "fitness",
  "personal",
  "other",
] as const satisfies readonly ProjectCategory[];


export const PROJECT_CATEGORY_LABELS:
Record<
  ProjectCategory,
  string
> = {
  ai:
    "الذكاء الاصطناعي",

  career:
    "المسار المهني",

  education:
    "التعليم",

  finance:
    "المالية",

  investments:
    "الاستثمارات",

  business:
    "البزنس",

  travel:
    "السفر",

  fitness:
    "اللياقة",

  personal:
    "شخصي",

  other:
    "أخرى",
};


/* =========================================================
 * 13. TASK STATUSES
 * ======================================================= */

export const TASK_STATUSES = [
  "pending",
  "active",
  "completed",
  "cancelled",
] as const satisfies readonly TaskStatus[];


export const TASK_STATUS_LABELS:
Record<
  TaskStatus,
  string
> = {
  pending:
    "بانتظار التنفيذ",

  active:
    "قيد العمل",

  completed:
    "مكتمل",

  cancelled:
    "ملغي",
};


/* =========================================================
 * 14. BUDGET CATEGORIES
 * ======================================================= */

export const BUDGET_CATEGORIES = [
  "family",
  "housing",
  "debt",
  "transport",
  "personal",
  "travel",
  "emergency",
  "investments",
  "education",
  "business",
  "other",
] as const satisfies readonly BudgetCategory[];


export const BUDGET_CATEGORY_LABELS:
Record<
  BudgetCategory,
  string
> = {
  family:
    "العائلة",

  housing:
    "السكن",

  debt:
    "القروض والالتزامات",

  transport:
    "المواصلات",

  personal:
    "المصاريف الشخصية",

  travel:
    "السفر",

  emergency:
    "الطوارئ",

  investments:
    "الاستثمارات",

  education:
    "التعليم",

  business:
    "البزنس",

  other:
    "أخرى",
};


/* =========================================================
 * 15. BUDGET ITEM TYPES
 * ======================================================= */

export const BUDGET_ITEM_TYPES = [
  "expense",
  "saving",
  "investment",
  "debt",
] as const satisfies readonly BudgetItemType[];


export const BUDGET_ITEM_TYPE_LABELS:
Record<
  BudgetItemType,
  string
> = {
  expense:
    "مصروف",

  saving:
    "توفير",

  investment:
    "استثمار",

  debt:
    "التزام",
};


/* =========================================================
 * 16. INVESTMENT ASSET TYPES
 * ======================================================= */

export const INVESTMENT_ASSET_TYPES = [
  "stock",
  "etf",
  "sukuk",
  "fund",
  "cash",
  "other",
] as const satisfies readonly InvestmentAssetType[];


export const INVESTMENT_ASSET_TYPE_LABELS:
Record<
  InvestmentAssetType,
  string
> = {
  stock:
    "سهم",

  etf:
    "صندوق ETF",

  sukuk:
    "صكوك",

  fund:
    "صندوق",

  cash:
    "نقد",

  other:
    "أخرى",
};


/* =========================================================
 * 17. INVESTMENT TRANSACTION TYPES
 * ======================================================= */

export const INVESTMENT_TRANSACTION_TYPES = [
  "buy",
  "sell",
  "dividend",
  "fee",
  "adjustment",
] as const satisfies readonly InvestmentTransactionType[];


export const INVESTMENT_TRANSACTION_TYPE_LABELS:
Record<
  InvestmentTransactionType,
  string
> = {
  buy:
    "شراء",

  sell:
    "بيع",

  dividend:
    "توزيعات",

  fee:
    "رسوم",

  adjustment:
    "تعديل",
};


/* =========================================================
 * 18. LEARNING ITEM TYPES
 * ======================================================= */

export const LEARNING_ITEM_TYPES = [
  "course",
  "certification",
  "learning_path",
  "masters",
  "university_program",
  "other",
] as const satisfies readonly LearningItemType[];


export const LEARNING_ITEM_TYPE_LABELS:
Record<
  LearningItemType,
  string
> = {
  course:
    "دورة",

  certification:
    "شهادة مهنية",

  learning_path:
    "مسار تعليمي",

  masters:
    "ماجستير",

  university_program:
    "برنامج جامعي",

  other:
    "أخرى",
};


/* =========================================================
 * 19. LEARNING STATUSES
 * ======================================================= */

export const LEARNING_STATUSES = [
  "planned",
  "active",
  "completed",
  "paused",
  "dropped",
] as const satisfies readonly LearningStatus[];


export const LEARNING_STATUS_LABELS:
Record<
  LearningStatus,
  string
> = {
  planned:
    "مخطط",

  active:
    "قيد الدراسة",

  completed:
    "مكتمل",

  paused:
    "مؤجل",

  dropped:
    "متوقف",
};


/* =========================================================
 * 20. CAREER ITEM TYPES
 * ======================================================= */

export const CAREER_ITEM_TYPES = [
  "current_role",
  "target_role",
  "skill",
  "achievement",
  "milestone",
  "gap",
] as const satisfies readonly CareerItemType[];


export const CAREER_ITEM_TYPE_LABELS:
Record<
  CareerItemType,
  string
> = {
  current_role:
    "الدور الحالي",

  target_role:
    "الدور المستهدف",

  skill:
    "مهارة",

  achievement:
    "إنجاز",

  milestone:
    "محطة مهنية",

  gap:
    "فجوة تطويرية",
};


/* =========================================================
 * 21. CAREER STATUSES
 * ======================================================= */

export const CAREER_STATUSES = [
  "active",
  "planned",
  "completed",
  "archived",
] as const satisfies readonly CareerStatus[];


export const CAREER_STATUS_LABELS:
Record<
  CareerStatus,
  string
> = {
  active:
    "نشط",

  planned:
    "مخطط",

  completed:
    "مكتمل",

  archived:
    "مؤرشف",
};


/* =========================================================
 * 22. MEMORY CATEGORIES
 * ======================================================= */

export const MEMORY_CATEGORIES = [
  "finance",
  "investments",
  "career",
  "learning",
  "education",
  "projects",
  "travel",
  "fitness",
  "personal",
  "preference",
  "constraint",
  "decision",
  "other",
] as const satisfies readonly MemoryCategory[];


export const MEMORY_CATEGORY_LABELS:
Record<
  MemoryCategory,
  string
> = {
  finance:
    "المالية",

  investments:
    "الاستثمارات",

  career:
    "المسار المهني",

  learning:
    "التعلم",

  education:
    "التعليم",

  projects:
    "المشاريع",

  travel:
    "السفر",

  fitness:
    "اللياقة",

  personal:
    "شخصي",

  preference:
    "تفضيل",

  constraint:
    "قيد",

  decision:
    "قرار",

  other:
    "أخرى",
};


/* =========================================================
 * 23. AI RECOMMENDATION CATEGORIES
 * ======================================================= */

export const AI_RECOMMENDATION_CATEGORIES = [
  "general",
  "finance",
  "investments",
  "goals",
  "projects",
  "career",
  "learning",
  "education",
  "travel",
  "fitness",
  "opportunity",
  "decision",
] as const satisfies readonly AIRecommendationCategory[];


export const AI_RECOMMENDATION_CATEGORY_LABELS:
Record<
  AIRecommendationCategory,
  string
> = {
  general:
    "عام",

  finance:
    "المالية",

  investments:
    "الاستثمارات",

  goals:
    "الأهداف",

  projects:
    "المشاريع",

  career:
    "المسار المهني",

  learning:
    "التعلم",

  education:
    "التعليم",

  travel:
    "السفر",

  fitness:
    "اللياقة",

  opportunity:
    "فرصة",

  decision:
    "قرار",
};


/* =========================================================
 * 24. AI RECOMMENDATION STATUSES
 * ======================================================= */

export const AI_RECOMMENDATION_STATUSES = [
  "new",
  "reviewed",
  "accepted",
  "dismissed",
] as const satisfies readonly AIRecommendationStatus[];


export const AI_RECOMMENDATION_STATUS_LABELS:
Record<
  AIRecommendationStatus,
  string
> = {
  new:
    "جديد",

  reviewed:
    "تمت المراجعة",

  accepted:
    "مقبول",

  dismissed:
    "مستبعد",
};


/* =========================================================
 * 25. AI RECOMMENDATION ENTITY TYPES
 * ======================================================= */

/**
 * Keep this aligned with the frozen AIRecommendationEntityType
 * domain contract.
 *
 * Travel recommendations may use category="travel" without
 * inventing a new entity type until the shared type contract
 * explicitly supports one.
 */
export const AI_RECOMMENDATION_ENTITY_TYPES = [
  "goal",
  "project",
  "learning",
  "career",
  "investment",
  "task",
] as const satisfies readonly AIRecommendationEntityType[];


/* =========================================================
 * 26. AI TOOL NAMES
 * ======================================================= */

/**
 * V2 LIFE AI is read-oriented.
 *
 * Travel data is currently supplied through the controlled
 * context builder rather than granting AI an arbitrary Travel
 * write tool.
 *
 *
 * LIFE Invest AI is intentionally NOT added as a Chief of
 * Staff tool here.
 *
 * It runs through its own constrained investment-analysis
 * pipeline and cannot receive broker execution authority.
 */
export const AI_TOOL_NAMES = [
  "get_dashboard_snapshot",
  "get_finance_snapshot",
  "get_investment_snapshot",
  "get_goal_status",
  "get_learning_status",
  "simulate_decision",
  "search_opportunities",
] as const satisfies readonly AIToolName[];


/* =========================================================
 * 27. PROHIBITED AI ACTIONS
 * ======================================================= */

export const PROHIBITED_AI_ACTIONS = [
  "transfer_money",
  "buy_investment",
  "sell_investment",
  "place_broker_order",
  "send_email",
  "send_message",
  "change_authentication",
  "change_security",
  "delete_important_data",
  "execute_sql",
  "execute_shell_command",
] as const satisfies readonly ProhibitedAIAction[];


/* =========================================================
 * 28. OPPORTUNITY CATEGORIES
 * ======================================================= */

export const OPPORTUNITY_CATEGORIES = [
  "course",
  "certification",
  "job",
  "education",
  "professional_program",
  "development",
] as const satisfies readonly OpportunityCategory[];


export const OPPORTUNITY_CATEGORY_LABELS:
Record<
  OpportunityCategory,
  string
> = {
  course:
    "دورة",

  certification:
    "شهادة مهنية",

  job:
    "فرصة وظيفية",

  education:
    "فرصة تعليمية",

  professional_program:
    "برنامج مهني",

  development:
    "فرصة تطوير",
};


/* =========================================================
 * 29. OPPORTUNITY RECOMMENDATIONS
 * ======================================================= */

export const OPPORTUNITY_RECOMMENDATIONS = [
  "strong_match",
  "consider",
  "low_priority",
  "skip",
] as const satisfies readonly OpportunityRecommendation[];


export const OPPORTUNITY_RECOMMENDATION_LABELS:
Record<
  OpportunityRecommendation,
  string
> = {
  strong_match:
    "مناسبة جدًا",

  consider:
    "تستحق النظر",

  low_priority:
    "أولوية منخفضة",

  skip:
    "تجاوزها",
};


/* =========================================================
 * 30. NUMERIC BOUNDARIES
 * ======================================================= */

export const CAREER_RATING_MIN =
  1;


export const CAREER_RATING_MAX =
  5;


export const PROGRESS_MIN =
  0;


export const PROGRESS_MAX =
  100;


export const MONEY_MIN =
  0;


export const DUE_DAY_MIN =
  1;


export const DUE_DAY_MAX =
  31;


/* =========================================================
 * 31. TEXT BOUNDARIES
 * ======================================================= */

export const TITLE_MIN_LENGTH =
  1;


export const TITLE_MAX_LENGTH =
  120;


export const SHORT_TEXT_MAX_LENGTH =
  500;


export const NOTES_MAX_LENGTH =
  2_000;


export const MEMORY_CONTENT_MAX_LENGTH =
  4_000;


export const AI_RECOMMENDATION_MAX_LENGTH =
  2_000;


/* =========================================================
 * 32. PRIORITY SORT WEIGHT
 * ======================================================= */

export const PRIORITY_WEIGHT:
Record<
  Priority,
  number
> = {
  high:
    3,

  medium:
    2,

  low:
    1,
};


/* =========================================================
 * 33. FINAL V2 PRIMARY NAVIGATION
 * ======================================================= */

/**
 * Exactly six top-level destinations.
 *
 *
 * User-facing information architecture:
 *
 * الرئيسية
 * المال
 * خططي
 * السفر
 * التطوير
 * LIFE AI
 *
 *
 * LIFE Invest AI remains one level deeper:
 *
 * المال
 *      ↓
 * الاستثمارات
 *      ↓
 * LIFE Invest AI
 */
export const NAVIGATION_ITEMS = [
  {
    label:
      "الرئيسية",

    href:
      "/dashboard",

    icon:
      "⌂",
  },

  {
    label:
      "المال",

    href:
      "/finance",

    icon:
      "◈",
  },

  {
    label:
      "خططي",

    href:
      "/goals",

    icon:
      "◎",
  },

  {
    label:
      "السفر",

    href:
      "/travel",

    icon:
      "✈",
  },

  {
    label:
      "التطوير",

    href:
      "/learning",

    icon:
      "◉",
  },

  {
    label:
      "LIFE AI",

    href:
      "/assistant",

    icon:
      "✦",
  },
] as const satisfies readonly NavigationItem[];


/* =========================================================
 * 34. SECONDARY / DETAILED NAVIGATION
 * ======================================================= */

/**
 * Compatibility export name is intentionally retained because
 * existing UI code may still import LEGACY_NAVIGATION_ITEMS.
 *
 *
 * These pages are not legacy data.
 *
 * They are detailed secondary views under the six V2 areas.
 */
export const LEGACY_NAVIGATION_ITEMS = [
  {
    label:
      "الاستثمارات",

    href:
      "/investments",

    icon:
      "↗",
  },

  {
    label:
      "المشاريع",

    href:
      "/projects",

    icon:
      "▣",
  },

  {
    label:
      "المسار المهني",

    href:
      "/career",

    icon:
      "◇",
  },

  {
    label:
      "المهام",

    href:
      "/tasks",

    icon:
      "✓",
  },

  {
    label:
      "السجل",

    href:
      "/audit",

    icon:
      "≡",
  },

  {
    label:
      "الإعدادات",

    href:
      "/settings",

    icon:
      "⚙",
  },
] as const satisfies readonly NavigationItem[];


/* =========================================================
 * 35. PRIMARY ROUTES
 * ======================================================= */

export const HOME_ROUTE =
  "/dashboard";


export const MONEY_ROUTE =
  "/finance";


export const PLANS_ROUTE =
  "/goals";


export const TRAVEL_ROUTE =
  "/travel";


export const GROWTH_ROUTE =
  "/learning";


export const LIFE_AI_ROUTE =
  "/assistant";


/* =========================================================
 * 36. PUBLIC ROUTES
 * ======================================================= */

export const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/auth/callback",
] as const;


/* =========================================================
 * 37. PROTECTED ROUTES
 * ======================================================= */

/**
 * /onboarding is authenticated.
 *
 * It is not a public account-registration route.
 *
 *
 * Proxy performs prefix matching.
 *
 * Therefore:
 *
 * /investments
 *
 * automatically protects:
 *
 * /investments/intelligence
 */
export const PROTECTED_ROUTES = [
  "/dashboard",
  "/finance",
  "/goals",
  "/travel",
  "/learning",
  "/assistant",

  "/investments",
  "/projects",
  "/career",
  "/tasks",

  "/audit",
  "/settings",
  "/onboarding",
] as const;


/* =========================================================
 * 38. API ROUTES
 * ======================================================= */

export const AI_API_ROUTE =
  "/api/ai";


export const OPPORTUNITIES_API_ROUTE =
  "/api/opportunities";


export const INTAKE_PREVIEW_API_ROUTE =
  "/api/intake/preview";


export const INTAKE_CONFIRM_API_ROUTE =
  "/api/intake/confirm";


export const INVESTMENT_INTELLIGENCE_ANALYZE_API_ROUTE =
  "/api/investment-intelligence/analyze";


export const INVESTMENT_INTELLIGENCE_TRACK_RECORD_API_ROUTE =
  "/api/investment-intelligence/track-record";


/* =========================================================
 * 39. USER ERRORS
 * ======================================================= */

export const USER_ERRORS = {
  generic:
    "تعذر تنفيذ الطلب الآن.",

  dataLoad:
    "تعذر تحميل البيانات.",

  invalidInput:
    "البيانات المدخلة غير صحيحة.",

  authentication:
    "انتهت الجلسة. سجل الدخول مرة أخرى.",

  authorization:
    "ليس لديك صلاحية لتنفيذ هذا الإجراء.",

  aiUnavailable:
    "تعذر تشغيل المساعد الذكي الآن. بيانات LIFE OS محفوظة ولم تتأثر.",

  opportunityUnavailable:
    "تعذر البحث عن الفرص الآن.",

  intakeUnavailable:
    "تعذر تجهيز الإضافة الآن. لم يتم حفظ أي تغيير.",

  investmentIntelligenceUnavailable:
    "تعذر تشغيل LIFE Invest AI الآن. محفظتك وسجل استثماراتك لم يتأثرا.",
} as const;


/* =========================================================
 * 40. EMPTY STATES
 * ======================================================= */

export const EMPTY_STATE_MESSAGES = {
  goals: {
    title:
      "لا توجد أهداف بعد",

    description:
      "أضف أول هدف لتبدأ المتابعة.",
  },


  projects: {
    title:
      "لا توجد مشاريع بعد",

    description:
      "أضف مشروعًا عندما يكون لديك هدف متعدد الخطوات.",
  },


  finance: {
    title:
      "لا توجد بيانات مالية بعد",

    description:
      "ابدأ بإضافة مصدر الدخل والتوزيعات الأساسية.",
  },


  investments: {
    title:
      "لا توجد استثمارات بعد",

    description:
      "أضف أول أصل استثماري لمتابعة المحفظة.",
  },


  travel: {
    title:
      "لا توجد رحلات بعد",

    description:
      "أضف وجهتك أو ارفع برنامج الرحلة PDF.",
  },


  career: {
    title:
      "لا توجد بيانات مهنية بعد",

    description:
      "ابدأ بإضافة دورك الحالي أو هدفك المهني.",
  },


  learning: {
    title:
      "لا توجد عناصر تعليمية بعد",

    description:
      "أضف الدورة أو البرنامج الذي تعمل عليه حاليًا.",
  },


  tasks: {
    title:
      "لا توجد مهام",

    description:
      "أنت محدث حاليًا.",
  },


  audit: {
    title:
      "لا يوجد نشاط مسجل بعد",

    description:
      "ستظهر هنا العمليات المهمة داخل LIFE OS.",
  },
} as const;


/* =========================================================
 * 41. STATUS SORT WEIGHT
 * ======================================================= */

export const STATUS_SORT_WEIGHT = {
  active:
    5,

  blocked:
    5,

  pending:
    4,

  planned:
    3,

  paused:
    2,

  completed:
    1,

  archived:
    1,

  dropped:
    1,

  cancelled:
    0,
} as const;


/* =========================================================
 * 42. DATE FORMATTING
 * ======================================================= */

export const DATE_DISPLAY_OPTIONS = {
  year:
    "numeric",

  month:
    "short",

  day:
    "numeric",
} as const satisfies Intl.DateTimeFormatOptions;


export const DATE_TIME_DISPLAY_OPTIONS = {
  year:
    "numeric",

  month:
    "short",

  day:
    "numeric",

  hour:
    "2-digit",

  minute:
    "2-digit",
} as const satisfies Intl.DateTimeFormatOptions;


/* =========================================================
 * 43. MONEY FORMATTING
 * ======================================================= */

export const CURRENCY_DISPLAY_OPTIONS = {
  style:
    "currency",

  currencyDisplay:
    "symbol",

  maximumFractionDigits:
    2,
} as const satisfies Intl.NumberFormatOptions;


/* =========================================================
 * 44. PERCENT FORMATTING
 * ======================================================= */

export const PERCENT_DISPLAY_OPTIONS = {
  minimumFractionDigits:
    0,

  maximumFractionDigits:
    1,
} as const satisfies Intl.NumberFormatOptions;


/* =========================================================
 * 45. AUDIT LIMITS
 * ======================================================= */

export const AUDIT_METADATA_MAX_KEYS =
  10;


export const AUDIT_METADATA_MAX_STRING_LENGTH =
  250;


/* =========================================================
 * 46. FORBIDDEN AUDIT METADATA
 * ======================================================= */

export const FORBIDDEN_AUDIT_METADATA_KEYS = [
  "password",
  "passcode",
  "otp",
  "totp",
  "totp_secret",
  "api_key",
  "apikey",
  "access_token",
  "refresh_token",
  "authorization",
  "cookie",
  "secret",
  "service_role",
  "openai_api_key",
  "twelve_data_api_key",
] as const;


/* =========================================================
 * 47. AUTHENTICATION
 * ======================================================= */

/**
 * LIFE OS V2 requires a verified authenticated Supabase
 * session.
 *
 *
 * Password login satisfies AAL1.
 *
 *
 * TOTP may still exist as optional account hardening, but the
 * application does not require AAL2 for ordinary V2 use.
 */
export const REQUIRED_AUTHENTICATION_LEVEL =
  "aal1";


export const LOGIN_ROUTE =
  "/login";


export const SETTINGS_ROUTE =
  "/settings";


export const DEFAULT_AUTHENTICATED_ROUTE =
  "/dashboard";


/* =========================================================
 * 48. SENSITIVE QUERY PARAMETERS
 * ======================================================= */

export const SENSITIVE_QUERY_PARAMETER_NAMES = [
  "password",
  "passcode",
  "token",
  "access_token",
  "refresh_token",
  "api_key",
  "secret",
  "twelve_data_api_key",
  "salary",
  "investment_balance",
] as const;


/* =========================================================
 * 49. LIFE OS DATABASE TABLE REGISTRY
 * ======================================================= */

/**
 * Complete LIFE OS public application table registry.
 *
 *
 * V1 foundation:
 *
 * profiles
 * income_sources
 * budget_items
 * monthly_snapshots
 * investment_assets
 * investment_transactions
 * goals
 * projects
 * tasks
 * learning_items
 * career_items
 * memory_items
 * ai_recommendations
 * audit_logs
 *
 *
 * V2:
 *
 * intake_items
 * trips
 * documents
 *
 *
 * Investment Intelligence extension:
 *
 * investment_ai_analyses
 * investment_ai_evidence
 * investment_ai_forecasts
 * investment_ai_forecast_outcomes
 *
 *
 * investment_ai_track_record is a VIEW,
 * therefore it does not belong in LIFE_OS_TABLES.
 */
export const LIFE_OS_TABLES = [
  "profiles",

  "income_sources",
  "budget_items",
  "monthly_snapshots",

  "investment_assets",
  "investment_transactions",

  "investment_ai_analyses",
  "investment_ai_evidence",
  "investment_ai_forecasts",
  "investment_ai_forecast_outcomes",

  "goals",
  "projects",
  "tasks",

  "learning_items",
  "career_items",

  "memory_items",
  "ai_recommendations",

  "intake_items",

  "trips",
  "documents",

  "audit_logs",
] as const;


/* =========================================================
 * 50. DOMAIN TABLE GROUPS
 * ======================================================= */

export const LIFE_OS_MONEY_TABLES = [
  "income_sources",
  "budget_items",
  "monthly_snapshots",
  "investment_assets",
  "investment_transactions",

  "investment_ai_analyses",
  "investment_ai_evidence",
  "investment_ai_forecasts",
  "investment_ai_forecast_outcomes",
] as const;


export const LIFE_OS_INVESTMENT_INTELLIGENCE_TABLES = [
  "investment_ai_analyses",
  "investment_ai_evidence",
  "investment_ai_forecasts",
  "investment_ai_forecast_outcomes",
] as const;


export const LIFE_OS_PLAN_TABLES = [
  "goals",
  "projects",
  "tasks",
] as const;


export const LIFE_OS_GROWTH_TABLES = [
  "learning_items",
  "career_items",
] as const;


export const LIFE_OS_TRAVEL_TABLES = [
  "trips",
  "documents",
] as const;


export const LIFE_OS_INTELLIGENCE_TABLES = [
  "memory_items",
  "ai_recommendations",
  "intake_items",
] as const;


/* =========================================================
 * 51. PRIVATE DOCUMENT STORAGE
 * ======================================================= */

/**
 * Canonical bucket name.
 *
 * Actual upload validation and Storage RLS remain enforced in
 * the Travel/document data layer and Supabase migrations.
 */
export const PRIVATE_DOCUMENT_STORAGE_BUCKET =
  "life-os-private-documents";


/* =========================================================
 * 52. AI OUTPUT LABELS
 * ======================================================= */

export const AI_OUTPUT_LABELS = {
  situation:
    "الوضع",

  recommendation:
    "الاقتراح",

  nextAction:
    "الخطوة التالية",
} as const;


/* =========================================================
 * 53. DECISION LABELS
 * ======================================================= */

export const DECISION_LABELS = {
  optionA:
    "الخيار A",

  optionB:
    "الخيار B",

  optionC:
    "الخيار C",

  bestChoice:
    "الخيار الأفضل",

  tradeoff:
    "المقابل",

  nextAction:
    "الخطوة التالية",
} as const;


/* =========================================================
 * 54. APPLICATION SAFETY DEFAULTS
 * ======================================================= */

export const APPLICATION_SAFETY_DEFAULTS = {
  publicRegistrationEnabled:
    false,

  autonomousFinancialExecution:
    false,

  autonomousEmailExecution:
    false,

  autonomousDeletion:
    false,

  arbitrarySqlEnabled:
    false,

  shellExecutionEnabled:
    false,

  backgroundOpportunityMonitoring:
    false,

  directBankIntegration:
    false,

  brokerExecution:
    false,

  aiDatabaseWriteAuthority:
    false,

  publicDocumentStorage:
    false,

  autonomousIntakeExecution:
    false,

  autonomousInvestmentAnalysis:
    false,

  autonomousInvestmentOutcomeMutation:
    false,
} as const;


/* =========================================================
 * 55. FINAL NAVIGATION CONTRACT
 * ======================================================= */

/**
 * Exactly six top-level V2 destinations:
 *
 * الرئيسية
 * المال
 * خططي
 * السفر
 * التطوير
 * LIFE AI
 *
 *
 * Detailed routes remain available underneath those areas.
 *
 *
 * LIFE Invest AI:
 *
 * /investments/intelligence
 *
 * remains a secondary intelligence layer and does not become
 * a seventh navigation destination.
 */


/* =========================================================
 * 56. FINAL AUTH CONTRACT
 * ======================================================= */

/**
 * Required:
 *
 * verified authenticated session
 * +
 * AAL1 minimum
 *
 *
 * Not required for ordinary application use:
 *
 * mandatory TOTP
 * mandatory AAL2
 */


/* =========================================================
 * 57. FINAL TRAVEL CONTRACT
 * ======================================================= */

/**
 * Travel is no longer a placeholder.
 *
 *
 * V2 contains:
 *
 * trips
 * documents
 * private Storage
 * Universal Add travel proposal
 * deterministic Travel executor
 * Travel OS page
 * Home Travel summary
 * LIFE AI read-only Travel context
 */


/* =========================================================
 * 58. FINAL INTAKE CONTRACT
 * ======================================================= */

/**
 * Universal Add:
 *
 * text / PDF
 *      ↓
 * AI preview
 *      ↓
 * exact structured proposal
 *      ↓
 * user review
 *      ↓
 * explicit confirmation
 *      ↓
 * deterministic executor
 *
 *
 * AI never receives direct database write authority.
 */


/* =========================================================
 * 59. INVESTMENT INTELLIGENCE CONTRACT
 * ======================================================= */

/**
 * LIFE Invest AI:
 *
 * existing owned investment
 *      ↓
 * trusted market evidence
 *      ↓
 * deterministic technical calculations
 *      ↓
 * constrained AI interpretation
 *      ↓
 * deterministic LIFE score
 *      ↓
 * probabilistic forecast
 *      ↓
 * immutable forecast history
 *      ↓
 * future actual market observation
 *      ↓
 * deterministic grading
 *      ↓
 * Track Record
 *
 *
 * Browser cannot supply:
 *
 * overall score
 * recommendation
 * confidence
 * market facts
 * historical accuracy
 *
 *
 * AI cannot:
 *
 * buy
 * sell
 * transfer money
 * place broker orders
 * rewrite historical forecasts
 */


/* =========================================================
 * 60. MARKET DATA SECRET CONTRACT
 * ======================================================= */

/**
 * TWELVE_DATA_API_KEY:
 *
 * server-only
 * never NEXT_PUBLIC_
 * never audit metadata
 * never query parameters
 * never source control
 */


/* =========================================================
 * 61. FINAL DATABASE SECURITY CONTRACT
 * ======================================================= */

/**
 * Application access:
 *
 * publishable Supabase client
 * +
 * authenticated user session
 * +
 * PostgreSQL RLS
 * +
 * Storage RLS
 *
 *
 * No application feature requires:
 *
 * service_role
 * database password
 * arbitrary SQL from AI
 */


/* =========================================================
 * 62. FINAL LIFE OS V2 RULE
 * ======================================================= */

/**
 * Database architecture may be complex underneath.
 *
 * User-facing LIFE OS stays simple:
 *
 * الرئيسية
 * المال
 * خططي
 * السفر
 * التطوير
 * LIFE AI
 *
 *
 * Investment Intelligence remains optional underneath:
 *
 * المال
 *      ↓
 * الاستثمارات
 *      ↓
 * LIFE Invest AI
 *
 *
 * Simple outside.
 * Intelligent underneath.
 * Private by default.
 */