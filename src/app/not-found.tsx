import Link from "next/link";

export default function NotFound() { return <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-6 text-center"><div><p className="text-sm font-semibold text-[var(--brand)]">404</p><h1 className="mt-2 text-2xl font-bold">Không tìm thấy trang</h1><Link href="/" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white">Về tổng quan</Link></div></main>; }
