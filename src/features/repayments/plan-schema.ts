import { z } from "zod";
import { localToday } from "../../lib/date";

const money = z.number().int().min(0).max(1_000_000_000_000);
export const planSchema = z.object({ title: z.string().trim().min(1).max(100), accountId: z.uuid().nullable(), kind: z.enum(["installment", "expense", "manual"]),
  firstDue: z.iso.date().refine(s => s >= "1900-01-01" && s <= "2099-12-31"), terms: z.number().int().min(1).max(120),
  amount: money.refine(v => v > 0), finalAmount: money.nullable(), key: z.uuid(),
  recordPurchase: z.boolean().default(false), purchaseAmount: money.refine(v => v > 0).nullable().default(null),
  purchaseDate: z.iso.date().refine(s => s >= "1900-01-01" && s <= localToday()).nullable().default(null),
}).superRefine((v, ctx) => {
  if (v.kind !== "manual" && !v.accountId) ctx.addIssue({ code: "custom", message: "Chọn nguồn thẻ hoặc trả sau." });
  if (v.kind !== "installment" && v.terms !== 1) ctx.addIssue({ code: "custom", message: "Khoản trả một lần chỉ có một kỳ." });
  if (v.recordPurchase && (!v.accountId || !v.purchaseAmount || !v.purchaseDate)) ctx.addIssue({ code: "custom", message: "Nhập số tiền sử dụng hạn mức và ngày phát sinh." });
  if (v.recordPurchase && v.kind !== "installment" && v.purchaseAmount !== v.amount) ctx.addIssue({ code: "custom", message: "Số tiền trừ khả dụng phải bằng số tiền chi tiêu." });
  if (!v.recordPurchase && (v.purchaseAmount !== null || v.purchaseDate !== null)) ctx.addIssue({ code: "custom", message: "Khoản đã ghi vào dư nợ chỉ lưu lịch trả." });
});
