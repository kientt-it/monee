"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Archive, ArchiveRestore, Building2, CreditCard, Eye, EyeOff, Landmark, Pencil, Plus, WalletCards, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createAccountAction } from "@/features/accounts/actions/create-account";
import { archiveAccountAction, restoreAccountAction, updateAccountAction } from "@/features/accounts/actions/update-account";
import { accountMetadataSchema, accountSchema, type AccountInput, type AccountMetadataInput } from "@/features/accounts/schemas/account.schema";
import type { AccountRecord } from "@/features/accounts/queries/get-accounts";
import { formatCurrency } from "@/lib/utils";

const typeLabels: Record<AccountRecord["type"], string> = {
  cash: "Tiền mặt",
  bank: "Ngân hàng",
  ewallet: "Ví điện tử",
  credit_card: "Thẻ tín dụng",
  saving: "Tiết kiệm",
  investment: "Đầu tư",
  other: "Khác",
};
const typeIcons = { cash: WalletCards, bank: Landmark, ewallet: WalletCards, credit_card: CreditCard, saving: Building2, investment: Building2, other: WalletCards };

const demoAccounts: AccountRecord[] = [
  { id: "demo-cash", name: "Tiền mặt", type: "cash", current_balance: 1_250_000, currency: "VND", color: "#efaa47", is_archived: false, include_in_total: true },
  { id: "demo-bank", name: "Vietcombank", type: "bank", current_balance: 15_700_000, currency: "VND", color: "#087f5b", is_archived: false, include_in_total: true },
  { id: "demo-wallet", name: "Momo", type: "ewallet", current_balance: 850_000, currency: "VND", color: "#a477b9", is_archived: false, include_in_total: true },
  { id: "demo-saving", name: "Tiết kiệm", type: "saving", current_balance: 35_000_000, currency: "VND", color: "#8795c4", is_archived: false, include_in_total: true },
];

