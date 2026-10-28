import { AllocationView } from "@/features/allocations/components/allocation-view";
import { getAllocation } from "@/features/allocations/queries/get-allocation";
import { localToday } from "@/lib/date";

export default async function AllocationPage({ searchParams }: { searchParams: Promise<{ month?: string | string[] }> }) {
  const requested = (await searchParams).month;
  const month = typeof requested === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(requested) && requested >= "1900-01" && requested <= "2100-12"
    ? `${requested}-01` : `${localToday().slice(0, 7)}-01`;
  const data = await getAllocation(month);
  return <AllocationView key={`${month}-${data.plannedIncome}-${JSON.stringify(data.lines)}-${JSON.stringify(data.installments)}`} {...data} />;
}
