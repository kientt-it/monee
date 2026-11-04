"use client";

import { useEffect, useState } from "react";
import { ArrowDownUp, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { currencies, convertCurrency, parseRates, type Currency, type RateSnapshot } from "../calculations";

const input = "mt-2 min-h-11 w-full min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-base tabular-nums";
const CACHE = "monee-fx-usd-v1";
const number = (value: number, digits = 6) => value.toLocaleString("vi-VN", { maximumFractionDigits: digits });
export function CurrencyConverter() {
  const [from, setFrom] = useState<Currency>("USD");
  const [to, setTo] = useState<Currency>("VND");
  const [amount, setAmount] = useState("100");
  const [manual, setManual] = useState(false);
  const [manualRate, setManualRate] = useState("");
  const [snapshot, setSnapshot] = useState<RateSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stale, setStale] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;
    async function load() {
      try {
        try {
          const cached = JSON.parse(localStorage.getItem(CACHE) ?? "null");
          const parsed = parseRates(cached);
          if (parsed && parsed.updatedAt <= Date.now() + 300000) {
            setSnapshot(parsed);
            setStale(Date.now() - parsed.updatedAt > 48 * 3600000);
            if (retry === 0 && Date.now() - parsed.updatedAt < 24 * 3600000) return;
          }
        } catch { /* Storage may be unavailable in private browsing. */ }
        const timeout = setTimeout(() => controller.abort(), 10000);
        let response: Response;
        try { response = await fetch("https://open.er-api.com/v6/latest/USD", { signal: controller.signal }); }
        finally { clearTimeout(timeout); }
        if (!response.ok) throw new Error("rates");
        const raw: unknown = await response.json();
        const parsed = parseRates(raw);
        if (!parsed || parsed.updatedAt > Date.now() + 300000) throw new Error("rates");
        if (!mounted) return;
        setSnapshot(parsed);
        setStale(Date.now() - parsed.updatedAt > 48 * 3600000);
        try { localStorage.setItem(CACHE, JSON.stringify(raw)); } catch { /* Conversion still works without storage. */ }
      } catch {
        if (mounted) setError("Chưa tải được tỷ giá mới. Bạn có thể dùng bản đã lưu hoặc nhập tỷ giá riêng.");
      } finally { if (mounted) setLoading(false); }
    }
    void load();
    return () => { mounted = false; controller.abort(); };
  }, [retry]);

  const rate = from === to ? 1 : manual ? (manualRate.trim() ? Number(manualRate) : NaN) : snapshot ? snapshot.rates[to] / snapshot.rates[from] : NaN;
  const converted = amount.trim() ? convertCurrency(Number(amount), rate) : null;
  function swap() {
    setFrom(to); setTo(from);
    if (manual && Number(manualRate) > 0) setManualRate(String(1 / Number(manualRate)));
  }
  function changeCurrency(code: Currency, side: "from" | "to") {
    if (side === "from") setFrom(code); else setTo(code);
    setManualRate("");
  }
  return <section aria-labelledby="currency-title" className="space-y-5">
    <div><h2 id="currency-title" className="text-xl font-bold">Chuyển đổi tiền tệ</h2><p className="mt-2 text-sm text-[var(--muted)]">Đổi nhanh giữa 12 đồng tiền thường dùng.</p></div>
    <div className="grid items-start gap-5 lg:grid-cols-2">
      <div className="space-y-5 rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6">
        <label className="block text-sm font-semibold">Số tiền cần đổi<input type="number" inputMode="decimal" min="0" max="1000000000000" step="any" value={amount} onChange={e => setAmount(e.target.value)} className={input} /></label>
        <div className="grid grid-cols-[minmax(0,1fr)_44px_minmax(0,1fr)] items-end gap-2">
          <label className="min-w-0 text-sm font-semibold">Từ<select aria-label="Từ" className={input} value={from} onChange={e => changeCurrency(e.target.value as Currency, "from")}>{currencies.map(([code]) => <option key={code}>{code}</option>)}</select></label>
          <Button variant="outline" size="icon" onClick={swap} aria-label="Đảo chiều quy đổi"><ArrowDownUp size={18} /></Button>
          <label className="min-w-0 text-sm font-semibold">Sang<select aria-label="Sang" className={input} value={to} onChange={e => changeCurrency(e.target.value as Currency, "to")}>{currencies.map(([code]) => <option key={code}>{code}</option>)}</select></label>
        </div>
        <p className="text-xs leading-5 text-[var(--muted)]">{currencies.find(([c]) => c === from)?.[1]} → {currencies.find(([c]) => c === to)?.[1]}</p>
        <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={manual} onChange={e => { setManual(e.target.checked); setManualRate(""); }} className="h-5 w-5 accent-[var(--brand)]" />Nhập tỷ giá riêng</label>
        {manual && from !== to && <label className="block text-sm font-semibold">1 {from} bằng bao nhiêu {to}?<input type="number" inputMode="decimal" min="0" step="any" value={manualRate} onChange={e => setManualRate(e.target.value)} className={input} /></label>}
        {loading && !manual && <p role="status" className="flex items-center gap-2 text-sm text-[var(--muted)]"><RefreshCw size={16} className="animate-spin" />Đang tải tỷ giá…</p>}
        {error && <div><p role="status" className="text-sm text-[var(--warning)]">{error}</p><Button variant="outline" className="mt-3" disabled={loading} onClick={() => { setError(""); setLoading(true); setRetry(n => n + 1); }}>Thử tải lại tỷ giá</Button></div>}
      </div>
      <div className="space-y-4">
        <div className="rounded-[20px] bg-[var(--brand)] p-5 text-[var(--brand-contrast)] sm:p-6" aria-live="polite" aria-atomic="true">
          <p className="text-sm opacity-85">Số tiền quy đổi</p><p className="mt-3 break-words text-3xl font-bold tabular-nums">{converted === null ? "—" : `${number(converted, ["VND", "JPY", "KRW"].includes(to) ? 0 : 2)} ${to}`}</p>
          <p className="mt-4 text-sm opacity-85">{Number.isFinite(rate) && rate > 0 ? `1 ${from} = ${number(rate)} ${to}` : "Chờ tỷ giá hợp lệ để quy đổi"}</p>
        </div>
        {amount && (Number(amount) < 0 || Number(amount) > 1e12) && <p role="alert" className="text-sm text-[var(--danger)]">Nhập số tiền từ 0 đến 1.000 tỷ.</p>}
        {manual && from !== to && manualRate && !(Number(manualRate) > 0) && <p role="alert" className="text-sm text-[var(--danger)]">Tỷ giá phải lớn hơn 0.</p>}
        {converted === null && amount.trim() && Number(amount) >= 0 && Number(amount) <= 1e12 && Number.isFinite(rate) && rate > 0 && <p role="alert" className="text-sm text-[var(--danger)]">Kết quả vượt giới hạn tính toán. Hãy giảm số tiền hoặc kiểm tra tỷ giá.</p>}
        <div className="space-y-2 text-xs leading-5 text-[var(--muted)]">
          {!manual && snapshot && <p>Cập nhật: {new Date(snapshot.updatedAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })} (giờ Việt Nam). {stale && <span className="text-[var(--warning)]">Tỷ giá đã quá 48 giờ, hãy kiểm tra trước khi dùng.</span>}</p>}
          <p>{manual ? "Đang dùng tỷ giá bạn nhập." : "Tỷ giá tham khảo, cập nhật hằng ngày."} Chưa gồm phí và chênh lệch mua/bán của ngân hàng.</p>
          <a href="https://www.exchangerate-api.com" target="_blank" rel="noreferrer" className="inline-block min-h-11 py-3 underline underline-offset-4">Rates By Exchange Rate API</a>
        </div>
      </div>
    </div>
  </section>;
}
