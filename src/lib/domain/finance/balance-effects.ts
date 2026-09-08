export type BalanceTransaction = {
  type: "expense" | "income" | "transfer";
  amount: number;
  accountId: string;
  destinationAccountId?: string | null;
};

export type AccountBalances = Record<string, number>;

function assertValidTransaction(transaction: BalanceTransaction) {
  if (!Number.isSafeInteger(transaction.amount) || transaction.amount <= 0) throw new Error("INVALID_AMOUNT");
  if (transaction.type === "transfer" && (!transaction.destinationAccountId || transaction.destinationAccountId === transaction.accountId)) throw new Error("INVALID_TRANSFER_ACCOUNT");
}

export function applyTransactionEffect(balances: AccountBalances, transaction: BalanceTransaction, direction: 1 | -1 = 1): AccountBalances {
  assertValidTransaction(transaction);
  if (!(transaction.accountId in balances)) throw new Error("INVALID_ACCOUNT");
  const result = { ...balances };
  const signedAmount = transaction.amount * direction;
  if (transaction.type === "expense") result[transaction.accountId] -= signedAmount;
  if (transaction.type === "income") result[transaction.accountId] += signedAmount;
  if (transaction.type === "transfer") {
    const destinationId = transaction.destinationAccountId!;
    if (!(destinationId in balances)) throw new Error("INVALID_TRANSFER_ACCOUNT");
    result[transaction.accountId] -= signedAmount;
    result[destinationId] += signedAmount;
  }
  return result;
}

export function replaceTransactionEffect(balances: AccountBalances, previous: BalanceTransaction, next: BalanceTransaction) {
  return applyTransactionEffect(applyTransactionEffect(balances, previous, -1), next, 1);
}

export function removeTransactionEffect(balances: AccountBalances, transaction: BalanceTransaction) {
  return applyTransactionEffect(balances, transaction, -1);
}
