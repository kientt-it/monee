import { redirect } from "next/navigation";
import {
  calculateBudgetUsage,
  calculateNetCashFlow,
  calculateSavingRate,
  calculateTotalBalance,
} from "@/lib/domain/finance/calculations";
import { getSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { DashboardSummary } from "@/features/dashboard/types";

const TIMEZONE = "Asia/Ho_Chi_Minh";
const CATEGORY_COLORS = ["#087f5b", "#efaa47", "#8795c4", "#c46b79", "#5f8fbd"];

type TransactionRow = {
  id: string;
  type: "expense" | "income" | "transfer";
  amount: number | string;
  merchant: string | null;
  note: string | null;
  transaction_date: string;
  account_id: string;
  destination_account_id: string | null;
  category_id: string | null;
};

type AccountRow = {
  id: string;
  name: string;
  current_balance: number | string;
  is_archived: boolean;
  include_in_total: boolean;
};

type CategoryRow = { id: string; name: string; color: string | null };
type BudgetRow = { amount: number | string; category_id: string | null };
type GoalRow = { id: string; name: string; target_amount: number | string; current_amount: number | string; color: string | null; icon: string | null };

function toSafeAmount(value: number | string) {
  const amount = Number(value);
  if (!Number.isSafeInteger(amount)) throw new Error("Số tiền vượt quá giới hạn hiển thị an toàn.");
  return amount;
}

function getLocalDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return { year: value("year"), month: value("month"), day: value("day") };
}

