import { describe, expect, it } from "vitest";
import { installmentDueDate, installmentForMonth, overdueInstallments, summarizeLoans } from "./schedule";
import { loanSchema } from "./schemas/loan.schema";
import type { LoanRecord } from "./types";
import { localToday } from "../../lib/date";

const loan: LoanRecord = { id: "11111111-1111-4111-8111-111111111111", name: "Xe máy", lender: "", monthlyAmount: 2_000_000, firstDueDate: "2026-01-31", installmentCount: 3, note: "", isArchived: false, payments: [] };

describe("monthly repayment schedule", () => {
  it("clamps short months without losing the original due day", () => {
    expect(installmentDueDate("2026-01-31", 2)).toBe("2026-02-28");
    expect(installmentDueDate("2026-01-31", 3)).toBe("2026-03-31");
    expect(installmentDueDate("2028-01-31", 2)).toBe("2028-02-29");
    expect(installmentDueDate("2026-12-30", 2)).toBe("2027-01-30");
  });
  it("excludes months outside the term and treats today as due, not overdue", () => {
    expect(installmentForMonth(loan, "2025-12", "2026-02-28")).toBeNull();
    expect(installmentForMonth(loan, "2026-04", "2026-02-28")).toBeNull();
    expect(installmentForMonth(loan, "2026-02", "2026-02-28")?.status).toBe("pending");
    expect(installmentForMonth(loan, "2026-02", "2026-03-01")?.status).toBe("overdue");
  });
  it("carries unpaid earlier months forward and excludes paid periods", () => {
    const paidLoan = { ...loan, payments: [{ installmentNumber: 2, amount: loan.monthlyAmount, paidOn: "2026-02-25" }] };
    expect(overdueInstallments(paidLoan, "2026-04-01").map((item) => item.installmentNumber)).toEqual([1, 3]);
    expect(summarizeLoans([paidLoan], "2026-02", "2026-04-01")).toEqual({ total: 2_000_000, paid: 2_000_000, remaining: 0, overdue: 4_000_000, activeCount: 1 });
  });
  it("excludes archived loans and keeps completed schedules paid", () => {
    expect(summarizeLoans([{ ...loan, isArchived: true }], "2026-02", "2026-04-01")).toEqual({ total: 0, paid: 0, remaining: 0, overdue: 0, activeCount: 0 });
    const completed = { ...loan, payments: [1, 2, 3].map((installmentNumber) => ({ installmentNumber, amount: loan.monthlyAmount, paidOn: "2026-01-01" })) };
    expect(overdueInstallments(completed, "2026-04-01")).toEqual([]);
    expect(installmentForMonth(completed, "2026-03", "2026-04-01")?.status).toBe("paid");
  });
  it("uses the Vietnamese calendar date across UTC midnight", () => {
    expect(localToday(new Date("2026-09-09T18:00:00Z"))).toBe("2026-09-10");
  });
  it("rejects invalid dates, amounts and repayment terms", () => {
    expect(loanSchema.safeParse(loan).success).toBe(true);
    for (const change of [{ monthlyAmount: 0 }, { monthlyAmount: -1 }, { monthlyAmount: 1.5 }, { monthlyAmount: Number.MAX_SAFE_INTEGER }, { firstDueDate: "2026-02-30" }, { installmentCount: 0 }, { installmentCount: 601 }]) {
      expect(loanSchema.safeParse({ ...loan, ...change }).success).toBe(false);
    }
  });
});
