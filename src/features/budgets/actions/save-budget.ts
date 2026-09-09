"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { budgetSchema } from "@/features/budgets/schemas/budget.schema";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/env";

const idSchema = z.string().uuid();

function asDateString(value: Date) {
  return value.toISOString().slice(0, 10);
}

function refreshBudgetViews() {
  revalidatePath("/app");
  revalidatePath("/app/budgets");
}

async function getAuthenticatedClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

async function validateCategory(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, categoryId: string | null | undefined) {
  if (!categoryId) return true;
  const { data, error } = await supabase.from("categories").select("id").eq("id", categoryId).eq("type", "expense").eq("is_archived", false).or(`user_id.is.null,user_id.eq.${userId}`).maybeSingle();
  return !error && Boolean(data);
}

export async function saveBudgetAction(id: string | null, input: unknown) {
  if (!getSupabaseConfig().configured) return { ok: false as const, error: "SUPABASE_NOT_CONFIGURED" };
  const parsed = budgetSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Dữ liệu ngân sách chưa hợp lệ." };
  if (parsed.data.endDate && parsed.data.endDate < parsed.data.startDate) return { ok: false as const, error: "Ngày kết thúc phải sau ngày bắt đầu." };
  if (id && !idSchema.safeParse(id).success) return { ok: false as const, error: "Ngân sách không hợp lệ." };

  const { supabase, user } = await getAuthenticatedClient();
  if (!user) return { ok: false as const, error: "Bạn cần đăng nhập để lưu ngân sách." };
  if (!(await validateCategory(supabase, user.id, parsed.data.categoryId))) return { ok: false as const, error: "Danh mục chi tiêu không hợp lệ." };

  const payload = {
    name: parsed.data.name,
    category_id: parsed.data.categoryId ?? null,
    amount: parsed.data.amount,
    period: parsed.data.period,
    start_date: asDateString(parsed.data.startDate),
    end_date: parsed.data.endDate ? asDateString(parsed.data.endDate) : null,
    alert_threshold: parsed.data.alertThreshold,
  };
  const query = id
    ? supabase.from("budgets").update(payload).eq("id", id).eq("user_id", user.id).select("id").maybeSingle()
    : supabase.from("budgets").insert({ ...payload, user_id: user.id, is_active: true }).select("id").maybeSingle();
  const { data, error } = await query;
  if (error || !data) return { ok: false as const, error: "Không thể lưu ngân sách lúc này." };
  refreshBudgetViews();
  return { ok: true as const };
}

export async function setBudgetActiveAction(id: string, isActive: boolean) {
  if (!getSupabaseConfig().configured) return { ok: false as const, error: "SUPABASE_NOT_CONFIGURED" };
  if (!idSchema.safeParse(id).success) return { ok: false as const, error: "Ngân sách không hợp lệ." };
  const { supabase, user } = await getAuthenticatedClient();
  if (!user) return { ok: false as const, error: "Bạn cần đăng nhập để cập nhật ngân sách." };
  const { data, error } = await supabase.from("budgets").update({ is_active: isActive }).eq("id", id).eq("user_id", user.id).select("id").maybeSingle();
  if (error || !data) return { ok: false as const, error: "Không thể cập nhật trạng thái ngân sách." };
  refreshBudgetViews();
  return { ok: true as const };
}