function getMonthWindow(now: Date) {
  const { year, month } = getLocalDateParts(now);
  const timezoneOffsetMs = 7 * 60 * 60 * 1000;
  const start = new Date(Date.UTC(year, month - 1, 1) - timezoneOffsetMs).toISOString();
  const end = new Date(Date.UTC(year, month, 1) - timezoneOffsetMs).toISOString();
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    start,
    end,
    firstDate: `${year}-${String(month).padStart(2, "0")}-01`,
    lastDate: `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
  };
}

function formatDateLabel(now: Date) {
  const label = new Intl.DateTimeFormat("vi-VN", {
    timeZone: TIMEZONE,
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(now);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatMonthLabel(now: Date) {
  const month = new Intl.DateTimeFormat("vi-VN", { timeZone: TIMEZONE, month: "long" }).format(now);
  return month.charAt(0).toUpperCase() + month.slice(1);
}

function formatTransactionDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export async function getDashboardSummary(): Promise<DashboardSummary | null> {
  if (!getSupabaseConfig().configured) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const now = new Date();
  const month = getMonthWindow(now);
  const [profileResult, accountsResult, monthTransactionsResult, recentTransactionsResult, categoriesResult, budgetsResult, goalsResult, notificationResult] = await Promise.all([
    supabase.from("profiles").select("full_name,currency").eq("id", user.id).maybeSingle(),
    supabase.from("accounts").select("id,name,current_balance,is_archived,include_in_total").eq("user_id", user.id),
    supabase.from("transactions").select("id,type,amount,merchant,note,transaction_date,account_id,destination_account_id,category_id").eq("user_id", user.id).is("deleted_at", null).gte("transaction_date", month.start).lt("transaction_date", month.end).order("transaction_date", { ascending: false }),
    supabase.from("transactions").select("id,type,amount,merchant,note,transaction_date,account_id,destination_account_id,category_id").eq("user_id", user.id).is("deleted_at", null).order("transaction_date", { ascending: false }).limit(5),
    supabase.from("categories").select("id,name,color").or(`user_id.is.null,user_id.eq.${user.id}`).eq("is_archived", false),
    supabase.from("budgets").select("amount,category_id").eq("user_id", user.id).eq("is_active", true).eq("period", "monthly").lte("start_date", month.lastDate).or(`end_date.is.null,end_date.gte.${month.firstDate}`),
    supabase.from("saving_goals").select("id,name,target_amount,current_amount,color,icon").eq("user_id", user.id).eq("status", "active").order("created_at", { ascending: true }).limit(3),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("is_read", false),
  ]);

  const error = [profileResult.error, accountsResult.error, monthTransactionsResult.error, recentTransactionsResult.error, categoriesResult.error, budgetsResult.error, goalsResult.error, notificationResult.error].find(Boolean);
  if (error) throw new Error("Không thể tải tổng quan tài chính lúc này.");

  const accounts = (accountsResult.data ?? []) as AccountRow[];
  const monthTransactions = (monthTransactionsResult.data ?? []) as TransactionRow[];
  const recentTransactions = (recentTransactionsResult.data ?? []) as TransactionRow[];
  const categories = (categoriesResult.data ?? []) as CategoryRow[];
  const budgets = (budgetsResult.data ?? []) as BudgetRow[];
  const goals = (goalsResult.data ?? []) as GoalRow[];
  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const accountMap = new Map(accounts.map((account) => [account.id, account.name]));

  const normalizedTransactions = monthTransactions.map((transaction) => ({
    type: transaction.type,
    amount: toSafeAmount(transaction.amount),
    transactionDate: transaction.transaction_date,
  }));
  const monthlyIncome = normalizedTransactions.filter((item) => item.type === "income").reduce((total, item) => total + item.amount, 0);
  const monthlyExpense = normalizedTransactions.filter((item) => item.type === "expense").reduce((total, item) => total + item.amount, 0);

  const spendingByCategory = new Map<string, number>();
  for (const transaction of monthTransactions) {
    if (transaction.type !== "expense") continue;
    const key = transaction.category_id ?? "uncategorized";
    spendingByCategory.set(key, (spendingByCategory.get(key) ?? 0) + toSafeAmount(transaction.amount));
  }
  const spending = [...spendingByCategory.entries()]
    .map(([categoryId, amount], index) => {
      const category = categoryMap.get(categoryId);
      return {
        label: category?.name ?? "Chưa phân loại",
        amount,
        percentage: monthlyExpense > 0 ? (amount / monthlyExpense) * 100 : 0,
        color: category?.color ?? CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      };
    })
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);

  const budgetAmount = budgets.reduce((total, budget) => total + toSafeAmount(budget.amount), 0);
  const budgetCategories = new Set(budgets.flatMap((budget) => (budget.category_id ? [budget.category_id] : [])));
  const hasGeneralBudget = budgets.some((budget) => budget.category_id === null);
  const budgetSpent = monthTransactions
    .filter((transaction) => transaction.type === "expense" && (hasGeneralBudget || (transaction.category_id && budgetCategories.has(transaction.category_id))))
    .reduce((total, transaction) => total + toSafeAmount(transaction.amount), 0);
  const budgetUsage = budgetAmount > 0 ? calculateBudgetUsage(budgetSpent, budgetAmount) : null;

  const fullName = profileResult.data?.full_name?.trim();
  const greetingName = fullName?.split(/\s+/).at(-1) ?? user.email?.split("@")[0] ?? "bạn";

  return {
    greetingName,
    dateLabel: formatDateLabel(now),
    monthLabel: formatMonthLabel(now),
    currency: profileResult.data?.currency ?? "VND",
    totalBalance: calculateTotalBalance(accounts.map((account) => ({ currentBalance: toSafeAmount(account.current_balance), isArchived: account.is_archived, includeInTotal: account.include_in_total }))),
    monthlyIncome,
    monthlyExpense,
    netCashFlow: calculateNetCashFlow(normalizedTransactions),
    savingRate: calculateSavingRate(normalizedTransactions),
    budget: budgetUsage ? {
      amount: budgetUsage.budget,
      spent: budgetUsage.spent,
      remaining: budgetUsage.remaining,
      percentage: budgetUsage.percentage,
      status: budgetUsage.status,
    } : null,
    spending,
    recentTransactions: recentTransactions.map((transaction) => {
      const category = transaction.category_id ? categoryMap.get(transaction.category_id) : null;
      const sourceAccount = accountMap.get(transaction.account_id);
      const destinationAccount = transaction.destination_account_id ? accountMap.get(transaction.destination_account_id) : null;
      const title = transaction.type === "transfer"
        ? `${sourceAccount ?? "Tài khoản"} → ${destinationAccount ?? "Tài khoản"}`
        : transaction.merchant?.trim() || category?.name || (transaction.type === "income" ? "Khoản thu" : "Khoản chi");
      const kind = transaction.type === "transfer" ? "Chuyển khoản" : category?.name ?? (transaction.type === "income" ? "Thu nhập" : "Chi tiêu");
      return {
        id: transaction.id,
        title,
        metadata: `${kind} · ${formatTransactionDate(transaction.transaction_date)}`,
        amount: toSafeAmount(transaction.amount),
        type: transaction.type,
      };
    }),
    goals: goals.map((goal) => {
      const currentAmount = toSafeAmount(goal.current_amount);
      const targetAmount = toSafeAmount(goal.target_amount);
      return {
        id: goal.id,
        name: goal.name,
        currentAmount,
        targetAmount,
        percentage: Math.min((currentAmount / targetAmount) * 100, 100),
        color: goal.color ?? "#8795c4",
        icon: goal.icon ?? "🎯",
      };
    }),
    unreadNotifications: notificationResult.count ?? 0,
  };
}
