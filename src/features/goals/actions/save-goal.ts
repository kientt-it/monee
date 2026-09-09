"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { savingGoalContributionSchema, savingGoalSchema } from "@/features/goals/schemas/saving-goal.schema";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/env";

const idSchema = z.string().uuid();
function dateString(value: Date) { return value.toISOString().slice(0, 10); }
function refreshGoalViews() { revalidatePath("/app"); revalidatePath("/app/goals"); }

async function authClient() { const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); return { supabase, user }; }

export async function saveGoalAction(id: string | null, input: unknown) {
  if (!getSupabaseConfig().configured) return { ok: false as const, error: "SUPABASE_NOT_CONFIGURED" };
  const parsed = savingGoalSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Dữ liệu mục tiêu chưa hợp lệ." };
  if (id && !idSchema.safeParse(id).success) return { ok: false as const, error: "Mục tiêu không hợp lệ." };
  const { supabase, user } = await authClient();
  if (!user) return { ok: false as const, error: "Bạn cần đăng nhập để lưu mục tiêu." };
  if (parsed.data.accountId) {
    const { data: account } = await supabase.from("accounts").select("id").eq("id", parsed.data.accountId).eq("user_id", user.id).eq("is_archived", false).maybeSingle();
    if (!account) return { ok: false as const, error: "Tài khoản liên kết không hợp lệ." };
  }
  const base = { name: parsed.data.name, target_amount: parsed.data.targetAmount, target_date: parsed.data.targetDate ? dateString(parsed.data.targetDate) : null, icon: parsed.data.icon ?? "🎯", color: parsed.data.color ?? "#8795c4", account_id: parsed.data.accountId ?? null };
  const query = id ? supabase.from("saving_goals").update(base).eq("id", id).eq("user_id", user.id).select("id").maybeSingle() : supabase.from("saving_goals").insert({ ...base, user_id: user.id, current_amount: parsed.data.currentAmount, status: parsed.data.currentAmount >= parsed.data.targetAmount ? "completed" : "active" }).select("id").maybeSingle();
  const { data, error } = await query;
  if (error || !data) return { ok: false as const, error: "Không thể lưu mục tiêu lúc này." };
  refreshGoalViews();
  return { ok: true as const };
}

export async function addGoalContributionAction(goalId: string, input: unknown) {
  if (!getSupabaseConfig().configured) return { ok: false as const, error: "SUPABASE_NOT_CONFIGURED" };
  if (!idSchema.safeParse(goalId).success) return { ok: false as const, error: "Mục tiêu không hợp lệ." };
  const parsed = savingGoalContributionSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Khoản đóng góp chưa hợp lệ." };
  const { supabase, user } = await authClient();
  if (!user) return { ok: false as const, error: "Bạn cần đăng nhập để thêm đóng góp." };
  const { error } = await supabase.rpc("add_saving_goal_contribution", { p_goal_id: goalId, p_amount: parsed.data.amount, p_contribution_date: dateString(parsed.data.contributionDate), p_note: parsed.data.note ?? null });
  if (error) return { ok: false as const, error: "Không thể ghi nhận khoản đóng góp lúc này." };
  refreshGoalViews();
  return { ok: true as const };
}

export async function setGoalStatusAction(id: string, status: "active" | "paused") {
  if (!getSupabaseConfig().configured) return { ok: false as const, error: "SUPABASE_NOT_CONFIGURED" };
  if (!idSchema.safeParse(id).success) return { ok: false as const, error: "Mục tiêu không hợp lệ." };
  const { supabase, user } = await authClient();
  if (!user) return { ok: false as const, error: "Bạn cần đăng nhập để cập nhật mục tiêu." };
  const { data, error } = await supabase.from("saving_goals").update({ status }).eq("id", id).eq("user_id", user.id).in("status", ["active", "paused"]).select("id").maybeSingle();
  if (error || !data) return { ok: false as const, error: "Không thể cập nhật mục tiêu lúc này." };
  refreshGoalViews();
  return { ok: true as const };
}
