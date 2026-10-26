import { PayablesView } from "@/features/payables/components/payables-view";
import { getPayables } from "@/features/payables/queries/get-payables";
import { localToday } from "@/lib/date";

export default async function PayablesPage() {
  const data = await getPayables();
  return <PayablesView {...data} today={localToday()} />;
}
