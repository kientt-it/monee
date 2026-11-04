"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PiggyBank } from "lucide-react";

const items = [
  ["Tổng quan", "/app"],
  ["Khoản trả", "/app/payables"],
  ["Ví & thẻ", "/app/accounts"],
  ["Giao dịch", "/app/transactions"],
  ["Mục tiêu", "/app/goals"],
  ["Báo cáo", "/app/reports"],
  ["Công cụ", "/app/tools"],
  ["Thông báo", "/app/notifications"],
  ["Cá nhân", "/app/settings/profile"],
] as const;

export function AppNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const isActive = (path: string) => path === "/app" ? pathname === path : pathname.startsWith(path) || (path === "/app/tools" && pathname.startsWith("/app/hui"));
  const prefetchOnIntent = (path: string) => ({
    onPointerEnter: () => router.prefetch(path),
    onFocus: () => router.prefetch(path),
    onTouchStart: () => router.prefetch(path),
  });

  return <aside className="hidden border-r border-[var(--border)] bg-[var(--surface)] p-7 md:sticky md:top-0 md:block md:h-dvh md:self-start md:overflow-y-auto md:overscroll-contain">
    <div className="mb-12 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[var(--brand)] text-white"><PiggyBank size={21} /></div><span className="text-xl font-bold tracking-tight">monee</span></div>
    <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-[.16em] text-[var(--muted)]">Không gian của bạn</p>
    <nav className="space-y-1" aria-label="Điều hướng desktop">
      {items.map(([label, path]) => <Link key={path} href={path} prefetch={false} {...prefetchOnIntent(path)} className={`flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold ${isActive(path) ? "bg-[var(--brand-soft)] text-[var(--brand-strong)]" : "text-[var(--muted)] hover:bg-[var(--surface-muted)]"}`}>{label}</Link>)}
    </nav>
  </aside>;
}
