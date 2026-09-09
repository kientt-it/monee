import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/env";

export type TransactionRecord = { id: string; type: "expense" | "income" | "transfer"; amount: number; merchant: string | null; note: string | null; transaction_date: string; account_id: string; destination_account_id: string | null; category_id: string | null };

type TransactionFilters = { type?: "expense" | "income"; monthOnly?: boolean; page?: number };
const PAGE_SIZE = 50;

function getVietnamMonthBounds() {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit" }).formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const nextMonth = new Date(Date.UTC(year, month, 1));
  const format = (date: Date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}T00:00:00+07:00`;
  return { start: `${year}-${String(month).padStart(2, "0")}-01T00:00:00+07:00`, end: format(nextMonth) };
}

export async function getTransactions(filters: TransactionFilters = {}) {
  if (!getSupabaseConfig().configured) return { transactions: [] as TransactionRecord[], configured: false };
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { transactions: [] as TransactionRecord[], configured: true };
  const page = Math.max(1, filters.page ?? 1);
  let query = supabase.from("transactions").select("id,type,amount,merchant,note,transaction_date,account_id,destination_account_id,category_id").eq("user_id", user.id).is("deleted_at", null);
  if (filters.type) query = query.eq("type", filters.type);
  if (filters.monthOnly) {
    const bounds = getVietnamMonthBounds();
    query = query.gte("transaction_date", bounds.start).lt("transaction_date", bounds.end);
  }
  const { data, error } = await query.order("transaction_date", { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  if (error) throw new Error("Không thể tải giao dịch.");
  const rows = (data ?? []) as TransactionRecord[];
  return { transactions: rows.slice(0, PAGE_SIZE), configured: true, hasMore: rows.length > PAGE_SIZE, page };
}

export async function getTransaction(id: string) {
  if (!getSupabaseConfig().configured) return { transaction: null as TransactionRecord | null, configured: false };
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { transaction: null as TransactionRecord | null, configured: true };
  const { data, error } = await supabase.from("transactions").select("id,type,amount,merchant,note,transaction_date,account_id,destination_account_id,category_id").eq("id", id).eq("user_id", user.id).is("deleted_at", null).maybeSingle();
  if (error) throw new Error("Không thể tải giao dịch.");
  return { transaction: data as TransactionRecord | null, configured: true };
}
