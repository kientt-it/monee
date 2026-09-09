import { getSupabaseAuthContext } from "@/lib/supabase/auth-context";
import { calculateBudgetUsage, type BudgetStatus } from "@/lib/domain/finance/calculations";

const TIMEZONE = "Asia/Ho_Chi_Minh";

type BudgetRow = {
  id: string;
  name: string;
  category_id: string | null;
  amount: number | string;
  period: "weekly" | "monthly" | "yearly" | "custom";
  start_date: string;
  end_date: string | null;
  alert_threshold: number;
  is_active: boolean;
  created_at: string;
};

type CategoryRow = { id: string; name: string; color: string | null };
type TransactionRow = { amount: number | string; transaction_date: string; category_id: string | null };

export type BudgetRecord = {
  id: string;
  name: string;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  amount: number;
  period: BudgetRow["period"];
  startDate: string;
  endDate: string | null;
  alertThreshold: number;
  isActive: boolean;
  spent: number;
  remaining: number;
  percentage: number;
  status: BudgetStatus;
  periodLabel: string;
};

export type BudgetCategoryOption = { id: string; name: string; color: string | null };

function localDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return { year: value("year"), month: value("month"), day: value("day") };
}

function toDateString(date: Date) {
  const { year, month, day } = localDateParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function getCurrentWindow(period: BudgetRow["period"], now: Date, startDate: string, endDate: string | null) {
  const today = toDateString(now);
  const { year, month } = localDateParts(now);
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const nextMonthStart = new Date(Date.UTC(year, month, 1));
  const nextYearStart = new Date(Date.UTC(year + 1, 0, 1));
  let windowStart = toDateString(monthStart);
  let windowEnd = toDateString(addDays(nextMonthStart, -1));
  let label = `Tháng ${month}/${year}`;

  if (period === "weekly") {
    const todayUtc = new Date(`${today}T00:00:00Z`);
    const day = todayUtc.getUTCDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const weekStart = addDays(todayUtc, mondayOffset);
    windowStart = toDateString(weekStart);
    windowEnd = toDateString(addDays(weekStart, 6));
    label = `Tuần này · ${windowStart.slice(8)}–${windowEnd.slice(8)}/${windowEnd.slice(5, 7)}`;
  } else if (period === "yearly") {
    windowStart = toDateString(yearStart);
    windowEnd = toDateString(addDays(nextYearStart, -1));
    label = `Năm ${year}`;
  } else if (period === "custom") {
    windowStart = startDate;
    windowEnd = endDate ?? today;
    label = endDate ? `${startDate} → ${endDate}` : `Từ ${startDate}`;
  }

  const effectiveStart = windowStart > startDate ? windowStart : startDate;
  const effectiveEnd = endDate && endDate < windowEnd ? endDate : windowEnd;
  return { start: effectiveStart, end: effectiveEnd, label };
}

function dateTimeBoundary(date: string, end = false) {
  const offset = 7 * 60 * 60 * 1000;
  const base = new Date(`${date}T00:00:00Z`).getTime() - offset;
  return new Date(base + (end ? 24 * 60 * 60 * 1000 : 0)).toISOString();
}

function safeAmount(value: number | string) {
  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || amount < 0) throw new Error("Số tiền vượt quá giới hạn hiển thị an toàn.");
  return amount;
}

export async function getBudgets() {
  const { configured, supabase, user } = await getSupabaseAuthContext();
  if (!configured) return { budgets: [] as BudgetRecord[], categories: [] as BudgetCategoryOption[], configured: false };
  if (!supabase || !user) return { budgets: [] as BudgetRecord[], categories: [] as BudgetCategoryOption[], configured: true };

  const [{ data: budgetRows, error: budgetsError }, { data: categoryRows, error: categoriesError }] = await Promise.all([
    supabase.from("budgets").select("id,name,category_id,amount,period,start_date,end_date,alert_threshold,is_active,created_at").eq("user_id", user.id).order("is_active", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("categories").select("id,name,color").or(`user_id.is.null,user_id.eq.${user.id}`).eq("type", "expense").eq("is_archived", false).order("sort_order"),
  ]);
  if (budgetsError || categoriesError) throw new Error("Không thể tải danh sách ngân sách.");

  const rows = (budgetRows ?? []) as BudgetRow[];
  const categories = (categoryRows ?? []) as CategoryRow[];
  if (rows.length === 0) return { budgets: [], categories, configured: true };

  const now = new Date();
  const windows = rows.map((row) => getCurrentWindow(row.period, now, row.start_date, row.end_date));
  const minStart = windows.reduce((min, window) => window.start < min ? window.start : min, toDateString(now));
  const maxEnd = windows.reduce((max, window) => window.end > max ? window.end : max, toDateString(now));
  const { data: transactionRows, error: transactionsError } = await supabase.from("transactions").select("amount,transaction_date,category_id").eq("user_id", user.id).eq("type", "expense").is("deleted_at", null).gte("transaction_date", dateTimeBoundary(minStart)).lt("transaction_date", dateTimeBoundary(maxEnd, true));
  if (transactionsError) throw new Error("Không thể tính tiến độ ngân sách.");

  const transactions = (transactionRows ?? []) as TransactionRow[];
  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const budgets = rows.map((row, index) => {
    const window = windows[index];
    const spent = window.start > window.end ? 0 : transactions.filter((transaction) => {
      const transactionDate = transaction.transaction_date.slice(0, 10);
      return transactionDate >= window.start && transactionDate <= window.end && (row.category_id === null || row.category_id === transaction.category_id);
    }).reduce((total, transaction) => total + safeAmount(transaction.amount), 0);
    const usage = calculateBudgetUsage(spent, safeAmount(row.amount));
    const category = row.category_id ? categoryMap.get(row.category_id) : null;
    return {
      id: row.id,
      name: row.name,
      categoryId: row.category_id,
      categoryName: category?.name ?? (row.category_id ? "Danh mục đã lưu trữ" : "Tất cả chi tiêu"),
      categoryColor: category?.color ?? null,
      amount: usage.budget,
      period: row.period,
      startDate: row.start_date,
      endDate: row.end_date,
      alertThreshold: row.alert_threshold,
      isActive: row.is_active,
      spent: usage.spent,
      remaining: usage.remaining,
      percentage: usage.percentage,
      status: usage.status,
      periodLabel: window.label,
    } satisfies BudgetRecord;
  });

  return { budgets, categories, configured: true };
}
