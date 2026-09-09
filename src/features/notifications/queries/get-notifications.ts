import { getSupabaseAuthContext } from "@/lib/supabase/auth-context";

export type NotificationRecord = { id: string; type: "budget_warning" | "budget_exceeded" | "recurring_transaction" | "saving_goal" | "system"; title: string; message: string; is_read: boolean; created_at: string };

export async function getNotifications() {
  const { configured, supabase, user } = await getSupabaseAuthContext();
  if (!configured) return { notifications: [] as NotificationRecord[], configured: false };
  if (!supabase || !user) return { notifications: [] as NotificationRecord[], configured: true };
  const { data, error } = await supabase.from("notifications").select("id,type,title,message,is_read,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
  if (error) throw new Error("Không thể tải thông báo.");
  return { notifications: (data ?? []) as NotificationRecord[], configured: true };
}
