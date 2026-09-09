import { RecurringView } from "@/features/recurring/components/recurring-view";
import { getRecurringTransactions } from "@/features/recurring/queries/get-recurring";

export default async function RecurringPage() {
  const result = await getRecurringTransactions();
  return <RecurringView recurring={result.recurring} accounts={result.accounts} categories={result.categories} configured={result.configured} />;
}
