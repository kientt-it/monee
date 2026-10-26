import { cache } from "react";
import { getSupabaseAuthContext } from "@/lib/supabase/auth-context";
import type { PayableRecord } from "../types";

type PayableRow = { id: string; title: string; amount: number | string; due_date: string; note: string; paid_on: string | null };

export const getPayables = cache(async () => {
  const { configured, supabase, user } = await getSupabaseAuthContext();
  if (!configured || !supabase || !user) return { payables: [] as PayableRecord[], available: false };
  const { data, error } = await supabase.from("payables")
    .select("id,title,amount,due_date,note,paid_on")
    .eq("user_id", user.id)
    .order("due_date", { ascending: true })
    .order("created_at", { ascending: false });
  // Keep the rest of the app usable while the new migration is being applied.
  if (error && ["42P01", "PGRST205"].includes(error.code)) return { payables: [] as PayableRecord[], available: false };
  if (error) throw new Error("Không thể tải khoản cần trả. Vui lòng thử lại.");
  const payables: PayableRecord[] = ((data ?? []) as PayableRow[]).map((row) => {
    const amount = Number(row.amount);
    if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error("Số tiền khoản cần trả không hợp lệ.");
    return { id: row.id, title: row.title, amount, dueDate: row.due_date, note: row.note, paidOn: row.paid_on };
  });
  return { payables, available: true };
});
