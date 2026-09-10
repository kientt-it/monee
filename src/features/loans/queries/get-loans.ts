import { cache } from "react";
import { getSupabaseAuthContext } from "@/lib/supabase/auth-context";
import type { LoanRecord } from "../types";

type LoanRow = {
  id: string; name: string; lender: string; monthly_amount: number | string;
  first_due_date: string; installment_count: number; note: string; is_archived: boolean;
  loan_payments: { installment_number: number; amount: number | string; paid_on: string }[];
};

function amount(value: number | string) {
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result <= 0) throw new Error("Số tiền khoản vay không hợp lệ.");
  return result;
}

export const getLoans = cache(async () => {
  const { configured, supabase, user } = await getSupabaseAuthContext();
  if (!configured || !supabase || !user) return { loans: [] as LoanRecord[], available: false };
  const { data, error } = await supabase.from("loans")
    .select("id,name,lender,monthly_amount,first_due_date,installment_count,note,is_archived,loan_payments(installment_number,amount,paid_on)")
    .eq("user_id", user.id).order("created_at", { ascending: false });
  // Rolling deployment: the rest of the app stays usable before this migration is applied.
  if (error && ["42P01", "PGRST205", "PGRST200"].includes(error.code)) return { loans: [] as LoanRecord[], available: false };
  if (error) throw new Error("Không thể tải khoản vay. Vui lòng thử lại.");
  const loans: LoanRecord[] = ((data ?? []) as unknown as LoanRow[]).map((row) => ({
    id: row.id, name: row.name, lender: row.lender, monthlyAmount: amount(row.monthly_amount),
    firstDueDate: row.first_due_date, installmentCount: row.installment_count, note: row.note,
    isArchived: row.is_archived,
    payments: row.loan_payments.map((payment) => ({ installmentNumber: payment.installment_number, amount: amount(payment.amount), paidOn: payment.paid_on })),
  }));
  return { loans, available: true };
});
