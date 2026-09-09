"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarDays, Check, Pencil, Plus, RotateCcw, Target, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { saveBudgetAction, setBudgetActiveAction } from "@/features/budgets/actions/save-budget";
import { budgetSchema, type BudgetInput } from "@/features/budgets/schemas/budget.schema";
import type { BudgetCategoryOption, BudgetRecord } from "@/features/budgets/queries/get-budgets";
import { formatCurrency } from "@/lib/utils";

const periodLabels = { weekly: "Hàng tuần", monthly: "Hàng tháng", yearly: "Hàng năm", custom: "Tùy chỉnh" } as const;
const demoBudgets: BudgetRecord[] = [{ id: "demo-budget", name: "Chi tiêu tháng", categoryId: null, categoryName: "Tất cả chi tiêu", categoryColor: null, amount: 5_000_000, period: "monthly", startDate: "2026-09-01", endDate: null, alertThreshold: 75, isActive: true, spent: 3_320_000, remaining: 1_680_000, percentage: 66.4, status: "normal", periodLabel: "Tháng 9/2026" }];

function statusLabel(status: BudgetRecord["status"]) {
  return status === "over" ? "Đã vượt ngân sách" : status === "strong_warning" ? "Sắp vượt ngân sách" : status === "warning" ? "Đang tiến gần giới hạn" : "Trong tầm kiểm soát";
}

function statusColor(status: BudgetRecord["status"]) {
  return status === "over" || status === "strong_warning" ? "var(--danger)" : status === "warning" ? "var(--warning)" : "var(--brand)";
}

function localToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
}

