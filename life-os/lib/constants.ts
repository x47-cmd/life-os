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

export const APP_NAME = "LIFE OS";

export const APP_VERSION = "2.0.0-beta.1";

export const APP_PHASE = "V2";

export const APP_DESCRIPTION =
  "Personal AI Operating System";

export const APP_LANGUAGE = "ar";

export const APP_LOCALE = "ar-AE";

export const APP_DIRECTION = "rtl";

export const DEFAULT_CURRENCY = "AED";

export const DEFAULT_TIMEZONE = "Asia/Dubai";

export const PRODUCT_PRINCIPLE =
  "Simple outside. Intelligent underneath.";

export const SECURITY_PRINCIPLE =
  "AI Suggests → User Reviews → User Approves → System Executes";

export const AI_ROLE = "advisor";

export const MAX_DASHBOARD_PRIORITIES = 3;

export const MAX_DASHBOARD_GOALS = 5;

export const MAX_DASHBOARD_PROJECTS = 5;

export const MAX_DASHBOARD_TASKS = 5;

export const MAX_DASHBOARD_LEARNING_ITEMS = 5;

export const DEFAULT_PAGE_SIZE = 20;

export const AUDIT_PAGE_SIZE = 50;

export const MAX_PAGE_SIZE = 100;

export const AI_MAX_USER_MESSAGE_LENGTH = 4_000;

export const AI_MAX_TOOL_CALLS = 7;

export const AI_MAX_CONTEXT_ITEMS_PER_CATEGORY = 10;

export const AI_MAX_RECOMMENDATIONS = 3;

export const DECISION_MAX_SCENARIOS = 3;

export const OPPORTUNITY_MAX_RESULTS = 5;

export const OPPORTUNITY_MIN_FIT_SCORE = 0;

export const OPPORTUNITY_MAX_FIT_SCORE = 100;

export const PRIORITIES = [
  "low",
  "medium",
  "high",
] as const satisfies readonly Priority[];

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: "منخفض",
  medium: "متوسط",
  high: "مرتفع",
};

export const FREQUENCIES = [
  "monthly",
  "annual",
  "one_time",
  "other",
] as const satisfies readonly Frequency[];

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  monthly: "شهري",
  annual: "سنوي",
  one_time: "مرة واحدة",
  other: "أخرى",
};

export const GOAL_STATUSES = [
  "planned",
  "active",
  "paused",
  "completed",
  "cancelled",
] as const satisfies readonly GoalStatus[];

export const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
  planned: "مخطط",
  active: "قيد العمل",
  paused: "مؤجل",
  completed: "مكتمل",
  cancelled: "ملغي",
};

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

export const GOAL_CATEGORY_LABELS: Record<
  GoalCategory,
  string
> = {
  finance: "المالية",
  investments: "الاستثمارات",
  career: "المسار المهني",
  learning: "التعلم",
  education: "التعليم",
  business: "البزنس",
  travel: "السفر",
  fitness: "اللياقة",
  personal: "شخصي",
  other: "أخرى",
};

export const PROJECT_STATUSES = [
  "planned",
  "active",
  "blocked",
  "paused",
  "completed",
  "cancelled",
] as const satisfies readonly ProjectStatus[];

export const PROJECT_STATUS_LABELS: Record<
  ProjectStatus,
  string
> = {
  planned: "مخطط",
  active: "قيد العمل",
  blocked: "متعطل",
  paused: "مؤجل",
  completed: "مكتمل",
  cancelled: "ملغي",
};

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

export const PROJECT_CATEGORY_LABELS: Record<
  ProjectCategory,
  string
> = {
  ai: "الذكاء الاصطناعي",
  career: "المسار المهني",
  education: "التعليم",
  finance: "المالية",
  investments: "الاستثمارات",
  business: "البزنس",
  travel: "السفر",
  fitness: "اللياقة",
  personal: "شخصي",
  other: "أخرى",
};

export const TASK_STATUSES = [
  "pending",
  "active",
  "completed",
  "cancelled",
] as const satisfies readonly TaskStatus[];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "بانتظار التنفيذ",
  active: "قيد العمل",
  completed: "مكتمل",
  cancelled: "ملغي",
};

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

export const BUDGET_CATEGORY_LABELS: Record<
  BudgetCategory,
  string
> = {
  family: "العائلة",
  housing: "السكن",
  debt: "القروض والالتزامات",
  transport: "المواصلات",
  personal: "المصاريف الشخصية",
  travel: "السفر",
  emergency: "الطوارئ",
  investments: "الاستثمارات",
  education: "التعليم",
  business: "البزنس",
  other: "أخرى",
};

