"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { mapTransactionError } from "@/features/transactions/services/map-transaction-error";
import { createClient } from "@/lib/supabase/server";

const idSchema = z.string().uuid();

async function runTransactionRpc(functionName: "soft_delete_financial_transaction" | "restore_financial_transaction", id: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return { ok: false as const, error: "SUPABASE_NOT_CONFIGURED" };
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { ok: false as const, error: "Giao dịch không hợp lệ." };
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Bạn cần đăng nhập để cập nhật giao dịch." };
  const { error } = await supabase.rpc(functionName, { p_transaction_id: parsed.data });
  if (error) return { ok: false as const, error: mapTransactionError(error.message) };
  revalidatePath("/app/transactions"); revalidatePath("/app");
  return { ok: true as const };
}

export async function deleteTransactionAction(id: string) { return runTransactionRpc("soft_delete_financial_transaction", id); }
export async function restoreTransactionAction(id: string) { return runTransactionRpc("restore_financial_transaction", id); }
