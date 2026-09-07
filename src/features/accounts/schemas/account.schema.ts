import { z } from "zod";

export const accountTypeSchema = z.enum(["cash", "bank", "ewallet", "credit_card", "saving", "investment", "other"]);
export const accountSchema = z.object({ name: z.string().trim().min(1).max(80), type: accountTypeSchema, initialBalance: z.number().int().nonnegative(), currency: z.string().length(3).default("VND"), icon: z.string().max(40).optional(), color: z.string().max(20).optional(), includeInTotal: z.boolean().default(true) });
export type AccountInput = z.infer<typeof accountSchema>;