export const BUDGET_ITEM_TYPES = [
  "expense",
  "saving",
  "investment",
  "debt",
] as const satisfies readonly BudgetItemType[];

export const BUDGET_ITEM_TYPE_LABELS: Record<
  BudgetItemType,
  string
> = {
  expense: "مصروف",
  saving: "توفير",
  investment: "استثمار",
  debt: "التزام",
};

export const INVESTMENT_ASSET_TYPES = [
  "stock",
  "etf",
  "sukuk",
  "fund",
  "cash",
  "other",
] as const satisfies readonly InvestmentAssetType[];

export const INVESTMENT_ASSET_TYPE_LABELS: Record<
  InvestmentAssetType,
  string
> = {
  stock: "سهم",
  etf: "صندوق ETF",
  sukuk: "صكوك",
  fund: "صندوق",
  cash: "نقد",
  other: "أخرى",
};

export const INVESTMENT_TRANSACTION_TYPES = [
  "buy",
  "sell",
  "dividend",
  "fee",
  "adjustment",
] as const satisfies readonly InvestmentTransactionType[];

export const INVESTMENT_TRANSACTION_TYPE_LABELS: Record<
  InvestmentTransactionType,
  string
> = {
  buy: "شراء",
  sell: "بيع",
  dividend: "توزيعات",
  fee: "رسوم",
  adjustment: "تعديل",
};

export const LEARNING_ITEM_TYPES = [
  "course",
  "certification",
  "learning_path",
  "masters",
  "university_program",
  "other",
] as const satisfies readonly LearningItemType[];

export const LEARNING_ITEM_TYPE_LABELS: Record<
  LearningItemType,
  string
> = {
  course: "دورة",
  certification: "شهادة مهنية",
  learning_path: "مسار تعليمي",
  masters: "ماجستير",
  university_program: "برنامج جامعي",
  other: "أخرى",
};

export const LEARNING_STATUSES = [
  "planned",
  "active",
  "completed",
  "paused",
  "dropped",
] as const satisfies readonly LearningStatus[];

export const LEARNING_STATUS_LABELS: Record<
  LearningStatus,
  string
> = {
  planned: "مخطط",
  active: "قيد الدراسة",
  completed: "مكتمل",
  paused: "مؤجل",
  dropped: "متوقف",
};

export const CAREER_ITEM_TYPES = [
  "current_role",
  "target_role",
  "skill",
  "achievement",
  "milestone",
  "gap",
] as const satisfies readonly CareerItemType[];

export const CAREER_ITEM_TYPE_LABELS: Record<
  CareerItemType,
  string
> = {
  current_role: "الدور الحالي",
  target_role: "الدور المستهدف",
  skill: "مهارة",
  achievement: "إنجاز",
  milestone: "محطة مهنية",
  gap: "فجوة تطويرية",
};

export const CAREER_STATUSES = [
  "active",
  "planned",
  "completed",
  "archived",
] as const satisfies readonly CareerStatus[];

export const CAREER_STATUS_LABELS: Record<
  CareerStatus,
  string
> = {
  active: "نشط",
  planned: "مخطط",
  completed: "مكتمل",
  archived: "مؤرشف",
};

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

export const MEMORY_CATEGORY_LABELS: Record<
  MemoryCategory,
  string
> = {
  finance: "المالية",
  investments: "الاستثمارات",
  career: "المسار المهني",
  learning: "التعلم",
  education: "التعليم",
  projects: "المشاريع",
  travel: "السفر",
  fitness: "اللياقة",
  personal: "شخصي",
  preference: "تفضيل",
  constraint: "قيد",
  decision: "قرار",
  other: "أخرى",
};

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

export const AI_RECOMMENDATION_CATEGORY_LABELS: Record<
  AIRecommendationCategory,
  string
> = {
  general: "عام",
  finance: "المالية",
  investments: "الاستثمارات",
  goals: "الأهداف",
  projects: "المشاريع",
  career: "المسار المهني",
  learning: "التعلم",
  education: "التعليم",
  travel: "السفر",
  fitness: "اللياقة",
  opportunity: "فرصة",
  decision: "قرار",
};

export const AI_RECOMMENDATION_STATUSES = [
  "new",
  "reviewed",
  "accepted",
  "dismissed",
] as const satisfies readonly AIRecommendationStatus[];

