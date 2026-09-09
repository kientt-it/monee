import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/env";

export type NotificationRecord = { id: string; type: "budget_warning" | "budget_exceeded" | "recurring_transaction" | "saving_goal" | "system"; title: string; message: string; is_read: boolean; created_at: string };

export async function getNotifications() {
  if (!getSupabaseConfig().configured) return { notifications: [] as NotificationRecord[], configured: false };
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { notifications: [] as NotificationRecord[], configured: true };
  const { data, error } = await supabase.from("notifications").select("id,type,title,message,is_read,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
  if (error) throw new Error("Không thể tải thông báo.");
  return { notifications: (data ?? []) as NotificationRecord[], configured: true };
}
