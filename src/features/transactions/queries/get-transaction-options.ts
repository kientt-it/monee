import { getSupabaseAuthContext } from "@/lib/supabase/auth-context";
import type { AccountRecord } from "@/features/accounts/queries/get-accounts";

export type CategoryOption = { id: string; name: string; type: "expense" | "income" };
export async function getTransactionOptions() {
  const { configured, supabase, user } = await getSupabaseAuthContext();
  if (!configured) return { accounts: [] as AccountRecord[], categories: [] as CategoryOption[], configured: false };
  if (!supabase || !user) return { accounts: [] as AccountRecord[], categories: [] as CategoryOption[], configured: true };
  const [{ data: accounts, error: accountsError }, { data: categories, error: categoriesError }] = await Promise.all([
    supabase.from("accounts").select("id,name,type,initial_balance,current_balance,currency,color,is_archived,include_in_total").eq("user_id", user.id).order("is_archived", { ascending: true }).order("created_at"),
    supabase.from("categories").select("id,name,type").or(`user_id.is.null,user_id.eq.${user.id}`).eq("is_archived", false).order("sort_order"),
  ]);
  if (accountsError || categoriesError) throw new Error("Không thể tải lựa chọn giao dịch.");
  return { accounts: (accounts ?? []) as AccountRecord[], categories: (categories ?? []) as CategoryOption[], configured: true };
}
