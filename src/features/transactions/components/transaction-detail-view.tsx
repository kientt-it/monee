"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, CalendarDays, ChevronLeft, Pencil, Trash2, WalletCards, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { deleteTransactionAction } from "@/features/transactions/actions/delete-transaction";
import type { TransactionRecord } from "@/features/transactions/queries/get-transactions";
import type { AccountRecord } from "@/features/accounts/queries/get-accounts";
import type { CategoryOption } from "@/features/transactions/queries/get-transaction-options";
import { formatCurrency } from "@/lib/utils";

const labels = { expense: "Chi tiêu", income: "Thu nhập", transfer: "Chuyển khoản" };
const icons = { expense: ArrowUpRight, income: ArrowDownLeft, transfer: ArrowLeftRight };

export function TransactionDetailView({ transaction, accounts, categories, configured }: { transaction: TransactionRecord; accounts: AccountRecord[]; categories: CategoryOption[]; configured: boolean }) {
  const router = useRouter(); const [confirming, setConfirming] = useState(false); const [isPending, startTransition] = useTransition(); const [error, setError] = useState("");
  const Icon = icons[transaction.type];
  const source = accounts.find((item) => item.id === transaction.account_id)?.name ?? (transaction.account_id.endsWith("1") ? "Tiền mặt" : "Tài khoản");
  const destination = accounts.find((item) => item.id === transaction.destination_account_id)?.name ?? "Tài khoản đích";
  const category = categories.find((item) => item.id === transaction.category_id)?.name ?? (transaction.type === "income" ? "Thu nhập" : "Ăn uống");
  function remove() { setError(""); startTransition(async () => { const result = await deleteTransactionAction(transaction.id); if (!result.ok) { setError(result.error === "SUPABASE_NOT_CONFIGURED" ? "Bản xem trước không xóa dữ liệu thật." : result.error); return; } router.push(`/app/transactions?deleted=${encodeURIComponent(transaction.id)}`); router.refresh(); }); }
  return <main className="min-h-screen bg-[var(--background)] px-4 pb-10 pt-5 sm:px-6 md:px-10 md:pt-8"><div className="mx-auto max-w-2xl">
    <header className="flex items-center justify-between"><div className="flex items-center gap-3"><Link href="/app/transactions" aria-label="Quay lại danh sách giao dịch" className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)]"><ChevronLeft size={19} /></Link><div><p className="text-sm text-[var(--muted)]">Chi tiết</p><h1 className="mt-0.5 text-2xl font-bold tracking-tight">Giao dịch</h1></div></div><Link href={`/app/transactions/${transaction.id}/edit`}><Button variant="outline" size="sm"><Pencil size={15} /> Sửa</Button></Link></header>
    {!configured && <div className="mt-5 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--muted)]">Bản xem trước · đây là dữ liệu minh họa.</div>}
    <Card className="mt-6 overflow-hidden"><CardContent className="p-6 text-center"><div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${transaction.type === "income" ? "bg-[var(--brand-soft)] text-[var(--brand)]" : "bg-[#fff1dc] text-[#b56f24]"}`}><Icon size={24} /></div><p className="mt-4 text-sm font-semibold text-[var(--muted)]">{labels[transaction.type]}</p><p className={`mt-1 text-3xl font-bold tabular-nums ${transaction.type === "income" ? "text-[var(--brand)]" : ""}`}>{transaction.type === "income" ? "+" : transaction.type === "expense" ? "−" : ""}{formatCurrency(transaction.amount)}</p><p className="mt-2 font-semibold">{transaction.merchant ?? labels[transaction.type]}</p></CardContent></Card>
    <Card className="mt-4"><CardContent className="divide-y divide-[var(--border)] p-5"><div className="flex items-center justify-between py-3"><span className="flex items-center gap-2 text-sm text-[var(--muted)]"><WalletCards size={16} /> Tài khoản</span><span className="text-sm font-semibold">{transaction.type === "transfer" ? `${source} → ${destination}` : source}</span></div>{transaction.type !== "transfer" && <div className="flex items-center justify-between py-3"><span className="text-sm text-[var(--muted)]">Danh mục</span><span className="text-sm font-semibold">{category}</span></div>}<div className="flex items-center justify-between py-3"><span className="flex items-center gap-2 text-sm text-[var(--muted)]"><CalendarDays size={16} /> Thời gian</span><span className="text-sm font-semibold">{new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(transaction.transaction_date))}</span></div>{transaction.note && <div className="py-3"><p className="text-sm text-[var(--muted)]">Ghi chú</p><p className="mt-1 text-sm font-medium">{transaction.note}</p></div>}</CardContent></Card>
    <Button variant="ghost" className="mt-5 w-full text-[var(--danger)]" onClick={() => setConfirming(true)}><Trash2 size={16} /> Xóa giao dịch</Button>
    {confirming && <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/35 sm:items-center sm:p-4" role="presentation"><section role="alertdialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-description" className="w-full max-w-md rounded-t-[24px] bg-[var(--surface)] p-5 shadow-2xl sm:rounded-[24px]"><div className="flex items-start justify-between"><div><h2 id="delete-title" className="text-lg font-bold">Xóa giao dịch?</h2><p id="delete-description" className="mt-2 text-sm leading-6 text-[var(--muted)]">Số dư liên quan sẽ được hoàn lại trong cùng một thao tác an toàn.</p></div><button aria-label="Đóng" onClick={() => setConfirming(false)} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-[var(--surface-muted)]"><X size={18} /></button></div>{error && <p role="alert" className="mt-4 rounded-xl bg-[#fff0ed] px-3 py-2 text-sm text-[var(--danger)]">{error}</p>}<div className="mt-5 grid grid-cols-2 gap-3"><Button variant="outline" onClick={() => setConfirming(false)}>Hủy</Button><Button className="bg-[var(--danger)] hover:bg-[var(--danger)]" onClick={remove} disabled={isPending}>{isPending ? "Đang xóa…" : "Xóa giao dịch"}</Button></div></section></div>}
  </div></main>;
}
