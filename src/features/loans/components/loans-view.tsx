"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Archive, Check, ChevronLeft, ChevronRight, HandCoins, Pencil, Plus, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DateInput } from "@/components/ui/date-input";
import { displayDate } from "@/lib/date";
import { formatCurrency } from "@/lib/utils";
import { saveLoanAction, setLoanArchivedAction, setLoanPaymentAction } from "../actions/save-loan";
import { loanSchema, type LoanInput } from "../schemas/loan.schema";
import { installmentForMonth, overdueInstallments, shiftMonth, summarizeLoans } from "../schedule";
import type { LoanRecord } from "../types";

const inputClass = "mt-2 min-h-11 min-w-0 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-base font-normal";
type Editor = { id: string; loan?: LoanRecord };

function LoanEditor({ editor, today, onClose }: { editor: Editor; today: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();
  const locked = !!editor.loan?.payments.length;
  const form = useForm<LoanInput>({
    resolver: zodResolver(loanSchema),
    defaultValues: editor.loan ?? { name: "", lender: "", monthlyAmount: 0, firstDueDate: today, installmentCount: 12, note: "" },
  });
  useEffect(() => {
    dialog.current?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, []);
  const error = (field: keyof LoanInput) => form.formState.errors[field] && <span className="mt-1 block text-sm font-normal text-[var(--danger)]" role="alert">{form.formState.errors[field]?.message}</span>;

  function submit(values: LoanInput) {
    startTransition(async () => {
      try {
        const result = await saveLoanAction(editor.id, values);
        if (!result.ok) { toast.error(result.error); return; }
        toast.success(editor.loan ? "Đã cập nhật khoản vay." : "Đã thêm khoản vay.");
        onClose();
      } catch { toast.error("Chưa lưu được khoản vay. Vui lòng thử lại."); }
    });
  }

  return <dialog ref={dialog} aria-labelledby="loan-editor-title" onCancel={(event) => { event.preventDefault(); if (!pending) onClose(); }} className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 text-[var(--foreground)] shadow-2xl backdrop:bg-black/40 sm:p-6">
    <div className="mb-5 flex items-center justify-between gap-3"><h2 id="loan-editor-title" className="text-xl font-bold">{editor.loan ? "Sửa khoản vay" : "Thêm khoản vay"}</h2><button type="button" disabled={pending} onClick={onClose} aria-label="Đóng" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-[var(--surface-muted)]"><X size={20} /></button></div>
    <form onSubmit={form.handleSubmit(submit)}><fieldset disabled={pending} className="min-w-0 space-y-4 disabled:opacity-70">
      <label className="block text-sm font-semibold">Tên khoản vay<input {...form.register("name")} required autoFocus maxLength={80} placeholder="Ví dụ: Trả góp xe máy" className={inputClass} />{error("name")}</label>
      <label className="block text-sm font-semibold">Bên cho vay <span className="font-normal text-[var(--muted)]">(không bắt buộc)</span><input {...form.register("lender")} maxLength={120} placeholder="Ngân hàng hoặc người cho vay" className={inputClass} />{error("lender")}</label>
      <label className="block text-sm font-semibold">Số tiền đóng mỗi tháng (đ)<input {...form.register("monthlyAmount", { valueAsNumber: true })} required type="number" inputMode="numeric" min={1} max={1_000_000_000_000} step={1} readOnly={locked} className={inputClass} />{error("monthlyAmount")}</label>
      <div className="grid min-w-0 gap-4 sm:grid-cols-2"><label className="block min-w-0 text-sm font-semibold">Ngày đóng kỳ đầu<DateInput {...form.register("firstDueDate")} required min="1900-01-01" max="2100-12-31" readOnly={locked} className="mt-2" />{error("firstDueDate")}</label><label className="block min-w-0 text-sm font-semibold">Số tháng cần đóng<input {...form.register("installmentCount", { valueAsNumber: true })} required type="number" inputMode="numeric" min={1} max={600} step={1} readOnly={locked} className={inputClass} />{error("installmentCount")}</label></div>
      <p className="text-sm leading-6 text-[var(--muted)]">{locked ? "Đã có lịch sử đóng tiền nên số tiền và lịch đóng được giữ cố định." : "Nhập số tiền gồm cả gốc và lãi của mỗi kỳ. Nếu đang trả dở, chọn kỳ tiếp theo và số tháng còn lại. Ngày 29–31 sẽ chuyển về ngày cuối tháng khi cần."}</p>
      <label className="block text-sm font-semibold">Ghi chú<textarea {...form.register("note")} rows={2} maxLength={500} className={`${inputClass} resize-y`} placeholder="Thông tin cần nhớ" />{error("note")}</label>
      <Button type="submit" className="w-full">{pending ? "Đang lưu…" : "Lưu khoản vay"}</Button>
    </fieldset></form>
  </dialog>;
}

export function LoansView({ loans, available, today }: { loans: LoanRecord[]; available: boolean; today: string }) {
  const [month, setMonth] = useState(today.slice(0, 7));
  const [editor, setEditor] = useState<Editor | null>(null);
  const [pending, startTransition] = useTransition();
  const active = loans.filter((loan) => !loan.isArchived);
  const archived = loans.filter((loan) => loan.isArchived);
  const summary = summarizeLoans(loans, month, today);
  const create = () => setEditor({ id: crypto.randomUUID() });

  function recordPayment(loan: LoanRecord, installmentNumber: number, paid: boolean) {
    startTransition(async () => {
      try {
        const result = await setLoanPaymentAction({ loanId: loan.id, installmentNumber, paid });
        if (!result.ok) { toast.error(result.error); return; }
        toast.success(paid ? "Đã ghi nhận kỳ đóng." : "Đã hoàn tác kỳ đóng.");
      } catch { toast.error("Chưa cập nhật được kỳ đóng. Vui lòng thử lại."); }
    });
  }

  function archive(loan: LoanRecord) {
    startTransition(async () => {
      try {
        const result = await setLoanArchivedAction(loan.id, !loan.isArchived);
        if (!result.ok) { toast.error(result.error); return; }
        toast.success(loan.isArchived ? "Đã khôi phục khoản vay." : "Đã lưu trữ khoản vay.");
      } catch { toast.error("Chưa cập nhật được khoản vay. Vui lòng thử lại."); }
    });
  }

  function renderLoan(loan: LoanRecord) {
    const installment = installmentForMonth(loan, month, today);
    const overdue = overdueInstallments(loan, today);
    const paidCount = loan.payments.length;
    const completed = paidCount === loan.installmentCount;
    const label = installment?.status === "paid" ? "Đã đóng" : installment?.status === "overdue" ? "Quá hạn" : installment?.dueDate === today ? "Đến hạn hôm nay" : "Chưa đóng";
    return <Card key={loan.id} className="min-w-0 p-4 sm:p-5">
      <div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]"><HandCoins size={22} /></div><div className="min-w-0 flex-1"><h3 className="break-words text-base font-semibold">{loan.name}</h3>{loan.lender && <p className="mt-1 break-words text-sm text-[var(--muted)]">{loan.lender}</p>}</div><button type="button" disabled={pending} onClick={() => setEditor({ id: loan.id, loan })} aria-label={`Sửa ${loan.name}`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--surface-muted)]"><Pencil size={17} /></button></div>
      <p className="mt-4 break-words text-2xl font-bold tabular-nums">{formatCurrency(loan.monthlyAmount)}<span className="ml-1 text-sm font-normal text-[var(--muted)]">/ tháng</span></p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm"><span className="text-[var(--muted)]">Đã đóng {paidCount}/{loan.installmentCount} kỳ</span><span className="font-semibold text-[var(--brand)]">{completed ? "Đã hoàn tất" : `Còn ${formatCurrency((loan.installmentCount - paidCount) * loan.monthlyAmount)}`}</span></div>
      <progress aria-label={`Tiến độ ${loan.name}`} max={loan.installmentCount} value={paidCount} className="loan-progress mt-2 h-2 w-full overflow-hidden rounded-full" />
      {installment ? <div className="mt-4 rounded-2xl bg-[var(--surface-muted)] p-3"><div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span>Kỳ {installment.installmentNumber} · Hạn {displayDate(installment.dueDate)}</span><span className={`font-semibold ${installment.status === "overdue" ? "text-[var(--danger)]" : installment.payment ? "text-[var(--brand)]" : "text-[var(--muted)]"}`}>{label}</span></div>{installment.payment && <p className="mt-1 text-sm text-[var(--muted)]">Ghi nhận ngày {displayDate(installment.payment.paidOn)}</p>}
        {!loan.isArchived && <Button disabled={pending} variant={installment.payment ? "secondary" : "primary"} className="mt-3 w-full" onClick={() => recordPayment(loan, installment.installmentNumber, !installment.payment)}>{installment.payment ? <><RotateCcw size={16} /> Hoàn tác đã đóng</> : <><Check size={17} /> Ghi nhận đã đóng</>}</Button>}
      </div> : <p className="mt-4 rounded-xl bg-[var(--surface-muted)] p-3 text-sm text-[var(--muted)]">{month < loan.firstDueDate.slice(0, 7) ? `Kỳ đầu đến hạn ${displayDate(loan.firstDueDate)}` : "Không có kỳ đóng trong tháng này."}</p>}
      {overdue.length > 0 && <button type="button" onClick={() => setMonth(overdue[0].dueDate.slice(0, 7))} className="mt-3 min-h-11 w-full text-left text-sm font-medium text-[var(--danger)]">{overdue.length} kỳ quá hạn chưa đóng · Xem kỳ sớm nhất <ChevronRight size={15} className="inline" /></button>}
      {loan.note && <p className="mt-3 whitespace-pre-wrap break-words text-sm text-[var(--muted)]">{loan.note}</p>}
      <button type="button" disabled={pending} onClick={() => archive(loan)} className="mt-3 flex min-h-11 items-center gap-2 text-sm text-[var(--muted)]">{loan.isArchived ? <RotateCcw size={16} /> : <Archive size={16} />}{loan.isArchived ? "Khôi phục khoản vay" : "Lưu trữ khoản vay"}</button>
    </Card>;
  }

  return <main className="min-w-0 px-4 pb-[calc(env(safe-area-inset-bottom)+7rem)] pt-5 sm:px-6 md:px-10 md:pb-12 md:pt-8"><div className="mx-auto max-w-[900px]">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-[var(--muted)]">Lịch đóng hằng tháng</p><h1 className="mt-1 text-2xl font-bold md:text-3xl">Khoản vay</h1></div><Button size="sm" disabled={!available || pending} onClick={create}><Plus size={17} /> Thêm khoản vay</Button></header>
    {!available ? <Card className="mt-6 p-6"><p className="font-semibold">Khoản vay chưa sẵn sàng</p><p className="mt-2 text-sm text-[var(--muted)]">Tính năng đang chờ cập nhật dữ liệu. Bạn vẫn có thể sử dụng các mục khác.</p></Card> : <>
      <div className="mt-6 flex flex-wrap items-center gap-3"><div className="grid w-full max-w-xs grid-cols-[44px_minmax(0,1fr)_44px] items-center rounded-xl border border-[var(--border)] bg-[var(--surface)]"><button type="button" aria-label="Tháng trước" disabled={month <= "1900-01"} onClick={() => setMonth(shiftMonth(month, -1))} className="flex h-11 items-center justify-center"><ChevronLeft size={18} /></button><input type="month" aria-label="Tháng đóng khoản vay" min="1900-01" max="2150-12" value={month} onChange={(event) => { if (/^\d{4}-(0[1-9]|1[0-2])$/.test(event.target.value) && event.target.value >= "1900-01" && event.target.value <= "2150-12") setMonth(event.target.value); }} className="date-input min-h-11 min-w-0 w-full appearance-none bg-transparent px-1 text-base" /><button type="button" aria-label="Tháng sau" disabled={month >= "2150-12"} onClick={() => setMonth(shiftMonth(month, 1))} className="flex h-11 items-center justify-center"><ChevronRight size={18} /></button></div><button type="button" onClick={() => setMonth(today.slice(0, 7))} className="min-h-11 text-sm font-semibold text-[var(--brand)]">Tháng này</button></div>
      <Card className="mt-4 bg-[var(--brand)] p-5 text-white sm:p-6"><p className="text-sm text-white/85">Còn cần đóng trong tháng</p><p className="mt-2 break-words text-3xl font-bold tabular-nums">{formatCurrency(summary.remaining)}</p><div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/20 pt-4"><div><p className="text-sm text-white/85">Tổng cần đóng</p><p className="mt-1 break-words font-semibold tabular-nums">{formatCurrency(summary.total)}</p></div><div><p className="text-sm text-white/85">Đã đóng</p><p className="mt-1 break-words font-semibold tabular-nums">{formatCurrency(summary.paid)}</p></div></div></Card>
      {summary.overdue > 0 && <p className="mt-3 text-sm font-medium text-[var(--danger)]">Tổng quá hạn đến hôm nay: {formatCurrency(summary.overdue)} (gồm các tháng trước).</p>}
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">“Đã đóng” chỉ ghi nhận lịch trả vay. Để cập nhật số dư, hãy ghi thêm giao dịch chi tiêu từ tài khoản đã trả.</p>
      <section className="mt-6" aria-label="Danh sách khoản vay">{active.length ? <div className="grid gap-4 lg:grid-cols-2">{active.map(renderLoan)}</div> : <Card className="p-7 text-center"><HandCoins size={32} className="mx-auto text-[var(--brand)]" /><h2 className="mt-3 font-semibold">Chưa có khoản vay đang theo dõi</h2><p className="mt-2 text-sm text-[var(--muted)]">Thêm khoản vay để biết mỗi tháng cần đóng bao nhiêu.</p><Button onClick={create} className="mt-5"><Plus size={17} /> Thêm khoản vay</Button></Card>}</section>
      {archived.length > 0 && <details className="mt-7"><summary className="min-h-11 cursor-pointer text-base font-semibold">Đã lưu trữ ({archived.length})</summary><div className="mt-3 grid gap-4 lg:grid-cols-2">{archived.map(renderLoan)}</div></details>}
    </>}
    {editor && <LoanEditor key={editor.id} editor={editor} today={today} onClose={() => setEditor(null)} />}
  </div></main>;
}
