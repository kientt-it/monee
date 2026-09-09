import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/env";
import type { AccountRecord } from "@/features/accounts/queries/get-accounts";

export type CategoryOption = { id: string; name: string; type: "expense" | "income" };
export async function getTransactionOptions() {
  if (!getSupabaseConfig().configured) return { accounts: [] as AccountRecord[], categories: [] as CategoryOption[], configured: false };
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { accounts: [] as AccountRecord[], categories: [] as CategoryOption[], configured: true };
  const [{ data: accounts, error: accountsError }, { data: categories, error: categoriesError }] = await Promise.all([
    supabase.from("accounts").select("id,name,type,current_balance,currency,color,is_archived,include_in_total").eq("user_id", user.id).eq("is_archived", false).order("created_at"),
    supabase.from("categories").select("id,name,type").or(`user_id.is.null,user_id.eq.${user.id}`).eq("is_archived", false).order("sort_order"),
  ]);
  if (accountsError || categoriesError) throw new Error("Không thể tải lựa chọn giao dịch.");
  return { accounts: (accounts ?? []) as AccountRecord[], categories: (categories ?? []) as CategoryOption[], configured: true };
}
