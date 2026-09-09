import { z } from "zod";

export const recurringSchema = z.object({
  type: z.enum(["expense", "income", "transfer"]),
  amount: z.number().int().positive(),
  accountId: z.string().uuid(),
  destinationAccountId: z.string().uuid().nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  merchant: z.string().trim().max(120).nullable().optional(),
  note: z.string().trim().max(500).nullable().optional(),
  frequency: z.enum(["daily", "weekly", "monthly", "yearly", "custom"]),
  interval: z.number().int().positive().default(1),
  startDate: z.coerce.date(),
  nextRunDate: z.coerce.date(),
  endDate: z.coerce.date().nullable().optional(),
}).superRefine((value, context) => {
  if (value.type === "transfer" && !value.destinationAccountId) context.addIssue({ code: "custom", path: ["destinationAccountId"], message: "Chuyển khoản cần có tài khoản đích." });
  if (value.type === "transfer" && value.accountId === value.destinationAccountId) context.addIssue({ code: "custom", path: ["destinationAccountId"], message: "Tài khoản nguồn và đích phải khác nhau." });
  if (value.type !== "transfer" && value.destinationAccountId) context.addIssue({ code: "custom", path: ["destinationAccountId"], message: "Chỉ chuyển khoản mới có tài khoản đích." });
  if (value.nextRunDate < value.startDate) context.addIssue({ code: "custom", path: ["nextRunDate"], message: "Ngày chạy kế tiếp phải từ ngày bắt đầu." });
  if (value.endDate && value.endDate < value.startDate) context.addIssue({ code: "custom", path: ["endDate"], message: "Ngày kết thúc phải sau ngày bắt đầu." });
});

export type RecurringInput = z.infer<typeof recurringSchema>;
