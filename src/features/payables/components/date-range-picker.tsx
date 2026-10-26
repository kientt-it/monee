"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { displayDate } from "@/lib/date";
import type { PayableDateRange } from "../types";

const weekdays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function shiftMonth(month: string, offset: number) {
  const [year, number] = month.split("-").map(Number);
  return new Date(Date.UTC(year, number - 1 + offset, 1)).toISOString().slice(0, 7);
}

function CalendarDialog({ range, today, onApply, onClose }: { range: PayableDateRange; today: string; onApply: (range: PayableDateRange) => void; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [month, setMonth] = useState((range.fromDate || today).slice(0, 7));
  const [start, setStart] = useState(range.fromDate);
  const [end, setEnd] = useState(range.toDate);
  const [choosingEnd, setChoosingEnd] = useState(false);

  useEffect(() => {
    dialog.current?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, []);

  const [year, monthNumber] = month.split("-").map(Number);
  const offset = (new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const monthLabel = new Intl.DateTimeFormat("vi-VN", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));

  function chooseDay(day: string) {
    if (!choosingEnd || !start) {
      setStart(day);
      setEnd("");
      setChoosingEnd(true);
      return;
    }
    if (day < start) {
      setEnd(start);
      setStart(day);
    } else {
      setEnd(day);
    }
    setChoosingEnd(false);
  }

  return <dialog ref={dialog} aria-labelledby="payables-date-range-title" onCancel={(event) => { event.preventDefault(); onClose(); }} className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-sm overflow-y-auto rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 text-[var(--foreground)] shadow-2xl backdrop:bg-black/40">
    <div className="flex items-start justify-between gap-3"><div><h2 id="payables-date-range-title" className="text-lg font-bold">Chọn khoảng ngày</h2><p className="mt-1 text-sm text-[var(--muted)]">Chạm ngày bắt đầu, rồi ngày kết thúc.</p></div><button type="button" onClick={onClose} aria-label="Đóng lịch" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-[var(--surface-muted)]"><X size={19} /></button></div>
    <div className="mt-5 grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl bg-[var(--surface-muted)] p-3"><span className="block text-xs text-[var(--muted)]">Từ ngày</span><strong className="mt-1 block">{start ? displayDate(start) : "Chưa chọn"}</strong></div><div className="rounded-xl bg-[var(--surface-muted)] p-3"><span className="block text-xs text-[var(--muted)]">Đến ngày</span><strong className="mt-1 block">{end ? displayDate(end) : "Chưa chọn"}</strong></div></div>
    <div className="mt-5 flex items-center justify-between gap-2"><button type="button" aria-label="Tháng trước" disabled={month <= "1900-01"} onClick={() => setMonth(shiftMonth(month, -1))} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-[var(--surface-muted)] disabled:opacity-40"><ChevronLeft size={20} /></button><p className="text-sm font-semibold capitalize">{monthLabel}</p><button type="button" aria-label="Tháng sau" disabled={month >= "2100-12"} onClick={() => setMonth(shiftMonth(month, 1))} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-[var(--surface-muted)] disabled:opacity-40"><ChevronRight size={20} /></button></div>
    <div className="mt-2 grid grid-cols-7 gap-1 text-center">{weekdays.map((day) => <span key={day} className="py-2 text-xs font-semibold text-[var(--muted)]">{day}</span>)}{Array.from({ length: offset }, (_, index) => <span key={`blank-${index}`} aria-hidden="true" />)}{Array.from({ length: daysInMonth }, (_, index) => {
      const day = `${month}-${String(index + 1).padStart(2, "0")}`;
      const edge = day === start || day === end;
      const between = !!start && !!end && day > start && day < end;
      return <button key={day} type="button" onClick={() => chooseDay(day)} aria-label={displayDate(day)} aria-pressed={edge} className={`flex h-10 min-w-0 items-center justify-center rounded-full text-sm font-medium ${edge ? "bg-[var(--brand)] text-white" : between ? "bg-[var(--brand-soft)] text-[var(--brand-strong)]" : day === today ? "border border-[var(--brand)] text-[var(--brand)]" : "hover:bg-[var(--surface-muted)]"}`}>{index + 1}</button>;
    })}</div>
    <div className="mt-5 flex items-center justify-between gap-2 border-t border-[var(--border)] pt-4"><button type="button" onClick={() => onApply({ fromDate: "", toDate: "" })} className="min-h-11 text-sm font-semibold text-[var(--brand)]">Xóa lọc</button><Button type="button" disabled={!start || !end} onClick={() => onApply({ fromDate: start, toDate: end })}>Áp dụng</Button></div>
  </dialog>;
}

export function DateRangePicker({ range, today, onChange }: { range: PayableDateRange; today: string; onChange: (range: PayableDateRange) => void }) {
  const [open, setOpen] = useState(false);
  const label = range.fromDate && range.toDate ? `${displayDate(range.fromDate)} – ${displayDate(range.toDate)}` : "Chọn từ ngày đến ngày";
  return <>
    <button type="button" aria-label="Chọn khoảng ngày cần trả" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)} className="flex min-h-12 w-full min-w-0 items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-left text-sm font-semibold hover:bg-[var(--surface-muted)] sm:max-w-sm"><CalendarDays size={18} className="shrink-0 text-[var(--brand)]" /><span className="min-w-0 flex-1 truncate">{label}</span><ChevronDown size={17} className="shrink-0 text-[var(--muted)]" /></button>
    {open && <CalendarDialog range={range} today={today} onClose={() => setOpen(false)} onApply={(next) => { onChange(next); setOpen(false); }} />}
  </>;
}
