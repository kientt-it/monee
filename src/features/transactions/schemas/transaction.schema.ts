import { z } from "zod";

export const transactionTypeSchema = z.enum(["expense", "income", "transfer"]);
export const transactionSchema = z.object({
  type: transactionTypeSchema,
  amount: z.number().int().positive(),
  accountId: z.string().uuid(),
  destinationAccountId: z.string().uuid().nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  merchant: z.string().trim().max(120).nullable().optional(),
  note: z.string().trim().max(500).nullable().optional(),
  transactionDate: z.coerce.date(),
}).superRefine((value, context) => {
  if (value.type === "transfer" && !value.destinationAccountId) context.addIssue({ code: "custom", path: ["destinationAccountId"], message: "Chuyển khoản cần có tài khoản đích." });
  if (value.type === "transfer" && value.accountId === value.destinationAccountId) context.addIssue({ code: "custom", path: ["destinationAccountId"], message: "Tài khoản nguồn và đích phải khác nhau." });
  if (value.type !== "transfer" && value.destinationAccountId) context.addIssue({ code: "custom", path: ["destinationAccountId"], message: "Chỉ giao dịch chuyển khoản mới có tài khoản đích." });
});

export type TransactionInput = z.infer<typeof transactionSchema>;

export const transactionFormSchema = z.object({
  type: transactionTypeSchema,
  amount: z.string().trim().min(1, "Nhập số tiền.").refine((value) => /^\d+$/.test(value.replaceAll(".", "")), "Số tiền phải là số dương."),
  accountId: z.string().uuid("Chọn tài khoản."),
  destinationAccountId: z.string().uuid().nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  merchant: z.string().trim().max(120).optional(),
  note: z.string().trim().max(500).optional(),
  transactionDate: z.string().min(1, "Chọn ngày giao dịch."),
}).superRefine((value, context) => {
  const amount = Number(value.amount.replaceAll(".", ""));
  if (!Number.isSafeInteger(amount) || amount <= 0) context.addIssue({ code: "custom", path: ["amount"], message: "Số tiền phải lớn hơn 0." });
  if (value.type === "transfer" && !value.destinationAccountId) context.addIssue({ code: "custom", path: ["destinationAccountId"], message: "Chọn tài khoản đích." });
  if (value.type === "transfer" && value.accountId === value.destinationAccountId) context.addIssue({ code: "custom", path: ["destinationAccountId"], message: "Tài khoản đích phải khác nguồn." });
});

export type TransactionFormInput = z.infer<typeof transactionFormSchema>;
