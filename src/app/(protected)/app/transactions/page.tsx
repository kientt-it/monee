import { TransactionsView } from "@/features/transactions/components/transactions-view";
import { getTransactions } from "@/features/transactions/queries/get-transactions";

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<{ deleted?: string; period?: string; type?: string; page?: string }> }) {
  const params = await searchParams;
  const typeFilter = params.type === "expense" || params.type === "income" ? params.type : undefined;
  const monthOnly = params.period === "month";
  const parsedPage = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const result = await getTransactions({ type: typeFilter, monthOnly, page });
  return <TransactionsView transactions={result.transactions} configured={result.configured} hasMore={result.hasMore ?? false} page={result.page ?? page} deletedId={params.deleted} typeFilter={typeFilter ?? "all"} monthOnly={monthOnly} />;
}
