import type { PayableFilter, PayableRecord, PayableSummary } from "./types";

export function filterPayables(items: PayableRecord[], filter: PayableFilter) {
  if (filter.mode === "all") return items;
  return items.filter((item) => filter.mode === "day" ? item.dueDate === filter.value : item.dueDate.startsWith(`${filter.value}-`));
}

export function summarizePayables(items: PayableRecord[], today: string): PayableSummary {
  return items.reduce((summary, item) => {
    summary.total += item.amount;
    summary.count++;
    if (!item.paidOn) {
      summary.remaining += item.amount;
      summary.pendingCount++;
      if (item.dueDate < today) summary.overdue += item.amount;
    }
    return summary;
  }, { total: 0, remaining: 0, overdue: 0, count: 0, pendingCount: 0 });
}
