"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { transactionSchema } from "@/features/transactions/schemas/transaction.schema";
import { mapTransactionError } from "@/features/transactions/services/map-transaction-error";
import { createClient } from "@/lib/supabase/server";

const updateSchema = z.object({ id: z.string().uuid(), transaction: transactionSchema });

export async function updateTransactionAction(id: string, input: unknown) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return { ok: false as const, error: "SUPABASE_NOT_CONFIGURED" };
  const parsed = updateSchema.safeParse({ id, transaction: input });
  if (!parsed.success) return { ok: false as const, error: "Dữ liệu giao dịch chưa hợp lệ." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Bạn cần đăng nhập để sửa giao dịch." };
  const transaction = parsed.data.transaction;
  const { error } = await supabase.rpc("update_financial_transaction", { p_transaction_id: parsed.data.id, p_type: transaction.type, p_amount: transaction.amount, p_account_id: transaction.accountId, p_destination_account_id: transaction.destinationAccountId ?? null, p_category_id: transaction.categoryId ?? null, p_merchant: transaction.merchant ?? null, p_note: transaction.note ?? null, p_transaction_date: transaction.transactionDate.toISOString() });
  if (error) return { ok: false as const, error: mapTransactionError(error.message) };
  revalidatePath(`/app/transactions/${parsed.data.id}`); revalidatePath("/app/transactions"); revalidatePath("/app");
  return { ok: true as const };
}
