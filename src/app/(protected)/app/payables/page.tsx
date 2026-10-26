import { PayablesView } from "@/features/payables/components/payables-view";
import { getPayables } from "@/features/payables/queries/get-payables";
import { localToday } from "@/lib/date";
import { getAccounts } from "@/features/accounts/queries/get-accounts";

export default async function PayablesPage() {
  const [data, accountData] = await Promise.all([getPayables(), getAccounts()]);
  return <PayablesView {...data} accounts={accountData.accounts} today={localToday()} />;
}
