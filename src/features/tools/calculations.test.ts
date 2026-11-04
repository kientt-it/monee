import { describe, expect, it } from "vitest";
import { calculateDeposit, convertCurrency, currencies, parseRates, type DepositInput } from "./calculations";

const base: DepositInput = { principal: 100_000_000, annualRate: 5, start: "2026-11-04", term: 6, unit: "months", payout: "end", cycles: 1 };
describe("deposit estimates", () => {
  it("uses actual calendar days, not months divided by twelve", () => {
    const result = calculateDeposit(base)!;
    expect(result.maturity).toBe("2027-05-04");
    expect(result.days).toBe(181);
    expect(result.interest).toBe(Math.round(100_000_000 * 0.05 * 181 / 365));
    expect(result.total).toBe(base.principal + result.interest);
  });
  it("clamps month ends without drifting subsequent anniversaries", () => {
    const result = calculateDeposit({ ...base, start: "2028-01-31", term: 3, payout: "monthly" })!;
    expect(result.rows.map(r => r.until)).toEqual(["2028-02-29", "2028-03-31", "2028-04-30"]);
    expect(result.rows.map(r => r.days)).toEqual([29, 31, 30]);
    expect(result.rows.every(r => r.opening === base.principal && r.closing === base.principal)).toBe(true);
    expect(result.interest).toBe(result.rows.reduce((sum, r) => sum + r.interest, 0));
  });
  it("pays a final short monthly period for a deposit in days", () => {
    const result = calculateDeposit({ ...base, start: "2026-01-01", term: 45, unit: "days", payout: "monthly" })!;
    expect(result.rows.map(r => r.days)).toEqual([31, 14]);
    expect(result.maturity).toBe("2026-02-15");
  });
  it("counts leap-year days with a 365-day interest basis", () => {
    const result = calculateDeposit({ ...base, start: "2028-01-01", term: 12 })!;
    expect(result.days).toBe(366);
    expect(result.interest).toBe(Math.round(base.principal * 0.05 * 366 / 365));
  });
  it("uses weekly and daily periods", () => {
    const weeks = calculateDeposit({ ...base, term: 4, unit: "weeks" })!;
    const days = calculateDeposit({ ...base, term: 28, unit: "days" })!;
    expect(weeks).toEqual(days);
    expect(weeks.days).toBe(28);
  });
  it("reinvests interest only at each maturity, using the new principal", () => {
    const result = calculateDeposit({ ...base, start: "2026-01-01", term: 12, payout: "compound", cycles: 2 })!;
    expect(result.rows.map(r => r.interest)).toEqual([5_000_000, 5_250_000]);
    expect(result.rows[1].opening).toBe(105_000_000);
    expect(result.total).toBe(110_250_000);
    expect(result.maturity).toBe("2028-01-01");
  });
  it("allows a true zero interest rate", () => {
    expect(calculateDeposit({ ...base, annualRate: 0 })?.total).toBe(base.principal);
  });
  it.each([
    { start: "2026-02-30" }, { principal: 0 }, { principal: NaN }, { principal: 1e13 },
    { annualRate: -1 }, { annualRate: Infinity }, { term: 1.5 }, { term: 0 },
    { cycles: 0 }, { term: 120, cycles: 60, payout: "compound" as const },
  ])("rejects invalid or unbounded inputs: %j", change => {
    expect(calculateDeposit({ ...base, ...change })).toBeNull();
  });
});
describe("currency conversion", () => {
  it("keeps precision for decimal and cross rates", () => {
    expect(convertCurrency(100.5, 25000)).toBe(2_512_500);
    expect(convertCurrency(25000, 1 / 25000)).toBe(1);
    expect(convertCurrency(0, 25000)).toBe(0);
  });
  it("rejects missing, negative, infinite or unsafe values", () => {
    for (const [amount, rate] of [[NaN, 1], [-1, 1], [1, 0], [1, -2], [1, Infinity], [1e12, 1e12]]) expect(convertCurrency(amount, rate)).toBeNull();
  });
  it("requires a complete positive USD-based rate snapshot", () => {
    const rates = Object.fromEntries(currencies.map(([code]) => [code, code === "USD" ? 1 : 2]));
    const raw = { result: "success", base_code: "USD", time_last_update_unix: 1793750551, rates };
    expect(parseRates(raw)?.updatedAt).toBe(1793750551000);
    expect(parseRates({ ...raw, rates: { ...rates, VND: 0 } })).toBeNull();
    expect(parseRates({ ...raw, rates: { USD: 1 } })).toBeNull();
    expect(parseRates({ ...raw, base_code: "EUR" })).toBeNull();
    expect(parseRates({ ...raw, result: "error" })).toBeNull();
    expect(parseRates({ ...raw, time_last_update_unix: NaN })).toBeNull();
  });
});
