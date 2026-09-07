import { TransactionForm } from "@/features/transactions/components/transaction-form";
import { getTransactionOptions } from "@/features/transactions/queries/get-transaction-options";

export default async function NewTransactionPage() { const result = await getTransactionOptions(); return <TransactionForm accounts={result.accounts} categories={result.categories} configured={result.configured} />; }
