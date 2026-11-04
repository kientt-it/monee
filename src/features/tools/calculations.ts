export const currencies = [
  ["VND", "Đồng Việt Nam"], ["USD", "Đô la Mỹ"], ["EUR", "Euro"],
  ["JPY", "Yên Nhật"], ["KRW", "Won Hàn Quốc"], ["CNY", "Nhân dân tệ"],
  ["GBP", "Bảng Anh"], ["SGD", "Đô la Singapore"], ["THB", "Baht Thái"],
  ["AUD", "Đô la Úc"], ["CAD", "Đô la Canada"], ["TWD", "Đô la Đài Loan"],
] as const;
export type Currency = typeof currencies[number][0];
export type RateSnapshot = { rates: Record<Currency, number>; updatedAt: number };

export function parseRates(value: unknown): RateSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  if (data.result !== "success" || data.base_code !== "USD" || !data.rates || typeof data.rates !== "object") return null;
  const rates = data.rates as Record<string, unknown>;
  if (typeof data.time_last_update_unix !== "number" || !Number.isFinite(data.time_last_update_unix) || data.time_last_update_unix <= 0) return null;
  if (currencies.some(([code]) => typeof rates[code] !== "number" || !Number.isFinite(rates[code]) || Number(rates[code]) <= 0) || rates.USD !== 1) return null;
  return { rates: Object.fromEntries(currencies.map(([code]) => [code, rates[code]])) as Record<Currency, number>, updatedAt: data.time_last_update_unix * 1000 };
}

export function convertCurrency(amount: number, rate: number) {
  const result = amount * rate;
  return Number.isFinite(amount) && amount >= 0 && amount <= 1e12 && Number.isFinite(rate) && rate > 0 && Number.isFinite(result) && result <= Number.MAX_SAFE_INTEGER ? result : null;
}

export type DepositInput = {
  principal: number; annualRate: number; start: string; term: number;
  unit: "months" | "weeks" | "days"; payout: "end" | "monthly" | "compound"; cycles: number;
};
export type DepositRow = { from: string; until: string; days: number; opening: number; interest: number; closing: number };
const DAY = 86_400_000;
function date(value: string) {
  if (!/^(19|20)\d{2}-\d{2}-\d{2}$/.test(value)) return null;
  const result = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(result.getTime()) && result.toISOString().slice(0, 10) === value ? result : null;
}
function addMonths(start: Date, count: number) {
  const result = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + count, 1));
  result.setUTCDate(Math.min(start.getUTCDate(), new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate()));
  return result;
}
const iso = (value: Date) => value.toISOString().slice(0, 10);

export function calculateDeposit(input: DepositInput) {
  const { principal, annualRate, term, unit, payout, cycles } = input;
  const start = date(input.start);
  if (!start || !Number.isSafeInteger(principal) || principal <= 0 || principal > 1e12 || !Number.isFinite(annualRate) || annualRate < 0 || annualRate > 100
    || !Number.isInteger(term) || term < 1 || term > (unit === "months" ? 120 : unit === "weeks" ? 520 : 3650)
    || !["months", "weeks", "days"].includes(unit) || !["end", "monthly", "compound"].includes(payout)
    || !Number.isInteger(cycles) || cycles < 1 || cycles > 60) return null;
  const count = payout === "compound" ? cycles : 1;
  const boundary = (i: number) => unit === "months" ? addMonths(start, term * i) : new Date(start.getTime() + term * i * (unit === "weeks" ? 7 : 1) * DAY);
  const end = boundary(count);
  if ((end.getTime() - start.getTime()) / DAY > 36525) return null;
  const rows: DepositRow[] = [];
  let opening = principal;
  let from = start;
  let index = 1;
  while (from < end) {
    const until = payout === "monthly" ? new Date(Math.min(addMonths(start, index).getTime(), end.getTime())) : boundary(index);
    const days = (until.getTime() - from.getTime()) / DAY;
    const interest = Math.round(opening * annualRate / 100 * days / 365);
    const closing = payout === "compound" ? opening + interest : opening;
    if (!Number.isSafeInteger(closing) || closing > 1e15) return null;
    rows.push({ from: iso(from), until: iso(until), days, opening, interest, closing });
    opening = closing;
    from = until;
    index++;
  }
  const interest = rows.reduce((sum, row) => sum + row.interest, 0);
  return { rows, interest, total: principal + interest, maturity: iso(end), days: (end.getTime() - start.getTime()) / DAY };
}
