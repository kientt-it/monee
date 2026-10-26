import { z } from "zod";

export const accountTypeSchema = z.enum(["cash", "bank", "ewallet", "credit_card", "saving", "investment", "other"]);
const accountMetadataFields = {
  name: z.string().trim().min(1, "Tên tài khoản không được để trống.").max(80, "Tên tài khoản tối đa 80 ký tự."),
  type: accountTypeSchema,
  currency: z.literal("VND"),
  icon: z.string().max(40).optional(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i, "Màu tài khoản chưa hợp lệ.").optional(),
  includeInTotal: z.boolean(),
};

export const accountMetadataSchema = z.object(accountMetadataFields);
const accountInitialBalanceSchema = z.number().int("Số dư phải là số nguyên.").nonnegative("Số dư ban đầu không được âm.").max(1_000_000_000_000, "Số dư ban đầu vượt giới hạn.");
const accountFields = {
  ...accountMetadataFields,
  initialBalance: z.number().int("Số dư phải là số nguyên.").min(-1_000_000_000_000).max(1_000_000_000_000),
  creditLimit: z.number().int("Hạn mức phải là số nguyên.").positive("Nhập hạn mức thẻ tín dụng.").max(1_000_000_000_000).optional(),
  availableCredit: z.number().int("Khả dụng phải là số nguyên.").min(-1_000_000_000_000).max(1_000_000_000_000).optional(),
};

function validateAccountBalance(value: z.infer<z.ZodObject<typeof accountFields>>, context: z.RefinementCtx) {
  if (value.type === "credit_card") {
    if (value.creditLimit === undefined) context.addIssue({ code: "custom", path: ["creditLimit"], message: "Nhập hạn mức thẻ tín dụng." });
    if (value.availableCredit === undefined) context.addIssue({ code: "custom", path: ["availableCredit"], message: "Nhập số tiền khả dụng." });
    if (value.creditLimit !== undefined && value.availableCredit !== undefined && value.availableCredit > value.creditLimit) {
      context.addIssue({ code: "custom", path: ["availableCredit"], message: "Khả dụng không được vượt hạn mức." });
    }
  } else {
    const result = accountInitialBalanceSchema.safeParse(value.initialBalance);
    if (!result.success) context.addIssue({ code: "custom", path: ["initialBalance"], message: result.error.issues[0]?.message ?? "Số dư ban đầu không hợp lệ." });
  }
}

export const accountSchema = z.object(accountFields).superRefine(validateAccountBalance);
export const accountEditSchema = z.object(accountFields).superRefine(validateAccountBalance);

export type AccountInput = z.infer<typeof accountSchema>;
export type AccountMetadataInput = z.infer<typeof accountMetadataSchema>;
export type AccountEditInput = z.infer<typeof accountEditSchema>;
