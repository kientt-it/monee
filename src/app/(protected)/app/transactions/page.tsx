import { TransactionsView } from "@/features/transactions/components/transactions-view";
import { getTransactions } from "@/features/transactions/queries/get-transactions";

export default async function TransactionsPage() { const result = await getTransactions(); return <TransactionsView transactions={result.transactions} configured={result.configured} />; }
