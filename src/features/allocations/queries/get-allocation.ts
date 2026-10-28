import { getAccounts } from "@/features/accounts/queries/get-accounts";
import { getSupabaseAuthContext } from "@/lib/supabase/auth-context";
import { addMonths } from "@/features/reports/queries/report-period";
import { defaultAllocationLines, withNewInstallments, type AllocationActuals, type AllocationLine, type Installment } from "../logic";

type MonthRow = { id: string; month: string; planned_income: number | string | null };
type LineRow = { kind: AllocationLine["kind"]; title: string; amount: number | string; installment_id: string | null; credit_account_id: string | null; category_id: string | null; goal_id: string | null; payable_id: string | null };
type InstallmentRow = { id: string; credit_account_id: string; title: string; total_amount: number | string; term_months: number; start_month: string; due_day: number };
type PaymentRow = { installment_id: string; transaction_id: string };
type TransactionRow = { id: string; type: "income" | "expense" | "transfer"; amount: number | string; account_id: string; destination_account_id: string | null; category_id: string | null; transaction_date: string; deleted_at?: string | null };
type CategoryRow = { id: string; name: string };
type GoalRow = { id: string; name: string };
type ContributionRow = { saving_goal_id: string; amount: number | string };
type PayableRow = { id: string; title: string; amount: number | string; due_date: string; paid_on: string | null };

