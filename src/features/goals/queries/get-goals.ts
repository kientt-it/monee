import { getSupabaseAuthContext } from "@/lib/supabase/auth-context";

type GoalRow = { id: string; name: string; target_amount: number | string; current_amount: number | string; target_date: string | null; icon: string | null; color: string | null; account_id: string | null; status: "active" | "completed" | "paused" | "cancelled"; created_at: string };
type ContributionRow = { id: string; saving_goal_id: string; amount: number | string; contribution_date: string; note: string | null };
type AccountRow = { id: string; name: string; is_archived: boolean };

export type GoalContributionRecord = { id: string; amount: number; contributionDate: string; note: string | null };
export type SavingGoalRecord = { id: string; name: string; targetAmount: number; currentAmount: number; targetDate: string | null; icon: string; color: string; accountId: string | null; accountName: string | null; status: GoalRow["status"]; percentage: number; remaining: number; contributions: GoalContributionRecord[] };
export type GoalAccountOption = { id: string; name: string };

function safeAmount(value: number | string) { const amount = Number(value); if (!Number.isSafeInteger(amount) || amount < 0) throw new Error("Số tiền vượt quá giới hạn hiển thị an toàn."); return amount; }

export async function getGoals() {
  const { configured, supabase, user } = await getSupabaseAuthContext();
  if (!configured) return { goals: [] as SavingGoalRecord[], accounts: [] as GoalAccountOption[], configured: false };
  if (!supabase || !user) return { goals: [] as SavingGoalRecord[], accounts: [] as GoalAccountOption[], configured: true };
  const [{ data: goalRows, error: goalsError }, { data: contributionRows, error: contributionsError }, { data: accountRows, error: accountsError }] = await Promise.all([
    supabase.from("saving_goals").select("id,name,target_amount,current_amount,target_date,icon,color,account_id,status,created_at").eq("user_id", user.id).order("status").order("created_at", { ascending: true }),
    supabase.from("saving_goal_contributions").select("id,saving_goal_id,amount,contribution_date,note").eq("user_id", user.id).order("contribution_date", { ascending: false }),
    supabase.from("accounts").select("id,name,is_archived").eq("user_id", user.id).eq("is_archived", false).order("created_at"),
  ]);
  if (goalsError || contributionsError || accountsError) throw new Error("Không thể tải mục tiêu tiết kiệm.");
  const contributions = (contributionRows ?? []) as ContributionRow[];
  const contributionMap = new Map<string, GoalContributionRecord[]>();
  for (const contribution of contributions) {
    const list = contributionMap.get(contribution.saving_goal_id) ?? [];
    list.push({ id: contribution.id, amount: safeAmount(contribution.amount), contributionDate: contribution.contribution_date, note: contribution.note });
    contributionMap.set(contribution.saving_goal_id, list);
  }
  const accountMap = new Map(((accountRows ?? []) as AccountRow[]).map((account) => [account.id, account.name]));
  const goals = ((goalRows ?? []) as GoalRow[]).map((goal) => {
    const targetAmount = safeAmount(goal.target_amount);
    const currentAmount = safeAmount(goal.current_amount);
    return { id: goal.id, name: goal.name, targetAmount, currentAmount, targetDate: goal.target_date, icon: goal.icon ?? "🎯", color: goal.color ?? "#8795c4", accountId: goal.account_id, accountName: goal.account_id ? accountMap.get(goal.account_id) ?? "Tài khoản đã lưu trữ" : null, status: goal.status, percentage: Math.min(currentAmount / targetAmount * 100, 100), remaining: Math.max(targetAmount - currentAmount, 0), contributions: contributionMap.get(goal.id) ?? [] } satisfies SavingGoalRecord;
  });
  return { goals, accounts: ((accountRows ?? []) as AccountRow[]).map((account) => ({ id: account.id, name: account.name })), configured: true };
}
