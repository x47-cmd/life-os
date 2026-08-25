import { z } from "zod";

import { DATA_ENTRY_KINDS } from "@/lib/data-entry/catalog";

const optionalText = z.string().trim().max(2000).optional().nullable();
const requiredText = z.string().trim().min(1).max(250);
const amount = z.coerce.number().finite().min(0);
const optionalAmount = z.coerce.number().finite().min(0).optional().nullable();
const optionalDate = z.string().date().optional().nullable();

export const dataEntryKindSchema = z.enum(DATA_ENTRY_KINDS);

const baseSchemas = {
  income: z.object({ name: requiredText, amount, frequency: z.enum(["monthly", "annual", "one_time", "other"]), next_expected_date: optionalDate, notes: optionalText }),
  budget: z.object({ name: requiredText, category: z.enum(["family", "housing", "debt", "transport", "personal", "travel", "emergency", "investments", "education", "business", "other"]), item_type: z.enum(["expense", "saving", "investment", "debt"]), amount, frequency: z.enum(["monthly", "annual", "one_time", "other"]), due_day: z.coerce.number().int().min(1).max(31).optional().nullable(), notes: optionalText }),
  investment_asset: z.object({ ticker: requiredText.transform((value) => value.toUpperCase()), name: requiredText, market: requiredText.transform((value) => value.toUpperCase()), asset_type: z.enum(["stock", "etf", "sukuk", "fund", "cash", "other"]), quantity: amount, average_cost: amount, reference_price: optionalAmount, monthly_contribution_target: optionalAmount, target_quantity: optionalAmount }),
  investment_transaction: z.object({ asset_id: z.string().uuid(), transaction_type: z.enum(["buy", "sell", "dividend", "fee", "adjustment"]), transaction_date: z.string().date(), quantity: optionalAmount, unit_price: optionalAmount, total_amount: amount, fees: optionalAmount }),
  goal: z.object({ title: requiredText, category: z.enum(["finance", "investments", "career", "learning", "education", "business", "travel", "fitness", "personal", "other"]), description: optionalText, target_value: z.coerce.number().finite().optional().nullable(), unit: optionalText, target_date: optionalDate, priority: z.enum(["low", "medium", "high"]), next_action: optionalText }),
  project: z.object({ title: requiredText, category: z.enum(["ai", "career", "education", "finance", "investments", "business", "travel", "fitness", "personal", "other"]), description: optionalText, target_date: optionalDate, priority: z.enum(["low", "medium", "high"]), next_action: optionalText }),
  task: z.object({ title: requiredText, notes: optionalText, due_date: optionalDate, priority: z.enum(["low", "medium", "high"]) }),
  learning: z.object({ title: requiredText, provider: optionalText, item_type: z.enum(["course", "certification", "learning_path", "masters", "university_program", "other"]), target_date: optionalDate, priority: z.enum(["low", "medium", "high"]), url: optionalText, notes: optionalText }),
  career: z.object({ title: requiredText, item_type: z.enum(["current_role", "target_role", "skill", "achievement", "milestone", "gap"]), description: optionalText, target_date: optionalDate, priority: z.enum(["low", "medium", "high"]), evidence_url: optionalText, notes: optionalText }),
  trip: z.object({ title: requiredText, destination: requiredText, start_date: optionalDate, end_date: optionalDate, budget_total: optionalAmount, notes: optionalText }),
  memory: z.object({ title: requiredText, content: z.string().trim().min(1).max(10000), category: z.enum(["finance", "investments", "career", "learning", "education", "projects", "travel", "fitness", "personal", "preference", "constraint", "decision", "other"]), importance: z.enum(["low", "medium", "high"]) }),
} as const;

export type JsonDataEntryKind = keyof typeof baseSchemas;

export function parseJsonDataEntry(kind: JsonDataEntryKind, input: unknown) {
  return baseSchemas[kind].parse(input);
}

export function isJsonDataEntryKind(kind: string): kind is JsonDataEntryKind {
  return kind in baseSchemas;
}

export const documentEntrySchema = z.object({
  title: requiredText,
  category: z.enum(["general", "travel", "education", "career", "finance", "personal", "other"]),
  notes: optionalText,
});
