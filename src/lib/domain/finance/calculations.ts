export type FinancialTransaction = { type: "expense" | "income" | "transfer"; amount: number; deletedAt?: string | null; transactionDate: string };

export function calculateNetCashFlow(transactions: FinancialTransaction[]) {
  return transactions.filter((item) => !item.deletedAt).reduce((total, item) => total + (item.type === "income" ? item.amount : item.type === "expense" ? -item.amount : 0), 0);
}

export function calculateSavingRate(transactions: FinancialTransaction[]) {
  const active = transactions.filter((item) => !item.deletedAt);
  const income = active.filter((item) => item.type === "income").reduce((total, item) => total + item.amount, 0);
  if (income === 0) return 0;
  return (calculateNetCashFlow(active) / income) * 100;
}

export function calculateTotalBalance(accounts: Array<{ currentBalance: number; isArchived: boolean; includeInTotal: boolean }>) {
  return accounts.filter((account) => !account.isArchived && account.includeInTotal).reduce((total, account) => total + account.currentBalance, 0);
}
