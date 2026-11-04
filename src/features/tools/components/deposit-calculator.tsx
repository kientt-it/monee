"use client";

import { useState } from "react";
import { CalendarDays, Landmark } from "lucide-react";
import { MoneyInput } from "@/components/ui/money-input";
import { DateInput } from "@/components/ui/date-input";
import { Button } from "@/components/ui/button";
import { localToday, displayDate } from "@/lib/date";
import { formatCurrency } from "@/lib/utils";
import { calculateDeposit, type DepositInput } from "../calculations";

const input = "mt-2 min-h-11 w-full min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-base tabular-nums";
export function DepositCalculator() {
  const [principal, setPrincipal] = useState<number | null>(100_000_000);
  const [rate, setRate] = useState("5");
  const [start, setStart] = useState(localToday);
  const [term, setTerm] = useState("6");
  const [unit, setUnit] = useState<DepositInput["unit"]>("months");
  const [payout, setPayout] = useState<DepositInput["payout"]>("end");
  const [cycles, setCycles] = useState("2");
  const result = calculateDeposit({ principal: principal ?? NaN, annualRate: rate.trim() ? Number(rate) : NaN, start,
    term: term.trim() ? Number(term) : NaN, unit, payout, cycles: payout === "compound" ? (cycles.trim() ? Number(cycles) : NaN) : 1 });
  return <section aria-labelledby="deposit-title" className="space-y-5">
    <div><h2 id="deposit-title" className="text-xl font-bold">Lãi tiền gửi ngân hàng</h2><p className="mt-2 text-sm text-[var(--muted)]">Ước tính tiền lãi theo kỳ hạn và cách nhận lãi bạn chọn.</p></div>
    <div className="grid items-start gap-5 lg:grid-cols-2">
      <div className="space-y-5 rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6">
        <label className="block text-sm font-semibold">Số tiền gửi (VND)<MoneyInput value={principal} onValueChange={v => setPrincipal(v ?? null)} min={1} max={1e12} /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="min-w-0 text-sm font-semibold">Lãi suất (%/năm)<input type="number" inputMode="decimal" min="0" max="100" step="any" value={rate} onChange={e => setRate(e.target.value)} className={input} /></label>
          <label className="min-w-0 text-sm font-semibold">Ngày gửi<DateInput value={start} onChange={e => setStart(e.target.value)} min="1900-01-01" max="2099-12-31" className={input} /></label>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <label className="min-w-0 text-sm font-semibold">Kỳ hạn<input type="number" inputMode="numeric" min="1" max={unit === "months" ? 120 : unit === "weeks" ? 520 : 3650} step="1" value={term} onChange={e => setTerm(e.target.value)} className={input} /></label>
          <label className="min-w-0 text-sm font-semibold">Đơn vị<select aria-label="Đơn vị" value={unit} onChange={e => { setUnit(e.target.value as typeof unit); setTerm(e.target.value === "months" ? "6" : e.target.value === "weeks" ? "4" : "30"); }} className={input}><option value="months">Tháng</option><option value="weeks">Tuần</option><option value="days">Ngày</option></select></label>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Chọn nhanh kỳ hạn">{[1, 3, 6, 12, 24].map(n => <Button key={n} type="button" size="sm" variant={unit === "months" && Number(term) === n ? "secondary" : "outline"} aria-pressed={unit === "months" && Number(term) === n} onClick={() => { setUnit("months"); setTerm(String(n)); }}>{n} tháng</Button>)}</div>
        <label className="block text-sm font-semibold">Cách nhận lãi<select aria-label="Cách nhận lãi" value={payout} onChange={e => setPayout(e.target.value as typeof payout)} className={input}><option value="end">Nhận lãi cuối kỳ</option><option value="monthly">Nhận lãi hàng tháng</option><option value="compound">Tái tục gốc và lãi</option></select></label>
        {payout === "compound" && <label className="block text-sm font-semibold">Tổng số kỳ gửi (gồm kỳ đầu)<input type="number" inputMode="numeric" min="1" max="60" step="1" aria-label="Tổng số kỳ gửi (gồm kỳ đầu)" value={cycles} onChange={e => setCycles(e.target.value)} className={input} /><span className="mt-2 block text-xs font-normal leading-5 text-[var(--muted)]">Cuối mỗi kỳ, lãi nhập gốc để gửi tiếp. Giả định lãi suất giữ nguyên cho tất cả kỳ.</span></label>}
        <p className="text-xs leading-5 text-[var(--muted)]">Lãi suất mặc định 5% là ví dụ. Nhập lãi suất ngân hàng áp dụng cho đúng kỳ hạn và cách nhận lãi của bạn.</p>
      </div>
      <div className="space-y-4" aria-live="polite" aria-atomic="true">
        <div className="rounded-[20px] bg-[var(--brand)] p-5 text-[var(--brand-contrast)] sm:p-6"><div className="flex items-center gap-2 text-sm opacity-85"><Landmark size={18} />Tiền lãi dự kiến</div><p className="mt-3 break-words text-3xl font-bold tabular-nums">{result ? formatCurrency(result.interest) : "—"}</p><div className="mt-5 border-t border-current/20 pt-4"><p className="text-sm opacity-85">Tổng gốc và lãi nhận được</p><p className="mt-2 break-words text-xl font-semibold tabular-nums">{result ? formatCurrency(result.total) : "—"}</p></div></div>
        {result ? <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5"><div className="flex items-center gap-2 text-sm font-semibold"><CalendarDays size={18} />{payout === "compound" ? "Kết thúc toàn bộ kỳ gửi" : "Ngày đáo hạn"}</div><p className="mt-3 text-xl font-semibold tabular-nums">{displayDate(result.maturity)}</p><p className="mt-2 text-sm text-[var(--muted)]">{result.days.toLocaleString("vi-VN")} ngày thực gửi{payout === "compound" ? ` · ${cycles} kỳ` : ""}.</p>{payout === "monthly" && <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Lãi được nhận riêng từng tháng; cuối kỳ nhận lại gốc {formatCurrency(principal ?? 0)}. Tổng gốc và lãi ở trên gồm các khoản lãi đã nhận.</p>}</div>
          : <p role="alert" className="rounded-xl border border-[var(--border)] p-4 text-sm leading-6 text-[var(--danger)]">Kiểm tra số tiền gửi (1–1.000 tỷ), lãi suất (0–100%), ngày gửi và kỳ hạn. Tổng thời gian mô phỏng tối đa 100 năm.</p>}
        <p className="text-xs leading-5 text-[var(--muted)]">Lãi mỗi kỳ nhận = gốc × lãi suất năm × số ngày thực tế / 365, làm tròn đến đồng. Ngày cuối tháng được điều chỉnh theo lịch; chưa điều chỉnh ngày nghỉ hoặc rút trước hạn. <a href="https://www.vietcombank.com.vn/KHCN/Cong-cu-Tien-ich/KHCN---Lai-suat" target="_blank" rel="noreferrer" className="underline underline-offset-4">Tham khảo cách tính tại Vietcombank</a>.</p>
      </div>
    </div>
    {result && <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6"><h3 className="font-semibold">{payout === "compound" ? "Lịch tái tục" : "Lịch nhận lãi"}</h3><div className="mt-4 max-h-[480px] overflow-auto rounded-xl border border-[var(--border)]" tabIndex={0} role="region" aria-label="Bảng lịch nhận lãi, cuộn để xem đầy đủ"><table className="w-full min-w-[520px] text-left text-sm"><thead className="bg-[var(--surface-muted)] text-[var(--muted)]"><tr><th scope="col" className="p-3">Ngày nhận</th><th scope="col" className="p-3 text-right">Số ngày</th><th scope="col" className="p-3 text-right">Gốc tính lãi</th><th scope="col" className="p-3 text-right">Tiền lãi</th>{payout === "compound" && <th scope="col" className="p-3 text-right">Gốc sau tái tục</th>}</tr></thead><tbody>{result.rows.map(row => <tr key={row.until} className="border-t border-[var(--border)] tabular-nums"><td className="whitespace-nowrap p-3">{displayDate(row.until)}</td><td className="p-3 text-right">{row.days}</td><td className="whitespace-nowrap p-3 text-right">{formatCurrency(row.opening)}</td><td className="whitespace-nowrap p-3 text-right font-semibold">{formatCurrency(row.interest)}</td>{payout === "compound" && <td className="whitespace-nowrap p-3 text-right">{formatCurrency(row.closing)}</td>}</tr>)}</tbody></table></div></div>}
  </section>;
}