export function AccountsView({ accounts, configured }: { accounts: AccountRecord[]; configured: boolean }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<"create" | "edit" | null>(null);
  const [editingAccount, setEditingAccount] = useState<AccountRecord | null>(null);
  const [confirmingArchive, setConfirmingArchive] = useState<AccountRecord | null>(null);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState("");
  const visibleAccounts = configured ? accounts : demoAccounts;
  const activeAccounts = visibleAccounts.filter((account) => !account.is_archived);
  const archivedAccounts = visibleAccounts.filter((account) => account.is_archived);
  const total = activeAccounts.filter((account) => account.include_in_total).reduce((sum, account) => sum + account.current_balance, 0);

  const createForm = useForm<AccountInput>({
    resolver: zodResolver(accountSchema),
    defaultValues: { name: "", type: "cash", initialBalance: 0, currency: "VND", color: "#087f5b", includeInTotal: true },
  });
  const editForm = useForm<AccountMetadataInput>({
    resolver: zodResolver(accountMetadataSchema),
    defaultValues: { name: "", type: "cash", currency: "VND", color: "#087f5b", includeInTotal: true },
  });

  function openCreateDialog() {
    setFeedback("");
    createForm.reset({ name: "", type: "cash", initialBalance: 0, currency: "VND", color: "#087f5b", includeInTotal: true });
    setDialog("create");
  }

  function openEditDialog(account: AccountRecord) {
    setFeedback("");
    setEditingAccount(account);
    editForm.reset({ name: account.name, type: account.type, currency: "VND", color: account.color ?? "#087f5b", includeInTotal: account.include_in_total });
    setDialog("edit");
  }

  function submitCreate(values: AccountInput) {
    setFeedback("");
    startTransition(async () => {
      const result = await createAccountAction(values);
      if (!result.ok) {
        setFeedback(result.error === "SUPABASE_NOT_CONFIGURED" ? "Hãy cấu hình Supabase trước khi lưu dữ liệu thật." : result.error);
        return;
      }
      setDialog(null);
      router.refresh();
    });
  }

  function submitEdit(values: AccountMetadataInput) {
    if (!editingAccount) return;
    setFeedback("");
    startTransition(async () => {
      const result = await updateAccountAction(editingAccount.id, values);
      if (!result.ok) {
        setFeedback(result.error === "SUPABASE_NOT_CONFIGURED" ? "Hãy cấu hình Supabase trước khi lưu dữ liệu thật." : result.error);
        return;
      }
      setDialog(null);
      setEditingAccount(null);
      router.refresh();
    });
  }

  function archiveAccount() {
    if (!confirmingArchive) return;
    setFeedback("");
    startTransition(async () => {
      const result = await archiveAccountAction(confirmingArchive.id);
      if (!result.ok) {
        setFeedback(result.error);
        return;
      }
      setConfirmingArchive(null);
      router.refresh();
    });
  }

  function restoreAccount(account: AccountRecord) {
    setFeedback("");
    startTransition(async () => {
      const result = await restoreAccountAction(account.id);
      if (!result.ok) {
        setFeedback(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 pb-28 pt-5 sm:px-6 md:px-10 md:pb-12 md:pt-8">
      <div className="mx-auto max-w-[900px]">
        <header className="flex items-center justify-between gap-4">
          <div><p className="text-sm text-[var(--muted)]">Không gian của bạn</p><h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">Tài khoản</h1></div>
          <Button size="sm" onClick={openCreateDialog}><Plus size={16} /> Thêm tài khoản</Button>
        </header>

        {!configured && <div className="mt-5 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--muted)]">Bản xem trước · các số dư dưới đây là dữ liệu minh họa, chưa được lưu.</div>}
        {feedback && !dialog && !confirmingArchive && <p role="alert" className="mt-5 rounded-xl bg-[#fff0ed] px-3 py-2 text-sm text-[var(--danger)]">{feedback}</p>}

        <Card className="mt-6 overflow-hidden bg-[var(--brand)] text-white">
          <CardContent className="p-6">
            <p className="text-sm text-white/75">Tổng số dư được tính</p>
            <p className="mt-2 text-3xl font-bold tabular-nums">{formatCurrency(total)}</p>
            <p className="mt-2 text-xs text-white/70">{activeAccounts.length} tài khoản đang hoạt động · {activeAccounts.filter((account) => account.include_in_total).length} được tính vào tổng</p>
          </CardContent>
        </Card>

        <section className="mt-7">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-base font-semibold">Tài khoản của bạn</h2><span className="text-xs text-[var(--muted)]">Cập nhật theo số dư hiện tại</span></div>
          {configured && activeAccounts.length === 0 ? (
            <Card><CardContent className="p-8 text-center"><WalletCards className="mx-auto text-[var(--brand)]" size={30} /><p className="mt-3 font-semibold">Chưa có tài khoản đang hoạt động</p><p className="mt-1 text-sm text-[var(--muted)]">Tạo tài khoản mới hoặc khôi phục một tài khoản đã lưu trữ.</p><Button className="mt-5" onClick={openCreateDialog}><Plus size={16} /> Tạo tài khoản đầu tiên</Button></CardContent></Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {activeAccounts.map((account) => {
                const Icon = typeIcons[account.type];
                return (
                  <Card key={account.id} className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white" style={{ background: account.color ?? "var(--brand)" }}><Icon size={19} /></div>
                      <div className="min-w-0 flex-1"><p className="truncate font-semibold">{account.name}</p><p className="mt-0.5 flex items-center gap-1 text-xs text-[var(--muted)]">{typeLabels[account.type]} · {account.include_in_total ? <><Eye size={12} /> Có trong tổng</> : <><EyeOff size={12} /> Không tính tổng</>}</p></div>
                      <div className="text-right"><p className="font-bold tabular-nums">{formatCurrency(account.current_balance)}</p><div className="mt-1 flex justify-end gap-1"><button type="button" aria-label={`Sửa ${account.name}`} onClick={() => openEditDialog(account)} className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--surface-muted)]"><Pencil size={15} /></button><button type="button" aria-label={`Lưu trữ ${account.name}`} onClick={() => { setFeedback(""); setConfirmingArchive(account); }} className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--surface-muted)]"><Archive size={15} /></button></div></div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {archivedAccounts.length > 0 && (
          <section className="mt-8">
            <div className="mb-3"><h2 className="text-base font-semibold">Đã lưu trữ</h2><p className="mt-1 text-xs text-[var(--muted)]">Vẫn giữ nguyên số dư và lịch sử giao dịch.</p></div>
            <div className="space-y-2">
              {archivedAccounts.map((account) => {
                const Icon = typeIcons[account.type];
                return <Card key={account.id} className="p-4 opacity-75"><div className="flex items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-muted)] text-[var(--muted)]"><Icon size={17} /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{account.name}</p><p className="text-xs text-[var(--muted)]">{typeLabels[account.type]} · {formatCurrency(account.current_balance)}</p></div><Button type="button" variant="outline" size="sm" onClick={() => restoreAccount(account)} disabled={isPending}><ArchiveRestore size={14} /> Khôi phục</Button></div></Card>;
              })}
            </div>
          </section>
        )}
      </div>

      {dialog === "create" && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/35 p-0 sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="create-account-title" className="w-full max-w-lg rounded-t-[24px] bg-[var(--surface)] p-5 shadow-2xl sm:rounded-[24px]">
            <div className="mb-5 flex items-center justify-between"><div><h2 id="create-account-title" className="text-lg font-bold">Thêm tài khoản</h2><p className="mt-1 text-sm text-[var(--muted)]">Số dư ban đầu chỉ dùng một lần.</p></div><button type="button" aria-label="Đóng" onClick={() => setDialog(null)} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-[var(--surface-muted)]"><X size={19} /></button></div>
            <form onSubmit={createForm.handleSubmit(submitCreate)} className="space-y-4">
              <label className="block text-sm font-semibold">Tên tài khoản<input {...createForm.register("name")} autoFocus className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-base" placeholder="Ví dụ: Techcombank" />{createForm.formState.errors.name && <span className="mt-1 block text-xs text-[var(--danger)]">{createForm.formState.errors.name.message}</span>}</label>
              <div className="grid grid-cols-[1fr_72px] gap-3"><label className="block text-sm font-semibold">Loại tài khoản<select {...createForm.register("type")} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-base">{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="block text-sm font-semibold">Màu<input {...createForm.register("color")} type="color" className="mt-2 h-11 w-full cursor-pointer rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1" /></label></div>
              <label className="block text-sm font-semibold">Số dư ban đầu<input {...createForm.register("initialBalance", { valueAsNumber: true })} type="number" min="0" step="1" inputMode="numeric" className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-base" placeholder="0" />{createForm.formState.errors.initialBalance && <span className="mt-1 block text-xs text-[var(--danger)]">{createForm.formState.errors.initialBalance.message}</span>}</label>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-[var(--surface-muted)] p-3 text-sm"><input {...createForm.register("includeInTotal")} type="checkbox" className="mt-1 h-4 w-4 accent-[var(--brand)]" /><span><strong className="block">Tính vào tổng tài sản</strong><span className="mt-0.5 block text-xs text-[var(--muted)]">Có thể thay đổi sau mà không ảnh hưởng số dư.</span></span></label>
              {feedback && <p role="alert" className="rounded-xl bg-[#fff0ed] px-3 py-2 text-sm text-[var(--danger)]">{feedback}</p>}
              <Button type="submit" className="w-full" disabled={isPending}>{isPending ? "Đang lưu…" : "Lưu tài khoản"}</Button>
            </form>
          </section>
        </div>
      )}

      {dialog === "edit" && editingAccount && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/35 p-0 sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="edit-account-title" className="w-full max-w-lg rounded-t-[24px] bg-[var(--surface)] p-5 shadow-2xl sm:rounded-[24px]">
            <div className="mb-5 flex items-center justify-between"><div><h2 id="edit-account-title" className="text-lg font-bold">Sửa tài khoản</h2><p className="mt-1 text-sm text-[var(--muted)]">Số dư chỉ thay đổi qua giao dịch.</p></div><button type="button" aria-label="Đóng" onClick={() => setDialog(null)} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-[var(--surface-muted)]"><X size={19} /></button></div>
            <form onSubmit={editForm.handleSubmit(submitEdit)} className="space-y-4">
              <label className="block text-sm font-semibold">Tên tài khoản<input {...editForm.register("name")} autoFocus className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-base" />{editForm.formState.errors.name && <span className="mt-1 block text-xs text-[var(--danger)]">{editForm.formState.errors.name.message}</span>}</label>
              <div className="grid grid-cols-[1fr_72px] gap-3"><label className="block text-sm font-semibold">Loại tài khoản<select {...editForm.register("type")} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-base">{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="block text-sm font-semibold">Màu<input {...editForm.register("color")} type="color" className="mt-2 h-11 w-full cursor-pointer rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1" /></label></div>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-[var(--surface-muted)] p-3 text-sm"><input {...editForm.register("includeInTotal")} type="checkbox" className="mt-1 h-4 w-4 accent-[var(--brand)]" /><span><strong className="block">Tính vào tổng tài sản</strong><span className="mt-0.5 block text-xs text-[var(--muted)]">Tắt nếu đây là tài khoản chỉ dùng để theo dõi riêng.</span></span></label>
              {feedback && <p role="alert" className="rounded-xl bg-[#fff0ed] px-3 py-2 text-sm text-[var(--danger)]">{feedback}</p>}
              <Button type="submit" className="w-full" disabled={isPending}>{isPending ? "Đang lưu…" : "Lưu thay đổi"}</Button>
            </form>
          </section>
        </div>
      )}

      {confirmingArchive && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/35 sm:items-center sm:p-4" role="presentation">
          <section role="alertdialog" aria-modal="true" aria-labelledby="archive-title" aria-describedby="archive-description" className="w-full max-w-md rounded-t-[24px] bg-[var(--surface)] p-5 shadow-2xl sm:rounded-[24px]">
            <div className="flex items-start justify-between"><div><h2 id="archive-title" className="text-lg font-bold">Lưu trữ {confirmingArchive.name}?</h2><p id="archive-description" className="mt-2 text-sm leading-6 text-[var(--muted)]">Tài khoản sẽ không còn xuất hiện khi tạo giao dịch mới hoặc trong tổng tài sản. Số dư và lịch sử cũ vẫn được giữ nguyên.</p></div><button type="button" aria-label="Đóng" onClick={() => setConfirmingArchive(null)} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-[var(--surface-muted)]"><X size={18} /></button></div>
            {feedback && <p role="alert" className="mt-4 rounded-xl bg-[#fff0ed] px-3 py-2 text-sm text-[var(--danger)]">{feedback}</p>}
            <div className="mt-5 grid grid-cols-2 gap-3"><Button variant="outline" onClick={() => setConfirmingArchive(null)}>Hủy</Button><Button className="bg-[var(--danger)] hover:bg-[var(--danger)]" onClick={archiveAccount} disabled={isPending}>{isPending ? "Đang lưu trữ…" : "Lưu trữ"}</Button></div>
          </section>
        </div>
      )}
    </main>
  );
}
