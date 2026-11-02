import { DashboardView } from "@/features/dashboard/components/dashboard-view";
import { getDashboardSummary } from "@/features/dashboard/queries/get-dashboard-summary";
import { getRepaymentData } from "@/features/repayments/queries";
import { parsePeriod } from "@/features/repayments/domain";
import { RepaymentWorkspace } from "@/features/repayments/components/repayment-workspace";

export default async function AppPage({ searchParams }: { searchParams: Promise<{ month?: string | string[]; mode?: string | string[] }> }) {
  const params = await searchParams;
  const period = parsePeriod(params.month, params.mode);
  const repayments = await getRepaymentData(period.month, period.mode);
  if (repayments.available) return <RepaymentWorkspace key={`${period.month}-${period.mode}`} data={repayments} period={period} />;
  const data = await getDashboardSummary();
  return <DashboardView data={data} />;
}
