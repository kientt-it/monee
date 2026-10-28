"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSupabaseAuthContext } from "@/lib/supabase/auth-context";

const monthSchema = z.iso.date().refine((value) => /^\d{4}-(0[1-9]|1[0-2])-01$/.test(value) && value >= "1900-01-01" && value <= "2100-12-01");
const lineSchema = z.object({
  kind: z.enum(["living", "debt", "reserve", "custom", "card_installment", "card_repayment"]),
  title: z.string().trim().min(1).max(100),
  amount: z.number().int().min(0).max(1_000_000_000_000),
  installmentId: z.uuid().nullable(),
  creditAccountId: z.uuid().nullable(),
  categoryId: z.uuid().nullable(),
  goalId: z.uuid().nullable(),
  payableId: z.uuid().nullable(),
}).superRefine((line, context) => {
  if ((line.kind === "card_installment") !== Boolean(line.installmentId)) context.addIssue({ code: "custom", message: "Khoản trả góp chưa hợp lệ." });
  if ((line.kind === "card_repayment") !== Boolean(line.creditAccountId)) context.addIssue({ code: "custom", message: "Khoản hoàn trả thẻ chưa hợp lệ." });
  if (line.categoryId && !["living", "debt", "custom"].includes(line.kind)) context.addIssue({ code: "custom", message: "Danh mục chưa hợp lệ." });
  if (line.goalId && line.kind !== "reserve") context.addIssue({ code: "custom", message: "Mục tiêu chưa hợp lệ." });
  if (line.payableId && (line.kind !== "debt" || line.categoryId)) context.addIssue({ code: "custom", message: "Khoản cần trả chưa hợp lệ." });
});
const planSchema = z.object({ month: monthSchema, plannedIncome: z.number().int().min(0).max(1_000_000_000_000).nullable(), lines: z.array(lineSchema).max(100) }).superRefine((plan, context) => {
  for (const key of ["installmentId", "creditAccountId", "categoryId", "goalId", "payableId"] as const) {
    const ids = plan.lines.map((line) => line[key]).filter(Boolean);
    if (ids.length !== new Set(ids).size) context.addIssue({ code: "custom", message: "Một khoản hoặc danh mục đang được phân bổ nhiều lần." });
  }
  if (plan.lines.filter((line) => line.kind === "living" && !line.categoryId).length > 1 || plan.lines.filter((line) => line.kind === "reserve" && !line.goalId).length > 1) {
    context.addIssue({ code: "custom", message: "Nhóm phân bổ đang bị lặp." });
  }
});

const installmentSchema = z.object({
  creditAccountId: z.uuid(), title: z.string().trim().min(1).max(100),
  totalAmount: z.number().int().positive().max(1_000_000_000_000),
  termMonths: z.number().int().min(1).max(120), startMonth: monthSchema,
  dueDay: z.number().int().min(1).max(31),
});

export async function saveAllocationAction(input: unknown) {
  const parsed = planSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Kế hoạch chưa hợp lệ." };
  const { supabase, user } = await getSupabaseAuthContext();
  if (!supabase || !user) return { ok: false as const, error: "Bạn cần đăng nhập để lưu phân bổ." };
  const { error } = await supabase.rpc("save_income_allocation", { p_month: parsed.data.month, p_planned_income: parsed.data.plannedIncome, p_lines: parsed.data.lines });
  if (error) return { ok: false as const, error: "Chưa lưu được phân bổ. Kiểm tra các khoản và thử lại." };
  revalidatePath("/app/allocations");
  return { ok: true as const };
}

export async function saveInstallmentAction(id: string | null, input: unknown) {
  const parsed = installmentSchema.safeParse(input);
  if (!parsed.success || (id && !z.uuid().safeParse(id).success)) return { ok: false as const, error: "Thông tin trả góp chưa hợp lệ." };
  const { supabase, user } = await getSupabaseAuthContext();
  if (!supabase || !user) return { ok: false as const, error: "Bạn cần đăng nhập để lưu khoản trả góp." };
  const value = parsed.data;
  const { data: card } = await supabase.from("accounts").select("id").eq("id", value.creditAccountId).eq("user_id", user.id).eq("type", "credit_card").maybeSingle();
  if (!card) return { ok: false as const, error: "Thẻ tín dụng không hợp lệ." };
  const fields = { credit_account_id: value.creditAccountId, title: value.title, total_amount: value.totalAmount,
    term_months: value.termMonths, start_month: value.startMonth, due_day: value.dueDay };
  const result = id
    ? await supabase.from("credit_card_installments").update(fields).eq("id", id).eq("user_id", user.id).select("id").maybeSingle()
    : await supabase.from("credit_card_installments").insert({ ...fields, user_id: user.id }).select("id").maybeSingle();
  if (result.error || !result.data) return { ok: false as const, error: result.error?.message.includes("INSTALLMENT_BELOW_PAID") ? "Tổng trả góp không thể thấp hơn số tiền đã trả." : "Chưa lưu được khoản trả góp." };
  revalidatePath("/app/allocations");
  return { ok: true as const };
}

export async function deleteInstallmentAction(id: string) {
  if (!z.uuid().safeParse(id).success) return { ok: false as const, error: "Khoản trả góp chưa hợp lệ." };
  const { supabase, user } = await getSupabaseAuthContext();
  if (!supabase || !user) return { ok: false as const, error: "Bạn cần đăng nhập để xóa khoản trả góp." };
  const { data, error } = await supabase.from("credit_card_installments").delete().eq("id", id).eq("user_id", user.id).select("id").maybeSingle();
  if (error || !data) return { ok: false as const, error: "Chưa xóa được khoản trả góp." };
  revalidatePath("/app/allocations");
  return { ok: true as const };
}

export async function payInstallmentAction(input: unknown) {
  const parsed = z.object({ installmentId: z.uuid(), sourceAccountId: z.uuid(), amount: z.number().int().positive().max(1_000_000_000_000), idempotencyKey: z.uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Khoản hoàn trả chưa hợp lệ." };
  const { supabase, user } = await getSupabaseAuthContext();
  if (!supabase || !user) return { ok: false as const, error: "Bạn cần đăng nhập để hoàn trả." };
  const { error } = await supabase.rpc("pay_credit_card_installment", {
    p_installment_id: parsed.data.installmentId, p_source_account_id: parsed.data.sourceAccountId,
    p_amount: parsed.data.amount, p_idempotency_key: parsed.data.idempotencyKey,
  });
  if (error) {
    if (error.message.includes("REPAYMENT_EXCEEDS_INSTALLMENT")) return { ok: false as const, error: "Số tiền vượt quá phần còn lại của khoản trả góp." };
    if (error.message.includes("REPAYMENT_EXCEEDS_DUE")) return { ok: false as const, error: "Số tiền vượt quá dư nợ thẻ hiện tại." };
    return { ok: false as const, error: "Chưa ghi nhận được khoản hoàn trả. Vui lòng thử lại." };
  }
  for (const path of ["/app/allocations", "/app/payables", "/app/accounts", "/app/transactions", "/app"]) revalidatePath(path);
  return { ok: true as const };
}
