"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PiggyBank, Sparkles } from "lucide-react";

const items = [
  ["Tổng quan", "/app"],
  ["Tài khoản", "/app/accounts"],
  ["Giao dịch", "/app/transactions"],
  ["Ngân sách", "/app/budgets"],
  ["Mục tiêu", "/app/goals"],
  ["Báo cáo", "/app/reports"],
  ["Định kỳ", "/app/recurring"],
  ["Thông báo", "/app/notifications"],
  ["Cá nhân", "/app/settings/profile"],
] as const;

export function AppNavigation() {
  const pathname = usePathname();
  const isActive = (path: string) => path === "/app" ? pathname === path : pathname.startsWith(path);

  return <aside className="hidden min-h-screen border-r border-[var(--border)] bg-[var(--surface)] p-7 md:block">
    <div className="mb-12 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[var(--brand)] text-white"><PiggyBank size={21} /></div><span className="text-xl font-bold tracking-tight">monee</span></div>
    <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-[.16em] text-[var(--muted)]">Không gian của bạn</p>
    <nav className="space-y-1" aria-label="Điều hướng desktop">
      {items.map(([label, path]) => <Link key={path} href={path} prefetch={false} className={`flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold ${isActive(path) ? "bg-[var(--brand-soft)] text-[var(--brand-strong)]" : "text-[var(--muted)] hover:bg-[var(--surface-muted)]"}`}>{label}</Link>)}
    </nav>
    <div className="pt-14"><div className="rounded-2xl bg-[var(--surface-muted)] p-4"><Sparkles size={19} className="mb-3 text-[var(--brand)]" /><p className="text-sm font-semibold">Monee đang cùng bạn</p><p className="mt-1 text-xs leading-5 text-[var(--muted)]">Ghi lại từng khoản nhỏ để hiểu hơn về thói quen của mình.</p></div></div>
  </aside>;
}
