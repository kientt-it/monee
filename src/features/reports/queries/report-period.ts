export const TIMEZONE = "Asia/Ho_Chi_Minh";
export type ReportRange = "week" | "month" | "year" | "custom";
export type ReportUnit = "week" | "month" | "year";

function localParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return { year: value("year"), month: value("month"), day: value("day") };
}

export function dateString(date: Date) {
  const { year, month, day } = localParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function utcDate(value: string) { return new Date(`${value}T00:00:00Z`); }
export function addDays(value: string, days: number) { const result = utcDate(value); result.setUTCDate(result.getUTCDate() + days); return dateString(result); }
export function addMonths(value: string, months: number) { const result = utcDate(`${value.slice(0, 7)}-01`); result.setUTCMonth(result.getUTCMonth() + months); return dateString(result); }
export function addYears(value: string, years: number) { const result = utcDate(`${value.slice(0, 4)}-01-01`); result.setUTCFullYear(result.getUTCFullYear() + years); return dateString(result); }
function validDate(value: string | undefined) { return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value)); }

export function currentWeekStart(today: string) {
  const date = utcDate(today);
  const day = date.getUTCDay();
  date.setUTCDate(date.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return dateString(date);
}

export function getReportPeriod(range: ReportRange, now: Date, customFrom?: string, customTo?: string) {
  const today = dateString(now);
  if (range === "custom" && validDate(customFrom) && validDate(customTo) && customFrom! <= customTo!) return { from: customFrom!, to: customTo!, unit: "month" as ReportUnit, label: `${customFrom} → ${customTo}` };
  if (range === "week") {
    const from = currentWeekStart(today);
    const to = addDays(from, 6);
    return { from, to, unit: "week" as ReportUnit, label: `Tuần ${from.slice(8)}–${to.slice(8)}/${to.slice(5, 7)}` };
  }
  if (range === "year") {
    const from = `${today.slice(0, 4)}-01-01`;
    return { from, to: `${today.slice(0, 4)}-12-31`, unit: "year" as ReportUnit, label: `Năm ${today.slice(0, 4)}` };
  }
  const from = `${today.slice(0, 7)}-01`;
  const to = addDays(addMonths(from, 1), -1);
  return { from, to, unit: "month" as ReportUnit, label: `Tháng ${Number(today.slice(5, 7))}/${today.slice(0, 4)}` };
}
