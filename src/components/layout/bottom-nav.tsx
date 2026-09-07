"use client";

import Link from "next/link";
import { BarChart3, Home, Plus, ReceiptText, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav({ preview = false }: { preview?: boolean }) {
  const href = (path: string) => (preview ? "#" : path);
  return <nav aria-label="Điều hướng chính" className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] px-3 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2 backdrop-blur-lg md:hidden"><div className="mx-auto grid max-w-[430px] grid-cols-5 items-end"><Link href={href("/app")} className="flex min-h-11 flex-col items-center justify-center gap-1 text-[11px] font-medium text-[var(--brand)]"><Home size={19} strokeWidth={2.2} aria-hidden="true" /><span>Tổng quan</span></Link><Link href={href("/app/transactions")} className="flex min-h-11 flex-col items-center justify-center gap-1 text-[11px] font-medium text-[var(--muted)]"><ReceiptText size={19} aria-hidden="true" /><span>Giao dịch</span></Link><Link href={href("/app/transactions/new")} aria-label="Thêm giao dịch" className="mx-auto -mt-6 flex h-14 w-14 items-center justify-center rounded-full border-4 border-[var(--background)] bg-[var(--brand)] text-white shadow-lg"><Plus size={25} aria-hidden="true" /></Link><Link href={href("/app/reports")} className="flex min-h-11 flex-col items-center justify-center gap-1 text-[11px] font-medium text-[var(--muted)]"><BarChart3 size={19} aria-hidden="true" /><span>Báo cáo</span></Link><Link href={href("/app/settings/profile")} className={cn("flex min-h-11 flex-col items-center justify-center gap-1 text-[11px] font-medium text-[var(--muted)]", preview && "text-[var(--brand)]")}><UserRound size={19} aria-hidden="true" /><span>Cá nhân</span></Link></div></nav>;
}
