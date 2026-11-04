"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeftRight, ArrowUpRight, HandCoins, Landmark } from "lucide-react";
import { CurrencyConverter } from "./currency-converter";
import { DepositCalculator } from "./deposit-calculator";

export function FinancialTools() {
  const [tool, setTool] = useState<"currency" | "deposit">("currency");
  return <main className="min-w-0 px-4 pb-[calc(env(safe-area-inset-bottom)+7rem)] pt-5 sm:px-6 md:px-10 md:pb-12 md:pt-8"><div className="mx-auto max-w-[1080px] space-y-6">
    <header><p className="text-sm text-[var(--muted)]">Tính toán trước khi quyết định</p><h1 className="mt-1 text-2xl font-bold md:text-3xl">Công cụ tài chính</h1><p className="mt-3 text-sm leading-6 text-[var(--muted)]">Quy đổi ngoại tệ và dự tính tiền lãi trong vài bước.</p></header>
    <div className="grid gap-3 sm:grid-cols-3" aria-label="Chọn công cụ">
      {([['currency', 'Đổi tiền tệ', ArrowLeftRight], ['deposit', 'Lãi tiền gửi', Landmark]] as const).map(([id, title, Icon]) => <button key={id} type="button" onClick={() => setTool(id)} aria-pressed={tool === id} className={`flex min-h-16 items-center gap-3 rounded-2xl border p-4 text-left text-sm font-semibold ${tool === id ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand-strong)]" : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-muted)]"}`}><Icon size={21} aria-hidden="true" />{title}</button>)}
      <Link href="/app/hui" className="flex min-h-16 items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm font-semibold hover:bg-[var(--surface-muted)]"><HandCoins size={21} aria-hidden="true" />Tính hụi<ArrowUpRight size={17} className="ml-auto text-[var(--muted)]" aria-hidden="true" /></Link>
    </div>
    <div hidden={tool !== "currency"}><CurrencyConverter /></div>
    <div hidden={tool !== "deposit"}><DepositCalculator /></div>
  </div></main>;
}
