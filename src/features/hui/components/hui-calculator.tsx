"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Calculator, HandCoins, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MoneyInput } from "@/components/ui/money-input";
import { formatCurrency } from "@/lib/utils";
import { calculateHui, calculateHuiProfit } from "../calculate-hui";
import { saveHuiCalculation } from "../actions";
import { huiConfigSchema, type SavedHuiCalculation } from "../saved-calculation";

const countInputClass = "mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-base tabular-nums";

export function HuiCalculator({ initialSaved = null, savingAvailable = true, initialNotice = null }: { initialSaved?: SavedHuiCalculation | null; savingAvailable?: boolean; initialNotice?: string | null }) {
  const saved = initialSaved?.config;
  const [shares, setShares] = useState(String(saved?.shares ?? 34));
  const [payoutPeriod, setPayoutPeriod] = useState(String(saved?.payoutPeriod ?? 17));
  const [historyMode, setHistoryMode] = useState<"average" | "total">(saved?.historyMode ?? "average");
  const [averageContribution, setAverageContribution] = useState<number | null>(saved ? saved.averageContribution : 1_800_000);
  const [pastTotal, setPastTotal] = useState<number | null>(saved?.pastTotal ?? null);
  const paidOutShares = payoutPeriod.trim() ? Number(payoutPeriod) - 1 : NaN;
  const [faceValue, setFaceValue] = useState<number | null>(saved?.faceValue ?? 2_000_000);
  const [startingContribution, setStartingContribution] = useState<number | null>(saved?.startingContribution ?? 1_800_000);
  const [bid, setBid] = useState<number | null>(saved?.bid ?? 1_700_000);
  const [organizerFee, setOrganizerFee] = useState<number | null>(saved?.organizerFee ?? 0);
  const [savedAt, setSavedAt] = useState(initialSaved?.savedAt ?? null);
  const [savedKey, setSavedKey] = useState(saved ? JSON.stringify(huiConfigSchema.parse(saved)) : null);
  const [saveError, setSaveError] = useState("");
  const [pending, startSaving] = useTransition();
  const huiInput = { shares: shares.trim() ? Number(shares) : NaN, paidOutShares, faceValue: faceValue ?? 0, startingContribution: startingContribution ?? 0, bid: bid ?? 0, organizerFee: organizerFee ?? 0 };
  const result = calculateHui(huiInput);
  const pastContributions = paidOutShares === 0 ? 0 : historyMode === "average" ? (averageContribution === null ? NaN : averageContribution * paidOutShares) : (pastTotal ?? NaN);
  const profitResult = calculateHuiProfit({ ...huiInput, pastContributions });
  const isEstimate = historyMode === "average" && paidOutShares > 0;
  const config = huiConfigSchema.safeParse({ version: 1, shares: Number(shares), payoutPeriod: Number(payoutPeriod), faceValue, startingContribution, bid, organizerFee, historyMode, averageContribution, pastTotal });
  const currentKey = config.success ? JSON.stringify(config.data) : null;
  const dirty = currentKey !== savedKey;
  function saveCalculation() {
    if (!config.success) return;
    const submitted = config.data;
    setSaveError("");
    startSaving(async () => {
      try {
        const response = await saveHuiCalculation(submitted);
        if (!response.ok) { setSaveError(response.error); return; }
        setSavedAt(response.savedAt);
        setSavedKey(JSON.stringify(submitted));
      } catch { setSaveError("Mất kết nối, chưa lưu được bản tính. Vui lòng thử lại."); }
    });
  }

  return <main className="min-w-0 px-4 pb-[calc(env(safe-area-inset-bottom)+7rem)] pt-5 sm:px-6 md:px-10 md:pb-12 md:pt-8">
    <div className="mx-auto max-w-[900px] space-y-6">
      <header>
        <Link href="/app/tools" className="mb-3 inline-flex min-h-11 items-center text-sm font-semibold text-[var(--brand)]">← Công cụ tài chính</Link>
        <p className="text-sm text-[var(--muted)]">Tiền hốt và lãi/lỗ cả dây</p>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold md:text-3xl">Tính hụi</h1><Button type="button" onClick={saveCalculation} disabled={pending || !savingAvailable || !config.success || !dirty}><Save size={18} aria-hidden="true" />{pending ? "Đang lưu…" : "Lưu bản tính"}</Button></div>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">Chọn kỳ hốt để xem tiền thực nhận và lãi/lỗ khi kết thúc dây. Giả định bạn tham gia một chân, mỗi tháng hốt một chân. {savedAt ? "Bạn có thể điều chỉnh các thông số rồi lưu lại." : "Các số điền sẵn là ví dụ để bạn thay theo dây thực tế."}</p>
        <p role="status" className="mt-3 text-xs leading-5 text-[var(--muted)]">{savedAt ? `${dirty ? "Có thay đổi chưa lưu. " : "Đã lưu. "}Lần lưu gần nhất: ${new Date(savedAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}.` : "Lưu bản tính gần nhất theo tài khoản để mở lại trên các thiết bị."}</p>
        {initialNotice && <p className="mt-3 text-sm text-[var(--warning)]">{initialNotice}</p>}
        {saveError && <p role="alert" className="mt-3 text-sm text-[var(--danger)]">{saveError}</p>}
      </header>

      <Card className="p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-2"><Calculator className="text-[var(--brand)]" size={21} /><h2 className="font-semibold">Thông tin dây hụi</h2></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold">Tổng số kỳ / chân hụi
            <input type="number" inputMode="numeric" min={2} max={1000} step={1} value={shares} onChange={(event) => setShares(event.target.value)} className={countInputClass} />
          </label>
          <label className="text-sm font-semibold">Kỳ dự định hốt
            <input type="number" inputMode="numeric" min={1} max={Number(shares) || 1000} step={1} value={payoutPeriod} onChange={(event) => { setPayoutPeriod(event.target.value); setPastTotal(null); }} className={countInputClass} />
          </label>
          <label className="text-sm font-semibold">Mức đóng sau khi hốt (hụi chết)
            <MoneyInput value={faceValue} onValueChange={(value) => setFaceValue(value ?? null)} min={1} max={1_000_000_000_000} aria-label="Mức đóng hụi chết" />
          </label>
          <label className="text-sm font-semibold">Mức hụi sống ban đầu (giá mở)
            <MoneyInput value={startingContribution} onValueChange={(value) => setStartingContribution(value ?? null)} min={1} max={faceValue ?? undefined} aria-label="Mức hụi sống ban đầu" />
          </label>
          <label className="text-sm font-semibold">Mức bạn bỏ kỳ này
            <MoneyInput value={bid} onValueChange={(value) => setBid(value ?? null)} min={1} max={startingContribution ?? undefined} aria-label="Mức bỏ hụi kỳ này" />
          </label>
          <label className="text-sm font-semibold sm:col-span-2">Tiền công chủ hụi <span className="font-normal text-[var(--muted)]">(nếu có)</span>
            <MoneyInput value={organizerFee} onValueChange={(value) => setOrganizerFee(value ?? null)} min={0} max={1_000_000_000_000} aria-label="Tiền công chủ hụi" />
          </label>
        </div>
        {!result && <p role="alert" className="mt-4 text-sm text-[var(--danger)]">Kiểm tra số chân, tiền công và các mức góp. Mức bỏ không được lớn hơn giá mở; giá mở không được lớn hơn hụi chết.</p>}
      </Card>

      {result && <Card className="p-5 sm:p-6">
        <h2 className="font-semibold">Các khoản đã góp trước khi hốt</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Hốt kỳ {payoutPeriod}/{shares}: đã góp {paidOutShares} kỳ trước đó, còn góp {result.remainingPeriods} kỳ sau khi hốt. Không tính lại phần góp của bạn ở kỳ hốt vì đã trừ trong tiền thực nhận.</p>
        {paidOutShares > 0 ? <>
          <label className="mt-4 block text-sm font-semibold">Cách nhập tiền đã góp<select aria-label="Cách nhập tiền đã góp" value={historyMode} onChange={e => setHistoryMode(e.target.value as typeof historyMode)} className={countInputClass}><option value="average">Góp bình quân (ước tính)</option><option value="total">Tổng đã góp thực tế</option></select></label>
          {historyMode === "average" ? <label className="mt-4 block text-sm font-semibold">Mức góp bình quân mỗi kỳ trước khi hốt<MoneyInput aria-label="Mức góp bình quân" value={averageContribution} onValueChange={v => setAverageContribution(v ?? null)} min={0} max={1_000_000_000_000} /><span className="mt-2 block text-xs font-normal leading-5 text-[var(--muted)]">Có {paidOutShares} kỳ × {averageContribution === null ? "chưa nhập" : formatCurrency(averageContribution)}. Nếu mỗi kỳ đóng khác nhau, nhập tổng thực tế để tính sát hơn.</span></label>
            : <label className="mt-4 block text-sm font-semibold">Tổng tiền đã góp trong {paidOutShares} kỳ trước<MoneyInput aria-label="Tổng đã góp thực tế" value={pastTotal} onValueChange={v => setPastTotal(v ?? null)} min={0} max={1_000_000_000_000_000} /><span className="mt-2 block text-xs font-normal leading-5 text-[var(--muted)]">Chỉ cộng tiền góp trước kỳ hốt. Phí chủ hụi đã nhập riêng ở trên.</span></label>}
        </> : <p className="mt-3 text-sm">Hốt kỳ đầu nên tiền đã góp trước đó bằng 0.</p>}
        {!profitResult && <p role="alert" className="mt-4 text-sm text-[var(--danger)]">Nhập tiền đã góp hợp lệ để tính lãi/lỗ. Nhập 0 nếu chưa góp.</p>}
      </Card>}

      {profitResult && <Card className="p-5 sm:p-6" aria-live="polite" aria-atomic="true">
        <p className="text-sm text-[var(--muted)]">{profitResult.profit > 0 ? "Lãi" : profitResult.profit < 0 ? "Lỗ" : "Hòa vốn"} danh nghĩa cả dây{isEstimate ? " (ước tính)" : ""} · hốt kỳ {payoutPeriod}/{shares}</p>
        <p className={`mt-3 break-words text-3xl font-bold tabular-nums sm:text-4xl ${profitResult.profit < 0 ? "text-[var(--danger)]" : "text-[var(--brand-strong)]"}`}>{profitResult.profit > 0 ? "+" : profitResult.profit < 0 ? "−" : ""}{formatCurrency(Math.abs(profitResult.profit))}</p>
        {profitResult.profitPercent !== null && <p className="mt-2 text-sm text-[var(--muted)]">{profitResult.profitPercent.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}% trên tổng tiền đã và sẽ góp; đây là tỷ lệ cả dây.</p>}
        <dl className="mt-5 space-y-3 text-sm">
          {[["Tiền thực nhận ở kỳ hốt (đã trừ phí)", profitResult.cashReceived], ["Đã góp trước khi hốt", profitResult.pastContributions], ["Còn phải góp sau khi hốt", profitResult.remainingContributions], ["Tổng tiền đã và sẽ góp", profitResult.totalContributions]].map(([label, amount]) => <div key={String(label)} className="flex flex-wrap justify-between gap-2"><dt className="text-[var(--muted)]">{label}</dt><dd className="font-semibold tabular-nums">{formatCurrency(Number(amount))}</dd></div>)}
        </dl>
        <p className="mt-4 border-t border-[var(--border)] pt-4 text-sm leading-6 text-[var(--muted)]">Lãi/lỗ = tiền thực nhận − đã góp trước khi hốt − còn phải góp sau khi hốt. Chưa tính giá trị tiền theo thời gian hoặc các phí khác ngoài phí chủ hụi đã nhập.</p>
      </Card>}

      {result && <>
        <Card className="border-[var(--brand)] bg-[var(--brand)] p-5 text-[var(--brand-contrast)] sm:p-6" aria-live="polite">
          <div className="flex items-center gap-2 opacity-85"><HandCoins size={20} /><p className="text-sm">Tiền bạn thực cầm nếu hốt kỳ {Number(paidOutShares) + 1}</p></div>
          <p className="mt-3 break-words text-3xl font-bold tabular-nums sm:text-4xl">{formatCurrency(result.cashReceived)}</p>
          <p className="mt-2 text-sm leading-6 opacity-85">Đã trừ phần góp của bạn trong kỳ này và tiền công chủ hụi.</p>
          <div className="mt-5 grid grid-cols-2 gap-4 border-t border-current/20 pt-4">
            <div><p className="text-sm opacity-85">Tổng hụi có phần của bạn</p><p className="mt-1 break-words font-semibold tabular-nums">{formatCurrency(result.grossPool)}</p></div>
            <div><p className="text-sm opacity-85">Còn đóng sau khi hốt</p><p className="mt-1 break-words font-semibold tabular-nums">{result.remainingPeriods} kỳ × {formatCurrency(faceValue ?? 0)}</p></div>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="font-semibold">Cách tính kỳ này</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-3"><dt className="text-[var(--muted)]">{paidOutShares} chân đã hốt × {formatCurrency(faceValue ?? 0)}</dt><dd className="shrink-0 font-semibold tabular-nums">{formatCurrency(result.paidOutContributions)}</dd></div>
            <div className="flex flex-wrap items-start justify-between gap-3"><dt className="text-[var(--muted)]">{result.otherLivingShares} chân chưa hốt khác × {formatCurrency(bid ?? 0)}</dt><dd className="shrink-0 font-semibold tabular-nums">{formatCurrency(result.otherLivingContributions)}</dd></div>
            <div className="flex flex-wrap items-start justify-between gap-3"><dt className="text-[var(--muted)]">Tiền công chủ hụi</dt><dd className="shrink-0 font-semibold tabular-nums">−{formatCurrency(organizerFee ?? 0)}</dd></div>
            <div className="flex flex-wrap items-start justify-between gap-3 border-t border-[var(--border)] pt-3 font-semibold"><dt>Tiền thực cầm</dt><dd className="shrink-0 tabular-nums text-[var(--brand)]">{formatCurrency(result.cashReceived)}</dd></div>
          </dl>
          <p className="mt-4 text-sm leading-6 text-[var(--muted)]">Phần của bạn là {formatCurrency(bid ?? 0)}. Nếu chủ hụi thu đủ cả phần này rồi giao tiền, bạn nhận {formatCurrency(result.grossPool - (organizerFee ?? 0))} và tự nộp lại {formatCurrency(bid ?? 0)}; tiền ròng vẫn là {formatCurrency(result.cashReceived)}.</p>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Với mức bỏ này, mỗi chân chưa hốt góp ít hơn hụi chết {formatCurrency(result.discountPerLivingShare)}.</p>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Sau khi hốt, bạn còn đóng {formatCurrency(result.remainingContributions)} trong {result.remainingPeriods} kỳ. Mức bỏ {formatCurrency(bid ?? 0)} chỉ là giả định; bạn được hốt khi đó là mức nhỏ nhất theo quy ước của dây hụi.</p>
        </Card>
      </>}
    </div>
  </main>;
}
