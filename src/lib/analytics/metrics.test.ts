import { describe, expect, it } from "vitest";

import {
  accountStatus,
  dailyPnl,
  deriveOutcome,
  equityCurve,
  groupSummaries,
  maxDrawdown,
  rCurve,
  summarize,
  type TradeFact,
} from "./metrics";

const t = (id: string, date: string, net: number | null, r: number | null, extra: Partial<TradeFact> = {}): TradeFact => ({
  id, account_id: "a1", trade_date: date, net_pnl: net, r_multiple: r, created_at: `2026-01-01T00:00:${id.padStart(2, "0")}Z`, ...extra,
});

// Hand-checked sample: start 10,000, risk 100 per trade.
const sample: TradeFact[] = [
  t("1", "2026-01-05", 200, 2, { planned_rr: 2 }),     // win  → 10,200
  t("2", "2026-01-05", -100, -1, { planned_rr: 3 }),   // loss → 10,100
  t("3", "2026-01-06", 5, 0.05, { planned_rr: 2 }),    // BE (|R| ≤ 0.1) → 10,105
  t("4", "2026-01-07", -100, -1),                      // loss → 10,005
  t("5", "2026-01-07", -100, -1),                      // loss → 9,905
  t("6", "2026-01-08", 300, 3),                        // win  → 10,205
  t("7", "2026-01-09", null, null),                    // open — ignored
];

describe("deriveOutcome", () => {
  it("uses the break-even band on R", () => {
    expect(deriveOutcome({ net_pnl: 5, r_multiple: 0.1, outcome_override: null }, 0.1)).toBe("breakeven");
    expect(deriveOutcome({ net_pnl: 11, r_multiple: 0.11, outcome_override: null }, 0.1)).toBe("win");
    expect(deriveOutcome({ net_pnl: -9, r_multiple: -0.09, outcome_override: null }, 0.1)).toBe("breakeven");
  });
  it("falls back to P&L sign without R, and respects overrides", () => {
    expect(deriveOutcome({ net_pnl: -3, r_multiple: null, outcome_override: null }, 0.1)).toBe("loss");
    expect(deriveOutcome({ net_pnl: 0, r_multiple: null, outcome_override: null }, 0.1)).toBe("breakeven");
    expect(deriveOutcome({ net_pnl: 50, r_multiple: 0.5, outcome_override: "breakeven" }, 0.1)).toBe("breakeven");
    expect(deriveOutcome({ net_pnl: null, r_multiple: null, outcome_override: null }, 0.1)).toBeNull();
  });
});

describe("summarize", () => {
  const s = summarize(sample, 0.1);
  it("counts outcomes, ignoring open trades", () => {
    expect(s.totalTrades).toBe(6);
    expect([s.wins, s.losses, s.breakevens]).toEqual([2, 3, 1]);
  });
  it("win rate excludes break-evens: 2 / 5 = 40%", () => expect(s.winRate).toBe(40));
  it("net, gross profit/loss and profit factor", () => {
    expect(s.netPnl).toBe(205);
    expect(s.grossProfit).toBe(505); // 200 + 5 + 300
    expect(s.grossLoss).toBe(-300);
    expect(s.profitFactor).toBe(1.68); // 505 / 300 = 1.6833
  });
  it("R statistics", () => {
    expect(s.totalR).toBe(2.05);
    expect(s.avgR).toBe(0.34); // 2.05 / 6 = 0.3417
    expect(s.avgPlannedRR).toBe(2.33);
  });
  it("averages, expectancy and extremes", () => {
    expect(s.avgWin).toBe(250);
    expect(s.avgLoss).toBe(-100);
    expect(s.expectancy).toBe(34.17);
    expect(s.largestWin).toBe(300);
    expect(s.largestLoss).toBe(-100);
  });
  it("handles no trades and no losses", () => {
    expect(summarize([], 0.1)).toMatchObject({ totalTrades: 0, winRate: null, profitFactor: null, avgR: null });
    expect(summarize([t("x", "2026-01-01", 50, 0.5)], 0.1).profitFactor).toBe(Infinity);
  });
});

describe("equity & drawdown", () => {
  const curve = equityCurve(sample, 10000);
  it("builds the curve from the starting balance", () => {
    expect(curve.map((p) => p.balance)).toEqual([10000, 10200, 10100, 10105, 10005, 9905, 10205]);
  });
  it("max drawdown is peak 10,200 → trough 9,905 = 295 (2.89%)", () => {
    expect(maxDrawdown(curve)).toEqual({ amount: 295, pct: 2.89, peak: 10200, trough: 9905 });
  });
  it("is order-independent of input (sorts chronologically)", () => {
    expect(equityCurve([...sample].reverse(), 10000).map((p) => p.balance)).toEqual(curve.map((p) => p.balance));
  });
  it("cumulative R curve", () => {
    expect(rCurve(sample).map((p) => p.totalR)).toEqual([2, 1, 1.05, 0.05, -0.95, 2.05]);
  });
});

describe("accountStatus (static drawdown & daily limit)", () => {
  it("computes balance, return, floor, room and breaches", () => {
    const s = accountStatus({ starting_balance: 10000, daily_loss_limit_pct: 1.5, max_drawdown_pct: 1 }, sample);
    expect(s.currentBalance).toBe(10205);
    expect(s.netPnl).toBe(205);
    expect(s.returnPct).toBe(2.05);
    expect(s.drawdownFloor).toBe(9900);
    expect(s.lowestBalance).toBe(9905);
    expect(s.drawdownBreached).toBe(false);
    expect(s.drawdownRoom).toBe(305);
    expect(s.dailyLossLimit).toBe(150);
    expect(s.worstDay).toEqual({ date: "2026-01-07", pnl: -200 });
    expect(s.dailyLimitBreaches).toEqual([{ date: "2026-01-07", pnl: -200 }]);
  });
  it("flags a static drawdown breach", () => {
    const s = accountStatus({ starting_balance: 10000, daily_loss_limit_pct: null, max_drawdown_pct: 0.5 }, sample);
    expect(s.drawdownFloor).toBe(9950);
    expect(s.drawdownBreached).toBe(true);
    expect(s.dailyLossLimit).toBeNull();
  });
  it("works with no trades", () => {
    const s = accountStatus({ starting_balance: 5000, daily_loss_limit_pct: null, max_drawdown_pct: null }, []);
    expect(s).toMatchObject({ currentBalance: 5000, netPnl: 0, returnPct: 0, worstDay: null });
  });
});

describe("grouping", () => {
  it("daily P&L sums per day", () => {
    expect(dailyPnl(sample)).toEqual([
      { date: "2026-01-05", pnl: 100 },
      { date: "2026-01-06", pnl: 5 },
      { date: "2026-01-07", pnl: -200 },
      { date: "2026-01-08", pnl: 300 },
    ]);
  });
  it("groups by key (including multi-key and missing) sorted by net P&L", () => {
    const rows = groupSummaries(
      sample,
      (x) => (x.id === "1" ? ["a", "b"] : x.id === "6" ? "b" : null),
      (k) => k.toUpperCase(),
      0.1,
    );
    expect(rows.map((r) => [r.label, r.summary.netPnl])).toEqual([["B", 500], ["A", 200], ["Not set", -295]]);
  });
});
