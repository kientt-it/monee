import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Card } from "@/components/ui/card";
import { ProfileForm } from "@/features/profile/components/profile-form";
import { SignOutButton } from "@/features/profile/components/sign-out-button";
import { getCurrentProfile } from "@/features/profile/queries/get-current-profile";

export default async function ProfilePage() {
  const { profile, email } = await getCurrentProfile();

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 pb-28 pt-5 sm:px-6 md:px-10 md:pb-12 md:pt-8">
      <div className="mx-auto max-w-2xl">
        <header>
          <Link href="/app" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--muted)] hover:text-[var(--foreground)]"><ArrowLeft size={18} />Tổng quan</Link>
          <h1 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">Hồ sơ cá nhân</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">Quản lý cách Monee hiển thị thông tin của bạn.</p>
        </header>
        <Card className="mt-6 p-5 shadow-[var(--shadow)] sm:p-7"><ProfileForm profile={profile} email={email} /></Card>
        <div className="mt-4"><SignOutButton /></div>
      </div>
      <BottomNav active="profile" />
    </main>
  );
}
