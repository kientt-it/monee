"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSupabaseAuthContext } from "@/lib/supabase/auth-context";

const repaymentSchema = z.object({
  cardId: z.string().uuid(),
  sourceAccountId: z.string().uuid(),
  amount: z.number().int().positive().max(1_000_000_000_000),
  idempotencyKey: z.string().uuid(),
}).refine((value) => value.cardId !== value.sourceAccountId);

export async function payCreditCardAction(input: unknown) {
  const parsed = repaymentSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Khoản hoàn trả chưa hợp lệ." };
  const { supabase, user } = await getSupabaseAuthContext();
  if (!supabase || !user) return { ok: false as const, error: "Bạn cần đăng nhập để hoàn trả thẻ tín dụng." };
  const { error } = await supabase.rpc("pay_credit_card", {
    p_card_id: parsed.data.cardId,
    p_source_account_id: parsed.data.sourceAccountId,
    p_amount: parsed.data.amount,
    p_idempotency_key: parsed.data.idempotencyKey,
  });
  if (error) {
    if (error.message.includes("REPAYMENT_EXCEEDS_DUE")) return { ok: false as const, error: "Số tiền trả vượt quá khoản còn phải trả." };
    if (error.message.includes("INVALID_REPAYMENT_ACCOUNT")) return { ok: false as const, error: "Tài khoản nguồn hoặc thẻ tín dụng không hợp lệ." };
    return { ok: false as const, error: "Chưa ghi nhận được khoản hoàn trả. Vui lòng thử lại." };
  }
  revalidatePath("/app/payables");
  revalidatePath("/app/accounts");
  revalidatePath("/app/transactions");
  revalidatePath("/app");
  return { ok: true as const };
}
