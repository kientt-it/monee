import { z } from "zod";

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Họ tên cần ít nhất 2 ký tự.").max(80, "Họ tên tối đa 80 ký tự."),
  currency: z.literal("VND"),
  locale: z.literal("vi"),
  timezone: z.literal("Asia/Ho_Chi_Minh"),
  theme: z.enum(["light", "dark", "system"]),
  completeOnboarding: z.boolean(),
});

export type ProfileInput = z.infer<typeof profileSchema>;
