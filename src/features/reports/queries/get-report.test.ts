import { describe, expect, it } from "vitest";
import { getReportPeriod } from "./report-period";

describe("getReportPeriod", () => {
  const now = new Date("2026-09-09T04:00:00.000Z");

  it("builds the current local month", () => {
    const period = getReportPeriod("month", now);
    expect(period.from).toBe("2026-09-01");
    expect(period.to).toBe("2026-09-30");
    expect(period.unit).toBe("month");
  });

  it("keeps a valid custom range", () => {
    const period = getReportPeriod("custom", now, "2026-03-10", "2026-04-12");
    expect(period.from).toBe("2026-03-10");
    expect(period.to).toBe("2026-04-12");
  });

  it("falls back to the current month when custom dates are invalid", () => {
    const period = getReportPeriod("custom", now, "2026-04-12", "2026-03-10");
    expect(period.from).toBe("2026-09-01");
    expect(period.to).toBe("2026-09-30");
  });
});
