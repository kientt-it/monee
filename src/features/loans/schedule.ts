import type { LoanRecord, LoanSummary } from "./types";

export function shiftMonth(month: string, offset: number) {
  const [year, number] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, number - 1 + offset, 1));
  return date.toISOString().slice(0, 7);
}

export function installmentDueDate(firstDueDate: string, installmentNumber: number) {
  const month = shiftMonth(firstDueDate.slice(0, 7), installmentNumber - 1);
  const [year, number] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, number, 0)).getUTCDate();
  return `${month}-${String(Math.min(Number(firstDueDate.slice(8, 10)), lastDay)).padStart(2, "0")}`;
}

export function installmentForMonth(loan: LoanRecord, month: string, today: string) {
  const [year, number] = month.split("-").map(Number);
  const [startYear, startMonth] = loan.firstDueDate.split("-").map(Number);
  const installmentNumber = (year - startYear) * 12 + number - startMonth + 1;
  if (installmentNumber < 1 || installmentNumber > loan.installmentCount) return null;
  const dueDate = installmentDueDate(loan.firstDueDate, installmentNumber);
  const payment = loan.payments.find((item) => item.installmentNumber === installmentNumber);
  return { installmentNumber, dueDate, payment, status: payment ? "paid" as const : dueDate < today ? "overdue" as const : "pending" as const };
}

export function overdueInstallments(loan: LoanRecord, today: string) {
  const paid = new Set(loan.payments.map((item) => item.installmentNumber));
  const overdue: { installmentNumber: number; dueDate: string }[] = [];
  if (loan.isArchived) return overdue;
  for (let installmentNumber = 1; installmentNumber <= loan.installmentCount; installmentNumber++) {
    const dueDate = installmentDueDate(loan.firstDueDate, installmentNumber);
    if (dueDate >= today) break;
    if (!paid.has(installmentNumber)) overdue.push({ installmentNumber, dueDate });
  }
  return overdue;
}

export function summarizeLoans(loans: LoanRecord[], month: string, today: string): LoanSummary {
  return loans.filter((loan) => !loan.isArchived).reduce((summary, loan) => {
    const installment = installmentForMonth(loan, month, today);
    if (installment) {
      summary.total += loan.monthlyAmount;
      summary.paid += installment.payment?.amount ?? 0;
      summary.remaining += installment.payment ? 0 : loan.monthlyAmount;
    }
    summary.overdue += overdueInstallments(loan, today).length * loan.monthlyAmount;
    summary.activeCount++;
    return summary;
  }, { total: 0, paid: 0, remaining: 0, overdue: 0, activeCount: 0 });
}
