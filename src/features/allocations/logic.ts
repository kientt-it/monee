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
  principalAmount: number;
  termMonths: number;
  startMonth: string;
  dueDay: number;
  interestMode: "none" | "upfront" | "monthly_flat";
  interestRateBps: number;
  paidTotal: number;
  paidThroughMonth: number;
  paidThisMonth: number;
};

export function interestPerPeriod(principalAmount: number, interestRateBps: number) {
  return Number((BigInt(principalAmount) * BigInt(interestRateBps) + BigInt(5000)) / BigInt(10000));
}

export function totalInstallmentAmount(principalAmount: number, termMonths: number, interestMode: Installment["interestMode"], interestRateBps: number) {
  const interest = interestPerPeriod(principalAmount, interestRateBps);
  return principalAmount + (interestMode === "upfront" ? interest : interestMode === "monthly_flat" ? interest * termMonths : 0);
}

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
  const periods = Math.min(elapsed, installment.termMonths);
  const base = Math.floor(installment.principalAmount / installment.termMonths);
  const principal = periods === installment.termMonths ? installment.principalAmount : periods * base;
  const interest = interestPerPeriod(installment.principalAmount, installment.interestRateBps);
  const scheduled = principal + (installment.interestMode === "upfront" ? interest : installment.interestMode === "monthly_flat" ? interest * periods : 0);
  return Math.max(0, scheduled - installment.paidThroughMonth);
}

export function installmentAllocationAmount(installment: Installment, month: string) {
  return installmentDue(installment, month) + installment.paidThisMonth;
}

export function scheduledInstallmentAmount(installment: Installment, month: string) {
  const elapsed = monthIndex(month) - monthIndex(installment.startMonth) + 1;
  if (elapsed <= 0 || elapsed > installment.termMonths) return 0;
  const base = Math.floor(installment.principalAmount / installment.termMonths);
  const principal = elapsed === installment.termMonths ? installment.principalAmount - base * (installment.termMonths - 1) : base;
  const interest = interestPerPeriod(installment.principalAmount, installment.interestRateBps);
  return principal + (installment.interestMode === "upfront" && elapsed === 1 ? interest : installment.interestMode === "monthly_flat" ? interest : 0);
}

export function defaultAllocationLines(installments: Installment[], month: string): AllocationLine[] {
  return [
    { kind: "living", title: "Chi tiêu sinh hoạt", amount: 0, installmentId: null, creditAccountId: null, categoryId: null, goalId: null, payableId: null },
    { kind: "debt", title: "Trả nợ", amount: 0, installmentId: null, creditAccountId: null, categoryId: null, goalId: null, payableId: null },
    { kind: "reserve", title: "Dự phòng", amount: 0, installmentId: null, creditAccountId: null, categoryId: null, goalId: null, payableId: null },
    ...installments.filter((item) => installmentAllocationAmount(item, month) > 0).map((item) => ({
      kind: "card_installment" as const, title: item.title, amount: installmentAllocationAmount(item, month),
      installmentId: item.id, creditAccountId: null, categoryId: null, goalId: null, payableId: null,
    })),
  ];
}

export function withNewInstallments(lines: AllocationLine[], installments: Installment[], month: string) {
  const existingInstallments = new Set(lines.filter((line) => line.installmentId).map((line) => line.installmentId));
  const installmentById = new Map(installments.map((item) => [item.id, item]));
  const updatedLines = lines.map((line) => {
    const installment = line.installmentId ? installmentById.get(line.installmentId) : null;
    return installment ? { ...line, title: installment.title, amount: installmentAllocationAmount(installment, month) } : line;
  });
  return [...updatedLines, ...defaultAllocationLines(installments, month).filter((line) => line.installmentId && !existingInstallments.has(line.installmentId))];
}
