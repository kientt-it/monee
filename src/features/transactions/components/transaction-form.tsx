"use client";
/* React Hook Form's watch API is intentionally used for dependent transaction fields. */
/* eslint-disable react-hooks/incompatible-library */

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, CalendarDays, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createTransactionAction } from "@/features/transactions/actions/create-transaction";
import { updateTransactionAction } from "@/features/transactions/actions/update-transaction";
import { transactionFormSchema, type TransactionFormInput } from "@/features/transactions/schemas/transaction.schema";
import type { AccountRecord } from "@/features/accounts/queries/get-accounts";
import type { CategoryOption } from "@/features/transactions/queries/get-transaction-options";
import type { TransactionRecord } from "@/features/transactions/queries/get-transactions";

const fallbackAccounts: AccountRecord[] = [
  { id: "00000000-0000-0000-0000-000000000001", name: "Tiền mặt", type: "cash", current_balance: 1250000, currency: "VND", color: "#efaa47", is_archived: false, include_in_total: true },
  { id: "00000000-0000-0000-0000-000000000002", name: "Vietcombank", type: "bank", current_balance: 15700000, currency: "VND", color: "#087f5b", is_archived: false, include_in_total: true },
];
const fallbackCategories: CategoryOption[] = [
  { id: "00000000-0000-0000-0000-000000000011", name: "Ăn uống", type: "expense" },
  { id: "00000000-0000-0000-0000-000000000012", name: "Di chuyển", type: "expense" },
  { id: "00000000-0000-0000-0000-000000000013", name: "Lương", type: "income" },
];