export const AI_RECOMMENDATION_STATUS_LABELS: Record<
  AIRecommendationStatus,
  string
> = {
  new: "جديد",
  reviewed: "تمت المراجعة",
  accepted: "مقبول",
  dismissed: "مستبعد",
};

export const AI_RECOMMENDATION_ENTITY_TYPES = [
  "goal",
  "project",
  "learning",
  "career",
  "investment",
  "task",
] as const satisfies readonly AIRecommendationEntityType[];

export const AI_TOOL_NAMES = [
  "get_dashboard_snapshot",
  "get_finance_snapshot",
  "get_investment_snapshot",
  "get_goal_status",
  "get_learning_status",
  "simulate_decision",
  "search_opportunities",
] as const satisfies readonly AIToolName[];

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

export const OPPORTUNITY_CATEGORIES = [
  "course",
  "certification",
  "job",
  "education",
  "professional_program",
  "development",
] as const satisfies readonly OpportunityCategory[];

export const OPPORTUNITY_CATEGORY_LABELS: Record<
  OpportunityCategory,
  string
> = {
  course: "دورة",
  certification: "شهادة مهنية",
  job: "فرصة وظيفية",
  education: "فرصة تعليمية",
  professional_program: "برنامج مهني",
  development: "فرصة تطوير",
};

export const OPPORTUNITY_RECOMMENDATIONS = [
  "strong_match",
  "consider",
  "low_priority",
  "skip",
] as const satisfies readonly OpportunityRecommendation[];

export const OPPORTUNITY_RECOMMENDATION_LABELS: Record<
  OpportunityRecommendation,
  string
> = {
  strong_match: "مناسبة جدًا",
  consider: "تستحق النظر",
  low_priority: "أولوية منخفضة",
  skip: "تجاوزها",
};

export const CAREER_RATING_MIN = 1;

export const CAREER_RATING_MAX = 5;

export const PROGRESS_MIN = 0;

export const PROGRESS_MAX = 100;

export const MONEY_MIN = 0;

export const DUE_DAY_MIN = 1;

export const DUE_DAY_MAX = 31;

export const TITLE_MIN_LENGTH = 1;

export const TITLE_MAX_LENGTH = 120;

export const SHORT_TEXT_MAX_LENGTH = 500;

export const NOTES_MAX_LENGTH = 2_000;

export const MEMORY_CONTENT_MAX_LENGTH = 4_000;

export const AI_RECOMMENDATION_MAX_LENGTH = 2_000;

export const PRIORITY_WEIGHT: Record<Priority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

export const NAVIGATION_ITEMS = [
  {
    label: "الرئيسية",
    href: "/dashboard",
    icon: "⌂",
  },
  {
    label: "المال",
    href: "/finance",
    icon: "◈",
  },
  {
    label: "خططي",
    href: "/goals",
    icon: "◎",
  },
  {
    label: "السفر",
    href: "/travel",
    icon: "✈",
  },
  {
    label: "التطوير",
    href: "/learning",
    icon: "◉",
  },
  {
    label: "LIFE AI",
    href: "/assistant",
    icon: "✦",
  },
] as const satisfies readonly NavigationItem[];

export const LEGACY_NAVIGATION_ITEMS = [
  {
    label: "الاستثمارات",
    href: "/investments",
    icon: "↗",
  },
  {
    label: "المشاريع",
    href: "/projects",
    icon: "▣",
  },
  {
    label: "المسار المهني",
    href: "/career",
    icon: "◇",
  },
  {
    label: "المهام",
    href: "/tasks",
    icon: "✓",
  },
  {
    label: "السجل",
    href: "/audit",
    icon: "≡",
  },
  {
    label: "الإعدادات",
    href: "/settings",
    icon: "⚙",
  },
] as const satisfies readonly NavigationItem[];

export const HOME_ROUTE = "/dashboard";

export const MONEY_ROUTE = "/finance";

export const PLANS_ROUTE = "/goals";

export const TRAVEL_ROUTE = "/travel";

export const GROWTH_ROUTE = "/learning";

export const LIFE_AI_ROUTE = "/assistant";

export const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/auth/callback",
] as const;

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
] as const;

export const AI_API_ROUTE = "/api/ai";

export const OPPORTUNITIES_API_ROUTE =
  "/api/opportunities";

