import { BudgetsView } from "@/features/budgets/components/budgets-view";
import { getBudgets } from "@/features/budgets/queries/get-budgets";

export default async function BudgetsPage() {
  const result = await getBudgets();
  return <BudgetsView budgets={result.budgets} categories={result.categories} configured={result.configured} />;
}
