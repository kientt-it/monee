"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, CreditCard, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MoneyInput } from "@/components/ui/money-input";
import { addMonths } from "@/features/reports/queries/report-period";
import { formatCurrency } from "@/lib/utils";
import type { getAllocation } from "../queries/get-allocation";
import type { AllocationLine, Installment } from "../logic";
import { actualForLine, installmentDue, interestPerPeriod, scheduledInstallmentAmount, totalInstallmentAmount, withNewInstallments } from "../logic";
import { deleteInstallmentAction, payInstallmentAction, saveAllocationAction, saveInstallmentAction } from "../actions/manage-allocation";

type Data = Awaited<ReturnType<typeof getAllocation>>;
const fieldClass = "mt-2 block min-h-11 min-w-0 w-full max-w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-base";

function monthLabel(month: string) { return `Tháng ${Number(month.slice(5, 7))}/${month.slice(0, 4)}`; }
function dueDate(month: string, day: number) {
  const [year, value] = month.slice(0, 7).split("-").map(Number);
  const last = new Date(Date.UTC(year, value, 0)).getUTCDate();
  return `${String(Math.min(day, last)).padStart(2, "0")}/${String(value).padStart(2, "0")}/${year}`;
}
function endMonth(item: Installment) { return addMonths(item.startMonth, item.termMonths - 1); }

