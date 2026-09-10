"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getSupabaseAuthContext } from "@/lib/supabase/auth-context";
import { loanPaymentSchema, loanSchema } from "../schemas/loan.schema";

function refreshLoans() {
  revalidatePath("/app/loans");
  revalidatePath("/app");
}

function loanError(message: string) {
  if (message.includes("LOAN_SCHEDULE_LOCKED")) return "Khoản vay đã có kỳ đóng. Chỉ có thể sửa tên, bên cho vay và ghi chú.";
  if (message.includes("LOAN_ARCHIVED")) return "Khôi phục khoản vay trước khi cập nhật kỳ đóng.";
  if (message.includes("LOAN_NOT_FOUND")) return "Không tìm thấy khoản vay của bạn.";
  return "Không thể lưu khoản vay. Vui lòng thử lại.";
}

export async function saveLoanAction(id: string, input: unknown) {
  const parsed = loanSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0].message };
  if (!z.uuid().safeParse(id).success) return { ok: false as const, error: "Khoản vay không hợp lệ." };
  const { supabase, user } = await getSupabaseAuthContext();
  if (!supabase || !user) return { ok: false as const, error: "Bạn cần đăng nhập để lưu khoản vay." };
  const values = parsed.data;
  const { error } = await supabase.rpc("save_monthly_loan", {
    p_id: id, p_name: values.name, p_lender: values.lender, p_monthly_amount: values.monthlyAmount,
    p_first_due_date: values.firstDueDate, p_installment_count: values.installmentCount, p_note: values.note,
  });
  if (error) return { ok: false as const, error: loanError(error.message) };
  refreshLoans();
  return { ok: true as const };
}

export async function setLoanArchivedAction(id: string, archived: boolean) {
  if (!z.object({ id: z.uuid(), archived: z.boolean() }).safeParse({ id, archived }).success) return { ok: false as const, error: "Khoản vay không hợp lệ." };
  const { supabase, user } = await getSupabaseAuthContext();
  if (!supabase || !user) return { ok: false as const, error: "Bạn cần đăng nhập để cập nhật khoản vay." };
  const { error } = await supabase.rpc("set_monthly_loan_archived", { p_id: id, p_archived: archived });
  if (error) return { ok: false as const, error: loanError(error.message) };
  refreshLoans();
  return { ok: true as const };
}

export async function setLoanPaymentAction(input: unknown) {
  const parsed = loanPaymentSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Kỳ đóng không hợp lệ." };
  const { supabase, user } = await getSupabaseAuthContext();
  if (!supabase || !user) return { ok: false as const, error: "Bạn cần đăng nhập để ghi nhận kỳ đóng." };
  const { loanId, installmentNumber, paid } = parsed.data;
  const { error } = await supabase.rpc("set_monthly_loan_payment", { p_loan_id: loanId, p_installment_number: installmentNumber, p_paid: paid });
  if (error) return { ok: false as const, error: loanError(error.message) };
  refreshLoans();
  return { ok: true as const };
}
