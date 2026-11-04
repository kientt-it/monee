import { describe, expect, it } from "vitest";
import { calculateHui, calculateHuiProfit } from "./calculate-hui";

describe("calculateHui", () => {
  it("counts the winner's own share in the pool but not in cash received", () => {
    expect(calculateHui({ shares: 10, paidOutShares: 0, faceValue: 2_000_000, startingContribution: 1_800_000, bid: 1_700_000, organizerFee: 0 })).toMatchObject({
      grossPool: 17_000_000,
      cashReceived: 15_300_000,
      remainingPeriods: 9,
      remainingContributions: 18_000_000,
    });
  });

  it("uses full contributions from prior winners and subtracts the organizer fee", () => {
    expect(calculateHui({ shares: 10, paidOutShares: 2, faceValue: 2_000_000, startingContribution: 1_800_000, bid: 1_750_000, organizerFee: 100_000 })).toMatchObject({
      paidOutContributions: 4_000_000,
      grossPool: 18_000_000,
      cashReceived: 16_150_000,
      remainingPeriods: 7,
    });
    expect(calculateHui({ shares: 10, paidOutShares: 9, faceValue: 2_000_000, startingContribution: 1_800_000, bid: 1_700_000, organizerFee: 0 })?.cashReceived).toBe(18_000_000);
  });

  it("rejects an impossible bid or paid-out share count", () => {
    expect(calculateHui({ shares: 10, paidOutShares: 10, faceValue: 2_000_000, startingContribution: 1_800_000, bid: 1_700_000, organizerFee: 0 })).toBeNull();
    expect(calculateHui({ shares: 10, paidOutShares: 0, faceValue: 2_000_000, startingContribution: 1_800_000, bid: 1_900_000, organizerFee: 0 })).toBeNull();
  });
});

describe("calculateHuiProfit", () => {
  const example = { shares: 34, paidOutShares: 16, faceValue: 2_000_000, startingContribution: 1_800_000, bid: 1_700_000, organizerFee: 0, pastContributions: 28_800_000 };
  it("computes nominal loss for payout 17/34 without deducting the current share twice", () => {
    expect(calculateHuiProfit(example)).toMatchObject({ cashReceived: 60_900_000, pastContributions: 28_800_000,
      remainingPeriods: 17, remainingContributions: 34_000_000, totalContributions: 62_800_000, profit: -1_900_000 });
  });
  it("counts organizer fees exactly once", () => {
    expect(calculateHuiProfit({ ...example, organizerFee: 100_000 })?.profit).toBe(-2_000_000);
  });
  it("uses the actual previous total for variable contributions", () => {
    expect(calculateHuiProfit({ ...example, pastContributions: 26_900_000 })?.profit).toBe(0);
    expect(calculateHuiProfit({ ...example, pastContributions: 25_000_000 })?.profit).toBe(1_900_000);
  });
  it("handles the first and last payout periods", () => {
    expect(calculateHuiProfit({ ...example, paidOutShares: 0, pastContributions: 0 })).toMatchObject({ profit: -9_900_000, remainingPeriods: 33 });
    expect(calculateHuiProfit({ ...example, paidOutShares: 33, pastContributions: 59_400_000 })).toMatchObject({ cashReceived: 66_000_000, remainingContributions: 0, profit: 6_600_000 });
  });
  it("computes whole-cycle return on actual outgoing contributions", () => {
    expect(calculateHuiProfit(example)?.profitPercent).toBeCloseTo(-1_900_000 / 62_800_000 * 100);
    expect(calculateHuiProfit({ ...example, shares: 2, paidOutShares: 1, pastContributions: 0 })?.profitPercent).toBeNull();
  });
  it.each([NaN, -1, 1.5, Infinity, 1e16])("rejects invalid historical contributions %s", pastContributions => {
    expect(calculateHuiProfit({ ...example, pastContributions })).toBeNull();
  });
  it("rejects history before a first-period payout or an invalid payout", () => {
    expect(calculateHuiProfit({ ...example, paidOutShares: 0, pastContributions: 1 })).toBeNull();
    expect(calculateHuiProfit({ ...example, paidOutShares: 34 })).toBeNull();
  });
});
