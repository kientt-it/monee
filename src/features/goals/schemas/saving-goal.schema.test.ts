import { describe, expect, it } from "vitest";
import { savingGoalContributionSchema, savingGoalSchema } from "./saving-goal.schema";

describe("saving goal schemas", () => {
  it("accepts a goal with an optional target date", () => {
    const result = savingGoalSchema.safeParse({ name: "Quỹ du lịch", targetAmount: 20_000_000, currentAmount: 2_000_000, targetDate: "2026-12-31", icon: "🏖️", color: "#8795c4", accountId: null });
    expect(result.success).toBe(true);
  });

  it("rejects a non-positive target", () => {
    expect(savingGoalSchema.safeParse({ name: "Sai", targetAmount: 0 }).success).toBe(false);
  });

  it("requires a positive contribution", () => {
    expect(savingGoalContributionSchema.safeParse({ amount: 500_000, contributionDate: "2026-09-09" }).success).toBe(true);
    expect(savingGoalContributionSchema.safeParse({ amount: 0, contributionDate: "2026-09-09" }).success).toBe(false);
  });
});
