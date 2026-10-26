"use client";

import Link from "next/link";
import { MailCheck } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function CheckEmailPage() {
  return (
    <Card className="p-6 text-center shadow-[var(--shadow)] sm:p-8">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand-strong)]">
        <MailCheck size={28} aria-hidden="true" />
      </div>
      <h1 className="mt-6 text-2xl font-bold">Kiểm tra email của bạn</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Mở hộp thư bạn vừa dùng để đăng ký và nhấn vào liên kết xác nhận để kích hoạt tài khoản.</p>
      <p className="mt-4 text-sm leading-6 text-[var(--muted)]">Nếu chưa thấy email, hãy kiểm tra thư mục Spam hoặc Thư rác.</p>
      <div className="mt-8 flex flex-col gap-4 text-sm">
        <Link href="/login" className="inline-flex min-h-11 items-center justify-center rounded-[14px] bg-[var(--brand)] px-4 font-semibold text-white hover:bg-[var(--brand-strong)]">Đã xác nhận? Đăng nhập</Link>
        <Link href="/register" className="font-semibold text-[var(--brand)]">Dùng email khác</Link>
      </div>
    </Card>
  );
}
