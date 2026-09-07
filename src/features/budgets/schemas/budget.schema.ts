import { z } from "zod";

export const budgetSchema = z.object({ name: z.string().trim().min(1).max(80), categoryId: z.string().uuid().nullable().optional(), amount: z.number().int().positive(), period: z.enum(["weekly", "monthly", "yearly", "custom"]), startDate: z.coerce.date(), endDate: z.coerce.date().nullable().optional(), alertThreshold: z.number().int().min(1).max(100).default(75) });
export type BudgetInput = z.infer<typeof budgetSchema>;