export const USER_ERRORS = {
  generic: "تعذر تنفيذ الطلب الآن.",
  dataLoad: "تعذر تحميل البيانات.",
  invalidInput: "البيانات المدخلة غير صحيحة.",
  authentication:
    "انتهت الجلسة. سجل الدخول مرة أخرى.",
  authorization:
    "ليس لديك صلاحية لتنفيذ هذا الإجراء.",
  aiUnavailable:
    "تعذر تشغيل المساعد الذكي الآن. بيانات LIFE OS محفوظة ولم تتأثر.",
  opportunityUnavailable:
    "تعذر البحث عن الفرص الآن.",
} as const;

export const EMPTY_STATE_MESSAGES = {
  goals: {
    title: "لا توجد أهداف بعد",
    description: "أضف أول هدف لتبدأ المتابعة.",
  },

  projects: {
    title: "لا توجد مشاريع بعد",
    description:
      "أضف مشروعًا عندما يكون لديك هدف متعدد الخطوات.",
  },

  finance: {
    title: "لا توجد بيانات مالية بعد",
    description:
      "ابدأ بإضافة مصدر الدخل والتوزيعات الأساسية.",
  },

  investments: {
    title: "لا توجد استثمارات بعد",
    description:
      "أضف أول أصل استثماري لمتابعة المحفظة.",
  },

  career: {
    title: "لا توجد بيانات مهنية بعد",
    description:
      "ابدأ بإضافة دورك الحالي أو هدفك المهني.",
  },

  learning: {
    title: "لا توجد عناصر تعليمية بعد",
    description:
      "أضف الدورة أو البرنامج الذي تعمل عليه حاليًا.",
  },

  tasks: {
    title: "لا توجد مهام",
    description: "أنت محدث حاليًا.",
  },

  audit: {
    title: "لا يوجد نشاط مسجل بعد",
    description:
      "ستظهر هنا العمليات المهمة داخل LIFE OS.",
  },
} as const;

export const STATUS_SORT_WEIGHT = {
  active: 5,
  blocked: 5,
  pending: 4,
  planned: 3,
  paused: 2,
  completed: 1,
  archived: 1,
  dropped: 1,
  cancelled: 0,
} as const;

export const DATE_DISPLAY_OPTIONS = {
  year: "numeric",
  month: "short",
  day: "numeric",
} as const satisfies Intl.DateTimeFormatOptions;

export const DATE_TIME_DISPLAY_OPTIONS = {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
} as const satisfies Intl.DateTimeFormatOptions;

export const CURRENCY_DISPLAY_OPTIONS = {
  style: "currency",
  currencyDisplay: "symbol",
  maximumFractionDigits: 2,
} as const satisfies Intl.NumberFormatOptions;

export const PERCENT_DISPLAY_OPTIONS = {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
} as const satisfies Intl.NumberFormatOptions;

export const AUDIT_METADATA_MAX_KEYS = 10;

export const AUDIT_METADATA_MAX_STRING_LENGTH = 250;

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
] as const;

export const REQUIRED_AUTHENTICATION_LEVEL = "aal1";

export const LOGIN_ROUTE = "/login";

export const SETTINGS_ROUTE = "/settings";

export const DEFAULT_AUTHENTICATED_ROUTE =
  "/dashboard";

export const SENSITIVE_QUERY_PARAMETER_NAMES = [
  "password",
  "passcode",
  "token",
  "access_token",
  "refresh_token",
  "api_key",
  "secret",
  "salary",
  "investment_balance",
] as const;

export const LIFE_OS_TABLES = [
  "profiles",
  "income_sources",
  "budget_items",
  "monthly_snapshots",
  "investment_assets",
  "investment_transactions",
  "goals",
  "projects",
  "tasks",
  "learning_items",
  "career_items",
  "memory_items",
  "ai_recommendations",
  "audit_logs",
] as const;

export const AI_OUTPUT_LABELS = {
  situation: "الوضع",
  recommendation: "الاقتراح",
  nextAction: "الخطوة التالية",
} as const;

export const DECISION_LABELS = {
  optionA: "الخيار A",
  optionB: "الخيار B",
  optionC: "الخيار C",
  bestChoice: "الخيار الأفضل",
  tradeoff: "المقابل",
  nextAction: "الخطوة التالية",
} as const;

export const APPLICATION_SAFETY_DEFAULTS = {
  publicRegistrationEnabled: false,
  autonomousFinancialExecution: false,
  autonomousEmailExecution: false,
  autonomousDeletion: false,
  arbitrarySqlEnabled: false,
  shellExecutionEnabled: false,
  backgroundOpportunityMonitoring: false,
  directBankIntegration: false,
  brokerExecution: false,
} as const;