"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BarChart3, Home, MoreHorizontal, Plus, ReceiptText, X } from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = "home" | "transactions" | "reports";

const moreItems = [
  ["Tài khoản", "/app/accounts"],
  ["Ngân sách", "/app/budgets"],
  ["Mục tiêu", "/app/goals"],
  ["Thông báo", "/app/notifications"],
  ["Cá nhân", "/app/settings/profile"],
] as const;

export function BottomNav({ active }: { active?: NavItem }) {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const current = active ?? (pathname === "/app" ? "home" : pathname.startsWith("/app/transactions") ? "transactions" : pathname.startsWith("/app/reports") ? "reports" : undefined);
  const moreActive = moreItems.some(([, path]) => pathname.startsWith(path));
  const itemClass = (item: NavItem) => cn("flex min-h-11 flex-col items-center justify-center gap-1 text-[11px] font-medium", current === item ? "text-[var(--brand)]" : "text-[var(--muted)]");
  const prefetchOnIntent = (path: string) => ({
    onPointerEnter: () => router.prefetch(path),
    onFocus: () => router.prefetch(path),
    onTouchStart: () => router.prefetch(path),
  });
  useEffect(() => {
    if (!moreOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setMoreOpen(false); };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", closeOnEscape); };
  }, [moreOpen]);
  return <>
    <nav aria-label="Điều hướng chính" className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] px-3 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2 backdrop-blur-lg md:hidden"><div className="mx-auto grid max-w-[430px] grid-cols-5 items-end"><Link href="/app" prefetch={false} {...prefetchOnIntent("/app")} className={itemClass("home")}><Home size={19} strokeWidth={2.2} aria-hidden="true" /><span>Tổng quan</span></Link><Link href="/app/transactions" prefetch={false} {...prefetchOnIntent("/app/transactions")} className={itemClass("transactions")}><ReceiptText size={19} aria-hidden="true" /><span>Giao dịch</span></Link><Link href="/app/transactions/new" prefetch={false} {...prefetchOnIntent("/app/transactions/new")} aria-label="Thêm giao dịch" className="mx-auto -mt-6 flex h-14 w-14 items-center justify-center rounded-full border-4 border-[var(--background)] bg-[var(--brand)] text-white shadow-lg"><Plus size={25} aria-hidden="true" /></Link><Link href="/app/reports" prefetch={false} {...prefetchOnIntent("/app/reports")} className={itemClass("reports")}><BarChart3 size={19} aria-hidden="true" /><span>Báo cáo</span></Link><button type="button" aria-label="Mở thêm màn hình" aria-expanded={moreOpen} aria-controls="mobile-more-menu" onClick={() => setMoreOpen((open) => !open)} className={cn("flex min-h-11 flex-col items-center justify-center gap-1 text-[11px] font-medium", moreActive || moreOpen ? "text-[var(--brand)]" : "text-[var(--muted)]")}><MoreHorizontal size={19} aria-hidden="true" /><span>Khác</span></button></div></nav>
    {moreOpen && <div className="fixed inset-0 z-30 bg-black/35 md:hidden" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setMoreOpen(false); }}><section id="mobile-more-menu" role="dialog" aria-modal="true" aria-labelledby="mobile-more-title" className="absolute inset-x-0 bottom-0 rounded-t-[24px] bg-[var(--surface)] p-5 pb-[calc(env(safe-area-inset-bottom)+20px)] shadow-2xl"><div className="mb-4 flex items-center justify-between"><h2 id="mobile-more-title" className="text-lg font-bold">Các màn hình khác</h2><button type="button" aria-label="Đóng menu" onClick={() => setMoreOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-[var(--surface-muted)]"><X size={19} /></button></div><nav aria-label="Các màn hình khác" className="grid grid-cols-2 gap-2">{moreItems.map(([label, path]) => <Link key={path} href={path} prefetch={false} {...prefetchOnIntent(path)} onClick={() => setMoreOpen(false)} className={`flex min-h-12 items-center rounded-xl border px-3 text-sm font-semibold ${pathname.startsWith(path) ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand-strong)]" : "border-[var(--border)] hover:bg-[var(--surface-muted)]"}`}>{label}</Link>)}</nav></section></div>}
  </>;
}
