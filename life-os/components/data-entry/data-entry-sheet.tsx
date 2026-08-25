"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { DATA_ENTRY_CATALOG, type DataEntryKind } from "@/lib/data-entry/catalog";

interface DataEntrySheetProps { kind: DataEntryKind; onClose: () => void; }

export function DataEntrySheet({ kind, onClose }: DataEntrySheetProps) {
  const definition = DATA_ENTRY_CATALOG[kind];
  const router = useRouter();
  const titleId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", handleKey); };
  }, [onClose]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(null);
    try {
      const form = new FormData(event.currentTarget);
      let response: Response;
      if (kind === "document") {
        response = await fetch("/api/data-entry", { method: "POST", body: form });
      } else {
        const values: Record<string, FormDataEntryValue | null> = {};
        for (const field of definition.fields) {
          const value = form.get(field.name);
          values[field.name] = value === "" ? null : value;
        }
        response = await fetch("/api/data-entry", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind, values }),
        });
      }
      const result = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !result.ok) throw new Error(result.error ?? "تعذر الحفظ.");
      router.refresh(); onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر الحفظ حاليًا.");
    } finally { setSaving(false); }
  }

  return (
    <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: 1200, display: "grid", alignItems: "end", background: "rgba(15,23,42,.42)", backdropFilter: "blur(5px)" }}>
      <section role="dialog" aria-modal="true" aria-labelledby={titleId}
        style={{ width: "min(100%, 46rem)", maxHeight: "88dvh", marginInline: "auto", overflow: "auto", borderRadius: "1.75rem 1.75rem 0 0", background: "#fff", padding: "1.25rem", boxShadow: "0 -18px 50px rgba(15,23,42,.18)" }}>
        <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", marginBottom: "1.1rem" }}>
          <div><h2 id={titleId} style={{ margin: 0, fontSize: "1.45rem" }}>{definition.title}</h2>
            <p style={{ margin: ".35rem 0 0", color: "#687180" }}>{definition.description}</p></div>
          <button type="button" onClick={onClose} aria-label="إغلاق" style={{ border: 0, background: "#f1f3f6", borderRadius: "50%", width: "2.65rem", height: "2.65rem", fontSize: "1.25rem", cursor: "pointer" }}>×</button>
        </header>
        <form ref={formRef} onSubmit={submit} style={{ display: "grid", gap: ".9rem" }}>
          {definition.fields.map((field) => (
            <label key={field.name} style={{ display: "grid", gap: ".4rem", fontWeight: 700 }}>
              <span>{field.label}{field.required ? " *" : ""}</span>
              {field.type === "select" ? (
                <select name={field.name} required={field.required} defaultValue="" style={inputStyle}>
                  <option value="" disabled>اختر</option>
                  {field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              ) : field.type === "textarea" ? (
                <textarea name={field.name} required={field.required} placeholder={field.placeholder} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
              ) : (
                <input name={field.name} type={field.type} required={field.required} placeholder={field.placeholder}
                  min={field.min} step={field.step} accept={field.type === "file" ? ".pdf,application/pdf" : undefined} style={inputStyle} />
              )}
            </label>
          ))}
          {error ? <p role="alert" style={{ margin: 0, color: "#b42318", fontWeight: 700 }}>{error}</p> : null}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem", position: "sticky", bottom: 0, background: "#fff", paddingBlock: ".5rem" }}>
            <button type="button" onClick={onClose} disabled={saving} style={{ ...buttonStyle, background: "#f1f3f6", color: "#1f2937" }}>إلغاء</button>
            <button type="submit" disabled={saving} style={{ ...buttonStyle, background: "#245b9e", color: "#fff" }}>{saving ? "جارٍ الحفظ..." : "حفظ"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

const inputStyle: React.CSSProperties = { width: "100%", minHeight: "3.25rem", boxSizing: "border-box", border: "1px solid #d8dde5", borderRadius: "1rem", background: "#f8fafc", padding: ".8rem 1rem", font: "inherit", color: "#111827" };
const buttonStyle: React.CSSProperties = { minHeight: "3.2rem", border: 0, borderRadius: "1rem", font: "inherit", fontWeight: 800, cursor: "pointer" };
