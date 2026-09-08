import { notFound } from "next/navigation";
import { TransactionDetailView } from "@/features/transactions/components/transaction-detail-view";
import { getTransaction } from "@/features/transactions/queries/get-transactions";
import { getTransactionOptions } from "@/features/transactions/queries/get-transaction-options";

const demoTransaction = { id: "demo-1", type: "expense" as const, amount: 65000, merchant: "Highlands Coffee", note: "Cà phê buổi sáng", transaction_date: "2026-09-07T09:42:00+07:00", account_id: "00000000-0000-0000-0000-000000000001", destination_account_id: null, category_id: "00000000-0000-0000-0000-000000000011" };

export default async function TransactionDetailPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; const [result, options] = await Promise.all([getTransaction(id), getTransactionOptions()]); if (result.configured && !result.transaction) notFound(); return <TransactionDetailView transaction={result.transaction ?? { ...demoTransaction, id }} accounts={options.accounts} categories={options.categories} configured={result.configured} />; }
