"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [message, setMessage] = useState(""); const [loading, setLoading] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setLoading(true); const supabase = createClient(); const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/app/onboarding` } }); setLoading(false); if (error) { const message = "Không thể tạo tài khoản. Vui lòng kiểm tra lại thông tin."; setMessage(message); toast.error(message); return; } if (data.session) { toast.success("Tạo tài khoản thành công."); router.push("/app/onboarding"); router.refresh(); return; } const message = "Kiểm tra email để xác nhận tài khoản của bạn."; setMessage(message); toast.success(message); }
  return <Card className="p-6 shadow-[var(--shadow)] sm:p-8"><div className="mb-7"><h1 className="text-2xl font-bold">Tạo tài khoản</h1><p className="mt-2 text-sm text-[var(--muted)]">Bắt đầu một cách nhẹ nhàng hơn với tiền bạc.</p></div><form onSubmit={submit} className="space-y-4"><label className="block text-sm font-semibold">Email<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-base" placeholder="you@example.com" /></label><label className="block text-sm font-semibold">Mật khẩu<input required minLength={6} type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-base" placeholder="Ít nhất 6 ký tự" /></label>{message && <p role="status" className="rounded-xl bg-[var(--brand-soft)] px-3 py-2 text-sm text-[var(--brand-strong)]">{message}</p>}<Button type="submit" className="w-full" disabled={loading}>{loading ? "Đang tạo…" : "Tạo tài khoản"}</Button></form><p className="mt-8 text-center text-sm text-[var(--muted)]">Đã có tài khoản? <Link href="/login" className="font-semibold text-[var(--brand)]">Đăng nhập</Link></p></Card>;
}
