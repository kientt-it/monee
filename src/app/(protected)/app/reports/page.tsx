import { ReportsView } from "@/features/reports/components/reports-view";
import { getReport, type ReportRange } from "@/features/reports/queries/get-report";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ range?: string; from?: string; to?: string }> }) {
  const params = await searchParams;
  const range: ReportRange = params.range === "week" || params.range === "year" || params.range === "custom" ? params.range : "month";
  const data = await getReport(range, params.from, params.to);
  return <ReportsView data={data} configured={data !== null} />;
}