export function BudgetsView({ budgets, categories, configured }: { budgets: BudgetRecord[]; categories: BudgetCategoryOption[]; configured: boolean }) {
  const router = useRouter();
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<BudgetRecord | null>(null);
  const [isPending, startTransition] = useTransition();
  const visibleBudgets = configured ? budgets : demoBudgets;
  const activeBudgets = visibleBudgets.filter((budget) => budget.isActive);
  const inactiveBudgets = visibleBudgets.filter((budget) => !budget.isActive);
  const form = useForm<z.input<typeof budgetSchema>, unknown, BudgetInput>({
    resolver: zodResolver(budgetSchema),
    defaultValues: { name: "", categoryId: null, amount: 0, period: "monthly", startDate: new Date(), endDate: null, alertThreshold: 75 },
  });

  function openCreate() {
    setEditing(null);
    form.reset({ name: "", categoryId: null, amount: 0, period: "monthly", startDate: new Date(`${localToday()}T12:00:00`), endDate: null, alertThreshold: 75 });
    setDialog(true);
  }

  function openEdit(budget: BudgetRecord) {
    setEditing(budget);
    form.reset({ name: budget.name, categoryId: budget.categoryId, amount: budget.amount, period: budget.period, startDate: new Date(`${budget.startDate}T12:00:00`), endDate: budget.endDate ? new Date(`${budget.endDate}T12:00:00`) : null, alertThreshold: budget.alertThreshold });
    setDialog(true);
  }

  function submit(values: BudgetInput) {
    startTransition(async () => {
      const result = await saveBudgetAction(editing?.id ?? null, values);
      if (!result.ok) { const message = result.error === "SUPABASE_NOT_CONFIGURED" ? "Hãy cấu hình Supabase trước khi lưu dữ liệu thật." : result.error; toast.error(message); return; }
      setDialog(false); setEditing(null); toast.success(editing ? "Đã cập nhật ngân sách." : "Đã thêm ngân sách."); router.refresh();
    });
  }

  function toggle(budget: BudgetRecord) {
    startTransition(async () => {
      const result = await setBudgetActiveAction(budget.id, !budget.isActive);
      if (!result.ok) { toast.error(result.error); return; }
      toast.success(budget.isActive ? "Đã tắt ngân sách." : "Đã bật ngân sách."); router.refresh();
    });
  }

  function renderBudget(budget: BudgetRecord) {
    const color = statusColor(budget.status);
    return <Card key={budget.id} className={`${budget.isActive ? "" : "opacity-70"} p-4`}>
      <div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]"><Target size={19} /></div><div className="min-w-0 flex-1"><p className="truncate font-semibold">{budget.name}</p><p className="mt-1 text-xs text-[var(--muted)]">{budget.categoryName} · {periodLabels[budget.period]}</p></div><div className="flex gap-1"><button type="button" aria-label={`Sửa ${budget.name}`} onClick={() => openEdit(budget)} className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--surface-muted)]"><Pencil size={15} /></button><button type="button" aria-label={budget.isActive ? `Tắt ${budget.name}` : `Bật ${budget.name}`} onClick={() => toggle(budget)} disabled={isPending} className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--surface-muted)]">{budget.isActive ? <X size={15} /> : <RotateCcw size={15} />}</button></div></div>
      <div className="mt-5 flex items-end justify-between gap-3"><div><p className="text-xs text-[var(--muted)]">Đã chi trong kỳ hiện tại</p><p className="mt-1 text-xl font-bold tabular-nums">{formatCurrency(budget.spent)} <span className="text-sm font-medium text-[var(--muted)]">/ {formatCurrency(budget.amount)}</span></p></div><span className="text-sm font-bold" style={{ color }}>{Math.round(budget.percentage)}%</span></div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]"><div className="h-full rounded-full" style={{ width: `${Math.min(budget.percentage, 100)}%`, background: color }} /></div>
      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-[var(--muted)]"><span style={{ color }}>{statusLabel(budget.status)}</span><span>{budget.remaining > 0 ? `Còn ${formatCurrency(budget.remaining)}` : `Vượt ${formatCurrency(budget.spent - budget.amount)}`}</span></div>
      <p className="mt-2 text-[11px] text-[var(--muted)]">{budget.periodLabel}{!budget.isActive && " · Đã tắt"}</p>
    </Card>;
  }

  return <main className="min-h-screen bg-[var(--background)] px-4 pb-28 pt-5 sm:px-6 md:px-10 md:pb-12 md:pt-8"><div className="mx-auto max-w-[900px]">
    <header className="flex items-center justify-between gap-4"><div><p className="text-sm text-[var(--muted)]">Lập kế hoạch chi tiêu</p><h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">Ngân sách</h1></div><Button size="sm" onClick={openCreate}><Plus size={16} /> Thêm ngân sách</Button></header>
    {!configured && <div className="mt-5 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--muted)]">Bản xem trước · tiến độ dưới đây là dữ liệu minh họa, chưa được lưu.</div>}
    <Card className="mt-6 bg-[var(--brand)] text-white"><CardContent className="p-6"><p className="text-sm text-white/75">Theo dõi ngân sách</p><p className="mt-2 text-2xl font-bold">{activeBudgets.length} ngân sách đang hoạt động</p><p className="mt-2 text-xs leading-5 text-white/75">Đặt giới hạn cho từng nhóm chi tiêu để biết mình còn bao nhiêu trước khi kết thúc kỳ.</p></CardContent></Card>
    <section className="mt-7"><div className="mb-3 flex items-center justify-between"><h2 className="text-base font-semibold">Đang hoạt động</h2><span className="text-xs text-[var(--muted)]">Tiến độ kỳ hiện tại</span></div>{configured && activeBudgets.length === 0 ? <Card><CardContent className="p-8 text-center"><Target className="mx-auto text-[var(--brand)]" size={30} /><p className="mt-3 font-semibold">Chưa có ngân sách</p><p className="mt-1 text-sm text-[var(--muted)]">Tạo ngân sách đầu tiên để theo dõi chi tiêu theo kế hoạch.</p><Button className="mt-5" onClick={openCreate}><Plus size={16} /> Tạo ngân sách</Button></CardContent></Card> : <div className="grid gap-3 md:grid-cols-2">{activeBudgets.map(renderBudget)}</div>}</section>
    {inactiveBudgets.length > 0 && <section className="mt-8"><div className="mb-3"><h2 className="text-base font-semibold">Đã tắt</h2><p className="mt-1 text-xs text-[var(--muted)]">Lịch sử ngân sách vẫn được giữ lại.</p></div><div className="grid gap-3 md:grid-cols-2">{inactiveBudgets.map(renderBudget)}</div></section>}
  </div>
    {dialog && <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/35 p-0 sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(false); }}><section role="dialog" aria-modal="true" aria-labelledby="budget-dialog-title" className="w-full max-w-lg rounded-t-[24px] bg-[var(--surface)] p-5 shadow-2xl sm:rounded-[24px]"><div className="mb-5 flex items-center justify-between"><div><h2 id="budget-dialog-title" className="text-lg font-bold">{editing ? "Sửa ngân sách" : "Thêm ngân sách"}</h2><p className="mt-1 text-sm text-[var(--muted)]">Giới hạn chỉ áp dụng cho các khoản chi tiêu.</p></div><button type="button" aria-label="Đóng" onClick={() => setDialog(false)} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-[var(--surface-muted)]"><X size={19} /></button></div><form onSubmit={form.handleSubmit(submit)} className="space-y-4">
      <label className="block text-sm font-semibold">Tên ngân sách<input {...form.register("name")} autoFocus className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-base" placeholder="Ví dụ: Chi tiêu tháng" />{form.formState.errors.name && <span className="mt-1 block text-xs text-[var(--danger)]">{form.formState.errors.name.message}</span>}</label>
      <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold">Số tiền tối đa<input {...form.register("amount", { valueAsNumber: true })} type="number" min="1" step="1" inputMode="numeric" className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-base" placeholder="0" />{form.formState.errors.amount && <span className="mt-1 block text-xs text-[var(--danger)]">{form.formState.errors.amount.message}</span>}</label><label className="block text-sm font-semibold">Cảnh báo từ (%)<input {...form.register("alertThreshold", { valueAsNumber: true })} type="number" min="1" max="100" step="1" className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-base" />{form.formState.errors.alertThreshold && <span className="mt-1 block text-xs text-[var(--danger)]">{form.formState.errors.alertThreshold.message}</span>}</label></div>
      <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold">Áp dụng cho<select {...form.register("categoryId")} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-base"><option value="">Tất cả chi tiêu</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label className="block text-sm font-semibold">Chu kỳ<select {...form.register("period")} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-base">{Object.entries(periodLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
      <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold">Ngày bắt đầu<div className="relative mt-2"><CalendarDays size={16} className="pointer-events-none absolute left-3 top-3 text-[var(--muted)]" /><input type="date" {...form.register("startDate", { valueAsDate: true })} className="min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] pl-10 pr-2 text-base" /> </div></label><label className="block text-sm font-semibold">Ngày kết thúc <span className="font-normal text-[var(--muted)]">(tùy chọn)</span><input type="date" {...form.register("endDate", { setValueAs: (value) => value ? new Date(`${value}T12:00:00`) : null })} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-base" /></label></div>
      <Button type="submit" className="w-full" disabled={isPending}>{isPending ? "Đang lưu…" : <><Check size={17} /> Lưu ngân sách</>}</Button>
    </form></section></div>}
  </main>;
}
