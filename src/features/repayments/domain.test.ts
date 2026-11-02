import { describe, expect, it } from "vitest";
import { dueStatus, parsePeriod, periodWindow, plannedSurplus, schedule, summarizeDues, type RepaymentDue } from "./domain";
const due: RepaymentDue = { id: "d", planId: "p", title: "MSB", kind: "installment", accountId: "a", dueDate: "2026-12-10", amount: 1_000_000, paid: 0, period: 1, terms: 3, confirmed: true };
describe("lịch nghĩa vụ theo kỳ", () => {
  it("giữ ngày cuối tháng và phân biệt kỳ cuối bằng 0 với trống", () => {
    expect(schedule("2027-01-31", 3, 100, 0)).toEqual([{ dueDate: "2027-01-31", amount: 100, period: 1 }, { dueDate: "2027-02-28", amount: 100, period: 2 }, { dueDate: "2027-03-31", amount: 0, period: 3 }]);
    expect(schedule("2028-01-31", 2, 100).at(-1)?.dueDate).toBe("2028-02-29");
    expect(() => schedule("2026-02-30", 2, 100)).toThrow();
  });
  it("kỳ lương bao gồm ngày bắt đầu, loại trừ ngày lương kế tiếp", () => {
    expect(periodWindow({ month: "2026-12", mode: "salary" })).toEqual({ from: "2026-12-16", until: "2027-01-16" });
    const s = summarizeDues([{ ...due, dueDate: "2026-11-15" }, { ...due, id: "b", dueDate: "2026-11-16" }, due, { ...due, id: "c", dueDate: "2026-12-16" }], { month: "2026-11", mode: "salary" });
    expect(s.total).toBe(2_000_000); expect(s.carry).toHaveLength(1);
  });
  it("trả trước chỉ đóng nghĩa vụ được chỉ định, không đổi tổng đến hạn", () => {
    const s = summarizeDues([{ ...due, paid: 400_000 }], { month: "2026-12", mode: "month" });
    expect(s.total).toBe(1_000_000); expect(s.paid).toBe(400_000); expect(s.remaining).toBe(600_000);
    expect(dueStatus({ ...due, paid: 400_000 })).toBe("Đã trả một phần");
    expect(dueStatus({ ...due, confirmed: false })).toBe("Chưa xác nhận");
    expect(dueStatus({ ...due, amount: 0 })).toBe("Không phát sinh");
  });
  it("tách ba mốc trước/cùng/sau ngày lương", () => {
    const s = summarizeDues([due, { ...due, dueDate: "2026-12-16" }, { ...due, dueDate: "2026-12-25", paid: 300_000 }], { month: "2026-12", mode: "month" });
    expect([s.beforeSalary, s.onSalary, s.afterSalary]).toEqual([1_000_000, 1_000_000, 700_000]);
  });
  it("ngân sách không biến dữ liệu thiếu thành 0, vẫn cho nhập 0 thật", () => {
    expect(plannedSurplus(null, 0, 0, 0, 100)).toBeNull();
    expect(plannedSurplus(0, 0, 0, 0, 100)).toBe(-100);
    expect(plannedSurplus(1_000_000, 2_000_000, 200_000, 100_000, 500_000)).toBe(2_200_000);
    expect(parsePeriod("2026-13", "garbage").mode).toBe("month");
    expect(typeof parsePeriod(["2026-11"], "month").month).toBe("string");
    expect(() => summarizeDues([{ ...due, amount: Number.MAX_SAFE_INTEGER }, due], { month: "2026-12", mode: "month" })).toThrow("giới hạn");
  });
});
