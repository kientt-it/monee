import { LoansView } from "@/features/loans/components/loans-view";
import { getLoans } from "@/features/loans/queries/get-loans";
import { localToday } from "@/lib/date";

export default async function LoansPage() {
  const data = await getLoans();
  return <LoansView {...data} today={localToday()} />;
}
