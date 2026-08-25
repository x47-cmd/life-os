import type { ServerSupabaseClient } from "@/lib/supabase/server";
import type { JsonDataEntryKind } from "@/lib/data-entry/validation";

const tableByKind = {
  income: "income_sources",
  budget: "budget_items",
  investment_asset: "investment_assets",
  investment_transaction: "investment_transactions",
  goal: "goals",
  project: "projects",
  task: "tasks",
  learning: "learning_items",
  career: "career_items",
  trip: "trips",
  memory: "memory_items",
} as const satisfies Record<JsonDataEntryKind, string>;

export async function createDataEntry(
  supabase: ServerSupabaseClient,
  userId: string,
  kind: JsonDataEntryKind,
  values: Record<string, unknown>,
) {
  const defaults: Record<JsonDataEntryKind, Record<string, unknown>> = {
    income: { is_active: true }, budget: { is_active: true },
    investment_asset: { currency: "AED", is_active: true }, investment_transaction: { fees: 0 },
    goal: { status: "planned", progress_percent: 0, current_value: 0 },
    project: { status: "planned", progress_percent: 0 },
    task: { status: "pending" }, learning: { status: "planned", progress_percent: 0 },
    career: { status: "planned" }, trip: { status: "planned", currency: "AED" },
    memory: { is_active: true },
  };

  const { data, error } = await supabase
    .from(tableByKind[kind])
    .insert({ ...defaults[kind], ...values, user_id: userId })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`DATA_ENTRY_${error?.code ?? "FAILED"}`);
  }

  return data;
}