type EditorValue = { creditAccountId: string; title: string; principalAmount: number | null; termMonths: number; startMonth: string; dueDay: number; interestMode: Installment["interestMode"]; interestRatePercent: string };
function InstallmentEditor({ item, cards, month, close, saved }: { item: Installment | null; cards: Data["accounts"]; month: string; close: () => void; saved: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState<EditorValue>({ creditAccountId: item?.creditAccountId ?? cards[0]?.id ?? "", title: item?.title ?? "", principalAmount: item?.principalAmount ?? null, termMonths: item?.termMonths ?? 3, startMonth: item?.startMonth ?? month, dueDay: item?.dueDay ?? 10, interestMode: item?.interestMode ?? "none", interestRatePercent: item?.interestRateBps ? String(item.interestRateBps / 100) : "" });
  useEffect(() => { dialog.current?.showModal(); }, []);
  const update = (patch: Partial<EditorValue>) => setValue((current) => ({ ...current, ...patch }));
  const rateText = value.interestRatePercent.replace(",", ".");
  const rateValid = value.interestMode === "none" || (/^\d+(?:\.\d{1,2})?$/.test(rateText) && Number(rateText) > 0 && Number(rateText) <= 100);
  const rateBps = value.interestMode === "none" ? 0 : rateValid ? Math.round(Number(rateText) * 100) : 0;
  const interest = value.principalAmount && rateValid ? interestPerPeriod(value.principalAmount, rateBps) : 0;
  const totalDue = value.principalAmount && rateValid && value.termMonths > 0 ? totalInstallmentAmount(value.principalAmount, value.termMonths, value.interestMode, rateBps) : 0;
  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!value.principalAmount || !value.creditAccountId || !rateValid) return;
    startTransition(async () => {
      try {
        const result = await saveInstallmentAction(item?.id ?? null, { creditAccountId: value.creditAccountId, title: value.title, principalAmount: value.principalAmount, termMonths: value.termMonths, dueDay: value.dueDay, startMonth: `${value.startMonth.slice(0, 7)}-01`, interestMode: value.interestMode, interestRateBps: rateBps });
        if (!result.ok) { toast.error(result.error); return; }
        toast.success(item ? "Đã sửa khoản trả góp." : "Đã thêm khoản trả góp.");
        saved();
      } catch { toast.error("Chưa lưu được khoản trả góp."); }
    });
  }
  return <dialog ref={dialog} aria-labelledby="installment-editor-title" onCancel={(event) => { event.preventDefault(); if (!pending) close(); }} className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 text-[var(--foreground)] shadow-2xl backdrop:bg-black/40">
    <div className="flex items-center justify-between"><h2 id="installment-editor-title" className="text-xl font-bold">{item ? "Sửa khoản trả góp" : "Thêm khoản trả góp"}</h2><button type="button" aria-label="Đóng" disabled={pending} onClick={close} className="flex h-10 w-10 items-center justify-center"><X size={20} /></button></div>
    <form onSubmit={submit} className="mt-5 space-y-4"><fieldset disabled={pending} className="space-y-4 disabled:opacity-70">
      <label className="block text-sm font-semibold">Thẻ tín dụng<select required value={value.creditAccountId} onChange={(event) => update({ creditAccountId: event.target.value })} className={fieldClass}>{cards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}</select></label>
      <label className="block text-sm font-semibold">Tên khoản trả góp<input required maxLength={100} value={value.title} onChange={(event) => update({ title: event.target.value })} placeholder="Ví dụ: Điện thoại" className={fieldClass} /></label>
      <label className="block text-sm font-semibold">Số tiền gốc trả góp (đ)<MoneyInput required value={value.principalAmount} onValueChange={(amount) => update({ principalAmount: amount ?? null })} min={1} max={1_000_000_000_000} placeholder="0" /></label>
      <div className="grid min-w-0 grid-cols-2 gap-3"><label className="block min-w-0 text-sm font-semibold">Số kỳ (tháng)<input required type="number" min={1} max={120} value={value.termMonths} onChange={(event) => update({ termMonths: Number(event.target.value) })} className={fieldClass} /></label><label className="block min-w-0 text-sm font-semibold">Ngày đến hạn mỗi tháng<input required type="number" min={1} max={31} value={value.dueDay} onChange={(event) => update({ dueDay: Number(event.target.value) })} className={fieldClass} />{(value.dueDay < 1 || value.dueDay > 31) && <span role="alert" className="mt-1 block text-xs text-[var(--danger)]">Chọn từ ngày 1 đến 31.</span>}</label></div>
      <div className="min-w-0 text-sm font-semibold"><span id="installment-start-month-label">Tháng bắt đầu</span><div role="group" aria-labelledby="installment-start-month-label" className="mt-2 grid min-w-0 grid-cols-2 gap-3"><select aria-label="Tháng bắt đầu" value={Number(value.startMonth.slice(5, 7))} onChange={(event) => update({ startMonth: `${value.startMonth.slice(0, 4)}-${String(event.target.value).padStart(2, "0")}-01` })} className="min-h-11 min-w-0 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-base">{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>Tháng {index + 1}</option>)}</select><select aria-label="Năm bắt đầu" value={Number(value.startMonth.slice(0, 4))} onChange={(event) => update({ startMonth: `${event.target.value}-${value.startMonth.slice(5, 7)}-01` })} className="min-h-11 min-w-0 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-base">{Array.from({ length: 201 }, (_, index) => 1900 + index).map((year) => <option key={year} value={year}>Năm {year}</option>)}</select></div></div>
      <label className="block min-w-0 text-sm font-semibold">Cách tính lãi<select value={value.interestMode} onChange={(event) => update({ interestMode: event.target.value as Installment["interestMode"] })} className={fieldClass}><option value="none">Không có lãi</option><option value="upfront">Lãi một lần kỳ đầu</option><option value="monthly_flat">Lãi % mỗi tháng</option></select></label>
      {value.interestMode !== "none" && <label className="block text-sm font-semibold">{value.interestMode === "upfront" ? "Lãi suất một lần (% trên gốc)" : "Lãi suất mỗi tháng (% trên gốc)"}<input required inputMode="decimal" type="text" value={value.interestRatePercent} onChange={(event) => update({ interestRatePercent: event.target.value })} placeholder="Ví dụ: 1,5" className={fieldClass} />{!rateValid && value.interestRatePercent && <span role="alert" className="mt-1 block text-xs text-[var(--danger)]">Nhập lãi suất lớn hơn 0 đến 100%, tối đa 2 chữ số thập phân.</span>}</label>}
      {value.principalAmount && value.termMonths > 0 && rateValid && <div className="rounded-xl bg-[var(--surface-muted)] p-3 text-sm text-[var(--muted)]"><p>Lãi {value.interestMode === "none" ? "0 đ" : value.interestMode === "upfront" ? `${formatCurrency(interest)} ở kỳ đầu` : `${formatCurrency(interest)}/tháng`} · Tổng dự tính {formatCurrency(totalDue)}</p><p className="mt-1">Gốc chia đều theo số kỳ; phần lẻ cộng vào kỳ cuối. Lãi dự tính chưa tự tạo giao dịch trên thẻ.</p></div>}
      <Button type="submit" className="w-full" disabled={!rateValid}>{pending ? "Đang lưu…" : "Lưu khoản trả góp"}</Button>
    </fieldset></form>
  </dialog>;
}

