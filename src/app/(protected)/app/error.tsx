"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-6 text-center"><div><h1 className="text-xl font-bold">Có lỗi xảy ra</h1><p className="mt-2 text-sm text-[var(--muted)]">Dữ liệu chưa thể tải. Bạn có thể thử lại.</p><button onClick={reset} className="mt-5 min-h-11 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white">Thử lại</button></div></main>; }
