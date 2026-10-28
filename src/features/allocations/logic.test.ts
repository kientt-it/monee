import { describe, expect, it } from "vitest";
import { actualForLine, defaultAllocationLines, installmentDue, scheduledInstallmentAmount, type AllocationActuals, type Installment } from "./logic";

const item: Installment = { id: "a", creditAccountId: "c", title: "Điện thoại", totalAmount: 10_000_001,
  termMonths: 3, startMonth: "2026-10-01", dueDay: 31, paidTotal: 0, paidThroughMonth: 0, paidThisMonth: 0 };

describe("lịch trả góp", () => {
  it("chia số lẻ vào kỳ cuối và không thu trước kỳ đầu", () => {
    expect(installmentDue(item, "2026-09-01")).toBe(0);
    expect(scheduledInstallmentAmount(item, "2026-10-01")).toBe(3_333_333);
    expect(scheduledInstallmentAmount(item, "2026-12-01")).toBe(3_333_335);
  });
  it("mang phần chưa trả sang tháng sau và trừ khoản đã trả trước", () => {
    expect(installmentDue({ ...item, paidThroughMonth: 1_000_000 }, "2026-11-01")).toBe(5_666_666);
    expect(installmentDue({ ...item, paidThroughMonth: 7_000_000 }, "2026-11-01")).toBe(0);
    expect(installmentDue({ ...item, paidThroughMonth: 7_000_000 }, "2027-01-01")).toBe(3_000_001);
  });
});

describe("phân bổ theo tháng", () => {
  it("hiện khoản trả góp đến hạn và một mục hoàn trả chung cho từng thẻ", () => {
    const lines = defaultAllocationLines([item], "2026-10-01", [{ id: "c", name: "Visa", type: "credit_card", current_balance: 0 }]);
    expect(lines.find((line) => line.installmentId === "a")?.amount).toBe(3_333_333);
    expect(lines.find((line) => line.creditAccountId === "c")?.amount).toBe(0);
  });
  it("không tính lại khoản trả góp vào chi tiêu sinh hoạt", () => {
    const lines = defaultAllocationLines([item], "2026-10-01", [{ id: "c", name: "Visa", type: "credit_card", current_balance: 0 }]);
    const actuals: AllocationActuals = { expensesByCategory: { food: 200_000 }, savingTransfers: 0, goalContributions: {}, paidManualPayables: {}, generalCardRepayments: { c: 50_000 }, installments: [{ ...item, paidThisMonth: 300_000 }] };
    expect(lines.map((line) => actualForLine(line, lines, actuals)).reduce((sum, amount) => sum + amount, 0)).toBe(550_000);
  });
});
