import { describe, expect, it } from "vitest";

import { DATA_ENTRY_CATALOG, DATA_ENTRY_KINDS } from "@/lib/data-entry/catalog";
import { isJsonDataEntryKind, parseJsonDataEntry } from "@/lib/data-entry/validation";

describe("data entry", () => {
  it("defines every supported entry kind", () => {
    expect(Object.keys(DATA_ENTRY_CATALOG).toSorted()).toEqual([...DATA_ENTRY_KINDS].toSorted());
  });

  it("accepts a valid monthly income", () => {
    expect(parseJsonDataEntry("income", { name: "الراتب", amount: "26700", frequency: "monthly" })).toMatchObject({ amount: 26700 });
  });

  it("rejects unknown kinds and negative money", () => {
    expect(isJsonDataEntryKind("unknown")).toBe(false);
    expect(() => parseJsonDataEntry("income", { name: "الراتب", amount: -1, frequency: "monthly" })).toThrow();
  });
});
