import type { PayableInput } from "./schemas/payable.schema";

export type PayableRecord = PayableInput & { id: string; paidOn: string | null };
export type PayableSummary = { total: number; remaining: number; overdue: number; count: number; pendingCount: number };
export type PayableFilter = { mode: "all" } | { mode: "day"; value: string } | { mode: "month"; value: string };
