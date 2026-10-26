"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, CreditCard, HandCoins, Pencil, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DateInput } from "@/components/ui/date-input";
import { MoneyInput } from "@/components/ui/money-input";
import { displayDate } from "@/lib/date";
import { formatCurrency } from "@/lib/utils";
import type { AccountRecord } from "@/features/accounts/queries/get-accounts";
import { deletePayablesAction, savePayableAction, setPayablePaidAction } from "../actions/manage-payables";
import { payCreditCardAction } from "../actions/pay-credit-card";
import { filterPayables, summarizePayables } from "../filter";
import { DateRangePicker } from "./date-range-picker";
import { payableSchema, type PayableInput } from "../schemas/payable.schema";
import type { CreditCardPayableRecord, ManualPayableRecord, PayableRecord } from "../types";

const inputClass = "mt-2 min-h-11 min-w-0 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-base";

function PayableEditor({ item, today, onClose, onSaved }: { item: ManualPayableRecord | null; today: string; onClose: () => void; onSaved: (date: string) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<PayableInput>({ resolver: zodResolver(payableSchema), defaultValues: item ?? { title: "", amount: 0, dueDate: today, note: "" } });
  const amount = useWatch({ control: form.control, name: "amount" });
  useEffect(() => { dialog.current?.showModal(); }, []);
  const error = (field: keyof PayableInput) => form.formState.errors[field] && <span role="alert" className="mt-1 block text-sm font-normal text-[var(--danger)]">{form.formState.errors[field]?.message}</span>;
  function submit(values: PayableInput) {
    startTransition(async () => {
      try {
        const result = await savePayableAction(item?.id ?? null, values);
        if (!result.ok) { toast.error(result.error); return; }
        toast.success(item ? "Đã cập nhật khoản cần trả." : "Đã thêm khoản cần trả.");
        onSaved(values.dueDate);
      } catch { toast.error("Chưa lưu được khoản cần trả. Vui lòng thử lại."); }
    });
  }
  return <dialog ref={dialog} aria-labelledby="payable-editor-title" onCancel={(event) => { event.preventDefault(); if (!pending) onClose(); }} className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 text-[var(--foreground)] shadow-2xl backdrop:bg-black/40 sm:p-6">
    <div className="mb-5 flex items-center justify-between"><h2 id="payable-editor-title" className="text-xl font-bold">{item ? "Sửa khoản cần trả" : "Thêm khoản cần trả"}</h2><button type="button" disabled={pending} onClick={onClose} aria-label="Đóng" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-[var(--surface-muted)]"><X size={20} /></button></div>
    <form onSubmit={form.handleSubmit(submit)}><fieldset disabled={pending} className="space-y-4 disabled:opacity-70">
      <label className="block text-sm font-semibold">Tên khoản cần trả<input {...form.register("title")} required autoFocus maxLength={100} placeholder="Ví dụ: Hóa đơn điện" className={inputClass} />{error("title")}</label>
      <label className="block text-sm font-semibold">Số tiền (đ)<MoneyInput value={amount} onValueChange={(value) => form.setValue("amount", value ?? 0, { shouldValidate: true })} onBlur={() => form.trigger("amount")} required min={1} max={1_000_000_000_000} placeholder="0" aria-label="Số tiền cần trả" />{error("amount")}</label>
      <label className="block text-sm font-semibold">Ngày cần trả<DateInput {...form.register("dueDate")} required min="1900-01-01" max="2100-12-31" className="mt-2" />{error("dueDate")}</label>
      <label className="block text-sm font-semibold">Ghi chú <span className="font-normal text-[var(--muted)]">(không bắt buộc)</span><textarea {...form.register("note")} rows={3} maxLength={500} className={`${inputClass} resize-y`} />{error("note")}</label>
      <Button type="submit" className="w-full">{pending ? "Đang lưu…" : "Lưu khoản cần trả"}</Button>
    </fieldset></form>
  </dialog>;
}

function DeleteConfirmation({ count, pending, onCancel, onConfirm }: { count: number; pending: boolean; onCancel: () => void; onConfirm: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog ref={dialog} aria-labelledby="delete-payables-title" onCancel={(event) => { event.preventDefault(); if (!pending) onCancel(); }} className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-sm rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 text-[var(--foreground)] shadow-2xl backdrop:bg-black/40">
    <h2 id="delete-payables-title" className="text-lg font-bold">Xóa {count} khoản cần trả?</h2><p className="mt-2 text-sm text-[var(--muted)]">Các khoản đã chọn sẽ bị xóa vĩnh viễn.</p>
    <div className="mt-6 flex justify-end gap-2"><Button variant="outline" disabled={pending} onClick={onCancel}>Hủy</Button><Button disabled={pending} onClick={onConfirm} className="bg-[var(--danger)] hover:brightness-90"><Trash2 size={16} /> {pending ? "Đang xóa…" : "Xóa"}</Button></div>
  </dialog>;
}

function CreditCardRepaymentDialog({ item, accounts, onClose, onPaid }: { item: CreditCardPayableRecord; accounts: AccountRecord[]; onClose: () => void; onPaid: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const idempotencyKey = useRef<string | null>(null);
  const sources = accounts.filter((account) => !account.is_archived && account.id !== item.creditAccountId);
  const card = accounts.find((account) => account.id === item.creditAccountId);
  const [sourceAccountId, setSourceAccountId] = useState(sources[0]?.id ?? "");
  const [amount, setAmount] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  useEffect(() => { dialog.current?.showModal(); }, []);

  function submit() {
    if (pending || !amount || amount > item.amount || !sourceAccountId) return;
    idempotencyKey.current ??= crypto.randomUUID();
    startTransition(async () => {
      try {
        const result = await payCreditCardAction({ cardId: item.creditAccountId, sourceAccountId, amount, idempotencyKey: idempotencyKey.current });
        if (!result.ok) { toast.error(result.error); return; }
        toast.success(`Đã hoàn trả ${formatCurrency(amount)} cho thẻ.`);
        onPaid();
      } catch { toast.error("Chưa ghi nhận được khoản hoàn trả. Vui lòng thử lại."); }
    });
  }

  return <dialog ref={dialog} aria-labelledby="repay-credit-card-title" onCancel={(event) => { event.preventDefault(); if (!pending) onClose(); }} className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 text-[var(--foreground)] shadow-2xl backdrop:bg-black/40">
    <div className="flex items-start justify-between gap-3"><div><h2 id="repay-credit-card-title" className="text-lg font-bold">Hoàn trả thẻ tín dụng</h2><p className="mt-1 text-sm text-[var(--muted)]">{card?.name ?? item.title}</p></div><button type="button" aria-label="Đóng" disabled={pending} onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-[var(--surface-muted)]"><X size={18} /></button></div>
    <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-[var(--surface-muted)] p-4 text-sm"><div><p className="text-[var(--muted)]">Hạn mức thẻ</p><p className="mt-1 font-semibold tabular-nums">{formatCurrency(card?.initial_balance ?? 0)}</p></div><div><p className="text-[var(--muted)]">Còn phải trả</p><p className="mt-1 font-semibold tabular-nums">{formatCurrency(item.amount)}</p></div></div>
    <label className="mt-5 block text-sm font-semibold">Trả từ tài khoản<select value={sourceAccountId} onChange={(event) => setSourceAccountId(event.target.value)} disabled={pending || sources.length === 0} className={inputClass}>{sources.map((account) => <option key={account.id} value={account.id}>{account.name} · {formatCurrency(account.current_balance)}</option>)}</select></label>
    {sources.length === 0 && <p className="mt-2 text-sm text-[var(--danger)]">Cần có một tài khoản nguồn khác để chuyển tiền vào thẻ.</p>}
    <label className="mt-4 block text-sm font-semibold">Số tiền đã trả (đ)<MoneyInput value={amount} onValueChange={(value) => setAmount(value ?? null)} min={1} max={item.amount} placeholder="0" aria-label="Số tiền đã trả" disabled={pending} /></label>
    {amount !== null && amount > item.amount && <p role="alert" className="mt-2 text-sm text-[var(--danger)]">Số tiền không được vượt quá khoản còn phải trả.</p>}
    <p className="mt-4 text-sm leading-6 text-[var(--muted)]">Ứng dụng sẽ tạo giao dịch chuyển tiền từ tài khoản nguồn vào thẻ. Số dư hai tài khoản và khoản còn phải trả được cập nhật cùng lúc.</p>
    <div className="mt-5 flex justify-end gap-2"><Button type="button" variant="outline" disabled={pending} onClick={onClose}>Hủy</Button><Button type="button" disabled={pending || !sourceAccountId || !amount || amount > item.amount} onClick={submit}>{pending ? "Đang lưu…" : "Ghi nhận đã trả"}</Button></div>
  </dialog>;
}

export function PayablesView({ payables, accounts, available, today }: { payables: PayableRecord[]; accounts: AccountRecord[]; available: boolean; today: string }) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [editor, setEditor] = useState<ManualPayableRecord | "new" | null>(null);
  const [paying, setPaying] = useState<CreditCardPayableRecord | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [deleting, setDeleting] = useState<string[] | null>(null);
  const [pending, startTransition] = useTransition();
  const visible = filterPayables(payables, { fromDate, toDate });
  const summary = summarizePayables(visible, today);
  const selectable = visible.filter((item): item is ManualPayableRecord => item.kind === "manual");
  const selectedVisible = selectable.filter((item) => selected.has(item.id)).map((item) => item.id);
  const allSelected = selectable.length > 0 && selectedVisible.length === selectable.length;

  function toggleSelected(id: string) { setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; }); }
  function togglePaid(item: ManualPayableRecord) {
    startTransition(async () => {
      try {
        const result = await setPayablePaidAction(item.id, !item.paidOn);
        if (!result.ok) { toast.error(result.error); return; }
        toast.success(item.paidOn ? "Đã chuyển về chưa trả." : "Đã đánh dấu đã trả.");
      } catch { toast.error("Chưa cập nhật được khoản cần trả. Vui lòng thử lại."); }
    });
  }
  function confirmDelete() {
    if (!deleting) return;
    startTransition(async () => {
      try {
        const result = await deletePayablesAction(deleting);
        if (!result.ok) { toast.error(result.error); return; }
        setSelected(new Set()); setSelecting(false); setDeleting(null);
        toast.success(`Đã xóa ${result.count} khoản cần trả.`);
      } catch { toast.error("Chưa xóa được khoản cần trả. Vui lòng thử lại."); }
    });
  }

  return <main className="min-w-0 px-4 pb-[calc(env(safe-area-inset-bottom)+7rem)] pt-5 sm:px-6 md:px-10 md:pb-12 md:pt-8"><div className="mx-auto max-w-[900px]">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-[var(--muted)]">Theo dõi các khoản sắp đến hạn</p><h1 className="mt-1 text-2xl font-bold md:text-3xl">Khoản cần trả</h1></div><Button size="sm" disabled={!available || pending} onClick={() => setEditor("new")}><Plus size={17} /> Thêm khoản cần trả</Button></header>
    {!available ? <Card className="mt-6 p-6"><p className="font-semibold">Khoản cần trả chưa sẵn sàng</p><p className="mt-2 text-sm text-[var(--muted)]">Tính năng đang chờ cập nhật dữ liệu. Bạn vẫn có thể sử dụng các mục khác.</p></Card> : <>
      <div className="mt-6"><DateRangePicker range={{ fromDate, toDate }} today={today} onChange={(next) => { setFromDate(next.fromDate); setToDate(next.toDate); setSelected(new Set()); setSelecting(false); }} /></div>
      <p className="mt-2 text-xs text-[var(--muted)]">Khoản hoàn trả thẻ tín dụng luôn hiển thị vì không có ngày trả.</p>
      <Card className="mt-5 bg-[var(--brand)] p-5 text-white sm:p-6"><p className="text-sm text-white/85">Còn cần trả</p><p className="mt-2 break-words text-3xl font-bold tabular-nums">{formatCurrency(summary.remaining)}</p><div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/20 pt-4"><div><p className="text-sm text-white/85">Tổng hiển thị</p><p className="mt-1 font-semibold tabular-nums">{formatCurrency(summary.total)}</p></div><div><p className="text-sm text-white/85">Quá hạn chưa trả</p><p className="mt-1 font-semibold tabular-nums">{formatCurrency(summary.overdue)}</p></div></div></Card>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Khoản hoàn trả thẻ tín dụng không có ngày trả và không tính vào tổng tài sản. Ghi nhận số tiền đã trả sẽ chuyển tiền từ tài khoản nguồn vào thẻ. Với khoản thường, “Đã trả” chỉ cập nhật danh sách.</p>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--muted)]">{summary.count} khoản · {summary.pendingCount} chưa trả</p>
        {selectable.length > 0 && (!selecting ? <Button size="sm" variant="outline" onClick={() => setSelecting(true)}>Chọn</Button> : <div className="flex flex-wrap items-center gap-3">
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(selectable.map((item) => item.id)))} className="h-4 w-4 accent-[var(--brand)]" /> Chọn tất cả</label>
          {selectedVisible.length > 0 && <Button size="sm" variant="outline" disabled={pending} onClick={() => setDeleting(selectedVisible)}><Trash2 size={16} /> Xóa đã chọn ({selectedVisible.length})</Button>}
          <button type="button" onClick={() => { setSelected(new Set()); setSelecting(false); }} className="min-h-11 text-sm font-semibold text-[var(--muted)]">Hủy chọn</button>
        </div>)}
      </div>
      <section className="mt-3" aria-label="Danh sách khoản cần trả">{visible.length ? <div className="grid gap-3">{visible.map((item) => { const card = item.kind === "credit_card_repayment" ? accounts.find((account) => account.id === item.creditAccountId) : null; return <Card key={item.id} className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          {selecting && item.kind === "manual" && <input type="checkbox" aria-label={`Chọn ${item.title}`} checked={selected.has(item.id)} onChange={() => toggleSelected(item.id)} className="mt-3 h-4 w-4 shrink-0 accent-[var(--brand)]" />}
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">{item.kind === "credit_card_repayment" ? <CreditCard size={21} /> : <HandCoins size={21} />}</div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><h2 className="break-words font-semibold">{item.title}</h2><p className="mt-1 text-sm text-[var(--muted)]">{item.dueDate ? `Hạn ${displayDate(item.dueDate)}` : "Loại: Hoàn trả thẻ tín dụng · Không có ngày trả"}</p></div><p className="break-words text-lg font-bold tabular-nums">{formatCurrency(item.amount)}</p></div>
            <p className={`mt-2 text-sm font-semibold ${item.kind === "credit_card_repayment" ? item.amount === 0 ? "text-[var(--brand)]" : "text-[var(--muted)]" : item.paidOn ? "text-[var(--brand)]" : item.dueDate < today ? "text-[var(--danger)]" : "text-[var(--muted)]"}`}>{item.kind === "credit_card_repayment" ? item.amount === 0 ? "Đã hoàn trả hết" : "Còn phải trả" : item.paidOn ? `Đã trả ${displayDate(item.paidOn)}` : item.dueDate < today ? "Quá hạn" : item.dueDate === today ? "Đến hạn hôm nay" : "Chưa trả"}</p>
            {card && <p className="mt-1 text-xs text-[var(--muted)]">Hạn mức {formatCurrency(card.initial_balance)} · Còn dùng được {formatCurrency(card.current_balance)}</p>}
            {item.note && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-[var(--muted)]">{item.note}</p>}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-[var(--border)] pt-3">{item.kind === "credit_card_repayment" ? <Button size="sm" variant="secondary" disabled={pending || item.amount === 0} onClick={() => setPaying(item)}><Check size={15} /> Ghi nhận đã trả</Button> : <><Button size="sm" variant={item.paidOn ? "outline" : "secondary"} disabled={pending} onClick={() => togglePaid(item)}>{item.paidOn ? <><RotateCcw size={15} /> Hoàn tác</> : <><Check size={15} /> Đã trả</>}</Button><Button size="sm" variant="ghost" disabled={pending} onClick={() => setEditor(item)} aria-label={`Sửa ${item.title}`}><Pencil size={16} /> Sửa</Button><Button size="sm" variant="ghost" disabled={pending} onClick={() => setDeleting([item.id])} aria-label={`Xóa ${item.title}`}><Trash2 size={16} /> Xóa</Button></>}</div>
      </Card>; })}</div> : <Card className="p-8 text-center"><HandCoins size={30} className="mx-auto text-[var(--brand)]" /><h2 className="mt-3 font-semibold">Chưa có khoản cần trả</h2><p className="mt-2 text-sm text-[var(--muted)]">Thêm một khoản mới hoặc chọn khoảng ngày khác.</p><Button onClick={() => setEditor("new")} className="mt-5"><Plus size={16} /> Thêm khoản cần trả</Button></Card>}</section>
    </>}
    {available && visible.length > 0 && <Button type="button" aria-label="Thêm khoản cần trả" disabled={pending} onClick={() => setEditor("new")} className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] right-4 z-20 h-14 w-14 rounded-full border-4 border-[var(--background)] p-0 shadow-xl md:hidden"><Plus size={24} /></Button>}
    {editor && <PayableEditor key={editor === "new" ? "new" : editor.id} item={editor === "new" ? null : editor} today={today} onClose={() => setEditor(null)} onSaved={(dueDate) => { setEditor(null); setFromDate(dueDate); setToDate(dueDate); setSelected(new Set()); setSelecting(false); }} />}
    {paying && <CreditCardRepaymentDialog key={paying.id} item={paying} accounts={accounts} onClose={() => setPaying(null)} onPaid={() => setPaying(null)} />}
    {deleting && <DeleteConfirmation count={deleting.length} pending={pending} onCancel={() => setDeleting(null)} onConfirm={confirmDelete} />}
  </div></main>;
}
