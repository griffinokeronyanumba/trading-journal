import { describe, expect, it } from "vitest";

import {
  autoPnlAvailability,
  defaultRiskAmount,
  netPnl,
  outcomeFromR,
  plannedRR,
  pnlFromPrices,
  potentialReward,
  priceR,
  priceWarnings,
  riskFromPrices,
  rMultiple,
  sizeForRisk,
  suggestSession,
} from "./calc";

// Example spec for gold at a broker where 1 lot = 100 oz: tick 0.01 = $1 per lot.
const gold = { tick_size: 0.01, tick_value: 1, quote_currency: "USD" };
// EURUSD standard lot: tick 0.00001 = $1 per lot.
const eurusd = { tick_size: 0.00001, tick_value: 1, quote_currency: "USD" };

describe("core money maths (mirrors database columns)", () => {
  it("net P&L and R", () => {
    expect(netPnl(203, 3)).toBe(200);
    expect(netPnl(null, 3)).toBeNull();
    expect(rMultiple(200, 100)).toBe(2);
    expect(rMultiple(-50, 100)).toBe(-0.5);
    expect(rMultiple(200, null)).toBeNull();
  });
  it("planned R:R and potential reward", () => {
    expect(plannedRR(2000, 1990, 2030)).toBe(3);
    expect(plannedRR(1.085, 1.087, 1.081)).toBe(2); // sell
    expect(plannedRR(2000, 2000, 2030)).toBeNull();
    expect(potentialReward(100, 3)).toBe(300);
  });
  it("price-based R respects direction", () => {
    expect(priceR("buy", 2000, 1990, 2020)).toBe(2);
    expect(priceR("sell", 2000, 2010, 2020)).toBe(-2);
  });
  it("outcome from R with the break-even band", () => {
    expect(outcomeFromR(0.1, 10, 0.1)).toBe("breakeven");
    expect(outcomeFromR(-1, -100, 0.1)).toBe("loss");
    expect(outcomeFromR(null, 5, 0.1)).toBe("win");
    expect(outcomeFromR(null, null, 0.1)).toBeNull();
  });
  it("default risk = % of starting balance", () => {
    expect(defaultRiskAmount(1, 10000)).toBe(100);
    expect(defaultRiskAmount(0.5, 5000)).toBe(25);
  });
});

describe("contract-spec P&L (only with specs + matching currency)", () => {
  it("gold: 20.00 move × 0.5 lot = $1,000", () => {
    expect(pnlFromPrices("buy", 2000, 2020, 0.5, gold)).toBe(1000);
    expect(pnlFromPrices("sell", 2000, 2020, 0.5, gold)).toBe(-1000);
  });
  it("EURUSD: 40 pips × 1 lot = $400", () => {
    expect(pnlFromPrices("sell", 1.085, 1.081, 1, eurusd)).toBe(400);
  });
  it("risk and position sizing", () => {
    expect(riskFromPrices(2000, 1990, 0.1, gold)).toBe(100);
    expect(sizeForRisk(2000, 1990, 100, gold)).toBe(0.1);
    expect(sizeForRisk(1.085, 1.087, 100, eurusd)).toBe(0.5);
  });
  it("never calculates without specs", () => {
    const none = { tick_size: null, tick_value: null, quote_currency: "USD" };
    expect(pnlFromPrices("buy", 1, 2, 1, none)).toBeNull();
    expect(autoPnlAvailability(none, "USD").available).toBe(false);
  });
  it("never calculates across currencies", () => {
    const r = autoPnlAvailability(gold, "EUR");
    expect(r.available).toBe(false);
    expect(r.reason).toMatch(/quoted in USD but the account is in EUR/);
    expect(autoPnlAvailability(gold, "USD").available).toBe(true);
  });
});

describe("price warnings", () => {
  it("flags stops/targets on the wrong side", () => {
    expect(priceWarnings("buy", 100, 101, 99)).toHaveLength(2);
    expect(priceWarnings("sell", 100, 101, 99)).toHaveLength(0);
    expect(priceWarnings("sell", 100, 99, null)[0]).toMatch(/above entry for a SELL/);
  });
});

describe("session suggestion", () => {
  const sessions = [
    { id: "asia", name: "Asia", start_time: "03:00:00", end_time: "11:00:00", is_active: true },
    { id: "london", name: "London", start_time: "10:00:00", end_time: "19:00:00", is_active: true },
    { id: "ny", name: "New York", start_time: "15:00:00", end_time: "23:00:00", is_active: true },
    { id: "late", name: "Late", start_time: "23:00:00", end_time: "02:00:00", is_active: false },
  ];
  it("picks the session that opened most recently", () => {
    expect(suggestSession("04:30", sessions)).toBe("asia");
    expect(suggestSession("10:30", sessions)).toBe("london"); // Asia/London overlap
    expect(suggestSession("16:00", sessions)).toBe("ny"); // London/NY overlap
    expect(suggestSession("23:30", sessions)).toBeNull();
    expect(suggestSession(null, sessions)).toBeNull();
  });
  it("handles sessions that cross midnight", () => {
    const s = [{ ...sessions[3], is_active: true }];
    expect(suggestSession("01:00", s)).toBe("late");
    expect(suggestSession("23:30", s)).toBe("late");
    expect(suggestSession("03:00", s)).toBeNull();
  });
});
