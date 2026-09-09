import { DashboardView } from "@/features/dashboard/components/dashboard-view";
import { getDashboardSummary } from "@/features/dashboard/queries/get-dashboard-summary";

export default async function AppPage() {
  const data = await getDashboardSummary();
  return <DashboardView data={data} />;
}
