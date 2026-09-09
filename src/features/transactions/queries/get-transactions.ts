import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/env";

export type TransactionRecord = { id: string; type: "expense" | "income" | "transfer"; amount: number; merchant: string | null; note: string | null; transaction_date: string; account_id: string; destination_account_id: string | null; category_id: string | null };

export async function getTransactions() {
  if (!getSupabaseConfig().configured) return { transactions: [] as TransactionRecord[], configured: false };
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { transactions: [] as TransactionRecord[], configured: true };
  const { data, error } = await supabase.from("transactions").select("id,type,amount,merchant,note,transaction_date,account_id,destination_account_id,category_id").eq("user_id", user.id).is("deleted_at", null).order("transaction_date", { ascending: false }).limit(50);
  if (error) throw new Error("Không thể tải giao dịch.");
  return { transactions: (data ?? []) as TransactionRecord[], configured: true };
}

export async function getTransaction(id: string) {
  if (!getSupabaseConfig().configured) return { transaction: null as TransactionRecord | null, configured: false };
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { transaction: null as TransactionRecord | null, configured: true };
  const { data, error } = await supabase.from("transactions").select("id,type,amount,merchant,note,transaction_date,account_id,destination_account_id,category_id").eq("id", id).eq("user_id", user.id).is("deleted_at", null).maybeSingle();
  if (error) throw new Error("Không thể tải giao dịch.");
  return { transaction: data as TransactionRecord | null, configured: true };
}
