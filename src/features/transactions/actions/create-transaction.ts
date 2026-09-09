"use server";

import { revalidatePath } from "next/cache";
import { transactionSchema } from "@/features/transactions/schemas/transaction.schema";
import { mapTransactionError } from "@/features/transactions/services/map-transaction-error";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/env";

export async function createTransactionAction(input: unknown) {
  if (!getSupabaseConfig().configured) return { ok: false as const, error: "SUPABASE_NOT_CONFIGURED" };
  const parsed = transactionSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Dữ liệu giao dịch chưa hợp lệ." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Bạn cần đăng nhập để lưu giao dịch." };
  const { error } = await supabase.rpc("create_financial_transaction", { p_type: parsed.data.type, p_amount: parsed.data.amount, p_account_id: parsed.data.accountId, p_destination_account_id: parsed.data.destinationAccountId ?? null, p_category_id: parsed.data.categoryId ?? null, p_merchant: parsed.data.merchant ?? null, p_note: parsed.data.note ?? null, p_transaction_date: parsed.data.transactionDate.toISOString(), p_idempotency_key: crypto.randomUUID() });
  if (error) return { ok: false as const, error: mapTransactionError(error.message) };
  revalidatePath("/app/transactions"); revalidatePath("/app");
  return { ok: true as const };
}
