"use server";

import { revalidatePath } from "next/cache";
import { accountSchema } from "@/features/accounts/schemas/account.schema";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/env";

export async function createAccountAction(input: unknown) {
  if (!getSupabaseConfig().configured) return { ok: false as const, error: "SUPABASE_NOT_CONFIGURED" };
  const parsed = accountSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Dữ liệu tài khoản chưa hợp lệ." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Bạn cần đăng nhập để thêm tài khoản." };
  const { error } = await supabase.rpc("create_financial_account_v2", { p_name: parsed.data.name, p_type: parsed.data.type, p_initial_balance: parsed.data.initialBalance, p_credit_limit: parsed.data.type === "credit_card" ? parsed.data.creditLimit : null, p_available_credit: parsed.data.type === "credit_card" ? parsed.data.availableCredit : null, p_currency: parsed.data.currency, p_icon: parsed.data.icon ?? null, p_color: parsed.data.color ?? null, p_include_in_total: parsed.data.includeInTotal });
  if (error) return { ok: false as const, error: error.message.includes("INVALID_CREDIT_CARD_LIMIT") ? "Hạn mức hoặc khả dụng của thẻ không hợp lệ." : "Không thể tạo tài khoản lúc này." };
  revalidatePath("/app/accounts");
  revalidatePath("/app/payables");
  revalidatePath("/app");
  return { ok: true as const };
}
