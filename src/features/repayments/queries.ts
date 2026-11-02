import "server-only";
import { getSupabaseAuthContext } from "@/lib/supabase/auth-context";
import { getAccounts, type AccountRecord } from "@/features/accounts/queries/get-accounts";
import type { RepaymentDue, RepaymentPayment } from "./domain";

export type RepaymentBudget = { income: number | null; cash: number | null; living: number | null; reserve: number | null; salaryDay: number };
export type RepaymentData = { available: boolean; dues: RepaymentDue[]; payments: RepaymentPayment[]; accounts: AccountRecord[];
  budget: RepaymentBudget; unallocatedLegacy: number;
  transactions: { id: string; amount: number; available: number; date: string; title: string; accountId: string; destinationId: string | null; type: string }[] };
function amount(value: unknown) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 0) throw new Error("Số tiền lịch trả không hợp lệ.");
  return n;
}
export async function getRepaymentData(month: string, mode: "month" | "salary" = "month"): Promise<RepaymentData> {
  const { supabase, user } = await getSupabaseAuthContext();
  const empty: RepaymentData = { available: false, dues: [], payments: [], accounts: [], transactions: [], unallocatedLegacy: 0,
    budget: { income: null, cash: null, living: null, reserve: null, salaryDay: 16 } };
  if (!supabase || !user) return empty;
  // Request bounded pages explicitly: PostgREST's default row cap must not
  // silently omit later periods or payments from financial totals.
  async function rows(table: string, columns: string) {
    const result: Record<string, unknown>[] = [];
    for (let page = 0; page < 50; page++) {
      const response = await supabase!.from(table).select(columns).eq("user_id", user!.id).order("id").range(page * 1000, page * 1000 + 999);
      if (response.error) throw response.error;
      result.push(...response.data as unknown as Record<string, unknown>[]);
      if (response.data.length < 1000) return result;
    }
    throw new Error("Lịch trả vượt giới hạn tải. Cần thu hẹp dữ liệu trước khi tính tổng.");
  }
  let plans: Record<string, unknown>[];
  try { plans = await rows("repayment_plans", "id,title,kind,account_id"); }
  catch (e) { if (["42P01", "PGRST205"].includes((e as { code?: string }).code ?? "")) return empty; throw e; }
  const [dues, payments, accountData, budget, transactionResult, legacyResult] = await Promise.all([
    rows("repayment_dues", "id,plan_id,period,due_date,amount,confirmed,title_override,deleted_at,revision"),
    rows("repayment_payments", "id,due_id,amount,paid_on,method,transaction_id,reversed_at"), getAccounts(),
    supabase.from("income_allocation_months").select("planned_income,opening_cash,living_budget,reserve_budget,salary_day,salary_opening_cash,salary_living_budget,salary_reserve_budget").eq("user_id", user.id).eq("month", `${month}-01`).maybeSingle(),
    supabase.from("transactions").select("id,type,amount,account_id,destination_account_id,transaction_date,merchant,note").eq("user_id", user.id).is("deleted_at", null).in("type", ["expense", "transfer"]).order("transaction_date", { ascending: false }).limit(100),
    supabase.from("credit_card_installment_payments").select("transaction_id").eq("user_id", user.id),
  ]);
  if (budget.error || transactionResult.error || legacyResult.error) throw new Error("Không thể tải đầy đủ dữ liệu đối soát lịch trả.");
  const pp: RepaymentPayment[] = payments.map(p => ({ id: String(p.id), dueId: String(p.due_id), amount: amount(p.amount), paidOn: String(p.paid_on),
    method: String(p.method), transactionId: p.transaction_id ? String(p.transaction_id) : null, reversed: p.reversed_at !== null }));
  const byPlan = new Map(plans.map(p => [String(p.id), p]));
  const terms = new Map<string, number>();
  for (const d of dues) terms.set(String(d.plan_id), Math.max(terms.get(String(d.plan_id)) ?? 0, Number(d.period)));
  const paid = new Map<string, number>();
  for (const p of pp) if (!p.reversed) paid.set(p.dueId, (paid.get(p.dueId) ?? 0) + p.amount);
  const parsed: RepaymentDue[] = dues.filter(d => d.deleted_at === null).map(d => {
    const p = byPlan.get(String(d.plan_id));
    if (!p) throw new Error("Lịch trả thiếu thông tin hợp đồng.");
    return { id: String(d.id), planId: String(p.id), title: String(d.title_override ?? p.title), revision: Number(d.revision), kind: p.kind as RepaymentDue["kind"], accountId: p.account_id ? String(p.account_id) : null,
      dueDate: String(d.due_date), amount: amount(d.amount), period: Number(d.period), terms: terms.get(String(p.id))!, confirmed: Boolean(d.confirmed), paid: paid.get(String(d.id)) ?? 0 };
  });
  const legacyIds = new Set((legacyResult.data ?? []).map(p => p.transaction_id));
  const used = (id: string) => pp.filter(p => !p.reversed && p.transactionId === id).reduce((s, p) => s + p.amount, 0);
  const tx = (transactionResult.data ?? []).filter(t => !legacyIds.has(t.id)).map(t => ({ id: t.id, amount: amount(t.amount), available: Math.max(0, amount(t.amount) - used(t.id)),
    date: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(t.transaction_date)),
    title: t.merchant || t.note || "Giao dịch", accountId: t.account_id, destinationId: t.destination_account_id, type: t.type }));
  const raw = budget.data;
  const b = raw && mode === "salary" ? { ...raw, opening_cash: raw.salary_opening_cash, living_budget: raw.salary_living_budget, reserve_budget: raw.salary_reserve_budget } : raw;
  return { available: true, dues: parsed, payments: pp, accounts: accountData.accounts, unallocatedLegacy: legacyIds.size, transactions: tx,
    budget: b ? { income: b.planned_income === null ? null : amount(b.planned_income), cash: b.opening_cash === null ? null : amount(b.opening_cash),
      living: b.living_budget === null ? null : amount(b.living_budget), reserve: b.reserve_budget === null ? null : amount(b.reserve_budget), salaryDay: b.salary_day } : empty.budget };
}
