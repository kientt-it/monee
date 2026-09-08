import { describe, expect, it } from "vitest";
import { applyTransactionEffect, removeTransactionEffect, replaceTransactionEffect } from "./balance-effects";
import { calculateBudgetUsage, calculateSavingRate } from "./calculations";

describe("financial balance effects", () => {
  it("subtracts an expense from its account", () => {
    expect(applyTransactionEffect({ cash: 1_000_000 }, { type: "expense", amount: 120_000, accountId: "cash" })).toEqual({ cash: 880_000 });
  });

  it("adds income to its account", () => {
    expect(applyTransactionEffect({ bank: 2_000_000 }, { type: "income", amount: 500_000, accountId: "bank" })).toEqual({ bank: 2_500_000 });
  });

  it("moves money without changing total balance", () => {
    const result = applyTransactionEffect({ bank: 2_000_000, cash: 300_000 }, { type: "transfer", amount: 400_000, accountId: "bank", destinationAccountId: "cash" });
    expect(result).toEqual({ bank: 1_600_000, cash: 700_000 });
    expect(result.bank + result.cash).toBe(2_300_000);
  });

  it("reverses an old expense before applying the edited amount", () => {
    const result = replaceTransactionEffect({ cash: 900_000 }, { type: "expense", amount: 100_000, accountId: "cash" }, { type: "expense", amount: 150_000, accountId: "cash" });
    expect(result).toEqual({ cash: 850_000 });
  });

  it("restores the balance when deleting an expense", () => {
    expect(removeTransactionEffect({ cash: 750_000 }, { type: "expense", amount: 250_000, accountId: "cash" })).toEqual({ cash: 1_000_000 });
  });

  it("reverses an old transfer and applies the edited transfer", () => {
    const result = replaceTransactionEffect(
      { bank: 800_000, cash: 700_000, wallet: 100_000 },
      { type: "transfer", amount: 200_000, accountId: "bank", destinationAccountId: "cash" },
      { type: "transfer", amount: 300_000, accountId: "bank", destinationAccountId: "wallet" },
    );
    expect(result).toEqual({ bank: 700_000, cash: 500_000, wallet: 400_000 });
  });

  it("reverses both sides when deleting a transfer", () => {
    expect(removeTransactionEffect({ bank: 800_000, cash: 700_000 }, { type: "transfer", amount: 200_000, accountId: "bank", destinationAccountId: "cash" })).toEqual({ bank: 1_000_000, cash: 500_000 });
  });
});

describe("financial summaries", () => {
  it("excludes transfers from saving rate", () => {
    const rate = calculateSavingRate([
      { type: "income", amount: 10_000_000, transactionDate: "2026-09-01" },
      { type: "expense", amount: 4_000_000, transactionDate: "2026-09-02" },
      { type: "transfer", amount: 2_000_000, transactionDate: "2026-09-03" },
    ]);
    expect(rate).toBe(60);
  });

  it("classifies budget thresholds and caps remaining at zero", () => {
    expect(calculateBudgetUsage(740_000, 1_000_000).status).toBe("normal");
    expect(calculateBudgetUsage(750_000, 1_000_000).status).toBe("warning");
    expect(calculateBudgetUsage(900_000, 1_000_000).status).toBe("strong_warning");
    expect(calculateBudgetUsage(1_100_000, 1_000_000)).toMatchObject({ status: "over", remaining: 0 });
  });
});
