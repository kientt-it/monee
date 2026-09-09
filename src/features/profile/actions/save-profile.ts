"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { profileSchema } from "@/features/profile/schemas/profile.schema";

export async function saveProfileAction(input: unknown) {
  if (!getSupabaseConfig().configured) return { ok: false as const, error: "SUPABASE_NOT_CONFIGURED" };
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Hồ sơ chưa hợp lệ." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Bạn cần đăng nhập để lưu hồ sơ." };

  const { data: currentProfile, error: profileError } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) return { ok: false as const, error: "Không thể kiểm tra hồ sơ hiện tại." };

  const onboardingCompleted = Boolean(currentProfile?.onboarding_completed || parsed.data.completeOnboarding);
  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    full_name: parsed.data.fullName,
    currency: parsed.data.currency,
    locale: parsed.data.locale,
    timezone: parsed.data.timezone,
    theme: parsed.data.theme,
    onboarding_completed: onboardingCompleted,
  });
  if (error) return { ok: false as const, error: "Không thể lưu hồ sơ lúc này." };

  const { count } = await supabase
    .from("accounts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_archived", false);

  revalidatePath("/app");
  revalidatePath("/app/settings/profile");
  return {
    ok: true as const,
    nextPath: parsed.data.completeOnboarding && (count ?? 0) === 0 ? "/app/accounts" : "/app",
  };
}
