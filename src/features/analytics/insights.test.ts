import { describe, expect, it } from "vitest";

import { groupSummaries, summarize, type TradeFact } from "@/lib/analytics/metrics";
import { buildInsights } from "./insights";

const t = (id: string, inst: string, r: number, extra: Partial<TradeFact> = {}): TradeFact & { inst: string } => ({
  id, account_id: "a", trade_date: "2026-01-01", net_pnl: r * 100, r_multiple: r, inst, ...extra,
});

describe("insights", () => {
  const trades = [t("1", "XAU", 2), t("2", "XAU", 3), t("3", "XAU", -1), t("4", "NAS", -1), t("5", "NAS", -1), t("6", "EUR", 1)];
  const by = groupSummaries(trades, (x) => x.inst, (k) => k, 0.1);
  const base = { total: summarize(trades, 0.1), byInstrument: by, bySession: [], byStrategy: [], byDirection: [], byGrade: [], mistakes: [], adherence: { followed: summarize([], 0.1), broken: summarize([], 0.1), adherenceRate: null } };
  it("names the most profitable group once one has ≥ 3 trades", () => {
    const out = buildInsights(base);
    expect(out.map((i) => i.text)).toContain("Most profitable instrument: XAU (+4.0R over 3 trades, 67% win rate).");
    expect(out.some((i) => i.text.startsWith("Weakest instrument"))).toBe(false); // only one group qualifies
  });
  it("asks for more data below 3 trades", () => {
    expect(buildInsights({ ...base, total: summarize(trades.slice(0, 2), 0.1) })[0].text).toMatch(/at least 3 closed trades/);
  });
  it("reports the most frequent and most expensive mistakes", () => {
    const s = (r: number[]) => summarize(r.map((x, i) => t(String(i), "X", x)), 0.1);
    const out = buildInsights({ ...base, mistakes: [{ name: "Early", count: 3, summary: s([-1, -1, 1]) }, { name: "Moved SL", count: 2, summary: s([-2, -2]) }] });
    expect(out.map((i) => i.text)).toEqual(expect.arrayContaining(["Most frequent mistake: “Early” (3 trades, −1.0R in total).", "Most expensive mistake: “Moved SL” (−4.0R)."]));
  });
});
