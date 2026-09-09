import { redirect } from "next/navigation";
import { PiggyBank } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ProfileForm } from "@/features/profile/components/profile-form";
import { getCurrentProfile } from "@/features/profile/queries/get-current-profile";

export default async function OnboardingPage() {
  const { profile, email } = await getCurrentProfile();
  if (profile.onboardingCompleted) redirect("/app");

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-8">
      <div className="w-full max-w-xl">
        <div className="mb-6 flex items-center justify-center gap-2 text-xl font-bold tracking-tight"><span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[var(--brand)] text-white"><PiggyBank size={21} /></span>monee</div>
        <Card className="p-6 shadow-[var(--shadow)] sm:p-8">
          <div className="mb-7">
            <span className="rounded-full bg-[var(--brand-soft)] px-3 py-1 text-xs font-semibold text-[var(--brand-strong)]">Thiết lập ban đầu</span>
            <h1 className="mt-4 text-2xl font-bold tracking-tight">Cá nhân hóa không gian tài chính</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Chọn cách Monee gọi bạn và thiết lập hiển thị phù hợp. Bạn có thể đổi lại bất cứ lúc nào.</p>
          </div>
          <ProfileForm profile={profile} email={email} mode="onboarding" />
        </Card>
      </div>
    </main>
  );
}
