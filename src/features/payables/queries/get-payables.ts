import { cache } from "react";
import { getSupabaseAuthContext } from "@/lib/supabase/auth-context";
import type { PayableRecord } from "../types";

type PayableRow = { id: string; title: string; amount: number | string; due_date: string | null; note: string; paid_on: string | null; kind?: "manual" | "credit_card_repayment"; credit_account_id?: string | null };

export const getPayables = cache(async () => {
  const { configured, supabase, user } = await getSupabaseAuthContext();
  if (!configured || !supabase || !user) return { payables: [] as PayableRecord[], available: false };
  const query = (columns: string) => supabase.from("payables")
    .select(columns).eq("user_id", user.id)
    .order("due_date", { ascending: true })
    .order("created_at", { ascending: false });
  let { data, error } = await query("id,title,amount,due_date,note,paid_on,kind,credit_account_id");
  if (error && ["42703", "PGRST204"].includes(error.code)) {
    ({ data, error } = await query("id,title,amount,due_date,note,paid_on"));
  }
  // Keep the rest of the app usable while the new migration is being applied.
  if (error && ["42P01", "PGRST205"].includes(error.code)) return { payables: [] as PayableRecord[], available: false };
  if (error) throw new Error("Không thể tải khoản cần trả. Vui lòng thử lại.");
  const payables: PayableRecord[] = ((data ?? []) as unknown as PayableRow[]).map((row) => {
    const amount = Number(row.amount);
    if (!Number.isSafeInteger(amount) || amount < 0) throw new Error("Số tiền khoản cần trả không hợp lệ.");
    if (row.kind === "credit_card_repayment" && row.credit_account_id && row.due_date === null) {
      return { id: row.id, title: row.title, amount, dueDate: null, note: row.note, paidOn: null, kind: "credit_card_repayment", creditAccountId: row.credit_account_id };
    }
    if (!row.due_date || amount === 0) throw new Error("Khoản cần trả không hợp lệ.");
    return { id: row.id, title: row.title, amount, dueDate: row.due_date, note: row.note, paidOn: row.paid_on, kind: "manual", creditAccountId: null };
  });
  return { payables, available: true };
});
