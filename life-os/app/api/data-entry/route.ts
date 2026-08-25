import { NextResponse } from "next/server";

import { assertAuthenticatedIdentity } from "@/lib/auth";
import { createDataEntry } from "@/lib/data-entry/server";
import { documentEntrySchema, isJsonDataEntryKind, parseJsonDataEntry } from "@/lib/data-entry/validation";
import { createClient } from "@/lib/supabase/server";
import { uploadPrivatePdfDocument } from "@/lib/travel-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } as const;

function fail(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status, headers });
}

export async function POST(request: Request) {
  try {
    const identity = await assertAuthenticatedIdentity();
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      const parsed = documentEntrySchema.parse({
        title: form.get("title"), category: form.get("category"), notes: form.get("notes") || null,
      });
      if (!(file instanceof File)) return fail(400, "اختر ملف PDF أولًا.");
      const document = await uploadPrivatePdfDocument({ file, ...parsed });
      return NextResponse.json({ ok: true, id: document.id }, { status: 201, headers });
    }

    const body = await request.json() as { kind?: unknown; values?: unknown };
    if (typeof body.kind !== "string" || !isJsonDataEntryKind(body.kind)) {
      return fail(400, "نوع الإضافة غير مدعوم.");
    }
    const values = parseJsonDataEntry(body.kind, body.values) as Record<string, unknown>;
    const supabase = await createClient();
    const result = await createDataEntry(supabase, identity.id, body.kind, values);
    return NextResponse.json({ ok: true, id: result.id }, { status: 201, headers });
  } catch (error) {
    if (error instanceof SyntaxError) return fail(400, "البيانات غير صالحة.");
    return fail(500, "تعذر حفظ البيانات حاليًا. حاول مرة أخرى.");
  }
}
