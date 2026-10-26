import { describe, expect, it } from "vitest";
import { filterPayables, summarizePayables } from "./filter";
import { payableSchema } from "./schemas/payable.schema";
import type { PayableRecord } from "./types";

const items: PayableRecord[] = [
  { id: "a", title: "Điện", amount: 300_000, dueDate: "2026-10-25", note: "", paidOn: null },
  { id: "b", title: "Nước", amount: 100_000, dueDate: "2026-10-26", note: "", paidOn: "2026-10-24" },
  { id: "c", title: "Internet", amount: 200_000, dueDate: "2026-11-01", note: "", paidOn: null },
];

describe("payables", () => {
  it("filters by exact due day and due month", () => {
    expect(filterPayables(items, { mode: "day", value: "2026-10-26" }).map((item) => item.id)).toEqual(["b"]);
    expect(filterPayables(items, { mode: "month", value: "2026-10" }).map((item) => item.id)).toEqual(["a", "b"]);
    expect(filterPayables(items, { mode: "all" })).toEqual(items);
  });

  it("excludes paid items from remaining and overdue amounts", () => {
    expect(summarizePayables(items, "2026-10-26")).toEqual({ total: 600_000, remaining: 500_000, overdue: 300_000, count: 3, pendingCount: 2 });
  });

  it("rejects invalid amounts and dates", () => {
    expect(payableSchema.safeParse({ title: "Điện", amount: 0, dueDate: "2026-10-26", note: "" }).success).toBe(false);
    expect(payableSchema.safeParse({ title: "Điện", amount: 100, dueDate: "2026-02-30", note: "" }).success).toBe(false);
  });
});
