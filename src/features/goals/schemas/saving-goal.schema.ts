import { z } from "zod";

export const savingGoalSchema = z.object({ name: z.string().trim().min(1).max(80), targetAmount: z.number().int().positive(), currentAmount: z.number().int().nonnegative().default(0), targetDate: z.coerce.date().nullable().optional(), icon: z.string().max(40).optional(), color: z.string().max(20).optional(), accountId: z.string().uuid().nullable().optional() });
export type SavingGoalInput = z.infer<typeof savingGoalSchema>;
