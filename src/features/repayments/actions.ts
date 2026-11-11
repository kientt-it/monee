"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSupabaseAuthContext } from "@/lib/supabase/auth-context";
import { planSchema } from "./plan-schema";

const money = z.number().int().min(0).max(1_000_000_000_000);
const day = z.iso.date().refine(s => s >= "1900-01-01" && s <= "2099-12-31");
const paymentSchema = z.object({ dueId: z.uuid(), amount: money.refine(v => v > 0), paidOn: day, method: z.enum(["history", "new", "link"]), sourceId: z.uuid().nullable(), transactionId: z.uuid().nullable(), key: z.uuid() })
  .superRefine((v, ctx) => {
    if (v.method === "new" && !v.sourceId) ctx.addIssue({ code: "custom", message: "Chọn tài khoản nguồn." });
    if (v.method === "link" && !v.transactionId) ctx.addIssue({ code: "custom", message: "Chọn giao dịch có sẵn." });
  });
function refresh() { for (const path of ["/app", "/app/payables", "/app/allocations", "/app/accounts", "/app/transactions", "/app/reports"]) revalidatePath(path); }
function errorMessage(message: string) {
  const errors: [string, string][] = [
    ["INSUFFICIENT_CARD_CREDIT", "Hạn mức khả dụng của thẻ không đủ cho khoản mới. Kiểm tra lại số gốc và số dư thẻ."],
    ["INVALID_PURCHASE_SOURCE", "Chỉ thẻ tín dụng đang hoạt động mới được ghi nhận khoản sử dụng hạn mức."],
    ["INVALID_PURCHASE", "Kiểm tra số tiền sử dụng hạn mức và ngày phát sinh; không chọn ngày tương lai."],
    ["INVALID_DUE_SELECTION", "Chọn từ 1 đến 200 kỳ khác nhau để xóa."],
    ["DUE_HAS_PAYMENTS", "Kỳ này đã có thanh toán. Bỏ phân bổ trước khi sửa hoặc xóa; giao dịch tiền vẫn được giữ."],
    ["DUE_CHANGED", "Khoản đã thay đổi ở phiên khác. Tải lại danh sách trước khi tiếp tục."],
    ["DUE_DELETED", "Kỳ này đã được xóa khỏi lịch."],
    ["DUE_NOT_FOUND", "Không tìm thấy khoản cần trả."],
    ["INVALID_DUE", "Kiểm tra tên, ngày đến hạn và số tiền."],
    ["INSUFFICIENT_PAYMENT_FUNDS", "Tài khoản nguồn chưa đủ tiền để thanh toán."],
    ["PAYMENT_EXCEEDS_DUE", "Số tiền vượt phần còn thiếu. Hãy tải lại lịch trả."],
    ["PAYMENT_EXCEEDS_TRANSACTION", "Giao dịch không còn đủ tiền chưa phân bổ."],
    ["PAYMENT_EXCEEDS_CARD_DEBT", "Số tiền vượt dư nợ đã đối soát của nguồn. Kiểm tra số dư thẻ trước khi trả."],
    ["REQUEST_CONFLICT", "Yêu cầu đã được dùng với nội dung khác. Đóng form rồi thử lại."],
    ["PAYMENT_DATE_MISMATCH", "Ngày trả phải khớp ngày của giao dịch liên kết."],
    ["LEGACY_PAYMENT_UNRECONCILED", "Khoản có liên kết thanh toán cũ. Cần đối soát trước khi sửa hoặc phân bổ; xóa kỳ chỉ bỏ khỏi lịch, giữ nguyên lịch sử tiền."],
    ["INVALID_PAYMENT", "Kiểm tra số tiền và ngày thực trả; không chọn ngày tương lai."],
    ["PAYMENT_REVERSED", "Khoản thanh toán đã được hoàn tác. Hãy tạo yêu cầu mới."],
  ];
  return errors.find(([code]) => message.includes(code))?.[1] ?? "Chưa lưu được. Kiểm tra dữ liệu và thử lại.";
}
async function rpc(name: string, args: Record<string, unknown>) {
  const { supabase, user } = await getSupabaseAuthContext();
  if (!supabase || !user) return { ok: false as const, error: "Bạn cần đăng nhập để tiếp tục." };
  const { error } = await supabase.rpc(name, args);
  if (error?.code === "PGRST202" && name === "create_repayment_plan_with_purchase") return { ok: false as const, error: "Chưa thể ghi nhận khoản mới vào thẻ. Vui lòng thử lại sau." };
  if (error) return { ok: false as const, error: errorMessage(error.message) };
  refresh(); return { ok: true as const };
}
export async function createRepaymentPlan(input: unknown) {
  const parsed = planSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Thông tin chưa hợp lệ." };
  const { key, ...value } = parsed.data;
  return rpc(value.recordPurchase ? "create_repayment_plan_with_purchase" : "create_repayment_plan", { p_input: value, p_key: key });
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
export async function manageRepaymentDue(input: unknown) {
  const parsed = z.discriminatedUnion("operation", [
    z.object({ operation: z.literal("edit"), id: z.uuid(), revision: z.number().int().nonnegative(), title: z.string().trim().min(1).max(100),
      dueDate: z.iso.date().refine(d => d >= "1900-01-01" && d <= "2109-12-31"), amount: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER) }),
    z.object({ operation: z.literal("delete"), id: z.uuid(), revision: z.number().int().nonnegative() }),
  ]).safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Dữ liệu khoản trả chưa hợp lệ." };
  const p = parsed.data;
  return rpc("manage_repayment_due", { p_id: p.id, p_revision: p.revision, p_delete: p.operation === "delete",
    p_title: p.operation === "edit" ? p.title : null, p_date: p.operation === "edit" ? p.dueDate : null, p_amount: p.operation === "edit" ? p.amount : null });
}
export async function bulkDeleteRepaymentDues(input: unknown) {
  const parsed = z.array(z.object({ id: z.uuid(), revision: z.number().int().nonnegative() })).min(1).max(200)
    .refine(items => new Set(items.map(i => i.id)).size === items.length, "Danh sách có kỳ trùng lặp.").safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Danh sách chưa hợp lệ." };
  return rpc("bulk_delete_repayment_dues", { p_items: parsed.data });
}
export async function saveRepaymentBudget(input: unknown) {
  const parsed = z.object({ mode: z.enum(["month", "salary"]), month: day.refine(v => v.endsWith("-01")), income: money.nullable(), cash: money.nullable(), living: money.nullable(), reserve: money.nullable(), salaryDay: z.number().int().min(1).max(28) }).safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Ngân sách hoặc ngày lương chưa hợp lệ." };
  const p = parsed.data;
  return rpc("save_repayment_budget", { p_month: p.month, p_income: p.income, p_cash: p.cash, p_living: p.living, p_reserve: p.reserve, p_day: p.salaryDay, p_mode: p.mode });
}
