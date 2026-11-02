import { PayablesView } from "@/features/payables/components/payables-view";
import { getPayables } from "@/features/payables/queries/get-payables";
import { localToday } from "@/lib/date";
import { getAccounts } from "@/features/accounts/queries/get-accounts";
import { getRepaymentData } from "@/features/repayments/queries";
import { parsePeriod } from "@/features/repayments/domain";
import { RepaymentWorkspace } from "@/features/repayments/components/repayment-workspace";

export default async function PayablesPage({ searchParams }: { searchParams: Promise<{ month?: string | string[]; mode?: string | string[]; new?: string }> }) {
  const params = await searchParams;
  const period = parsePeriod(params.month, params.mode);
  const repayments = await getRepaymentData(period.month, period.mode);
  if (repayments.available) return <RepaymentWorkspace key={`${period.month}-${period.mode}`} data={repayments} period={period} view="dues" openNew={params.new === "1"} />;
  const [data, accountData] = await Promise.all([getPayables(), getAccounts()]);
  return <PayablesView {...data} accounts={accountData.accounts} today={localToday()} />;
}
