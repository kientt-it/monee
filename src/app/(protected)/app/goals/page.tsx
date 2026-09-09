import { GoalsView } from "@/features/goals/components/goals-view";
import { getGoals } from "@/features/goals/queries/get-goals";

export default async function GoalsPage() {
  const result = await getGoals();
  return <GoalsView goals={result.goals} accounts={result.accounts} configured={result.configured} />;
}
