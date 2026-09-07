"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function ForgotPasswordPage() { const [email, setEmail] = useState(""); const [message, setMessage] = useState(""); async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const { error } = await createClient().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback?next=/settings/profile` }); setMessage(error ? "Không thể gửi email lúc này." : "Nếu email tồn tại, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu."); } return <Card className="p-6 shadow-[var(--shadow)] sm:p-8"><div className="mb-7"><h1 className="text-2xl font-bold">Đặt lại mật khẩu</h1><p className="mt-2 text-sm text-[var(--muted)]">Nhập email để nhận liên kết khôi phục.</p></div><form onSubmit={submit} className="space-y-4"><label className="block text-sm font-semibold">Email<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-base" /></label>{message && <p role="status" className="rounded-xl bg-[var(--brand-soft)] px-3 py-2 text-sm text-[var(--brand-strong)]">{message}</p>}<Button type="submit" className="w-full">Gửi hướng dẫn</Button></form><p className="mt-8 text-center text-sm"><Link href="/login" className="font-semibold text-[var(--brand)]">← Quay lại đăng nhập</Link></p></Card>; }
