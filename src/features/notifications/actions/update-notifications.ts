"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/env";

const idSchema = z.string().uuid();
export async function markNotificationReadAction(id: string | null) {
  if (!getSupabaseConfig().configured) return { ok: false as const, error: "SUPABASE_NOT_CONFIGURED" };
  if (id && !idSchema.safeParse(id).success) return { ok: false as const, error: "Thông báo không hợp lệ." };
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Bạn cần đăng nhập để cập nhật thông báo." };
  const query = id ? supabase.from("notifications").update({ is_read: true }).eq("id", id).eq("user_id", user.id) : supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
  const { error } = await query;
  if (error) return { ok: false as const, error: "Không thể cập nhật thông báo." };
  revalidatePath("/app"); revalidatePath("/app/notifications");
  return { ok: true as const };
}
