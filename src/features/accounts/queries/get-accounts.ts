import { getSupabaseAuthContext } from "@/lib/supabase/auth-context";

export type AccountRecord = {
  id: string;
  name: string;
  type: "cash" | "bank" | "ewallet" | "credit_card" | "saving" | "investment" | "other";
  initial_balance: number;
  credit_limit?: number | null;
  current_balance: number;
  currency: string;
  color: string | null;
  is_archived: boolean;
  include_in_total: boolean;
};

export async function getAccounts() {
  const { configured, supabase, user } = await getSupabaseAuthContext();
  if (!configured) return { accounts: [] as AccountRecord[], configured: false };
  if (!supabase || !user) return { accounts: [] as AccountRecord[], configured: true };
  const query = (columns: string) => supabase.from("accounts").select(columns).eq("user_id", user.id).order("is_archived", { ascending: true }).order("created_at", { ascending: true });
  let { data, error } = await query("id,name,type,initial_balance,current_balance,credit_limit,currency,color,is_archived,include_in_total");
  if (error && ["42703", "PGRST204"].includes(error.code)) {
    ({ data, error } = await query("id,name,type,initial_balance,current_balance,currency,color,is_archived,include_in_total"));
  }
  if (error) throw new Error("Không thể tải danh sách tài khoản.");
  return { accounts: (data ?? []) as unknown as AccountRecord[], configured: true };
}
