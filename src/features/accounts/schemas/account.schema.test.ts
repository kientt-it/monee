import { describe, expect, it } from "vitest";
import { accountEditSchema, accountMetadataSchema, accountSchema } from "./account.schema";

const metadata = {
  name: "Ví hằng ngày",
  type: "cash" as const,
  currency: "VND" as const,
  color: "#087f5b",
  includeInTotal: true,
};

describe("account schemas", () => {
  it("accepts a valid new account", () => {
    expect(accountSchema.safeParse({ ...metadata, initialBalance: 1_000_000 }).success).toBe(true);
  });

  it("rejects negative opening balances", () => {
    expect(accountSchema.safeParse({ ...metadata, initialBalance: -1 }).success).toBe(false);
  });

  it("accepts an editable opening balance and caps unsafe amounts", () => {
    expect(accountEditSchema.safeParse({ ...metadata, initialBalance: 2_500_000 }).success).toBe(true);
    expect(accountEditSchema.safeParse({ ...metadata, initialBalance: 1_000_000_000_001 }).success).toBe(false);
  });

  it("validates editable metadata without accepting a balance", () => {
    const result = accountMetadataSchema.parse({ ...metadata, name: "  Tiền mặt  ", currentBalance: 99 });
    expect(result.name).toBe("Tiền mặt");
    expect("currentBalance" in result).toBe(false);
  });
});
