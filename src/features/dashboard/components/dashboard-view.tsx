"use client";

import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  ChevronRight,
  MoreHorizontal,
  PiggyBank,
  Plus,
  Repeat2,
  Sparkles,
} from "lucide-react";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardSummary } from "@/features/dashboard/types";
import { formatCompactCurrency, formatCurrency } from "@/lib/utils";

function Money({ amount, currency }: { amount: number; currency: string }) {
  return <span className="tabular-nums">{formatCurrency(Math.abs(amount), currency)}</span>;
}

function buildSpendingGradient(spending: DashboardSummary["spending"]) {
  if (spending.length === 0) return "var(--surface-muted)";
  let cursor = 0;
  const segments = spending.map((item) => {
    const start = cursor;
    cursor = Math.min(100, cursor + item.percentage);
    return `${item.color} ${start}% ${cursor}%`;
  });
  if (cursor < 100) segments.push(`var(--surface-muted) ${cursor}% 100%`);
  return `conic-gradient(${segments.join(", ")})`;
}

function budgetBarColor(status: NonNullable<DashboardSummary["budget"]>["status"]) {
  if (status === "over" || status === "strong_warning") return "var(--danger)";
  if (status === "warning") return "var(--warning)";
  return "var(--brand)";
}

export function DashboardView({ data }: { data: DashboardSummary }) {
  const dashboard = data;
  const href = (path: string) => path;
  const savingRate = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(dashboard.savingRate);
  const firstGoal = dashboard.goals[0];

  return (
    <div className="app-shell bg-[var(--background)]">
      <div className="desktop-grid mx-auto grid max-w-[1440px]">
        <aside className="hidden min-h-screen border-r border-[var(--border)] bg-[var(--surface)] p-7 md:block">
          <div className="mb-12 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[var(--brand)] text-white"><PiggyBank size={21} /></div>
            <span className="text-xl font-bold tracking-tight">monee</span>
          </div>
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-[.16em] text-[var(--muted)]">Không gian của bạn</p>
          <nav className="space-y-1" aria-label="Điều hướng desktop">
            {[["Tổng quan", "/app"], ["Tài khoản", "/app/accounts"], ["Giao dịch", "/app/transactions"], ["Ngân sách", "/app/budgets"], ["Mục tiêu", "/app/goals"], ["Báo cáo", "/app/reports"], ["Định kỳ", "/app/recurring"], ["Thông báo", "/app/notifications"]].map(([label, path], index) => (
              <Link key={path} href={href(path)} className={`flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold ${index === 0 ? "bg-[var(--brand-soft)] text-[var(--brand-strong)]" : "text-[var(--muted)] hover:bg-[var(--surface-muted)]"}`}>{label}</Link>
            ))}
          </nav>
          <div className="pt-56">
            <div className="rounded-2xl bg-[var(--surface-muted)] p-4">
              <Sparkles size={19} className="mb-3 text-[var(--brand)]" />
              <p className="text-sm font-semibold">Monee đang cùng bạn</p>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">Ghi lại từng khoản nhỏ để hiểu hơn về thói quen của mình.</p>
            </div>
          </div>
        </aside>

        <main className="min-w-0 px-4 pb-28 pt-5 sm:px-6 md:px-10 md:pb-12 md:pt-8 lg:px-14">
          <header className="mx-auto flex max-w-[1060px] items-center justify-between">
            <div>
              <p className="text-sm text-[var(--muted)]">{dashboard.dateLabel}</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">Chào bạn, {dashboard.greetingName} <span aria-hidden="true">👋</span></h1>
            </div>
            <Link href={href("/app/notifications")} aria-label={dashboard.unreadNotifications > 0 ? `${dashboard.unreadNotifications} thông báo chưa đọc` : "Xem thông báo"} className="relative flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]">
              <Bell size={19} />
              {dashboard.unreadNotifications > 0 && <span className="absolute right-2.5 top-2 h-2 w-2 rounded-full bg-[#eb7665]" />}
            </Link>
          </header>

          <div className="mx-auto mt-7 max-w-[1060px] space-y-5">
            <section className="overflow-hidden rounded-[24px] bg-[var(--brand)] p-6 text-white surface-shadow md:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-white/75">Tổng tài sản</p>
                  <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums md:text-4xl">{formatCurrency(dashboard.totalBalance, dashboard.currency)}</p>
                </div>
                <span className="shrink-0 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold">{dashboard.monthLabel} <ChevronRight size={13} className="ml-1 inline" /></span>
              </div>
              <div className="mt-8 grid grid-cols-2 gap-5 border-t border-white/15 pt-4">
                <div><p className="text-xs text-white/65">Thu nhập tháng này</p><p className="mt-1 font-semibold tabular-nums">+{formatCurrency(dashboard.monthlyIncome, dashboard.currency)}</p></div>
                <div><p className="text-xs text-white/65">Chi tiêu tháng này</p><p className="mt-1 font-semibold tabular-nums">−{formatCurrency(dashboard.monthlyExpense, dashboard.currency)}</p></div>
              </div>
            </section>

            <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Card className="p-4">
                <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-[#dff4e9] text-[var(--brand)]"><ArrowDownLeft size={18} /></div>
                <p className="text-xs text-[var(--muted)]">Dòng tiền ròng</p>
                <p className={`mt-1 text-lg font-bold tabular-nums ${dashboard.netCashFlow < 0 ? "text-[var(--danger)]" : ""}`}>{dashboard.netCashFlow >= 0 ? "+" : "−"}<Money amount={dashboard.netCashFlow} currency={dashboard.currency} /></p>
              </Card>
              <Card className="p-4">
                <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-[#fff0de] text-[#c88029]"><ArrowUpRight size={18} /></div>
                <p className="text-xs text-[var(--muted)]">Tỷ lệ tiết kiệm</p>
                <p className={`mt-1 text-lg font-bold tabular-nums ${dashboard.savingRate < 0 ? "text-[var(--danger)]" : ""}`}>{savingRate}%</p>
              </Card>
              <Card className="col-span-2 p-4 md:col-span-2">
                {dashboard.budget ? (
                  <>
                    <div className="flex items-center justify-between gap-4">
                      <div><p className="text-xs text-[var(--muted)]">Ngân sách tháng</p><p className="mt-1 text-lg font-bold tabular-nums">{formatCurrency(dashboard.budget.spent, dashboard.currency)} <span className="text-sm font-medium text-[var(--muted)]">/ {formatCurrency(dashboard.budget.amount, dashboard.currency)}</span></p></div>
                      <span className="text-sm font-bold" style={{ color: budgetBarColor(dashboard.budget.status) }}>{Math.round(dashboard.budget.percentage)}%</span>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]"><div className="h-full rounded-full" style={{ width: `${Math.min(dashboard.budget.percentage, 100)}%`, background: budgetBarColor(dashboard.budget.status) }} /></div>
                    <p className="mt-2 text-xs text-[var(--muted)]">Còn lại {formatCurrency(dashboard.budget.remaining, dashboard.currency)} trong tháng</p>
                  </>
                ) : (
                  <div className="flex h-full items-center justify-between gap-4">
                    <div><p className="text-xs text-[var(--muted)]">Ngân sách tháng</p><p className="mt-1 font-semibold">Chưa có ngân sách đang hoạt động</p></div>
                    <Link href={href("/app/budgets")} className="shrink-0 text-sm font-semibold text-[var(--brand)]">Thiết lập</Link>
                  </div>
                )}
              </Card>
            </section>

            <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
              <Card>
                <CardHeader><div className="flex items-center justify-between"><CardTitle>Chi tiêu theo nhóm</CardTitle><button aria-label="Xem thêm thống kê" className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface-muted)]"><MoreHorizontal size={19} /></button></div></CardHeader>
                <CardContent>
                  {dashboard.spending.length > 0 ? (
                    <div className="flex items-center gap-6">
                      <div className="relative h-36 w-36 shrink-0 rounded-full" style={{ background: buildSpendingGradient(dashboard.spending) }}><div className="absolute inset-5 flex flex-col items-center justify-center rounded-full bg-[var(--surface)]"><span className="text-xl font-bold tabular-nums">{formatCompactCurrency(dashboard.monthlyExpense)}</span><span className="text-[11px] text-[var(--muted)]">tổng chi</span></div></div>
                      <div className="min-w-0 flex-1 space-y-3">{dashboard.spending.map((item) => <div key={item.label} className="flex items-center justify-between gap-3 text-sm"><span className="flex min-w-0 items-center gap-2"><i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: item.color }} /><span className="truncate">{item.label}</span></span><span className="font-semibold tabular-nums">{formatCompactCurrency(item.amount)}</span></div>)}</div>
                    </div>
                  ) : (
                    <div className="py-7 text-center"><p className="font-semibold">Chưa có khoản chi trong tháng</p><p className="mt-1 text-sm text-[var(--muted)]">Các nhóm chi sẽ xuất hiện sau khi bạn ghi giao dịch.</p></div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><div className="flex items-center justify-between"><CardTitle>Mục tiêu của bạn</CardTitle><Link href={href("/app/goals")} className="text-xs font-semibold text-[var(--brand)]">Xem tất cả</Link></div></CardHeader>
                <CardContent>
                  {firstGoal ? (
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8edff] text-xl" aria-hidden="true">{firstGoal.icon}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between gap-3 text-sm"><span className="truncate font-semibold">{firstGoal.name}</span><span className="font-bold text-[var(--brand)]">{Math.round(firstGoal.percentage)}%</span></div>
                        <div className="mt-2 h-2 rounded-full bg-[var(--surface-muted)]"><div className="h-full rounded-full" style={{ width: `${firstGoal.percentage}%`, background: firstGoal.color }} /></div>
                        <p className="mt-2 text-xs text-[var(--muted)] tabular-nums">{formatCurrency(firstGoal.currentAmount, dashboard.currency)} / {formatCurrency(firstGoal.targetAmount, dashboard.currency)}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="py-3 text-center"><p className="font-semibold">Chưa có mục tiêu tiết kiệm</p><p className="mt-1 text-sm text-[var(--muted)]">Tạo một mục tiêu để theo dõi tiến độ.</p></div>
                  )}
                  <Link href={href("/app/goals")} className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border)] text-sm font-semibold text-[var(--brand)] hover:bg-[var(--surface-muted)]"><Plus size={16} /> Thêm mục tiêu tiết kiệm</Link>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader><div className="flex items-center justify-between"><CardTitle>Giao dịch gần đây</CardTitle><Link href={href("/app/transactions")} className="text-xs font-semibold text-[var(--brand)]">Xem tất cả <ChevronRight size={13} className="inline" /></Link></div></CardHeader>
              <CardContent className="space-y-1 pt-2">
                {dashboard.recentTransactions.length > 0 ? dashboard.recentTransactions.map((item) => {
                  const Icon = item.type === "income" ? ArrowDownLeft : item.type === "expense" ? ArrowUpRight : Repeat2;
                  const sign = item.type === "income" ? "+" : item.type === "expense" ? "−" : "";
                  return (
                    <Link key={item.id} href={`/app/transactions/${item.id}`} className="flex items-center gap-3 rounded-xl py-3 hover:bg-[var(--surface-muted)]">
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${item.type === "income" ? "bg-[var(--brand-soft)] text-[var(--brand)]" : item.type === "expense" ? "bg-[#fff1dc] text-[#c88029]" : "bg-[#e8edff] text-[#6474a8]"}`}><Icon size={19} /></div>
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.title}</p><p className="mt-0.5 truncate text-xs text-[var(--muted)]">{item.metadata}</p></div>
                      <p className={`text-sm font-bold tabular-nums ${item.type === "income" ? "text-[var(--brand)]" : item.type === "transfer" ? "text-[var(--muted)]" : "text-[var(--foreground)]"}`}>{sign}<Money amount={item.amount} currency={dashboard.currency} /></p>
                    </Link>
                  );
                }) : (
                  <div className="py-7 text-center"><p className="font-semibold">Chưa có giao dịch nào</p><p className="mt-1 text-sm text-[var(--muted)]">Giao dịch mới nhất của bạn sẽ xuất hiện tại đây.</p><Link href={href("/app/transactions/new")} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white"><Plus size={16} /> Thêm giao dịch</Link></div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
