"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAuthContext } from "@/lib/supabase/auth-context";
import { huiConfigSchema } from "./saved-calculation";

export async function saveHuiCalculation(input: unknown) {
  const parsed = huiConfigSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Kiểm tra các thông số và tiền đã góp trước khi lưu." };
  const { supabase, user } = await getSupabaseAuthContext();
  if (!supabase || !user) return { ok: false as const, error: "Bạn cần đăng nhập để lưu bản tính." };
  const { data, error } = await supabase.from("hui_calculations")
    .upsert({ user_id: user.id, config: parsed.data }, { onConflict: "user_id" })
    .select("updated_at").single();
  if (error || !data) return { ok: false as const, error: "Chưa lưu được bản tính. Vui lòng thử lại sau." };
  revalidatePath("/app/hui");
  return { ok: true as const, savedAt: data.updated_at as string };
}
