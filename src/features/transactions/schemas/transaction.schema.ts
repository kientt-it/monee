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
