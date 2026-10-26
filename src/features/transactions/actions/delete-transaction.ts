"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { mapTransactionError } from "@/features/transactions/services/map-transaction-error";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/env";

const idSchema = z.string().uuid();
const idsSchema = z.array(idSchema).min(1).max(50).refine((ids) => new Set(ids).size === ids.length);

async function runTransactionRpc(functionName: "soft_delete_financial_transaction" | "restore_financial_transaction", id: string) {
  if (!getSupabaseConfig().configured) return { ok: false as const, error: "SUPABASE_NOT_CONFIGURED" };
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { ok: false as const, error: "Giao dịch không hợp lệ." };
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Bạn cần đăng nhập để cập nhật giao dịch." };
  const { error } = await supabase.rpc(functionName, { p_transaction_id: parsed.data });
  if (error) return { ok: false as const, error: mapTransactionError(error.message) };
  revalidatePath("/app/transactions"); revalidatePath("/app/payables"); revalidatePath("/app");
  return { ok: true as const };
}

export async function deleteTransactionAction(id: string) { return runTransactionRpc("soft_delete_financial_transaction", id); }
export async function restoreTransactionAction(id: string) { return runTransactionRpc("restore_financial_transaction", id); }

export async function deleteTransactionsAction(ids: string[]) {
  if (!getSupabaseConfig().configured) return { ok: false as const, error: "SUPABASE_NOT_CONFIGURED" };
  const parsed = idsSchema.safeParse(ids);
  if (!parsed.success) return { ok: false as const, error: "Danh sách giao dịch không hợp lệ." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Bạn cần đăng nhập để xóa giao dịch." };
  const { data, error } = await supabase.rpc("soft_delete_financial_transactions", { p_ids: parsed.data });
  if (error) return { ok: false as const, error: mapTransactionError(error.message) };
  revalidatePath("/app/transactions");
  revalidatePath("/app/payables");
  revalidatePath("/app");
  return { ok: true as const, count: data as number };
}
