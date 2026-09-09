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
export const accountSchema = z.object({
  ...accountMetadataFields,
  initialBalance: z.number().int("Số dư phải là số nguyên.").nonnegative("Số dư ban đầu không được âm."),
});

export type AccountInput = z.infer<typeof accountSchema>;
export type AccountMetadataInput = z.infer<typeof accountMetadataSchema>;
