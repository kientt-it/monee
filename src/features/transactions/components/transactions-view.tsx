"use client";

import Link from "next/link";
import { ArrowLeftRight, ChevronRight, Coffee, Plus, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TransactionRecord } from "@/features/transactions/queries/get-transactions";
import { formatCurrency } from "@/lib/utils";

const demoTransactions: TransactionRecord[] = [
  { id: "demo-1", type: "expense", amount: 65000, merchant: "Highlands Coffee", note: null, transaction_date: "2026-09-07T09:42:00+07:00", account_id: "", category_id: "" },
  { id: "demo-2", type: "income", amount: 18000000, merchant: "Lương tháng 9", note: null, transaction_date: "2026-09-06T08:00:00+07:00", account_id: "", category_id: "" },
  { id: "demo-3", type: "expense", amount: 485000, merchant: "Siêu thị WinMart", note: null, transaction_date: "2026-09-05T18:30:00+07:00", account_id: "", category_id: "" },
];

const icons = { expense: Coffee, income: WalletCards, transfer: ArrowLeftRight };

export function TransactionsView({ transactions, configured }: { transactions: TransactionRecord[]; configured: boolean }) {
  const visible = configured ? transactions : demoTransactions;

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 pb-28 pt-5 sm:px-6 md:px-10 md:pb-12 md:pt-8">
      <div className="mx-auto max-w-[900px]">
        <header className="flex items-center justify-between">
          <div><p className="text-sm text-[var(--muted)]">Lịch sử tiền bạc</p><h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">Giao dịch</h1></div>
          <Link href="/app/transactions/new"><Button size="sm"><Plus size={16} /> Thêm mới</Button></Link>
        </header>
        {!configured && <div className="mt-5 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--muted)]">Bản xem trước · các giao dịch dưới đây là dữ liệu minh họa.</div>}
        <div className="mt-6 flex gap-2 overflow-x-auto pb-1"><button className="min-h-10 shrink-0 rounded-full bg-[var(--brand)] px-4 text-sm font-semibold text-white">Tất cả</button><button className="min-h-10 shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--muted)]">Chi tiêu</button><button className="min-h-10 shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--muted)]">Thu nhập</button><button className="min-h-10 shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--muted)]">Tháng này</button></div>
        <Card className="mt-4"><CardHeader><div className="flex items-center justify-between"><CardTitle>Tháng 9, 2026</CardTitle><span className="text-xs text-[var(--muted)]">{visible.length} giao dịch</span></div></CardHeader><CardContent className="space-y-1 pt-2">
          {visible.length === 0 ? <div className="py-8 text-center text-sm text-[var(--muted)]">Chưa có giao dịch trong khoảng thời gian này.</div> : visible.map((item) => { const Icon = icons[item.type]; const income = item.type === "income"; return <Link href={configured ? `/app/transactions/${item.id}` : "#"} key={item.id} className="flex items-center gap-3 rounded-xl py-3 hover:bg-[var(--surface-muted)]"><div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${income ? "bg-[var(--brand-soft)] text-[var(--brand)]" : "bg-[#fff1dc] text-[#b56f24]"}`}><Icon size={19} /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.merchant ?? "Giao dịch không tên"}</p><p className="mt-0.5 text-xs text-[var(--muted)]">{new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(item.transaction_date))}</p></div><p className={`text-sm font-bold tabular-nums ${income ? "text-[var(--brand)]" : "text-[var(--foreground)]"}`}>{income ? "+" : "−"}{formatCurrency(item.amount)}</p><ChevronRight size={16} className="text-[var(--muted)]" /></Link>; })}
        </CardContent></Card>
      </div>
    </main>
  );
}
