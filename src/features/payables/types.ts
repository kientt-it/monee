import type { PayableInput } from "./schemas/payable.schema";

export type ManualPayableRecord = PayableInput & { id: string; paidOn: string | null; kind: "manual"; creditAccountId: null };
export type CreditCardPayableRecord = { id: string; title: string; amount: number; dueDate: null; note: string; paidOn: null; kind: "credit_card_repayment"; creditAccountId: string };
export type PayableRecord = ManualPayableRecord | CreditCardPayableRecord;
export type PayableSummary = { total: number; remaining: number; overdue: number; count: number; pendingCount: number };
export type PayableDateRange = { fromDate: string; toDate: string };
