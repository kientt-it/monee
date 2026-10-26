"use client";

import { useState } from "react";
import { Calculator, HandCoins } from "lucide-react";
import { Card } from "@/components/ui/card";
import { MoneyInput } from "@/components/ui/money-input";
import { formatCurrency } from "@/lib/utils";
import { calculateHui } from "../calculate-hui";

const countInputClass = "mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-base tabular-nums";

export function HuiCalculator() {
  const [shares, setShares] = useState("10");
  const [paidOutShares, setPaidOutShares] = useState("0");
  const [faceValue, setFaceValue] = useState<number | null>(2_000_000);
  const [startingContribution, setStartingContribution] = useState<number | null>(1_800_000);
  const [bid, setBid] = useState<number | null>(1_700_000);
  const [organizerFee, setOrganizerFee] = useState<number | null>(0);
  const result = calculateHui({ shares: shares ? Number(shares) : NaN, paidOutShares: paidOutShares ? Number(paidOutShares) : NaN, faceValue: faceValue ?? 0, startingContribution: startingContribution ?? 0, bid: bid ?? 0, organizerFee: organizerFee ?? 0 });

  return <main className="min-w-0 px-4 pb-[calc(env(safe-area-inset-bottom)+7rem)] pt-5 sm:px-6 md:px-10 md:pb-12 md:pt-8">
    <div className="mx-auto max-w-[900px] space-y-6">
      <header>
        <p className="text-sm text-[var(--muted)]">Tính nhanh tiền hốt kỳ này</p>
        <h1 className="mt-1 text-2xl font-bold md:text-3xl">Tính hụi</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">Dây hụi sống 1,8 triệu, hụi chết 2 triệu có thể bỏ mức khác nhau mỗi kỳ. Nhập mức bạn định bỏ để xem số tiền nhận nếu mức đó nhỏ nhất.</p>
      </header>

      <Card className="p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-2"><Calculator className="text-[var(--brand)]" size={21} /><h2 className="font-semibold">Thông tin dây hụi</h2></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold">Tổng số chân hụi
            <input type="number" inputMode="numeric" min={2} max={1000} step={1} value={shares} onChange={(event) => setShares(event.target.value)} className={countInputClass} />
          </label>
          <label className="text-sm font-semibold">Số chân đã hốt trước kỳ này
            <input type="number" inputMode="numeric" min={0} max={Math.max(0, Number(shares) - 1)} step={1} value={paidOutShares} onChange={(event) => setPaidOutShares(event.target.value)} className={countInputClass} />
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

      {result && <>
        <Card className="border-[var(--brand)] bg-[var(--brand)] p-5 text-white sm:p-6" aria-live="polite">
          <div className="flex items-center gap-2 text-white/85"><HandCoins size={20} /><p className="text-sm">Tiền bạn thực cầm nếu hốt kỳ {Number(paidOutShares) + 1}</p></div>
          <p className="mt-3 break-words text-3xl font-bold tabular-nums sm:text-4xl">{formatCurrency(result.cashReceived)}</p>
          <p className="mt-2 text-sm leading-6 text-white/85">Đã trừ phần góp của bạn trong kỳ này và tiền công chủ hụi.</p>
          <div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/20 pt-4">
            <div><p className="text-sm text-white/85">Tổng hụi có phần của bạn</p><p className="mt-1 font-semibold tabular-nums">{formatCurrency(result.grossPool)}</p></div>
            <div><p className="text-sm text-white/85">Còn đóng sau khi hốt</p><p className="mt-1 font-semibold tabular-nums">{result.remainingPeriods} kỳ × {formatCurrency(faceValue ?? 0)}</p></div>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="font-semibold">Cách tính kỳ này</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-start justify-between gap-3"><dt className="text-[var(--muted)]">{paidOutShares} chân đã hốt × {formatCurrency(faceValue ?? 0)}</dt><dd className="shrink-0 font-semibold tabular-nums">{formatCurrency(result.paidOutContributions)}</dd></div>
            <div className="flex items-start justify-between gap-3"><dt className="text-[var(--muted)]">{result.otherLivingShares} chân chưa hốt khác × {formatCurrency(bid ?? 0)}</dt><dd className="shrink-0 font-semibold tabular-nums">{formatCurrency(result.otherLivingContributions)}</dd></div>
            <div className="flex items-start justify-between gap-3"><dt className="text-[var(--muted)]">Tiền công chủ hụi</dt><dd className="shrink-0 font-semibold tabular-nums">−{formatCurrency(organizerFee ?? 0)}</dd></div>
            <div className="flex items-start justify-between gap-3 border-t border-[var(--border)] pt-3 font-semibold"><dt>Tiền thực cầm</dt><dd className="shrink-0 tabular-nums text-[var(--brand)]">{formatCurrency(result.cashReceived)}</dd></div>
          </dl>
          <p className="mt-4 text-sm leading-6 text-[var(--muted)]">Phần của bạn là {formatCurrency(bid ?? 0)}. Nếu chủ hụi thu đủ cả phần này rồi giao tiền, bạn nhận {formatCurrency(result.grossPool - (organizerFee ?? 0))} và tự nộp lại {formatCurrency(bid ?? 0)}; tiền ròng vẫn là {formatCurrency(result.cashReceived)}.</p>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Với mức bỏ này, mỗi chân chưa hốt góp ít hơn hụi chết {formatCurrency(result.discountPerLivingShare)}.</p>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Sau khi hốt, bạn còn đóng {formatCurrency(result.remainingContributions)} trong {result.remainingPeriods} kỳ. Mức bỏ {formatCurrency(bid ?? 0)} chỉ là giả định; bạn được hốt khi đó là mức nhỏ nhất theo quy ước của dây hụi.</p>
        </Card>
      </>}
    </div>
  </main>;
}
