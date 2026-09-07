import Link from "next/link";
import { PiggyBank } from "lucide-react";

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-8"><div className="w-full max-w-md"><Link href="/" className="mb-8 flex items-center justify-center gap-2 text-xl font-bold tracking-tight"><span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[var(--brand)] text-white"><PiggyBank size={21} /></span>monee</Link>{children}</div></main>;
}
