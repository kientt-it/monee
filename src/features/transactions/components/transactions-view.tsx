"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ArrowLeftRight, ChevronLeft, ChevronRight, Coffee, Plus, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { restoreTransactionAction } from "@/features/transactions/actions/delete-transaction";
import type { TransactionRecord } from "@/features/transactions/queries/get-transactions";
import { formatCurrency } from "@/lib/utils";

const demoTransactions: TransactionRecord[] = [
  { id: "demo-1", type: "expense", amount: 65000, merchant: "Highlands Coffee", note: null, transaction_date: "2026-09-07T09:42:00+07:00", account_id: "", destination_account_id: null, category_id: "" },
  { id: "demo-2", type: "income", amount: 18000000, merchant: "Lương tháng 9", note: null, transaction_date: "2026-09-06T08:00:00+07:00", account_id: "", destination_account_id: null, category_id: "" },
  { id: "demo-3", type: "expense", amount: 485000, merchant: "Siêu thị WinMart", note: null, transaction_date: "2026-09-05T18:30:00+07:00", account_id: "", destination_account_id: null, category_id: "" },
];

const icons = { expense: Coffee, income: WalletCards, transfer: ArrowLeftRight };
type TypeFilter = "all" | "expense" | "income";

function filterHref(type: TypeFilter, monthOnly: boolean, page?: number) {
  const params = new URLSearchParams();
  if (type !== "all") params.set("type", type);
  if (monthOnly) params.set("period", "month");
  if (page && page > 1) params.set("page", String(page));
  const query = params.toString();
  return `/app/transactions${query ? `?${query}` : ""}`;
}

function UndoBanner({ deletedId }: { deletedId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function restore() {
    startTransition(async () => {
      const result = await restoreTransactionAction(deletedId);
      if (!result.ok) {
        const message = result.error === "SUPABASE_NOT_CONFIGURED" ? "Bản xem trước không khôi phục dữ liệu thật." : result.error;
        toast.error(message);
        return;
      }
      toast.success("Đã khôi phục giao dịch.");
      router.replace("/app/transactions");
      router.refresh();
    });
  }

  return <div role="status" className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--brand)]/25 bg-[var(--brand-soft)] px-4 py-3 text-sm"><div><p className="font-semibold text-[var(--brand-strong)]">Đã xóa giao dịch</p></div><Button variant="secondary" size="sm" onClick={restore} disabled={isPending}>{isPending ? "Đang khôi phục…" : "Hoàn tác"}</Button></div>;
}

export function TransactionsView({ transactions, configured, hasMore, page, deletedId, typeFilter, monthOnly }: { transactions: TransactionRecord[]; configured: boolean; hasMore: boolean; page: number; deletedId?: string; typeFilter: TypeFilter; monthOnly: boolean }) {
  const visible = (configured ? transactions : demoTransactions).filter((item) => typeFilter === "all" || item.type === typeFilter);
  const monthTitle = new Intl.DateTimeFormat("vi-VN", { month: "long", year: "numeric" }).format(new Date());
  const countLabel = `${visible.length}${hasMore ? "+" : ""} giao dịch`;
  const filterClass = (selected: boolean) => selected ? "bg-[var(--brand)] text-white" : "border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]";

  return <main className="min-h-screen bg-[var(--background)] px-4 pb-28 pt-5 sm:px-6 md:px-10 md:pb-12 md:pt-8">
    <div className="mx-auto max-w-[900px]">
      <header className="flex items-center justify-between"><div><p className="text-sm text-[var(--muted)]">Lịch sử tiền bạc</p><h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">Giao dịch</h1></div><Link href="/app/transactions/new"><Button size="sm"><Plus size={16} /> Thêm mới</Button></Link></header>
      {!configured && <div className="mt-5 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--muted)]">Bản xem trước · các giao dịch dưới đây là dữ liệu minh họa.</div>}
      {deletedId && configured && <UndoBanner deletedId={deletedId} />}
      <nav aria-label="Bộ lọc giao dịch" className="mt-6 flex gap-2 overflow-x-auto pb-1">
        <Link href={filterHref("all", monthOnly)} aria-current={typeFilter === "all" && !monthOnly ? "page" : undefined} className={`min-h-10 shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${filterClass(typeFilter === "all" && !monthOnly)}`}>Tất cả</Link>
        <Link href={filterHref("expense", monthOnly)} aria-current={typeFilter === "expense" ? "page" : undefined} className={`min-h-10 shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${filterClass(typeFilter === "expense")}`}>Chi tiêu</Link>
        <Link href={filterHref("income", monthOnly)} aria-current={typeFilter === "income" ? "page" : undefined} className={`min-h-10 shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${filterClass(typeFilter === "income")}`}>Thu nhập</Link>
        <Link href={filterHref(typeFilter, true)} aria-current={monthOnly ? "page" : undefined} className={`min-h-10 shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${filterClass(monthOnly)}`}>Tháng này</Link>
      </nav>
      <Card className="mt-4"><CardHeader><div className="flex items-center justify-between"><CardTitle>{monthOnly ? monthTitle : "Giao dịch gần đây"}</CardTitle><span className="text-xs text-[var(--muted)]">{countLabel}</span></div></CardHeader><CardContent className="space-y-1 pt-2">
        {visible.length === 0 ? <div className="py-8 text-center text-sm text-[var(--muted)]">Chưa có giao dịch trong khoảng thời gian này.</div> : visible.map((item) => { const Icon = icons[item.type]; const income = item.type === "income"; return <Link href={`/app/transactions/${item.id}`} key={item.id} className="flex items-center gap-3 rounded-xl py-3 hover:bg-[var(--surface-muted)]"><div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${income ? "bg-[var(--brand-soft)] text-[var(--brand)]" : "bg-[#fff1dc] text-[#b56f24]"}`}><Icon size={19} /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.merchant ?? "Giao dịch không tên"}</p><p className="mt-0.5 text-xs text-[var(--muted)]">{new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(item.transaction_date))}</p></div><p className={`text-sm font-bold tabular-nums ${income ? "text-[var(--brand)]" : "text-[var(--foreground)]"}`}>{income ? "+" : "−"}{formatCurrency(item.amount)}</p><ChevronRight size={16} className="text-[var(--muted)]" /></Link>; })}
      </CardContent></Card>
      {(page > 1 || hasMore) && <nav aria-label="Phân trang giao dịch" className="mt-4 flex items-center justify-between"><div>{page > 1 && <Link href={filterHref(typeFilter, monthOnly, page - 1)}><Button variant="outline" size="sm"><ChevronLeft size={15} /> Trang trước</Button></Link>}</div><span className="text-xs text-[var(--muted)]">Trang {page}</span><div>{hasMore && <Link href={filterHref(typeFilter, monthOnly, page + 1)}><Button variant="outline" size="sm">Trang sau <ChevronRight size={15} /></Button></Link>}</div></nav>}
    </div>
  </main>;
}
