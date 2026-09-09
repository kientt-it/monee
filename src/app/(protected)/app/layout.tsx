import { ProfileThemeSync } from "@/features/profile/components/profile-theme-sync";
import { getCurrentProfile } from "@/features/profile/queries/get-current-profile";
import { AppNavigation } from "@/components/layout/app-navigation";
import { BottomNav } from "@/components/layout/bottom-nav";

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { profile } = await getCurrentProfile();
  return <ProfileThemeSync theme={profile.theme}><div className="app-shell bg-[var(--background)]"><div className="desktop-grid mx-auto grid max-w-[1440px]"><AppNavigation /><div className="min-w-0">{children}</div></div><BottomNav /></div></ProfileThemeSync>;
}