function RepaymentDialog({ item, accounts, close, paid }: { item: Installment; accounts: Data["accounts"]; close: () => void; paid: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const idempotencyKey = useRef<string | null>(null);
  const sources = accounts.filter((account) => !account.is_archived && account.type !== "credit_card" && account.id !== item.creditAccountId);
  const [sourceAccountId, setSourceAccountId] = useState(sources[0]?.id ?? "");
  const [amount, setAmount] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const remaining = item.totalAmount - item.paidTotal;
  useEffect(() => { dialog.current?.showModal(); }, []);
  function submit() {
    if (!amount || amount > remaining || !sourceAccountId) return;
    idempotencyKey.current ??= crypto.randomUUID();
    startTransition(async () => {
      try {
        const result = await payInstallmentAction({ installmentId: item.id, sourceAccountId, amount, idempotencyKey: idempotencyKey.current });
        if (!result.ok) { toast.error(result.error); return; }
        toast.success(`Đã hoàn trả ${formatCurrency(amount)}.`);
        paid();
      } catch { toast.error("Chưa ghi nhận được khoản hoàn trả."); }
    });
  }
  return <dialog ref={dialog} aria-labelledby="installment-payment-title" onCancel={(event) => { event.preventDefault(); if (!pending) close(); }} className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 text-[var(--foreground)] shadow-2xl backdrop:bg-black/40">
    <div className="flex items-center justify-between"><h2 id="installment-payment-title" className="text-lg font-bold">Trả góp · {item.title}</h2><button type="button" aria-label="Đóng" disabled={pending} onClick={close} className="flex h-10 w-10 items-center justify-center"><X size={19} /></button></div>
    <p className="mt-2 text-sm text-[var(--muted)]">Còn {formatCurrency(remaining)} theo lịch dự tính. Tiền được chuyển từ tài khoản nguồn vào thẻ tín dụng; số tiền chuyển không thể vượt dư nợ thực tế trên thẻ.</p>
    <label className="mt-5 block text-sm font-semibold">Tài khoản nguồn<select value={sourceAccountId} onChange={(event) => setSourceAccountId(event.target.value)} disabled={pending} className={fieldClass}>{sources.map((account) => <option key={account.id} value={account.id}>{account.name} · {formatCurrency(account.current_balance)}</option>)}</select></label>
    {sources.length === 0 && <p className="mt-2 text-sm text-[var(--danger)]">Cần một tài khoản nguồn không phải thẻ tín dụng.</p>}
    <label className="mt-4 block text-sm font-semibold">Số tiền đã trả (đ)<MoneyInput value={amount} onValueChange={(next) => setAmount(next ?? null)} min={1} max={remaining} disabled={pending} placeholder="0" /></label>
    {amount !== null && amount > remaining && <p role="alert" className="mt-2 text-sm text-[var(--danger)]">Số tiền vượt quá khoản trả góp còn lại.</p>}
    <div className="mt-6 flex justify-end gap-2"><Button variant="outline" disabled={pending} onClick={close}>Hủy</Button><Button disabled={pending || !sourceAccountId || !amount || amount > remaining} onClick={submit}>{pending ? "Đang lưu…" : "Ghi nhận đã trả"}</Button></div>
  </dialog>;
}

export function AllocationView(data: Data) {
  const router = useRouter();
  const [lines, setLines] = useState<AllocationLine[]>(data.lines);
  const [plannedIncome, setPlannedIncome] = useState<number | null>(data.plannedIncome);
  const [editor, setEditor] = useState<Installment | "new" | null>(null);
  const [paying, setPaying] = useState<Installment | null>(null);
  const [pending, startTransition] = useTransition();
  const cards = data.accounts.filter((account) => account.type === "credit_card");
  const activeCards = cards.filter((account) => !account.is_archived);
  const budget = plannedIncome ?? data.actualIncome;
  const allocated = lines.reduce((sum, line) => sum + line.amount, 0);
  const actualByLine = lines.map((line) => actualForLine(line, lines, data.actuals));
  const used = actualByLine.reduce((sum, amount, index) => sum + (lines[index].payableId ? 0 : amount), 0);
  function changeLine(index: number, patch: Partial<AllocationLine>) { setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line)); }
  function navigate(month: string) { router.push(`/app/allocations?month=${month.slice(0, 7)}`); }
  function save() {
    startTransition(async () => {
      try {
        const result = await saveAllocationAction({ month: data.month, plannedIncome, lines });
        if (!result.ok) { toast.error(result.error); return; }
        toast.success("Đã lưu phân bổ tháng."); router.refresh();
      } catch { toast.error("Chưa lưu được phân bổ tháng."); }
    });
  }
  function removeInstallment(item: Installment) {
    if (!window.confirm(`Xóa lịch trả góp “${item.title}”? Giao dịch đã trả vẫn được giữ.`)) return;
    startTransition(async () => {
      try {
        const result = await deleteInstallmentAction(item.id);
        if (!result.ok) { toast.error(result.error); return; }
        toast.success("Đã xóa lịch trả góp."); router.refresh();
      } catch { toast.error("Chưa xóa được lịch trả góp."); }
    });
  }
  return <main className="min-w-0 px-4 pb-[calc(env(safe-area-inset-bottom)+7rem)] pt-5 sm:px-6 md:px-10 md:pb-12 md:pt-8"><div className="mx-auto max-w-[960px]">
    <header><p className="text-sm text-[var(--muted)]">Lập kế hoạch cho từng tháng</p><h1 className="mt-1 text-2xl font-bold md:text-3xl">Phân bổ thu nhập</h1></header>
    {!data.available ? <Card className="mt-6 p-6"><p className="font-semibold">Phân bổ thu nhập chưa sẵn sàng</p><p className="mt-2 text-sm text-[var(--muted)]">Cần áp dụng migration dữ liệu mới trước khi sử dụng màn hình này.</p></Card> : <>
      <div className="mt-6 flex items-center justify-between gap-3"><Button type="button" variant="outline" size="icon" aria-label="Tháng trước" onClick={() => navigate(addMonths(data.month, -1))}><ChevronLeft size={19} /></Button><h2 className="text-lg font-bold">{monthLabel(data.month)}</h2><Button type="button" variant="outline" size="icon" aria-label="Tháng sau" onClick={() => navigate(addMonths(data.month, 1))}><ChevronRight size={19} /></Button></div>
      <Card className="mt-5 p-5 sm:p-6"><div className="grid gap-5 sm:grid-cols-2"><div><p className="text-sm text-[var(--muted)]">Thu nhập đã ghi nhận</p><p className="mt-1 text-2xl font-bold tabular-nums">{formatCurrency(data.actualIncome)}</p></div><label className="block text-sm font-semibold">Thu nhập dự kiến (nếu muốn lập trước)<MoneyInput value={plannedIncome} onValueChange={(value) => setPlannedIncome(value ?? null)} min={0} max={1_000_000_000_000} placeholder="Theo thu nhập thực tế" /></label></div><p className="mt-3 text-xs text-[var(--muted)]">Ngân sách tính theo thu nhập dự kiến nếu có; nếu để trống sẽ dùng thu nhập đã ghi nhận trong tháng.</p></Card>
      <Card className="mt-4 bg-[var(--brand)] p-5 text-white sm:p-6"><p className="text-sm text-white/85">Còn chưa phân bổ</p><p className="mt-1 text-3xl font-bold tabular-nums">{formatCurrency(budget - allocated)}</p><div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/20 pt-4 text-sm"><div><p className="text-white/85">Đã phân bổ</p><p className="mt-1 font-semibold tabular-nums">{formatCurrency(allocated)}</p></div><div><p className="text-white/85">Đã dùng / đã dành</p><p className="mt-1 font-semibold tabular-nums">{formatCurrency(used)}</p></div></div></Card>
      {allocated > budget && <p role="status" className="mt-2 text-sm font-semibold text-[var(--danger)]">Tổng phân bổ đang vượt thu nhập dùng để lập kế hoạch {formatCurrency(allocated - budget)}.</p>}
      <section className="mt-7" aria-labelledby="allocation-lines-title"><div className="flex flex-wrap items-center justify-between gap-2"><h2 id="allocation-lines-title" className="text-xl font-bold">Các khoản phân bổ</h2><div className="flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" onClick={() => setLines((current) => [...current, { kind: "debt", title: "Trả nợ", amount: 0, installmentId: null, creditAccountId: null, categoryId: null, goalId: null, payableId: null }])}><Plus size={16} /> Thêm khoản nợ</Button><Button type="button" size="sm" variant="outline" onClick={() => setLines((current) => [...current, { kind: "custom", title: "Mục khác", amount: 0, installmentId: null, creditAccountId: null, categoryId: null, goalId: null, payableId: null }])}><Plus size={16} /> Thêm mục</Button><Button type="button" size="sm" disabled={pending} onClick={save}>{pending ? "Đang lưu…" : "Lưu tháng"}</Button></div></div>
        {data.previousLines.length > 0 && <button type="button" className="mt-2 min-h-10 text-sm font-semibold text-[var(--brand)]" onClick={() => setLines(withNewInstallments(data.previousLines, data.installments, data.month))}>Sao chép phân bổ tháng trước</button>}
        <div className="mt-3 grid gap-3">{lines.map((line, index) => { const tracked = actualByLine[index] ?? 0; const item = line.installmentId ? data.installments.find((value) => value.id === line.installmentId) : null; const card = line.creditAccountId ? data.accounts.find((account) => account.id === line.creditAccountId) : null; const cardDebt = card ? Math.max(0, (card.credit_limit ?? 0) - card.current_balance) : 0; return <Card key={`${line.installmentId ?? line.creditAccountId ?? line.kind}-${index}`} className="p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{line.kind === "living" ? "Sinh hoạt" : line.kind === "debt" ? "Trả nợ" : line.kind === "reserve" ? "Dự phòng" : line.kind === "card_installment" ? "Trả góp thẻ" : line.kind === "card_repayment" ? "Hoàn trả thẻ khác" : "Mục riêng"}</p>{line.kind === "card_installment" || line.kind === "card_repayment" ? <h3 className="mt-1 break-words font-semibold">{line.title}</h3> : <input aria-label={`Tên mục ${index + 1}`} value={line.title} maxLength={100} onChange={(event) => changeLine(index, { title: event.target.value })} className="mt-1 min-h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 font-semibold" />}</div>{(line.kind === "custom" || line.kind === "card_repayment" || (line.kind === "debt" && index > 0)) && <button type="button" aria-label={`Xóa ${line.title}`} onClick={() => setLines((current) => current.filter((_, position) => position !== index))} className="flex h-10 w-10 shrink-0 items-center justify-center text-[var(--danger)]"><Trash2 size={18} /></button>}</div>
          {item && <p className="mt-1 text-xs text-[var(--muted)]">{data.accounts.find((account) => account.id === item.creditAccountId)?.name ?? "Thẻ tín dụng"} · Cần trong tháng {formatCurrency(installmentDue(item, data.month))}</p>}
          {card && <p className="mt-1 text-xs text-[var(--muted)]">Dư nợ thẻ hiện tại: {formatCurrency(cardDebt)}. Chọn số tiền muốn phân bổ trong tháng.</p>}
          <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold">Dự tính phân bổ (đ)<MoneyInput value={line.amount} onValueChange={(amount) => changeLine(index, { amount: amount ?? 0 })} min={0} max={1_000_000_000_000} /></label><div className="flex flex-col justify-end text-sm"><span className="text-[var(--muted)]">{line.payableId ? "Đã đánh dấu trả" : line.kind === "reserve" && line.goalId ? "Đã góp vào mục tiêu" : "Đã dùng / đã dành"}</span><strong className="mt-1 tabular-nums">{formatCurrency(tracked)}</strong><span className="mt-1 text-xs text-[var(--muted)]">Còn theo kế hoạch {formatCurrency(line.amount - tracked)}</span></div></div>
          {line.kind === "debt" && <label className="mt-3 block text-xs font-semibold text-[var(--muted)]">Khoản cần trả cần theo dõi<select value={line.payableId ?? ""} onChange={(event) => { const selected = data.payables.find((payable) => payable.id === event.target.value); changeLine(index, { payableId: selected?.id ?? null, categoryId: null, ...(selected ? { title: selected.title, amount: selected.amount } : {}) }); }} className={fieldClass}><option value="">Theo danh mục giao dịch</option>{data.payables.map((payable) => <option key={payable.id} value={payable.id}>{payable.title} · {formatCurrency(payable.amount)}</option>)}</select></label>}
          {line.kind !== "card_installment" && line.kind !== "card_repayment" && line.kind !== "reserve" && !line.payableId && <label className="mt-3 block text-xs font-semibold text-[var(--muted)]">{line.kind === "living" ? "Danh mục chi tiêu (để trống: các khoản chi chưa gán mục)" : "Danh mục giao dịch để theo dõi số đã dùng"}<select value={line.categoryId ?? ""} onChange={(event) => changeLine(index, { categoryId: event.target.value || null, payableId: null })} className={fieldClass}><option value="">{line.kind === "living" ? "Chi tiêu chưa gán mục" : "Chưa liên kết danh mục"}</option>{data.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>}
          {line.kind === "reserve" && <label className="mt-3 block text-xs font-semibold text-[var(--muted)]">Nguồn theo dõi<select value={line.goalId ?? ""} onChange={(event) => changeLine(index, { goalId: event.target.value || null })} className={fieldClass}><option value="">Chuyển vào tài khoản tiết kiệm</option>{data.goals.map((goal) => <option key={goal.id} value={goal.id}>Mục tiêu: {goal.name}</option>)}</select></label>}
        </Card>; })}</div>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Lưu kế hoạch không chuyển tiền. Chi tiêu từ thẻ tín dụng được tính khi hoàn trả thẻ. Khoản cần trả thường chỉ được đánh dấu đã trả, nên trạng thái đó không cộng vào tổng đã dùng; liên kết danh mục giao dịch nếu muốn tính theo tiền chi thực tế.</p>
      </section>
      <section className="mt-9" aria-labelledby="installment-title"><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 id="installment-title" className="text-xl font-bold">Trả góp thẻ tín dụng</h2><p className="mt-1 text-sm text-[var(--muted)]">Mỗi món có số tiền và thời hạn riêng.</p></div><Button type="button" size="sm" disabled={activeCards.length === 0} onClick={() => setEditor("new")}><Plus size={16} /> Thêm trả góp</Button></div>
        {activeCards.length === 0 && <p className="mt-3 text-sm text-[var(--muted)]">Thêm thẻ tín dụng ở mục Tài khoản để lập lịch trả góp.</p>}
        <div className="mt-4 grid gap-3">{data.installments.map((item) => { const remaining = Math.max(0, item.totalAmount - item.paidTotal); const due = installmentDue(item, data.month); return <Card key={item.id} className="p-4 sm:p-5"><div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]"><CreditCard size={20} /></div><div className="min-w-0 flex-1"><h3 className="break-words font-semibold">{item.title}</h3><p className="mt-1 text-sm text-[var(--muted)]">{data.accounts.find((account) => account.id === item.creditAccountId)?.name ?? "Thẻ đã lưu trữ"} · {item.termMonths} kỳ · đến hạn ngày {item.dueDay} mỗi tháng</p><p className="mt-1 text-xs text-[var(--muted)]">Gốc {formatCurrency(item.principalAmount)} · Lãi dự tính {formatCurrency(item.totalAmount - item.principalAmount)} · Tổng {formatCurrency(item.totalAmount)}</p></div><p className="text-right font-bold tabular-nums">{formatCurrency(remaining)}<span className="block text-xs font-normal text-[var(--muted)]">còn lại</span></p></div>
          <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-[var(--surface-muted)] p-3 text-sm sm:grid-cols-3"><div><p className="text-[var(--muted)]">Kỳ tháng này</p><p className="mt-1 font-semibold tabular-nums">{formatCurrency(scheduledInstallmentAmount(item, data.month))}</p></div><div><p className="text-[var(--muted)]">Cần trả đến tháng này</p><p className="mt-1 font-semibold tabular-nums">{formatCurrency(due)}</p></div><div className="col-span-2 sm:col-span-1"><p className="text-[var(--muted)]">Đã trả tổng cộng</p><p className="mt-1 font-semibold tabular-nums">{formatCurrency(item.paidTotal)}</p></div></div>
          <p className="mt-3 text-xs text-[var(--muted)]">Từ {monthLabel(item.startMonth)} đến {monthLabel(endMonth(item))} · kỳ này dự kiến {dueDate(data.month, item.dueDay)}</p>
          <div className="mt-3 flex flex-wrap gap-2"><Button type="button" size="sm" disabled={remaining === 0 || pending} onClick={() => setPaying(item)}>Ghi nhận trả</Button><Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => setEditor(item)}><Pencil size={14} /> Sửa</Button><Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => removeInstallment(item)} className="text-[var(--danger)]"><Trash2 size={14} /> Xóa</Button></div>
        </Card>; })}</div>
      </section>
    </>}
    {editor && <InstallmentEditor item={editor === "new" ? null : editor} cards={editor === "new" ? activeCards : cards} month={data.month} close={() => setEditor(null)} saved={() => { setEditor(null); router.refresh(); }} />}
    {paying && <RepaymentDialog item={paying} accounts={data.accounts} close={() => setPaying(null)} paid={() => { setPaying(null); router.refresh(); }} />}
  </div></main>;
}
