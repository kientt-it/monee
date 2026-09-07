"use server";

import { revalidatePath } from "next/cache";
import { transactionSchema } from "@/features/transactions/schemas/transaction.schema";
import { createClient } from "@/lib/supabase/server";

export async function createTransactionAction(input: unknown) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return { ok: false as const, error: "SUPABASE_NOT_CONFIGURED" };
  const parsed = transactionSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Dữ liệu giao dịch chưa hợp lệ." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Bạn cần đăng nhập để lưu giao dịch." };
  const { error } = await supabase.rpc("create_financial_transaction", { p_type: parsed.data.type, p_amount: parsed.data.amount, p_account_id: parsed.data.accountId, p_destination_account_id: parsed.data.destinationAccountId ?? null, p_category_id: parsed.data.categoryId ?? null, p_merchant: parsed.data.merchant ?? null, p_note: parsed.data.note ?? null, p_transaction_date: parsed.data.transactionDate.toISOString(), p_idempotency_key: crypto.randomUUID() });
  if (error) {
    const message = error.message.includes("INVALID_TRANSFER_ACCOUNT") ? "Tài khoản nguồn và đích phải khác nhau." : error.message.includes("INVALID_ACCOUNT") ? "Tài khoản không hợp lệ." : error.message.includes("INVALID_CATEGORY") ? "Danh mục không hợp lệ." : "Không thể lưu giao dịch lúc này.";
    return { ok: false as const, error: message };
  }
  revalidatePath("/app/transactions"); revalidatePath("/app");
  return { ok: true as const };
}
