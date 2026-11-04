import "server-only";

import { getSupabaseAuthContext } from "@/lib/supabase/auth-context";
import { huiConfigSchema, type SavedHuiCalculation } from "./saved-calculation";

export async function getSavedHuiCalculation(): Promise<{ saved: SavedHuiCalculation | null; available: boolean; notice: string | null }> {
  const { supabase, user } = await getSupabaseAuthContext();
  if (!supabase || !user) return { saved: null, available: false, notice: "Đăng nhập để lưu bản tính theo tài khoản." };
  const { data, error } = await supabase.from("hui_calculations").select("config,updated_at").eq("user_id", user.id).maybeSingle();
  if (error) return { saved: null, available: false, notice: "Chưa tải được bản tính đã lưu. Bạn vẫn có thể tính thử và tải lại trang để kết nối lại." };
  if (!data) return { saved: null, available: true, notice: null };
  const parsed = huiConfigSchema.safeParse(data.config);
  if (!parsed.success || !Number.isFinite(Date.parse(data.updated_at))) return { saved: null, available: true, notice: "Bản tính cũ không còn hợp lệ. Kiểm tra các thông số rồi lưu lại." };
  return { saved: { config: parsed.data, savedAt: data.updated_at }, available: true, notice: null };
}
