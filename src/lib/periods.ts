/**
 * Review periods and calendar maths on plain "YYYY-MM-DD" strings (no
 * timezone shifts: a trading day is the trade_date you recorded).
 * Weeks start on Monday.
 */
import { addDays, addMonths, endOfMonth, format, startOfMonth, startOfWeek } from "date-fns";

import type { ReviewPeriod } from "@/types/database";

export const parseDay = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day);
};
export const toDay = (d: Date) => format(d, "yyyy-MM-dd");
export const isDay = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(parseDay(s).getTime()) && toDay(parseDay(s)) === s;

export function periodBounds(period: ReviewPeriod, day: string) {
  const d = parseDay(day);
  if (period === "daily") return { start: day, end: day };
  if (period === "weekly") {
    const s = startOfWeek(d, { weekStartsOn: 1 });
    return { start: toDay(s), end: toDay(addDays(s, 6)) };
  }
  return { start: toDay(startOfMonth(d)), end: toDay(endOfMonth(d)) };
}

export function shiftPeriod(period: ReviewPeriod, start: string, by: number) {
  const d = parseDay(start);
  const next = period === "daily" ? addDays(d, by) : period === "weekly" ? addDays(d, 7 * by) : addMonths(d, by);
  return periodBounds(period, toDay(next)).start;
}

export function periodLabel(period: ReviewPeriod, start: string) {
  const { end } = periodBounds(period, start);
  if (period === "daily") return format(parseDay(start), "EEEE d MMMM yyyy");
  if (period === "weekly") return `Week of ${format(parseDay(start), "d MMM")} – ${format(parseDay(end), "d MMM yyyy")}`;
  return format(parseDay(start), "MMMM yyyy");
}

/** Weeks (Mon–Sun) covering a month; days outside the month are flagged. */
export function monthGrid(month: string /* YYYY-MM */) {
  const first = parseDay(`${month}-01`);
  const start = startOfWeek(first, { weekStartsOn: 1 });
  const last = endOfMonth(first);
  const weeks: { day: string; inMonth: boolean }[][] = [];
  for (let d = start; d <= last || weeks[weeks.length - 1]?.length !== 7; d = addDays(d, 1)) {
    if (!weeks.length || weeks[weeks.length - 1].length === 7) {
      if (d > last) break;
      weeks.push([]);
    }
    weeks[weeks.length - 1].push({ day: toDay(d), inMonth: d.getMonth() === first.getMonth() });
  }
  return weeks;
}

export const shiftMonth = (month: string, by: number) => format(addMonths(parseDay(`${month}-01`), by), "yyyy-MM");
