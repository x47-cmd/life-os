"use client";

import { useState } from "react";

import { DataEntrySheet } from "@/components/data-entry/data-entry-sheet";
import type { DataEntryKind } from "@/lib/data-entry/catalog";
import { DATA_ENTRY_CATALOG } from "@/lib/data-entry/catalog";

interface DataEntryButtonProps {
  kind: DataEntryKind;
  label?: string;
}

export function DataEntryButton({ kind, label }: DataEntryButtonProps) {
  const [open, setOpen] = useState(false);
  const definition = DATA_ENTRY_CATALOG[kind];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="data-entry-trigger"
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.45rem",
          minHeight: "2.6rem", padding: "0.55rem 0.9rem", borderRadius: "999px",
          border: "1px solid var(--color-border, #d8dde5)", background: "var(--color-surface, #fff)",
          color: "var(--color-primary, #245b9e)", font: "inherit", fontWeight: 700, cursor: "pointer",
        }}
      >
        <span aria-hidden="true">＋</span>
        <span>{label ?? definition.buttonLabel}</span>
      </button>
      {open ? <DataEntrySheet kind={kind} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
