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
  const { error } = await supabase.rpc("create_financial_account", { p_name: parsed.data.name, p_type: parsed.data.type, p_initial_balance: parsed.data.initialBalance, p_currency: parsed.data.currency, p_icon: parsed.data.icon ?? null, p_color: parsed.data.color ?? null, p_include_in_total: parsed.data.includeInTotal });
  if (error) return { ok: false as const, error: "Không thể tạo tài khoản lúc này." };
  revalidatePath("/app/accounts");
  revalidatePath("/app");
  return { ok: true as const };
}
