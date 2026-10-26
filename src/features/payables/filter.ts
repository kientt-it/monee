import type { PayableDateRange, PayableRecord, PayableSummary } from "./types";

export function filterPayables(items: PayableRecord[], { fromDate, toDate }: PayableDateRange) {
  if (fromDate && toDate && fromDate > toDate) return [];
  return items.filter((item) => item.kind === "credit_card_repayment" || ((!fromDate || item.dueDate >= fromDate) && (!toDate || item.dueDate <= toDate)));
}

export function summarizePayables(items: PayableRecord[], today: string): PayableSummary {
  return items.reduce((summary, item) => {
    summary.total += item.amount;
    summary.count++;
    if (item.kind === "credit_card_repayment" ? item.amount > 0 : !item.paidOn) {
      summary.remaining += item.amount;
      summary.pendingCount++;
      if (item.dueDate && item.dueDate < today) summary.overdue += item.amount;
    }
    return summary;
  }, { total: 0, remaining: 0, overdue: 0, count: 0, pendingCount: 0 });
}