export function TransactionForm({ accounts, categories, configured, transaction }: { accounts: AccountRecord[]; categories: CategoryOption[]; configured: boolean; transaction?: TransactionRecord }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const transactionAccountIds = new Set(transaction ? [transaction.account_id, transaction.destination_account_id].filter(Boolean) : []);
  const availableAccounts = configured ? accounts.filter((account) => !account.is_archived || transactionAccountIds.has(account.id)) : fallbackAccounts;
  const availableCategories = configured ? categories : fallbackCategories;
  const form = useForm<TransactionFormInput>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: transaction ? {
      type: transaction.type,
      amount: transaction.amount.toLocaleString("vi-VN"),
      accountId: transaction.account_id,
      destinationAccountId: transaction.destination_account_id,
      categoryId: transaction.category_id,
      merchant: transaction.merchant ?? "",
      note: transaction.note ?? "",
      transactionDate: transaction.transaction_date.slice(0, 10),
    } : {
      type: "expense", amount: "", accountId: (availableAccounts[0] ?? fallbackAccounts[0]).id,
      destinationAccountId: null, categoryId: (categories.find((item) => item.type === "expense") ?? fallbackCategories[0]).id,
      merchant: "", note: "", transactionDate: new Date().toISOString().slice(0, 10),
    },
  });
  const type = form.watch("type");
  const sourceAccountId = form.watch("accountId");
  const categoriesForType = availableCategories.filter((item) => item.type === (type === "income" ? "income" : "expense"));

  function submit(values: TransactionFormInput) {
    const payload = {
      ...values,
      amount: Number(values.amount.replaceAll(".", "")),
      transactionDate: new Date(`${values.transactionDate}T12:00:00+07:00`),
      merchant: values.merchant || null,
      note: values.note || null,
      categoryId: type === "transfer" ? null : values.categoryId || null,
      destinationAccountId: type === "transfer" ? values.destinationAccountId : null,
    };
    startTransition(async () => {
      const result = transaction ? await updateTransactionAction(transaction.id, payload) : await createTransactionAction(payload);
      if (!result.ok) {
        const message = result.error === "SUPABASE_NOT_CONFIGURED" ? "Hãy cấu hình Supabase trước khi lưu giao dịch thật." : result.error;
        toast.error(message);
        return;
      }
      if (transaction) { toast.success("Đã cập nhật giao dịch."); router.push(`/app/transactions/${transaction.id}`); router.refresh(); return; }
      form.reset(); toast.success("Đã lưu giao dịch.");
    });
  }

  const transactionTypes = [
    { value: "expense" as const, label: "Chi tiêu", icon: ArrowUpRight },
    { value: "income" as const, label: "Thu nhập", icon: ArrowDownLeft },
    { value: "transfer" as const, label: "Chuyển khoản", icon: ArrowLeftRight },
  ];

  return <main className="min-h-screen bg-[var(--background)] px-4 pb-10 pt-5 sm:px-6 md:px-10 md:pt-8"><div className="mx-auto max-w-2xl">
    <header className="flex items-center gap-3"><Link href={transaction ? `/app/transactions/${transaction.id}` : "/app/transactions"} aria-label="Quay lại giao dịch" className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)]"><ChevronLeft size={19} /></Link><div><p className="text-sm text-[var(--muted)]">Giao dịch</p><h1 className="mt-0.5 text-2xl font-bold tracking-tight">{transaction ? "Sửa giao dịch" : "Thêm giao dịch"}</h1></div></header>
    {!configured && <div className="mt-5 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--muted)]">Bản xem trước · form đã sẵn sàng nhưng chưa kết nối lưu dữ liệu.</div>}
    {configured && availableAccounts.length === 0 && <div className="mt-5 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-4 py-4 text-sm"><p className="font-semibold">Bạn cần một tài khoản đang hoạt động</p><p className="mt-1 text-[var(--muted)]">Tạo hoặc khôi phục tài khoản trước khi ghi giao dịch.</p><Link href="/app/accounts" className="mt-3 inline-flex min-h-11 items-center font-semibold text-[var(--brand)]">Đi đến tài khoản</Link></div>}
    <Card className="mt-6 p-5 sm:p-7"><form onSubmit={form.handleSubmit(submit)} className="space-y-5">
      <div className="grid grid-cols-3 gap-2 rounded-2xl bg-[var(--surface-muted)] p-1">{transactionTypes.map(({ value, label, icon: Icon }) => <button key={value} type="button" onClick={() => { form.setValue("type", value); form.setValue("categoryId", null); form.setValue("destinationAccountId", null); }} className={`flex min-h-11 items-center justify-center gap-1 rounded-xl text-xs font-semibold ${type === value ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm" : "text-[var(--muted)]"}`}><Icon size={15} />{label}</button>)}</div>
      <label className="block text-sm font-semibold">Số tiền<input autoFocus required {...form.register("amount")} onChange={(event) => { const digits = event.target.value.replace(/\D/g, ""); form.setValue("amount", digits ? Number(digits).toLocaleString("vi-VN") : "", { shouldValidate: true }); }} inputMode="numeric" className="mt-2 min-h-14 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-2xl font-bold tabular-nums" placeholder="0" />{form.formState.errors.amount && <span className="mt-1 block text-xs text-[var(--danger)]">{form.formState.errors.amount.message}</span>}</label>
      <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold">Tài khoản nguồn<select {...form.register("accountId")} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-base">{availableAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}{account.is_archived ? " (đã lưu trữ)" : ""}</option>)}</select></label>{type === "transfer" ? <label className="block text-sm font-semibold">Tài khoản đích<select {...form.register("destinationAccountId")} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-base"><option value="">Chọn tài khoản</option>{availableAccounts.filter((account) => account.id !== sourceAccountId).map((account) => <option key={account.id} value={account.id}>{account.name}{account.is_archived ? " (đã lưu trữ)" : ""}</option>)}</select>{form.formState.errors.destinationAccountId && <span className="mt-1 block text-xs text-[var(--danger)]">{form.formState.errors.destinationAccountId.message}</span>}</label> : <label className="block text-sm font-semibold">Danh mục<select {...form.register("categoryId")} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-base"><option value="">Chọn danh mục</option>{categoriesForType.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>}</div>
      <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold">Ngày giao dịch<div className="relative mt-2"><CalendarDays size={17} className="pointer-events-none absolute left-3 top-3 text-[var(--muted)]" /><input type="date" {...form.register("transactionDate")} className="min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] pl-10 pr-3 text-base" /></div></label><label className="block text-sm font-semibold">Nơi giao dịch<input {...form.register("merchant")} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-base" placeholder="Ví dụ: Highlands" /></label></div>
      <label className="block text-sm font-semibold">Ghi chú<textarea {...form.register("note")} rows={3} className="mt-2 w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-base" placeholder="Thêm ghi chú nếu cần" /></label>
      <Button type="submit" className="w-full" disabled={isPending || (configured && availableAccounts.length === 0)}>{isPending ? "Đang lưu…" : transaction ? "Lưu thay đổi" : "Lưu giao dịch"}</Button>
    </form></Card>
  </div></main>;
}
