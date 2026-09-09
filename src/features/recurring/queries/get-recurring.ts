import { getSupabaseAuthContext } from "@/lib/supabase/auth-context";
import type { AccountRecord } from "@/features/accounts/queries/get-accounts";
import type { CategoryOption } from "@/features/transactions/queries/get-transaction-options";

type RecurringRow = { id: string; type: "expense" | "income" | "transfer"; amount: number | string; account_id: string; destination_account_id: string | null; category_id: string | null; merchant: string | null; note: string | null; frequency: "daily" | "weekly" | "monthly" | "yearly" | "custom"; interval: number; start_date: string; next_run_date: string; end_date: string | null; is_active: boolean; };
export type RecurringRecord = RecurringRow & { amount: number };

export async function getRecurringTransactions() {
  const { configured, supabase, user } = await getSupabaseAuthContext();
  if (!configured) return { recurring: [] as RecurringRecord[], accounts: [] as AccountRecord[], categories: [] as CategoryOption[], configured: false };
  if (!supabase || !user) return { recurring: [] as RecurringRecord[], accounts: [] as AccountRecord[], categories: [] as CategoryOption[], configured: true };
  const [{ data: recurring, error: recurringError }, { data: accounts, error: accountsError }, { data: categories, error: categoriesError }] = await Promise.all([
    supabase.from("recurring_transactions").select("id,type,amount,account_id,destination_account_id,category_id,merchant,note,frequency,interval,start_date,next_run_date,end_date,is_active").eq("user_id", user.id).order("is_active", { ascending: false }).order("next_run_date"),
    supabase.from("accounts").select("id,name,type,current_balance,currency,color,is_archived,include_in_total").eq("user_id", user.id).order("is_archived").order("created_at"),
    supabase.from("categories").select("id,name,type").or(`user_id.is.null,user_id.eq.${user.id}`).eq("is_archived", false).order("sort_order"),
  ]);
  if (recurringError || accountsError || categoriesError) throw new Error("Không thể tải giao dịch định kỳ.");
  return { recurring: ((recurring ?? []) as RecurringRow[]).map((item) => ({ ...item, amount: Number(item.amount) })), accounts: (accounts ?? []) as AccountRecord[], categories: (categories ?? []) as CategoryOption[], configured: true };
}
