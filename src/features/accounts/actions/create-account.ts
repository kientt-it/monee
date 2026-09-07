"use server";

import { revalidatePath } from "next/cache";
import { accountSchema } from "@/features/accounts/schemas/account.schema";
import { createClient } from "@/lib/supabase/server";

export async function createAccountAction(input: unknown) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return { ok: false as const, error: "SUPABASE_NOT_CONFIGURED" };
  const parsed = accountSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Dữ liệu tài khoản chưa hợp lệ." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Bạn cần đăng nhập để thêm tài khoản." };
  const { error } = await supabase.from("accounts").insert({ user_id: user.id, name: parsed.data.name, type: parsed.data.type, initial_balance: parsed.data.initialBalance, current_balance: parsed.data.initialBalance, currency: parsed.data.currency, icon: parsed.data.icon ?? null, color: parsed.data.color ?? null, include_in_total: parsed.data.includeInTotal });
  if (error) return { ok: false as const, error: "Không thể tạo tài khoản lúc này." };
  revalidatePath("/app/accounts");
  revalidatePath("/app");
  return { ok: true as const };
}
