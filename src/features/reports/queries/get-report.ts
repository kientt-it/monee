import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/env";
import { calculateNetCashFlow, calculateSavingRate } from "@/lib/domain/finance/calculations";
import { TIMEZONE, addDays, addMonths, addYears, currentWeekStart, getReportPeriod, utcDate, type ReportRange, type ReportUnit } from "@/features/reports/queries/report-period";

type TransactionRow = { type: "expense" | "income"; amount: number | string; transaction_date: string; category_id: string | null };
type CategoryRow = { id: string; name: string; color: string | null };

export type ReportCategory = { id: string; name: string; color: string; amount: number; percentage: number };
export type ReportTrend = { label: string; income: number; expense: number; net: number };
export type ReportData = {
  range: ReportRange;
  from: string;
  to: string;
  periodLabel: string;
  trendLabel: string;
  income: number;
  expense: number;
  net: number;
  savingRate: number;
  transactionCount: number;
  topCategories: ReportCategory[];
  trend: ReportTrend[];
};

function toBoundary(value: string, end = false) { const offset = 7 * 60 * 60 * 1000; return new Date(utcDate(value).getTime() - offset + (end ? 24 * 60 * 60 * 1000 : 0)).toISOString(); }
export { getReportPeriod } from "@/features/reports/queries/report-period";
export type { ReportRange } from "@/features/reports/queries/report-period";

function getTrendPeriod(period: ReturnType<typeof getReportPeriod>) {
  if (period.unit === "week") return { from: addDays(period.from, -7 * 7), unit: "week" as ReportUnit, label: "8 tuần gần nhất" };
  if (period.unit === "year") return { from: addYears(period.from, -4), unit: "year" as ReportUnit, label: "5 năm gần nhất" };
  return { from: addMonths(period.from, -5), unit: "month" as ReportUnit, label: "6 tháng gần nhất" };
}

function localDateKey(timestamp: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(timestamp));
  const value = (type: Intl.DateTimeFormatPartTypes) => String(Number(parts.find((part) => part.type === type)?.value)).padStart(2, "0");
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function groupKey(date: string, unit: ReportUnit) {
  if (unit === "year") return date.slice(0, 4);
  if (unit === "month") return date.slice(0, 7);
  return currentWeekStart(date);
}

function labelForKey(key: string, unit: ReportUnit) {
  if (unit === "year") return key;
  if (unit === "month") return `${Number(key.slice(5, 7))}/${key.slice(0, 4)}`;
  return `${key.slice(8)}/${key.slice(5, 7)}`;
}

function safeAmount(value: number | string) {
  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || amount < 0) throw new Error("Số tiền vượt quá giới hạn hiển thị an toàn.");
  return amount;
}

function buildTrend(transactions: TransactionRow[], trendFrom: string, period: ReturnType<typeof getReportPeriod>, trendUnit: ReportUnit) {
  const keys: string[] = [];
  let cursor = trendFrom;
  const endKey = groupKey(period.to, trendUnit);
  while (true) {
    const key = groupKey(cursor, trendUnit);
    if (!keys.includes(key)) keys.push(key);
    if (key === endKey || keys.length > 60) break;
    cursor = trendUnit === "week" ? addDays(cursor, 7) : trendUnit === "year" ? addYears(cursor, 1) : addMonths(cursor, 1);
  }
  return keys.map((key) => {
    const rows = transactions.filter((transaction) => groupKey(localDateKey(transaction.transaction_date), trendUnit) === key);
    const income = rows.filter((row) => row.type === "income").reduce((sum, row) => sum + safeAmount(row.amount), 0);
    const expense = rows.filter((row) => row.type === "expense").reduce((sum, row) => sum + safeAmount(row.amount), 0);
    return { label: labelForKey(key, trendUnit), income, expense, net: income - expense };
  });
}

export async function getReport(range: ReportRange = "month", customFrom?: string, customTo?: string): Promise<ReportData | null> {
  if (!getSupabaseConfig().configured) return null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const period = getReportPeriod(range, new Date(), customFrom, customTo);
  const trend = getTrendPeriod(period);
  const [{ data: transactionRows, error: transactionsError }, { data: categoryRows, error: categoriesError }] = await Promise.all([
    supabase.from("transactions").select("type,amount,transaction_date,category_id").eq("user_id", user.id).is("deleted_at", null).in("type", ["income", "expense"]).gte("transaction_date", toBoundary(trend.from)).lt("transaction_date", toBoundary(addDays(period.to, 1))),
    supabase.from("categories").select("id,name,color").or(`user_id.is.null,user_id.eq.${user.id}`).eq("is_archived", false),
  ]);
  if (transactionsError || categoriesError) throw new Error("Không thể tải báo cáo tài chính.");

  const transactions = (transactionRows ?? []) as TransactionRow[];
  const selected = transactions.filter((transaction) => {
    const key = localDateKey(transaction.transaction_date);
    return key >= period.from && key <= period.to;
  });
  const normalized = selected.map((transaction) => ({ type: transaction.type, amount: safeAmount(transaction.amount), transactionDate: transaction.transaction_date }));
  const income = normalized.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
  const expense = normalized.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
  const categoryMap = new Map(((categoryRows ?? []) as CategoryRow[]).map((category) => [category.id, category]));
  const byCategory = new Map<string, number>();
  selected.filter((transaction) => transaction.type === "expense").forEach((transaction) => { const key = transaction.category_id ?? "uncategorized"; byCategory.set(key, (byCategory.get(key) ?? 0) + safeAmount(transaction.amount)); });
  const colors = ["#087f5b", "#efaa47", "#8795c4", "#c46b79", "#5f8fbd"];
  const topCategories = [...byCategory.entries()].map(([id, amount], index) => ({ id, name: categoryMap.get(id)?.name ?? "Chưa phân loại", color: categoryMap.get(id)?.color ?? colors[index % colors.length], amount, percentage: expense > 0 ? amount / expense * 100 : 0 })).sort((a, b) => b.amount - a.amount).slice(0, 6);
  return { range, from: period.from, to: period.to, periodLabel: period.label, trendLabel: trend.label, income, expense, net: calculateNetCashFlow(normalized), savingRate: calculateSavingRate(normalized), transactionCount: selected.length, topCategories, trend: buildTrend(transactions, trend.from, period, trend.unit) };
}
