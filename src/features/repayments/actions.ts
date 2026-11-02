"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSupabaseAuthContext } from "@/lib/supabase/auth-context";

const money = z.number().int().min(0).max(1_000_000_000_000);
const day = z.iso.date().refine(s => s >= "1900-01-01" && s <= "2099-12-31");
const planSchema = z.object({ title: z.string().trim().min(1).max(100), accountId: z.uuid().nullable(), kind: z.enum(["installment", "expense", "manual"]), firstDue: day,
  terms: z.number().int().min(1).max(120), amount: money.refine(v => v > 0), finalAmount: money.nullable(), key: z.uuid() }).superRefine((v, ctx) => {
    if (v.kind !== "manual" && !v.accountId) ctx.addIssue({ code: "custom", message: "Chọn nguồn thẻ hoặc trả sau." });
    if (v.kind !== "installment" && v.terms !== 1) ctx.addIssue({ code: "custom", message: "Khoản trả một lần chỉ có một kỳ." });
  });
const paymentSchema = z.object({ dueId: z.uuid(), amount: money.refine(v => v > 0), paidOn: day, method: z.enum(["history", "new", "link"]), sourceId: z.uuid().nullable(), transactionId: z.uuid().nullable(), key: z.uuid() })
  .superRefine((v, ctx) => {
    if (v.method === "new" && !v.sourceId) ctx.addIssue({ code: "custom", message: "Chọn tài khoản nguồn." });
    if (v.method === "link" && !v.transactionId) ctx.addIssue({ code: "custom", message: "Chọn giao dịch có sẵn." });
  });
function refresh() { for (const path of ["/app", "/app/payables", "/app/allocations", "/app/accounts", "/app/transactions", "/app/reports"]) revalidatePath(path); }
function errorMessage(message: string) {
  const errors: [string, string][] = [
    ["INSUFFICIENT_PAYMENT_FUNDS", "Tài khoản nguồn chưa đủ tiền để thanh toán."],
    ["PAYMENT_EXCEEDS_DUE", "Số tiền vượt phần còn thiếu. Hãy tải lại lịch trả."],
    ["PAYMENT_EXCEEDS_TRANSACTION", "Giao dịch không còn đủ tiền chưa phân bổ."],
    ["PAYMENT_EXCEEDS_CARD_DEBT", "Số tiền vượt dư nợ đã đối soát của nguồn. Kiểm tra số dư thẻ trước khi trả."],
    ["REQUEST_CONFLICT", "Yêu cầu đã được dùng với nội dung khác. Đóng form rồi thử lại."],
    ["PAYMENT_DATE_MISMATCH", "Ngày trả phải khớp ngày của giao dịch liên kết."],
    ["LEGACY_PAYMENT_UNRECONCILED", "Giao dịch đang thuộc lịch trả góp cũ, cần đối soát trước."],
    ["INVALID_PAYMENT", "Kiểm tra số tiền và ngày thực trả; không chọn ngày tương lai."],
    ["PAYMENT_REVERSED", "Khoản thanh toán đã được hoàn tác. Hãy tạo yêu cầu mới."],
  ];
  return errors.find(([code]) => message.includes(code))?.[1] ?? "Chưa lưu được. Kiểm tra dữ liệu và thử lại.";
}
async function rpc(name: string, args: Record<string, unknown>) {
  const { supabase, user } = await getSupabaseAuthContext();
  if (!supabase || !user) return { ok: false as const, error: "Bạn cần đăng nhập để tiếp tục." };
  const { error } = await supabase.rpc(name, args);
  if (error) return { ok: false as const, error: errorMessage(error.message) };
  refresh(); return { ok: true as const };
}
export async function createRepaymentPlan(input: unknown) {
  const parsed = planSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Thông tin chưa hợp lệ." };
  const { key, ...value } = parsed.data;
  return rpc("create_repayment_plan", { p_input: value, p_key: key });
}
export async function createRepaymentSource(input: unknown) {
  const parsed = z.object({ name: z.string().trim().min(1).max(80), kind: z.enum(["credit_card", "pay_later"]), limit: money.nullable(), debt: money, key: z.uuid() }).superRefine((p, ctx) => {
    if (p.kind === "credit_card" && !p.limit) ctx.addIssue({ code: "custom", message: "Nhập hạn mức thẻ." });
  }).safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Thông tin nguồn chưa hợp lệ." };
  const { key, ...p } = parsed.data;
  return rpc("create_repayment_source", { p_input: p, p_key: key });
}
export async function recordRepayment(input: unknown) {
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Thông tin thanh toán chưa hợp lệ." };
  const p = parsed.data;
  return rpc("record_repayment", { p_due: p.dueId, p_amount: p.amount, p_paid_on: p.paidOn, p_method: p.method,
    p_source: p.method === "new" ? p.sourceId : null, p_transaction: p.method === "link" ? p.transactionId : null, p_key: p.key });
}
export async function reverseRepayment(id: string) {
  if (!z.uuid().safeParse(id).success) return { ok: false as const, error: "Không tìm thấy thanh toán." };
  return rpc("reverse_repayment", { p_id: id });
}
export async function saveRepaymentBudget(input: unknown) {
  const parsed = z.object({ mode: z.enum(["month", "salary"]), month: day.refine(v => v.endsWith("-01")), income: money.nullable(), cash: money.nullable(), living: money.nullable(), reserve: money.nullable(), salaryDay: z.number().int().min(1).max(28) }).safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Ngân sách hoặc ngày lương chưa hợp lệ." };
  const p = parsed.data;
  return rpc("save_repayment_budget", { p_month: p.month, p_income: p.income, p_cash: p.cash, p_living: p.living, p_reserve: p.reserve, p_day: p.salaryDay, p_mode: p.mode });
}
