import { describe, expect, it } from "vitest";
import { huiConfigSchema } from "./saved-calculation";

const sample = { version: 1, shares: 34, payoutPeriod: 17, faceValue: 2_000_000, startingContribution: 1_800_000,
  bid: 1_700_000, organizerFee: 0, historyMode: "average", averageContribution: 1_800_000, pastTotal: null };
describe("saved hui configuration", () => {
  it("round-trips every input, including a true zero fee", () => {
    expect(huiConfigSchema.parse(JSON.parse(JSON.stringify(sample)))).toEqual(sample);
  });
  it("requires history in the selected mode", () => {
    expect(huiConfigSchema.safeParse({ ...sample, averageContribution: null }).success).toBe(false);
    expect(huiConfigSchema.safeParse({ ...sample, historyMode: "total" }).success).toBe(false);
    expect(huiConfigSchema.safeParse({ ...sample, historyMode: "total", pastTotal: 25_000_000, averageContribution: null }).success).toBe(true);
  });
  it("allows zero historical contributions, including a first-period payout", () => {
    expect(huiConfigSchema.safeParse({ ...sample, payoutPeriod: 1, averageContribution: null }).success).toBe(true);
    expect(huiConfigSchema.safeParse({ ...sample, historyMode: "total", pastTotal: 0 }).success).toBe(true);
  });
  it("rejects invalid business inputs even when field types are correct", () => {
    expect(huiConfigSchema.safeParse({ ...sample, payoutPeriod: 35 }).success).toBe(false);
    expect(huiConfigSchema.safeParse({ ...sample, bid: 1_900_000 }).success).toBe(false);
    expect(huiConfigSchema.safeParse({ ...sample, organizerFee: 1e12 }).success).toBe(false);
  });
  it("rejects unknown versions and malformed persisted data", () => {
    expect(huiConfigSchema.safeParse({ ...sample, version: 2 }).success).toBe(false);
    expect(huiConfigSchema.safeParse({ ...sample, shares: "34" }).success).toBe(false);
    expect(huiConfigSchema.safeParse({ ...sample, bid: NaN }).success).toBe(false);
    expect(huiConfigSchema.safeParse(null).success).toBe(false);
  });
  it("does not accept a client-supplied owner into the saved config", () => {
    expect(huiConfigSchema.parse({ ...sample, user_id: "someone-else" })).not.toHaveProperty("user_id");
  });
});
