import { createClient } from "@/lib/supabase/server";

export type AccountRecord = {
  id: string;
  name: string;
  type: "cash" | "bank" | "ewallet" | "credit_card" | "saving" | "investment" | "other";
  current_balance: number;
  currency: string;
  color: string | null;
  is_archived: boolean;
  include_in_total: boolean;
};

export async function getAccounts() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return { accounts: [] as AccountRecord[], configured: false };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { accounts: [] as AccountRecord[], configured: true };
  const { data, error } = await supabase.from("accounts").select("id,name,type,current_balance,currency,color,is_archived,include_in_total").eq("user_id", user.id).eq("is_archived", false).order("created_at", { ascending: true });
  if (error) throw new Error("Không thể tải danh sách tài khoản.");
  return { accounts: (data ?? []) as AccountRecord[], configured: true };
}
