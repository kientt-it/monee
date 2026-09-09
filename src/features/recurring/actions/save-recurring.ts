"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { recurringSchema } from "@/features/recurring/schemas/recurring.schema";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/env";

const idSchema = z.string().uuid();
function dateString(value: Date) { return value.toISOString().slice(0, 10); }
function refresh() { revalidatePath("/app"); revalidatePath("/app/recurring"); }
async function authClient() { const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); return { supabase, user }; }

export async function saveRecurringAction(id: string | null, input: unknown) {
  if (!getSupabaseConfig().configured) return { ok: false as const, error: "SUPABASE_NOT_CONFIGURED" };
  const parsed = recurringSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Dữ liệu định kỳ chưa hợp lệ." };
  if (id && !idSchema.safeParse(id).success) return { ok: false as const, error: "Lịch định kỳ không hợp lệ." };
  const { supabase, user } = await authClient();
  if (!user) return { ok: false as const, error: "Bạn cần đăng nhập để lưu lịch định kỳ." };
  const accountIds = [parsed.data.accountId, parsed.data.destinationAccountId].filter(Boolean) as string[];
  const { data: ownedAccounts } = await supabase.from("accounts").select("id").eq("user_id", user.id).eq("is_archived", false).in("id", accountIds);
  if ((ownedAccounts ?? []).length !== accountIds.length) return { ok: false as const, error: "Tài khoản trong lịch định kỳ không hợp lệ." };
  if (parsed.data.categoryId) {
    const { data: category } = await supabase.from("categories").select("id").eq("id", parsed.data.categoryId).eq("type", parsed.data.type === "income" ? "income" : "expense").eq("is_archived", false).or(`user_id.is.null,user_id.eq.${user.id}`).maybeSingle();
    if (!category) return { ok: false as const, error: "Danh mục trong lịch định kỳ không hợp lệ." };
  }
  const payload = { type: parsed.data.type, amount: parsed.data.amount, account_id: parsed.data.accountId, destination_account_id: parsed.data.destinationAccountId ?? null, category_id: parsed.data.type === "transfer" ? null : parsed.data.categoryId ?? null, merchant: parsed.data.merchant ?? null, note: parsed.data.note ?? null, frequency: parsed.data.frequency, interval: parsed.data.interval, start_date: dateString(parsed.data.startDate), next_run_date: dateString(parsed.data.nextRunDate), end_date: parsed.data.endDate ? dateString(parsed.data.endDate) : null };
  const query = id ? supabase.from("recurring_transactions").update(payload).eq("id", id).eq("user_id", user.id).select("id").maybeSingle() : supabase.from("recurring_transactions").insert({ ...payload, user_id: user.id, is_active: true }).select("id").maybeSingle();
  const { data, error } = await query;
  if (error || !data) return { ok: false as const, error: "Không thể lưu lịch định kỳ lúc này." };
  refresh();
  return { ok: true as const };
}

export async function setRecurringActiveAction(id: string, isActive: boolean) {
  if (!getSupabaseConfig().configured) return { ok: false as const, error: "SUPABASE_NOT_CONFIGURED" };
  if (!idSchema.safeParse(id).success) return { ok: false as const, error: "Lịch định kỳ không hợp lệ." };
  const { supabase, user } = await authClient();
  if (!user) return { ok: false as const, error: "Bạn cần đăng nhập để cập nhật lịch định kỳ." };
  const { data, error } = await supabase.from("recurring_transactions").update({ is_active: isActive }).eq("id", id).eq("user_id", user.id).select("id").maybeSingle();
  if (error || !data) return { ok: false as const, error: "Không thể cập nhật lịch định kỳ." };
  refresh();
  return { ok: true as const };
}
