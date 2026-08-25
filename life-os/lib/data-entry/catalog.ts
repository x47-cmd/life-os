export const DATA_ENTRY_KINDS = [
  "income",
  "budget",
  "investment_asset",
  "investment_transaction",
  "goal",
  "project",
  "task",
  "learning",
  "career",
  "trip",
  "memory",
  "document",
] as const;

export type DataEntryKind =
  (typeof DATA_ENTRY_KINDS)[number];

export type DataEntryFieldType =
  | "text"
  | "number"
  | "date"
  | "select"
  | "textarea"
  | "file";

export interface DataEntryOption {
  label: string;
  value: string;
}

export interface DataEntryField {
  name: string;
  label: string;
  type: DataEntryFieldType;
  required?: boolean;
  placeholder?: string;
  min?: number;
  step?: string;
  options?: readonly DataEntryOption[];
}

export interface DataEntryDefinition {
  kind: DataEntryKind;
  title: string;
  buttonLabel: string;
  description: string;
  fields: readonly DataEntryField[];
}

const frequencyOptions = [
  { label: "شهري", value: "monthly" },
  { label: "سنوي", value: "annual" },
  { label: "مرة واحدة", value: "one_time" },
  { label: "أخرى", value: "other" },
] as const;

const priorityOptions = [
  { label: "منخفضة", value: "low" },
  { label: "متوسطة", value: "medium" },
  { label: "عالية", value: "high" },
] as const;

export const DATA_ENTRY_CATALOG: Record<
  DataEntryKind,
  DataEntryDefinition
