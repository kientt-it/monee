import { describe, expect, it } from "vitest";
import { recurringSchema } from "./recurring.schema";

describe("recurringSchema", () => {
  const base = { type: "expense", amount: 300_000, accountId: "11111111-1111-4111-8111-111111111111", categoryId: null, frequency: "monthly", interval: 1, startDate: "2026-09-01", nextRunDate: "2026-09-10", endDate: null };

  it("accepts an expense schedule", () => expect(recurringSchema.safeParse(base).success).toBe(true));
  it("requires a destination for transfers", () => expect(recurringSchema.safeParse({ ...base, type: "transfer" }).success).toBe(false));
  it("rejects a next run before the start", () => expect(recurringSchema.safeParse({ ...base, nextRunDate: "2026-08-31" }).success).toBe(false));
});
