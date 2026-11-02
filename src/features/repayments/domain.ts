import { localToday } from "../../lib/date";

export type RepaymentPeriod = { month: string; mode: "month" | "salary" };
export type RepaymentDue = {
  id: string; planId: string; title: string; kind: "installment" | "expense" | "manual";
  accountId: string | null; dueDate: string; amount: number; period: number; terms: number;
  confirmed: boolean; paid: number;
  revision?: number;
};
export type RepaymentPayment = { id: string; dueId: string; amount: number; paidOn: string; method: string; transactionId: string | null; reversed: boolean };
export function parsePeriod(month?: unknown, mode?: unknown): RepaymentPeriod {
  return { month: typeof month === "string" && /^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/.test(month) ? month : localToday().slice(0, 7), mode: mode === "salary" ? "salary" : "month" };
}
export function shiftMonth(month: string, offset: number) {
  const [year, m] = month.split("-").map(Number);
  return new Date(Date.UTC(year, m - 1 + offset, 1)).toISOString().slice(0, 7);
}
export function periodWindow(period: RepaymentPeriod, salaryDay = 16) {
  if (!Number.isInteger(salaryDay) || salaryDay < 1 || salaryDay > 28) throw new Error("Ngày lương từ 1 đến 28.");
  const day = period.mode === "salary" ? String(salaryDay).padStart(2, "0") : "01";
  return { from: `${period.month}-${day}`, until: `${shiftMonth(period.month, 1)}-${day}` };
}
export function schedule(firstDue: string, terms: number, amount: number, finalAmount: number | null = null) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(firstDue) || !Number.isInteger(terms) || terms < 1 || terms > 120 || !Number.isSafeInteger(amount) || amount <= 0 || (finalAmount !== null && (!Number.isSafeInteger(finalAmount) || finalAmount < 0))) throw new Error("Lịch trả không hợp lệ.");
  const start = new Date(`${firstDue}T00:00:00Z`);
  if (!Number.isFinite(start.getTime()) || start.toISOString().slice(0, 10) !== firstDue) throw new Error("Ngày không hợp lệ.");
  return Array.from({ length: terms }, (_, i) => {
    const month = shiftMonth(firstDue.slice(0, 7), i);
    const [y, m] = month.split("-").map(Number);
    const day = Math.min(start.getUTCDate(), new Date(Date.UTC(y, m, 0)).getUTCDate());
    return { dueDate: `${month}-${String(day).padStart(2, "0")}`, amount: i === terms - 1 && finalAmount !== null ? finalAmount : amount, period: i + 1 };
  });
}
export function remaining(due: RepaymentDue) { return Math.max(0, due.amount - due.paid); }
export function dueStatus(due: RepaymentDue) {
  if (due.amount === 0) return "Không phát sinh";
  if (due.paid >= due.amount) return "Đã thanh toán";
  if (due.paid > 0) return "Đã trả một phần";
  return due.confirmed ? "Chưa thanh toán" : "Chưa xác nhận";
}
export function summarizeDues(dues: RepaymentDue[], period: RepaymentPeriod, salaryDay = 16) {
  const { from, until } = periodWindow(period, salaryDay);
  const selected = dues.filter(d => d.dueDate >= from && d.dueDate < until);
  const sum = (items: RepaymentDue[], value: (d: RepaymentDue) => number) => items.reduce((s, d) => {
    const next = s + value(d);
    if (!Number.isSafeInteger(next)) throw new Error("Tổng tiền vượt giới hạn hiển thị an toàn.");
    return next;
  }, 0);
  return { selected, total: sum(selected, d => d.amount), paid: sum(selected, d => d.paid), remaining: sum(selected, remaining),
    unknown: selected.filter(d => !d.confirmed && d.paid === 0 && d.amount > 0).length,
    beforeSalary: sum(selected.filter(d => Number(d.dueDate.slice(8)) < salaryDay), remaining),
    onSalary: sum(selected.filter(d => Number(d.dueDate.slice(8)) === salaryDay), remaining),
    afterSalary: sum(selected.filter(d => Number(d.dueDate.slice(8)) > salaryDay), remaining),
    carry: dues.filter(d => d.dueDate < from && remaining(d) > 0),
  };
}
export function plannedSurplus(cash: number | null, income: number | null, living: number | null, reserve: number | null, total: number) {
  if ([cash, income, living, reserve].some(n => n === null)) return null;
  return cash! + income! - living! - reserve! - total;
}