> = {
  income: {
    kind: "income",
    title: "إضافة دخل",
    buttonLabel: "إضافة دخل",
    description: "سجّل الراتب أو أي مصدر دخل آخر.",
    fields: [
      { name: "name", label: "اسم الدخل", type: "text", required: true, placeholder: "مثال: الراتب" },
      { name: "amount", label: "المبلغ", type: "number", required: true, min: 0, step: "0.01", placeholder: "26700" },
      { name: "frequency", label: "التكرار", type: "select", required: true, options: frequencyOptions },
      { name: "next_expected_date", label: "التاريخ القادم", type: "date" },
      { name: "notes", label: "ملاحظات", type: "textarea", placeholder: "اختياري" },
    ],
  },
  budget: {
    kind: "budget",
    title: "إضافة مبلغ أو التزام",
    buttonLabel: "إضافة مبلغ",
    description: "أضف مصروفًا أو ادخارًا أو استثمارًا شهريًا أو قرضًا.",
    fields: [
      { name: "name", label: "الاسم", type: "text", required: true, placeholder: "مثال: القرض" },
      { name: "item_type", label: "النوع", type: "select", required: true, options: [
        { label: "مصروف", value: "expense" }, { label: "ادخار", value: "saving" },
        { label: "استثمار", value: "investment" }, { label: "قرض أو دين", value: "debt" },
      ] },
      { name: "category", label: "التصنيف", type: "select", required: true, options: [
        { label: "العائلة", value: "family" }, { label: "السكن", value: "housing" },
        { label: "الديون", value: "debt" }, { label: "النقل", value: "transport" },
        { label: "شخصي", value: "personal" }, { label: "السفر", value: "travel" },
        { label: "الطوارئ", value: "emergency" }, { label: "الاستثمارات", value: "investments" },
        { label: "التعليم", value: "education" }, { label: "البزنس", value: "business" },
        { label: "أخرى", value: "other" },
      ] },
      { name: "amount", label: "المبلغ", type: "number", required: true, min: 0, step: "0.01" },
      { name: "frequency", label: "التكرار", type: "select", required: true, options: frequencyOptions },
      { name: "due_day", label: "يوم الاستحقاق", type: "number", min: 1, step: "1", placeholder: "1 - 31" },
      { name: "notes", label: "ملاحظات", type: "textarea" },
    ],
  },
  investment_asset: {
    kind: "investment_asset",
    title: "إضافة أصل استثماري",
    buttonLabel: "إضافة أصل",
    description: "سجّل السهم أو الصندوق والكمية ومتوسط التكلفة.",
    fields: [
      { name: "ticker", label: "الرمز", type: "text", required: true, placeholder: "ADIB" },
      { name: "name", label: "اسم الأصل", type: "text", required: true },
      { name: "market", label: "السوق", type: "text", required: true, placeholder: "ADX" },
      { name: "asset_type", label: "نوع الأصل", type: "select", required: true, options: [
        { label: "سهم", value: "stock" }, { label: "ETF", value: "etf" },
        { label: "صكوك", value: "sukuk" }, { label: "صندوق", value: "fund" },
        { label: "نقد", value: "cash" }, { label: "أخرى", value: "other" },
      ] },
      { name: "quantity", label: "الكمية", type: "number", required: true, min: 0, step: "0.0001" },
      { name: "average_cost", label: "متوسط التكلفة", type: "number", required: true, min: 0, step: "0.0001" },
      { name: "reference_price", label: "السعر المرجعي", type: "number", min: 0, step: "0.0001" },
      { name: "monthly_contribution_target", label: "هدف الاستثمار الشهري", type: "number", min: 0, step: "0.01" },
      { name: "target_quantity", label: "هدف الكمية", type: "number", min: 0, step: "0.0001" },
    ],
  },
  investment_transaction: {
    kind: "investment_transaction",
    title: "تسجيل عملية استثمارية",
    buttonLabel: "تسجيل عملية",
    description: "اختر الأصل ثم سجّل شراء أو بيعًا أو توزيعات.",
    fields: [
      { name: "asset_id", label: "معرّف الأصل", type: "text", required: true, placeholder: "UUID من بطاقة الأصل" },
      { name: "transaction_type", label: "نوع العملية", type: "select", required: true, options: [
        { label: "شراء", value: "buy" }, { label: "بيع", value: "sell" },
        { label: "توزيعات", value: "dividend" }, { label: "رسوم", value: "fee" },
        { label: "تعديل", value: "adjustment" },
      ] },
      { name: "transaction_date", label: "التاريخ", type: "date", required: true },
      { name: "quantity", label: "الكمية", type: "number", min: 0, step: "0.0001" },
      { name: "unit_price", label: "سعر الوحدة", type: "number", min: 0, step: "0.0001" },
      { name: "total_amount", label: "المبلغ الإجمالي", type: "number", required: true, min: 0, step: "0.01" },
      { name: "fees", label: "الرسوم", type: "number", min: 0, step: "0.01" },
    ],
  },
  goal: {
    kind: "goal", title: "إضافة هدف", buttonLabel: "إضافة هدف", description: "أضف هدفًا واضحًا وقابلًا للمتابعة.",
    fields: [
      { name: "title", label: "اسم الهدف", type: "text", required: true },
      { name: "category", label: "التصنيف", type: "select", required: true, options: [
        { label: "المال", value: "finance" }, { label: "الاستثمارات", value: "investments" },
        { label: "المهنة", value: "career" }, { label: "التعلم", value: "learning" },
        { label: "التعليم", value: "education" }, { label: "البزنس", value: "business" },
        { label: "السفر", value: "travel" }, { label: "اللياقة", value: "fitness" },
        { label: "شخصي", value: "personal" }, { label: "أخرى", value: "other" },
      ] },
      { name: "description", label: "الوصف", type: "textarea" },
      { name: "target_value", label: "القيمة المستهدفة", type: "number", step: "0.01" },
      { name: "unit", label: "الوحدة", type: "text", placeholder: "درهم، كغ، شهادة..." },
      { name: "target_date", label: "تاريخ الهدف", type: "date" },
      { name: "priority", label: "الأولوية", type: "select", required: true, options: priorityOptions },
      { name: "next_action", label: "الخطوة التالية", type: "text" },
    ],
  },
  project: {
    kind: "project", title: "إضافة مشروع", buttonLabel: "إضافة مشروع", description: "سجّل المشروع والخطوة التالية.",
    fields: [
      { name: "title", label: "اسم المشروع", type: "text", required: true },
      { name: "category", label: "التصنيف", type: "select", required: true, options: [
        { label: "ذكاء اصطناعي", value: "ai" }, { label: "المهنة", value: "career" },
        { label: "التعليم", value: "education" }, { label: "المال", value: "finance" },
        { label: "الاستثمارات", value: "investments" }, { label: "البزنس", value: "business" },
        { label: "السفر", value: "travel" }, { label: "اللياقة", value: "fitness" },
        { label: "شخصي", value: "personal" }, { label: "أخرى", value: "other" },
      ] },
      { name: "description", label: "الوصف", type: "textarea" },
      { name: "target_date", label: "تاريخ الإنجاز", type: "date" },
      { name: "priority", label: "الأولوية", type: "select", required: true, options: priorityOptions },
      { name: "next_action", label: "الخطوة التالية", type: "text" },
    ],
  },
  task: {
    kind: "task", title: "إضافة مهمة", buttonLabel: "إضافة مهمة", description: "أضف مهمة قصيرة وحدد موعدها.",
    fields: [
      { name: "title", label: "المهمة", type: "text", required: true },
      { name: "notes", label: "التفاصيل", type: "textarea" },
      { name: "due_date", label: "موعد الإنجاز", type: "date" },
      { name: "priority", label: "الأولوية", type: "select", required: true, options: priorityOptions },
    ],
  },
  learning: {
    kind: "learning", title: "إضافة دورة أو شهادة", buttonLabel: "إضافة دورة", description: "سجّل دورة أو شهادة أو برنامج ماجستير.",
    fields: [
      { name: "title", label: "الاسم", type: "text", required: true },
      { name: "provider", label: "الجهة", type: "text" },
      { name: "item_type", label: "النوع", type: "select", required: true, options: [
        { label: "دورة", value: "course" }, { label: "شهادة", value: "certification" },
        { label: "مسار تعلم", value: "learning_path" }, { label: "ماجستير", value: "masters" },
        { label: "برنامج جامعي", value: "university_program" }, { label: "أخرى", value: "other" },
      ] },
      { name: "target_date", label: "التاريخ المستهدف", type: "date" },
      { name: "priority", label: "الأولوية", type: "select", required: true, options: priorityOptions },
      { name: "url", label: "الرابط", type: "text" },
      { name: "notes", label: "ملاحظات", type: "textarea" },
    ],
  },
  career: {
    kind: "career", title: "إضافة عنصر مهني", buttonLabel: "إضافة عنصر مهني", description: "سجّل فرصة أو إنجازًا أو مهارة أو طلب وظيفة.",
    fields: [
      { name: "title", label: "العنوان", type: "text", required: true },
      { name: "item_type", label: "النوع", type: "select", required: true, options: [
        { label: "الدور الحالي", value: "current_role" }, { label: "الدور المستهدف", value: "target_role" },
        { label: "مهارة", value: "skill" }, { label: "إنجاز", value: "achievement" },
        { label: "محطة مهنية", value: "milestone" }, { label: "فجوة تطويرية", value: "gap" },
      ] },
      { name: "description", label: "الوصف", type: "textarea" },
      { name: "target_date", label: "التاريخ", type: "date" },
      { name: "priority", label: "الأولوية", type: "select", required: true, options: priorityOptions },
      { name: "evidence_url", label: "رابط الإثبات", type: "text" },
      { name: "notes", label: "ملاحظات", type: "textarea" },
    ],
  },
  trip: {
    kind: "trip", title: "إضافة سفرة", buttonLabel: "إضافة سفرة", description: "أضف الوجهة والتواريخ والميزانية.",
    fields: [
      { name: "title", label: "اسم السفرة", type: "text", required: true },
      { name: "destination", label: "الوجهة", type: "text", required: true },
      { name: "start_date", label: "من", type: "date" },
      { name: "end_date", label: "إلى", type: "date" },
      { name: "budget_total", label: "الميزانية", type: "number", min: 0, step: "0.01" },
      { name: "notes", label: "ملاحظات", type: "textarea" },
    ],
  },
  memory: {
    kind: "memory", title: "إضافة معلومة", buttonLabel: "إضافة معلومة", description: "احفظ معلومة شخصية مفيدة داخل LIFE OS.",
    fields: [
      { name: "title", label: "العنوان", type: "text", required: true },
      { name: "content", label: "المعلومة", type: "textarea", required: true },
      { name: "category", label: "التصنيف", type: "select", required: true, options: [
        { label: "المال", value: "finance" }, { label: "الاستثمارات", value: "investments" },
        { label: "المهنة", value: "career" }, { label: "التعلم", value: "learning" },
        { label: "التعليم", value: "education" }, { label: "المشاريع", value: "projects" },
        { label: "السفر", value: "travel" }, { label: "اللياقة", value: "fitness" },
        { label: "شخصي", value: "personal" }, { label: "تفضيل", value: "preference" },
        { label: "قيد", value: "constraint" }, { label: "قرار", value: "decision" },
        { label: "أخرى", value: "other" },
      ] },
      { name: "importance", label: "الأهمية", type: "select", required: true, options: priorityOptions },
    ],
  },
  document: {
    kind: "document", title: "رفع PDF", buttonLabel: "رفع PDF", description: "ارفع مستندًا خاصًا وآمنًا.",
    fields: [
      { name: "title", label: "اسم المستند", type: "text", required: true },
      { name: "category", label: "التصنيف", type: "select", required: true, options: [
        { label: "عام", value: "general" }, { label: "سفر", value: "travel" },
        { label: "تعليم", value: "education" }, { label: "مهنة", value: "career" },
        { label: "مال", value: "finance" }, { label: "شخصي", value: "personal" },
        { label: "أخرى", value: "other" },
      ] },
      { name: "file", label: "ملف PDF", type: "file", required: true },
      { name: "notes", label: "ملاحظات", type: "textarea" },
    ],
  },
};
