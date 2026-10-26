import { describe, expect, it } from "vitest";
import { calculateHui } from "./calculate-hui";

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
