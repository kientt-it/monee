import { cache } from "react";
import { redirect } from "next/navigation";
import { getSupabaseAuthContext } from "@/lib/supabase/auth-context";

export type ProfileRecord = {
  fullName: string;
  currency: "VND";
  locale: "vi";
  timezone: "Asia/Ho_Chi_Minh";
  theme: "light" | "dark" | "system";
  onboardingCompleted: boolean;
};

const defaultProfile: ProfileRecord = {
  fullName: "",
  currency: "VND",
  locale: "vi",
  timezone: "Asia/Ho_Chi_Minh",
  theme: "system",
  onboardingCompleted: false,
};

export const getCurrentProfile = cache(async () => {
  const { configured, supabase, user } = await getSupabaseAuthContext();
  if (!configured) {
    return { profile: defaultProfile, email: null, configured: false };
  }
  if (!supabase || !user) redirect("/login");

  const { data, error } = await supabase
    .from("profiles")
    .select("full_name,currency,locale,timezone,theme,onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw new Error("Không thể tải hồ sơ cá nhân.");

  const profile: ProfileRecord = data
    ? {
        fullName: data.full_name ?? "",
        currency: "VND",
        locale: "vi",
        timezone: "Asia/Ho_Chi_Minh",
        theme: data.theme === "light" || data.theme === "dark" ? data.theme : "system",
        onboardingCompleted: data.onboarding_completed,
      }
    : {
        ...defaultProfile,
        fullName: typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name : "",
      };

  return { profile, email: user.email ?? null, configured: true };
});
