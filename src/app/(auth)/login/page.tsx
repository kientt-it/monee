"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter(); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [loading, setLoading] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setLoading(true); const supabase = createClient(); const { error } = await supabase.auth.signInWithPassword({ email, password }); setLoading(false); if (error) { toast.error("Email hoặc mật khẩu chưa đúng. Vui lòng thử lại."); } else { toast.success("Đăng nhập thành công."); router.push("/app"); } }
  return <Card className="p-6 shadow-[var(--shadow)] sm:p-8"><div className="mb-7"><h1 className="text-2xl font-bold">Chào mừng trở lại</h1><p className="mt-2 text-sm text-[var(--muted)]">Đăng nhập để tiếp tục theo dõi tài chính của bạn.</p></div><form onSubmit={submit} className="space-y-4"><label className="block text-sm font-semibold">Email<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-base" placeholder="you@example.com" /></label><label className="block text-sm font-semibold">Mật khẩu<input required minLength={6} type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-base" placeholder="••••••••" /></label><Button type="submit" className="w-full" disabled={loading}>{loading ? "Đang đăng nhập…" : "Đăng nhập"}</Button></form><div className="mt-5 text-center text-sm"><Link href="/forgot-password" className="font-semibold text-[var(--brand)]">Quên mật khẩu?</Link></div><p className="mt-8 text-center text-sm text-[var(--muted)]">Chưa có tài khoản? <Link href="/register" className="font-semibold text-[var(--brand)]">Đăng ký</Link></p></Card>;
}
