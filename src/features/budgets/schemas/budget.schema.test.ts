import { describe, expect, it } from "vitest";
import { budgetSchema } from "./budget.schema";

describe("budgetSchema", () => {
  it("accepts a category budget with a positive amount", () => {
    const result = budgetSchema.safeParse({ name: "Ăn uống", categoryId: "11111111-1111-4111-8111-111111111111", amount: 2_000_000, period: "monthly", startDate: "2026-09-01", endDate: null, alertThreshold: 75 });
    expect(result.success).toBe(true);
  });

  it("rejects zero or negative amounts", () => {
    expect(budgetSchema.safeParse({ name: "Sai", amount: 0, period: "monthly", startDate: "2026-09-01" }).success).toBe(false);
    expect(budgetSchema.safeParse({ name: "Sai", amount: -1, period: "monthly", startDate: "2026-09-01" }).success).toBe(false);
  });

  it("rejects an invalid alert threshold", () => {
    expect(budgetSchema.safeParse({ name: "Sai", amount: 1_000_000, period: "monthly", startDate: "2026-09-01", alertThreshold: 101 }).success).toBe(false);
  });
});
