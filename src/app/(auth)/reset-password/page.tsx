"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (password.length < 8) { const message = "Mật khẩu cần ít nhất 8 ký tự."; setMessage(message); toast.error(message); return; }
    if (password !== confirmation) { const message = "Hai mật khẩu chưa khớp."; setMessage(message); toast.error(message); return; }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { const message = "Liên kết đã hết hạn hoặc không hợp lệ. Vui lòng yêu cầu lại."; setMessage(message); toast.error(message); return; }
    await supabase.auth.signOut();
    toast.success("Đã cập nhật mật khẩu.");
    router.replace("/login");
    router.refresh();
  }

  return <Card className="p-6 shadow-[var(--shadow)] sm:p-8"><div className="mb-7"><h1 className="text-2xl font-bold">Tạo mật khẩu mới</h1><p className="mt-2 text-sm text-[var(--muted)]">Chọn mật khẩu mới có ít nhất 8 ký tự.</p></div><form onSubmit={submit} className="space-y-4"><label className="block text-sm font-semibold">Mật khẩu mới<input required minLength={8} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-base" /></label><label className="block text-sm font-semibold">Nhập lại mật khẩu<input required minLength={8} type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-base" /></label>{message && <p role="alert" className="rounded-xl bg-[#fff0ed] px-3 py-2 text-sm text-[var(--danger)]">{message}</p>}<Button type="submit" className="w-full" disabled={loading}>{loading ? "Đang cập nhật…" : "Lưu mật khẩu mới"}</Button></form></Card>;
}
