"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { accountEditSchema } from "@/features/accounts/schemas/account.schema";
import { getSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const updateAccountSchema = z.object({ id: z.string().uuid(), account: accountEditSchema });
const accountIdSchema = z.string().uuid();

function revalidateAccountViews() {
  revalidatePath("/app");
  revalidatePath("/app/accounts");
  revalidatePath("/app/transactions");
}

export async function updateAccountAction(id: string, input: unknown) {
  if (!getSupabaseConfig().configured) return { ok: false as const, error: "SUPABASE_NOT_CONFIGURED" };
  const parsed = updateAccountSchema.safeParse({ id, account: input });
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Dữ liệu tài khoản chưa hợp lệ." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Bạn cần đăng nhập để sửa tài khoản." };

  const { error } = await supabase.rpc("update_financial_account", {
    p_account_id: parsed.data.id,
    p_name: parsed.data.account.name,
    p_type: parsed.data.account.type,
    p_initial_balance: parsed.data.account.initialBalance,
    p_currency: parsed.data.account.currency,
    p_icon: parsed.data.account.icon ?? null,
    p_color: parsed.data.account.color ?? null,
    p_include_in_total: parsed.data.account.includeInTotal,
  });
  if (error) return { ok: false as const, error: "Không thể cập nhật tài khoản lúc này." };

  revalidateAccountViews();
  return { ok: true as const };
}

export async function archiveAccountAction(id: string) {
  if (!getSupabaseConfig().configured) return { ok: false as const, error: "SUPABASE_NOT_CONFIGURED" };
  const parsed = accountIdSchema.safeParse(id);
  if (!parsed.success) return { ok: false as const, error: "Tài khoản không hợp lệ." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Bạn cần đăng nhập để lưu trữ tài khoản." };

  const { data, error } = await supabase
    .from("accounts")
    .update({ is_archived: true })
    .eq("id", parsed.data)
    .eq("user_id", user.id)
    .eq("is_archived", false)
    .select("id")
    .maybeSingle();
  if (error || !data) return { ok: false as const, error: "Không thể lưu trữ tài khoản lúc này." };

  revalidateAccountViews();
  return { ok: true as const };
}

export async function restoreAccountAction(id: string) {
  if (!getSupabaseConfig().configured) return { ok: false as const, error: "SUPABASE_NOT_CONFIGURED" };
  const parsed = accountIdSchema.safeParse(id);
  if (!parsed.success) return { ok: false as const, error: "Tài khoản không hợp lệ." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Bạn cần đăng nhập để khôi phục tài khoản." };

  const { data, error } = await supabase
    .from("accounts")
    .update({ is_archived: false })
    .eq("id", parsed.data)
    .eq("user_id", user.id)
    .eq("is_archived", true)
    .select("id")
    .maybeSingle();
  if (error || !data) return { ok: false as const, error: "Không thể khôi phục tài khoản lúc này." };

  revalidateAccountViews();
  return { ok: true as const };
}
