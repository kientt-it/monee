import { HuiCalculator } from "@/features/hui/components/hui-calculator";
import { getSavedHuiCalculation } from "@/features/hui/queries";

export default async function HuiPage() {
  const { saved, available, notice } = await getSavedHuiCalculation();
  return <HuiCalculator initialSaved={saved} savingAvailable={available} initialNotice={notice} />;
}
