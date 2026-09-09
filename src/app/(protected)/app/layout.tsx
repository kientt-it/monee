import { ProfileThemeSync } from "@/features/profile/components/profile-theme-sync";
import { getCurrentProfile } from "@/features/profile/queries/get-current-profile";

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { profile } = await getCurrentProfile();
  return <ProfileThemeSync theme={profile.theme}>{children}</ProfileThemeSync>;
}
