import { describe, expect, it } from "vitest";

import { tradeSchema } from "./schema";

const A = "8f7c3a52-6f7e-4a8e-9a43-0f6b6f2a1c11";
const I = "1b2c3d4e-5f60-4718-8a9b-0c1d2e3f4a5b";
const base = {
  account_id: A, instrument_id: I, direction: "buy", trade_date: "2026-03-02",
  entry_time_local: "2026-03-02T10:00", exit_time_local: "2026-03-02T11:00", session_id: "__none",
  entry_price: "2000", stop_loss: "1990", take_profit: "2030", exit_price: "2030", position_size: "",
  strategy_id: "", setup_type_id: "", grade_id: "", news_condition: "none", entry_reasoning: "",
  followed_rules: "", confluence_ids: [], rule_checks: {}, risk_pct: "1", risk_amount: "100",
  gross_pnl: "300", fees: "", pnl_source: "manual", outcome_override: "", mistake_ids: [], mfe_r: "", mae_r: "", notes: "",
};

describe("tradeSchema", () => {
  it("parses a complete trade", () => {
    const r = tradeSchema.parse(base);
    expect(r).toMatchObject({ entry_price: 2000, stop_loss: 1990, fees: 0, session_id: null, gross_pnl: 300, outcome_override: null, position_size: null });
  });
  it("requires account, instrument and entry", () => {
    const r = tradeSchema.safeParse({ ...base, account_id: "", instrument_id: "", entry_price: "" });
    const f = Object.fromEntries((r.error?.issues ?? []).map((i) => [i.path[0], i.message]));
    expect(f.account_id).toBe("Choose a value.");
    expect(f.instrument_id).toBe("Choose a value.");
    expect(f.entry_price).toBe("Entry price is required.");
  });
  it("rejects exit before entry", () => {
    const r = tradeSchema.safeParse({ ...base, exit_time_local: "2026-03-02T09:00" });
    expect(r.error?.issues[0].path).toEqual(["exit_time_local"]);
  });
  it("requires P&L once there is an exit price", () => {
    const r = tradeSchema.safeParse({ ...base, gross_pnl: "" });
    expect(r.error?.issues[0].path).toEqual(["gross_pnl"]);
  });
  it("allows an open trade (no exit, no P&L) and negative P&L", () => {
    expect(tradeSchema.safeParse({ ...base, exit_price: "", gross_pnl: "" }).success).toBe(true);
    expect(tradeSchema.parse({ ...base, gross_pnl: "-100.5" }).gross_pnl).toBe(-100.5);
  });
});
