import { describe, expect, it } from "vitest";

import { accountSchema } from "./schema";

const valid = {
  name: " 10k Backtest ",
  account_type: "backtest",
  currency: "usd",
  starting_balance: "10,000",
  risk_per_trade_pct: "1",
  daily_loss_limit_pct: "",
  max_drawdown_pct: "10",
  opened_on: "2026-11-06",
  notes: "  ",
};

describe("accountSchema", () => {
  it("parses and normalises form strings", () => {
    const r = accountSchema.parse(valid);
    expect(r).toEqual({
      name: "10k Backtest",
      account_type: "backtest",
      currency: "USD",
      starting_balance: 10000,
      risk_per_trade_pct: 1,
      daily_loss_limit_pct: null,
      max_drawdown_pct: 10,
      opened_on: "2026-11-06",
      notes: null,
    });
  });
  it("rejects bad values with field messages", () => {
    const r = accountSchema.safeParse({ ...valid, starting_balance: "", risk_per_trade_pct: "150", currency: "US", name: "" });
    expect(r.success).toBe(false);
    const fields = Object.fromEntries((r.error?.issues ?? []).map((i) => [i.path[0], i.message]));
    expect(fields.starting_balance).toBe("Starting balance is required.");
    expect(fields.risk_per_trade_pct).toBe("Risk per trade must be at most 100.");
    expect(fields.currency).toMatch(/3-letter/);
    expect(fields.name).toBe("Name is required.");
  });
  it("rejects non-numeric input", () => {
    const r = accountSchema.safeParse({ ...valid, starting_balance: "abc" });
    expect(r.error?.issues[0].message).toBe("Starting balance must be a number.");
  });
});
