import { describe, expect, it } from "vitest";

import { isDay, monthGrid, periodBounds, periodLabel, shiftMonth, shiftPeriod } from "./periods";

describe("periods", () => {
  it("bounds: day, Monday-start week, month", () => {
    expect(periodBounds("daily", "2026-01-07")).toEqual({ start: "2026-01-07", end: "2026-01-07" });
    expect(periodBounds("weekly", "2026-01-07")).toEqual({ start: "2026-01-05", end: "2026-01-11" }); // Wed → Mon..Sun
    expect(periodBounds("weekly", "2026-01-11")).toEqual({ start: "2026-01-05", end: "2026-01-11" }); // Sunday stays in its week
    expect(periodBounds("monthly", "2026-02-14")).toEqual({ start: "2026-02-01", end: "2026-02-28" });
  });
  it("shifts periods", () => {
    expect(shiftPeriod("daily", "2026-01-31", 1)).toBe("2026-02-01");
    expect(shiftPeriod("weekly", "2026-01-05", -1)).toBe("2025-12-29");
    expect(shiftPeriod("monthly", "2026-01-01", 1)).toBe("2026-02-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });
  it("labels", () => {
    expect(periodLabel("daily", "2026-01-05")).toBe("Monday 5 January 2026");
    expect(periodLabel("weekly", "2026-01-05")).toBe("Week of 5 Jan – 11 Jan 2026");
    expect(periodLabel("monthly", "2026-01-01")).toBe("January 2026");
  });
  it("validates day strings", () => {
    expect(isDay("2026-02-28")).toBe(true);
    expect(isDay("2026-02-30")).toBe(false);
    expect(isDay("2026-2-3")).toBe(false);
  });
  it("month grid: full Mon–Sun weeks", () => {
    const g = monthGrid("2026-02"); // Feb 2026 starts on a Sunday
    expect(g[0][0]).toEqual({ day: "2026-01-26", inMonth: false });
    expect(g[0][6]).toEqual({ day: "2026-02-01", inMonth: true });
    expect(g.every((w) => w.length === 7)).toBe(true);
    expect(g[g.length - 1].some((d) => d.day === "2026-02-28")).toBe(true);
    expect(g.length).toBe(5);
    expect(monthGrid("2026-03").length).toBe(6); // Mar 2026: Sun 1st → 6 rows
  });
});