function money(value: number | string | null) {
  if (value === null) return null;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error("Số tiền vượt giới hạn hiển thị.");
  return parsed;
}
function localDay(value: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
  const get = (type: string) => parts.find((part) => part.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export async function getAllocation(month: string) {
  const { configured, supabase, user } = await getSupabaseAuthContext();
  const accountData = await getAccounts();
  const emptyActuals: AllocationActuals = { expensesByCategory: {}, savingTransfers: 0, goalContributions: {}, paidManualPayables: {}, generalCardRepayments: {}, installments: [] };
  const empty = { available: false, month, plannedIncome: null as number | null, actualIncome: 0, lines: [] as AllocationLine[], previousLines: [] as AllocationLine[], installments: [] as Installment[], accounts: accountData.accounts, categories: [] as CategoryRow[], goals: [] as GoalRow[], payables: [] as { id: string; title: string; amount: number; dueDate: string; paidOn: string | null }[], actuals: emptyActuals };
  if (!configured || !supabase || !user) return empty;
  const next = addMonths(month, 1);
  const previous = addMonths(month, -1);
  const [monthsResult, installmentsResult, paymentsResult, transactionsResult, categoriesResult, goalsResult, contributionsResult, payablesResult] = await Promise.all([
    supabase.from("income_allocation_months").select("id,month,planned_income").eq("user_id", user.id).in("month", [month, previous]),
    supabase.from("credit_card_installments").select("id,credit_account_id,title,total_amount,term_months,start_month,due_day").eq("user_id", user.id).order("created_at"),
    supabase.from("credit_card_installment_payments").select("installment_id,transaction_id").eq("user_id", user.id),
    supabase.from("transactions").select("id,type,amount,account_id,destination_account_id,category_id,transaction_date").eq("user_id", user.id).is("deleted_at", null).gte("transaction_date", `${month}T00:00:00+07:00`).lt("transaction_date", `${next}T00:00:00+07:00`),
    supabase.from("categories").select("id,name").or(`user_id.is.null,user_id.eq.${user.id}`).eq("type", "expense").order("sort_order"),
    supabase.from("saving_goals").select("id,name").eq("user_id", user.id).order("created_at"),
    supabase.from("saving_goal_contributions").select("saving_goal_id,amount").eq("user_id", user.id).gte("contribution_date", month).lt("contribution_date", next),
    supabase.from("payables").select("id,title,amount,due_date,paid_on").eq("user_id", user.id).eq("kind", "manual").order("due_date"),
  ]);
  if (monthsResult.error && ["42P01", "PGRST205"].includes(monthsResult.error.code)) return empty;
  if ([monthsResult, installmentsResult, paymentsResult, transactionsResult, categoriesResult, goalsResult, contributionsResult, payablesResult].some((result) => result.error)) throw new Error("Không thể tải phân bổ thu nhập.");
  const months = (monthsResult.data ?? []) as MonthRow[];
  const currentPlan = months.find((item) => item.month === month);
  const previousPlan = months.find((item) => item.month === previous);
  const planIds = months.map((item) => item.id);
  const paymentRows = (paymentsResult.data ?? []) as PaymentRow[];
  const paymentIds = paymentRows.map((item) => item.transaction_id);
  const [linesResult, paymentTransactionsResult] = await Promise.all([
    planIds.length ? supabase.from("income_allocation_lines").select("month_id,kind,title,amount,installment_id,credit_account_id,category_id,goal_id,payable_id").in("month_id", planIds).order("sort_order") : Promise.resolve({ data: [], error: null }),
    paymentIds.length ? supabase.from("transactions").select("id,type,amount,account_id,destination_account_id,category_id,transaction_date,deleted_at").eq("user_id", user.id).in("id", paymentIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (linesResult.error || paymentTransactionsResult.error) throw new Error("Không thể tải chi tiết phân bổ thu nhập.");
  const rows = (linesResult.data ?? []) as (LineRow & { month_id: string })[];
  const toLines = (id: string | undefined) => rows.filter((row) => row.month_id === id).map((row) => ({ kind: row.kind, title: row.title, amount: money(row.amount)!, installmentId: row.installment_id, creditAccountId: row.credit_account_id, categoryId: row.category_id, goalId: row.goal_id, payableId: row.payable_id }));
  const paymentTransactions = new Map(((paymentTransactionsResult.data ?? []) as TransactionRow[]).map((row) => [row.id, row]));
  const installments = ((installmentsResult.data ?? []) as InstallmentRow[]).map((row) => {
    const payments = paymentRows.filter((payment) => payment.installment_id === row.id).map((payment) => paymentTransactions.get(payment.transaction_id)).filter((transaction): transaction is TransactionRow => Boolean(transaction && !transaction.deleted_at && transaction.type === "transfer" && transaction.destination_account_id === row.credit_account_id));
    return { id: row.id, creditAccountId: row.credit_account_id, title: row.title, totalAmount: money(row.total_amount)!, termMonths: row.term_months, startMonth: row.start_month, dueDay: row.due_day,
      paidTotal: payments.reduce((sum, payment) => sum + money(payment.amount)!, 0),
      paidThroughMonth: payments.filter((payment) => localDay(payment.transaction_date) < next).reduce((sum, payment) => sum + money(payment.amount)!, 0),
      paidThisMonth: payments.filter((payment) => { const day = localDay(payment.transaction_date); return day >= month && day < next; }).reduce((sum, payment) => sum + money(payment.amount)!, 0),
    } satisfies Installment;
  });
  const lines = currentPlan ? withNewInstallments(toLines(currentPlan.id), installments, month, accountData.accounts) : defaultAllocationLines(installments, month, accountData.accounts);
  const previousLines = toLines(previousPlan?.id).filter((line) => line.kind !== "card_installment" && line.kind !== "card_repayment");
  const monthlyTransactions = (transactionsResult.data ?? []) as TransactionRow[];
  const creditIds = new Set(accountData.accounts.filter((account) => account.type === "credit_card").map((account) => account.id));
  const savingIds = new Set(accountData.accounts.filter((account) => account.type === "saving").map((account) => account.id));
  const expenses = monthlyTransactions.filter((transaction) => transaction.type === "expense" && !creditIds.has(transaction.account_id));
  const contributions = (contributionsResult.data ?? []) as ContributionRow[];
  const payables = ((payablesResult.data ?? []) as PayableRow[]).map((item) => ({ id: item.id, title: item.title, amount: money(item.amount)!, dueDate: item.due_date, paidOn: item.paid_on }));
  const expensesByCategory: Record<string, number> = {};
  for (const item of expenses) { const id = item.category_id ?? ""; expensesByCategory[id] = (expensesByCategory[id] ?? 0) + money(item.amount)!; }
  const goalContributions: Record<string, number> = {};
  for (const item of contributions) goalContributions[item.saving_goal_id] = (goalContributions[item.saving_goal_id] ?? 0) + money(item.amount)!;
  const paidManualPayables: Record<string, number> = {};
  for (const item of payables) if (item.paidOn && item.paidOn >= month && item.paidOn < next) paidManualPayables[item.id] = item.amount;
  const linkedTransactionIds = new Set(paymentRows.map((payment) => payment.transaction_id));
  const generalCardRepayments: Record<string, number> = {};
  for (const item of monthlyTransactions) if (item.type === "transfer" && item.destination_account_id && creditIds.has(item.destination_account_id) && !creditIds.has(item.account_id) && !linkedTransactionIds.has(item.id)) {
    generalCardRepayments[item.destination_account_id] = (generalCardRepayments[item.destination_account_id] ?? 0) + money(item.amount)!;
  }
  const actuals: AllocationActuals = { expensesByCategory, goalContributions, paidManualPayables, generalCardRepayments, installments,
    savingTransfers: monthlyTransactions.filter((item) => item.type === "transfer" && item.destination_account_id && savingIds.has(item.destination_account_id) && !savingIds.has(item.account_id)).reduce((sum, item) => sum + money(item.amount)!, 0) };
  return { available: true, month, plannedIncome: currentPlan ? money(currentPlan.planned_income) : null,
    actualIncome: monthlyTransactions.filter((item) => item.type === "income").reduce((sum, item) => sum + money(item.amount)!, 0),
    lines, previousLines, installments, accounts: accountData.accounts,
    categories: (categoriesResult.data ?? []) as CategoryRow[], goals: (goalsResult.data ?? []) as GoalRow[], payables, actuals };
}
