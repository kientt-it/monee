import { describe, expect, it } from "vitest";
import { actualForLine, defaultAllocationLines, installmentAllocationAmount, installmentDue, interestPerPeriod, scheduledInstallmentAmount, totalInstallmentAmount, withNewInstallments, type AllocationActuals, type Installment } from "./logic";

const item: Installment = { id: "a", creditAccountId: "c", title: "Điện thoại", totalAmount: 10_000_001, principalAmount: 10_000_001,
  termMonths: 3, startMonth: "2026-10-01", dueDay: 31, interestMode: "none", interestRateBps: 0, paidTotal: 0, paidThroughMonth: 0, paidThisMonth: 0 };

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
  it("thu toàn bộ lãi một lần ở kỳ đầu", () => {
    const upfront = { ...item, principalAmount: 8_000_000, totalAmount: 8_120_000, interestMode: "upfront" as const, interestRateBps: 150 };
    expect(interestPerPeriod(8_000_000, 150)).toBe(120_000);
    expect(totalInstallmentAmount(8_000_000, 3, "upfront", 150)).toBe(8_120_000);
    expect(scheduledInstallmentAmount(upfront, "2026-10-01")).toBe(2_786_666);
    expect(scheduledInstallmentAmount(upfront, "2026-11-01")).toBe(2_666_666);
    expect(installmentDue(upfront, "2026-12-01")).toBe(8_120_000);
  });
  it("tính lãi mỗi tháng trên gốc ban đầu, làm tròn từng kỳ", () => {
    const monthly = { ...item, principalAmount: 8_000_000, totalAmount: 8_360_000, interestMode: "monthly_flat" as const, interestRateBps: 150 };
    expect(totalInstallmentAmount(8_000_000, 3, "monthly_flat", 150)).toBe(8_360_000);
    expect(scheduledInstallmentAmount(monthly, "2026-10-01")).toBe(2_786_666);
    expect(scheduledInstallmentAmount(monthly, "2026-12-01")).toBe(2_786_668);
    expect(installmentDue({ ...monthly, paidThroughMonth: 2_786_666 }, "2026-11-01")).toBe(2_786_666);
  });
});

describe("phân bổ theo tháng", () => {
  it("cập nhật phân bổ tháng hiện tại khi khoản trả kỳ trước thay đổi", () => {
    const saved = defaultAllocationLines([item], "2026-11-01");
    const paidEarlier = { ...item, paidTotal: 4_000_000, paidThroughMonth: 4_000_000 };
    expect(withNewInstallments(saved, [paidEarlier], "2026-11-01").find((line) => line.installmentId === item.id)?.amount).toBe(2_666_666);
  });
  it("giữ số đã trả trong tháng ở phân bổ và theo dõi số đã dùng", () => {
    const paidThisMonth = { ...item, paidTotal: 1_000_000, paidThroughMonth: 1_000_000, paidThisMonth: 1_000_000 };
    expect(installmentDue(paidThisMonth, "2026-10-01")).toBe(2_333_333);
    expect(installmentAllocationAmount(paidThisMonth, "2026-10-01")).toBe(3_333_333);
    expect(defaultAllocationLines([paidThisMonth], "2026-10-01").find((line) => line.installmentId === item.id)?.amount).toBe(3_333_333);
    const paidAhead = { ...item, paidTotal: 4_000_000, paidThroughMonth: 4_000_000, paidThisMonth: 4_000_000 };
    expect(defaultAllocationLines([paidAhead], "2026-10-01").find((line) => line.installmentId === item.id)?.amount).toBe(4_000_000);
  });
  it("không còn phân bổ kỳ đã được trả trước", () => {
    const paidEarlier = { ...item, paidTotal: 7_000_000, paidThroughMonth: 7_000_000 };
    const saved = defaultAllocationLines([item], "2026-11-01");
    expect(withNewInstallments(saved, [paidEarlier], "2026-11-01").find((line) => line.installmentId === item.id)?.amount).toBe(0);
  });
  it("hiện khoản trả góp đến hạn nhưng không tự thêm mục hoàn trả thẻ khác", () => {
    const lines = defaultAllocationLines([item], "2026-10-01");
    expect(lines.find((line) => line.installmentId === "a")?.amount).toBe(3_333_333);
    expect(lines.some((line) => line.kind === "card_repayment")).toBe(false);
  });
  it("không tính lại khoản trả góp vào chi tiêu sinh hoạt", () => {
    const lines = defaultAllocationLines([item], "2026-10-01");
    const actuals: AllocationActuals = { expensesByCategory: { food: 200_000 }, savingTransfers: 0, goalContributions: {}, paidManualPayables: {}, generalCardRepayments: { c: 50_000 }, installments: [{ ...item, paidThisMonth: 300_000 }] };
    expect(lines.map((line) => actualForLine(line, lines, actuals)).reduce((sum, amount) => sum + amount, 0)).toBe(500_000);
  });
});
