import type { BudgetStatus } from "@/lib/domain/finance/calculations";

export type DashboardSpendingCategory = {
  label: string;
  amount: number;
  percentage: number;
  color: string;
};

export type DashboardTransaction = {
  id: string;
  title: string;
  metadata: string;
  amount: number;
  type: "expense" | "income" | "transfer";
};

export type DashboardGoal = {
  id: string;
  name: string;
  currentAmount: number;
  targetAmount: number;
  percentage: number;
  color: string;
  icon: string;
};

export type DashboardBudget = {
  amount: number;
  spent: number;
  remaining: number;
  percentage: number;
  status: BudgetStatus;
};

export type DashboardSummary = {
  greetingName: string;
  dateLabel: string;
  monthLabel: string;
  currency: string;
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  netCashFlow: number;
  savingRate: number;
  budget: DashboardBudget | null;
  spending: DashboardSpendingCategory[];
  recentTransactions: DashboardTransaction[];
  goals: DashboardGoal[];
  unreadNotifications: number;
};
