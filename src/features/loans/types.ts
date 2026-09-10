import type { LoanInput } from "./schemas/loan.schema";

export type LoanPayment = { installmentNumber: number; amount: number; paidOn: string };
export type LoanRecord = LoanInput & { id: string; isArchived: boolean; payments: LoanPayment[] };
export type LoanSummary = { total: number; paid: number; remaining: number; overdue: number; activeCount: number };
