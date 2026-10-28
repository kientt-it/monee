export type AllocationKind = "living" | "debt" | "reserve" | "custom" | "card_installment" | "card_repayment";
export type AllocationLine = {
  kind: AllocationKind;
  title: string;
  amount: number;
  installmentId: string | null;
  creditAccountId: string | null;
  categoryId: string | null;
  goalId: string | null;
  payableId: string | null;
};

export type Installment = {
  id: string;
  creditAccountId: string;
  title: string;
  totalAmount: number;
  termMonths: number;
  startMonth: string;
  dueDay: number;
  paidTotal: number;
  paidThroughMonth: number;
  paidThisMonth: number;
};

export type CreditCardForAllocation = { id: string; name: string; type: string; credit_limit?: number | null; current_balance: number };
export type AllocationActuals = {
  expensesByCategory: Record<string, number>;
  savingTransfers: number;
  goalContributions: Record<string, number>;
  paidManualPayables: Record<string, number>;
  generalCardRepayments: Record<string, number>;
  installments: Installment[];
};

export function actualForLine(line: AllocationLine, allLines: AllocationLine[], actuals: AllocationActuals) {
  if (line.installmentId) return actuals.installments.find((item) => item.id === line.installmentId)?.paidThisMonth ?? 0;
  if (line.creditAccountId) return actuals.generalCardRepayments[line.creditAccountId] ?? 0;
  if (line.goalId) return actuals.goalContributions[line.goalId] ?? 0;
  if (line.payableId) return actuals.paidManualPayables[line.payableId] ?? 0;
  if (line.kind === "reserve") return actuals.savingTransfers;
  if (line.categoryId) return actuals.expensesByCategory[line.categoryId] ?? 0;
  if (line.kind === "living") {
    const assigned = new Set(allLines.map((item) => item.categoryId).filter(Boolean));
    return Object.entries(actuals.expensesByCategory).filter(([category]) => !assigned.has(category)).reduce((sum, [, amount]) => sum + amount, 0);
  }
  return 0;
}

export function monthIndex(month: string) {
  const [year, value] = month.slice(0, 7).split("-").map(Number);
  return year * 12 + value - 1;
}

export function installmentDue(installment: Installment, month: string) {
  const elapsed = monthIndex(month) - monthIndex(installment.startMonth) + 1;
  if (elapsed <= 0) return 0;
  const base = Math.floor(installment.totalAmount / installment.termMonths);
  const scheduled = Math.min(elapsed, installment.termMonths) === installment.termMonths
    ? installment.totalAmount : Math.min(elapsed, installment.termMonths) * base;
  return Math.max(0, scheduled - installment.paidThroughMonth);
}

export function scheduledInstallmentAmount(installment: Installment, month: string) {
  const elapsed = monthIndex(month) - monthIndex(installment.startMonth) + 1;
  if (elapsed <= 0 || elapsed > installment.termMonths) return 0;
  const base = Math.floor(installment.totalAmount / installment.termMonths);
  return elapsed === installment.termMonths ? installment.totalAmount - base * (installment.termMonths - 1) : base;
}

export function defaultAllocationLines(installments: Installment[], month: string, cards: CreditCardForAllocation[] = []): AllocationLine[] {
  return [
    { kind: "living", title: "Chi tiêu sinh hoạt", amount: 0, installmentId: null, creditAccountId: null, categoryId: null, goalId: null, payableId: null },
    { kind: "debt", title: "Trả nợ", amount: 0, installmentId: null, creditAccountId: null, categoryId: null, goalId: null, payableId: null },
    { kind: "reserve", title: "Dự phòng", amount: 0, installmentId: null, creditAccountId: null, categoryId: null, goalId: null, payableId: null },
    ...installments.filter((item) => installmentDue(item, month) > 0).map((item) => ({
      kind: "card_installment" as const, title: item.title, amount: installmentDue(item, month),
      installmentId: item.id, creditAccountId: null, categoryId: null, goalId: null, payableId: null,
    })),
    ...cards.filter((card) => card.type === "credit_card").map((card) => ({
      kind: "card_repayment" as const, title: `Hoàn trả ${card.name}`, amount: 0,
      installmentId: null, creditAccountId: card.id, categoryId: null, goalId: null, payableId: null,
    })),
  ];
}

export function withNewInstallments(lines: AllocationLine[], installments: Installment[], month: string, cards: CreditCardForAllocation[] = []) {
  const existingInstallments = new Set(lines.filter((line) => line.installmentId).map((line) => line.installmentId));
  const existingCards = new Set(lines.filter((line) => line.creditAccountId).map((line) => line.creditAccountId));
  return [...lines, ...defaultAllocationLines(installments, month, cards).filter((line) =>
    line.installmentId ? !existingInstallments.has(line.installmentId) : line.creditAccountId ? !existingCards.has(line.creditAccountId) : false)];
}
