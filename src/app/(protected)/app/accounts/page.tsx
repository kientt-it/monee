import { AccountsView } from "@/features/accounts/components/accounts-view";
import { getAccounts } from "@/features/accounts/queries/get-accounts";

export default async function AccountsPage() {
  const result = await getAccounts();
  return <AccountsView accounts={result.accounts} configured={result.configured} />;
}
