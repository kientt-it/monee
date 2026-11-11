import { describe, expect, it } from "vitest";
import { planSchema } from "./plan-schema";

const base = { title: "Chi tiêu thẻ", accountId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", kind: "expense", firstDue: "2026-12-10", terms: 1,
  amount: 1_000_000, finalAmount: null, key: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" };
const purchase = { ...base, recordPurchase: true, purchaseAmount: 1_000_000, purchaseDate: "2026-11-01" };
describe("card purchase on repayment creation", () => {
  it("keeps old schedules non-posting unless explicitly requested", () => {
    expect(planSchema.parse(base)).toMatchObject({ recordPurchase: false, purchaseAmount: null, purchaseDate: null });
  });
  it("requires amount/date/source for a new purchase", () => {
    expect(planSchema.safeParse(purchase).success).toBe(true);
    for (const change of [{ purchaseAmount: null }, { purchaseDate: null }, { accountId: null }, { purchaseAmount: 0 }, { purchaseDate: "2099-01-01" }]) {
      expect(planSchema.safeParse({ ...purchase, ...change }).success).toBe(false);
    }
  });
  it("uses the expense amount exactly for single-payment plans", () => {
    expect(planSchema.safeParse({ ...purchase, purchaseAmount: 999_999 }).success).toBe(false);
  });
  it("allows installment principal to differ from the full repayment including fees", () => {
    expect(planSchema.safeParse({ ...purchase, kind: "installment", terms: 3, amount: 1_100_000, finalAmount: 1_200_000, purchaseAmount: 3_000_000 }).success).toBe(true);
  });
  it("rejects hidden purchase parameters on schedule-only requests", () => {
    expect(planSchema.safeParse({ ...purchase, recordPurchase: false }).success).toBe(false);
  });
});
