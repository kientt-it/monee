import { describe, expect, it } from "vitest";
import { filterPayables, summarizePayables } from "./filter";
import { payableSchema } from "./schemas/payable.schema";
import type { PayableRecord } from "./types";

const items: PayableRecord[] = [
  { id: "a", title: "Điện", amount: 300_000, dueDate: "2026-10-25", note: "", paidOn: null, kind: "manual", creditAccountId: null },
  { id: "b", title: "Nước", amount: 100_000, dueDate: "2026-10-26", note: "", paidOn: "2026-10-24", kind: "manual", creditAccountId: null },
  { id: "c", title: "Internet", amount: 200_000, dueDate: "2026-11-01", note: "", paidOn: null, kind: "manual", creditAccountId: null },
  { id: "card", title: "Hoàn trả thẻ tín dụng · Visa", amount: 500_000, dueDate: null, note: "", paidOn: null, kind: "credit_card_repayment", creditAccountId: "card-id" },
];

describe("payables", () => {
  it("filters by inclusive due date range and supports open ends", () => {
    expect(filterPayables(items, { fromDate: "2026-10-26", toDate: "2026-10-26" }).map((item) => item.id)).toEqual(["b", "card"]);
    expect(filterPayables(items, { fromDate: "2026-10-25", toDate: "2026-10-26" }).map((item) => item.id)).toEqual(["a", "b", "card"]);
    expect(filterPayables(items, { fromDate: "2026-10-26", toDate: "" }).map((item) => item.id)).toEqual(["b", "c", "card"]);
    expect(filterPayables(items, { fromDate: "", toDate: "2026-10-26" }).map((item) => item.id)).toEqual(["a", "b", "card"]);
    expect(filterPayables(items, { fromDate: "", toDate: "" })).toEqual(items);
    expect(filterPayables(items, { fromDate: "2026-11-01", toDate: "2026-10-25" })).toEqual([]);
  });

  it("excludes paid items from remaining and overdue amounts", () => {
    expect(summarizePayables(items, "2026-10-26")).toEqual({ total: 1_100_000, remaining: 1_000_000, overdue: 300_000, count: 4, pendingCount: 3 });
  });

  it("keeps a paid-off card visible without counting it as pending", () => {
    const paidOffCard: PayableRecord = { ...items[3], kind: "credit_card_repayment", creditAccountId: "card-id", dueDate: null, paidOn: null, amount: 0 };
    expect(filterPayables([paidOffCard], { fromDate: "2026-10-26", toDate: "2026-10-26" })).toEqual([paidOffCard]);
    expect(summarizePayables([paidOffCard], "2026-10-26")).toEqual({ total: 0, remaining: 0, overdue: 0, count: 1, pendingCount: 0 });
  });

  it("rejects invalid amounts and dates", () => {
    expect(payableSchema.safeParse({ title: "Điện", amount: 0, dueDate: "2026-10-26", note: "" }).success).toBe(false);
    expect(payableSchema.safeParse({ title: "Điện", amount: 100, dueDate: "2026-02-30", note: "" }).success).toBe(false);
  });
});
