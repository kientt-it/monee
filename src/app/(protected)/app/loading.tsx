export default function Loading() {
  return (
    <main className="min-h-screen bg-[var(--background)] px-4 pb-28 pt-6 sm:px-6 md:px-10 md:pb-12 md:pt-8 lg:px-14" aria-label="Đang tải">
      <div className="mx-auto max-w-[1060px] animate-pulse space-y-5">
        <div className="flex items-center justify-between">
          <div className="space-y-2"><div className="h-4 w-32 rounded bg-[var(--surface-muted)]" /><div className="h-9 w-56 rounded bg-[var(--surface-muted)]" /></div>
          <div className="h-11 w-11 rounded-full bg-[var(--surface-muted)]" />
        </div>
        <div className="h-48 rounded-[24px] bg-[var(--surface-muted)]" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><div className="h-28 rounded-2xl bg-[var(--surface-muted)]" /><div className="h-28 rounded-2xl bg-[var(--surface-muted)]" /><div className="col-span-2 h-28 rounded-2xl bg-[var(--surface-muted)]" /></div>
        <div className="grid gap-5 lg:grid-cols-2"><div className="h-64 rounded-2xl bg-[var(--surface-muted)]" /><div className="h-64 rounded-2xl bg-[var(--surface-muted)]" /></div>
      </div>
    </main>
  );
}
