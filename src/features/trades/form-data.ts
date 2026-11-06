import "server-only";

import { getAccountContext, getProfile, listAccounts } from "@/features/accounts/queries";
import { listInstruments } from "@/features/instruments/queries";
import { getReferenceLists } from "@/features/settings/queries";
import { defaultRiskAmount } from "@/features/trades/calc";
import { isoToLocalInput, todayInTz } from "@/lib/time";
import type { Trade } from "@/types/database";
import type { TradeFormProps } from "./components/trade-form";
import type { TradeFormInput } from "./schema";

const s = (v: number | null | undefined) => (v == null ? "" : String(v));

export async function getTradeFormData(): Promise<Omit<TradeFormProps, "initial" | "tradeId">> {
  const [accounts, instruments, lists, profile] = await Promise.all([
    listAccounts({ includeArchived: true }),
    listInstruments(),
    getReferenceLists(),
    getProfile(),
  ]);
  return { accounts, instruments, ...lists, timezone: profile.timezone, breakevenBand: profile.breakeven_band_r };
}

export async function blankTradeInput(): Promise<TradeFormInput> {
  const [{ accounts, active }, profile] = await Promise.all([getAccountContext(), getProfile()]);
  const account = active ?? accounts[0] ?? null;
  return {
    account_id: account?.id ?? "",
    instrument_id: "",
    direction: "buy",
    trade_date: todayInTz(profile.timezone),
    entry_time_local: "",
    exit_time_local: "",
    session_id: "__none",
    entry_price: "",
    stop_loss: "",
    take_profit: "",
    exit_price: "",
    position_size: "",
    strategy_id: "__none",
    setup_type_id: "__none",
    grade_id: "__none",
    news_condition: "none",
    entry_reasoning: "",
    followed_rules: "",
    confluence_ids: [],
    rule_checks: {},
    risk_pct: account ? String(account.risk_per_trade_pct) : "",
    risk_amount: account ? s(defaultRiskAmount(account.risk_per_trade_pct, account.starting_balance)) : "",
    gross_pnl: "",
    fees: "",
    pnl_source: "manual",
    outcome_override: "__none",
    mistake_ids: [],
    mfe_r: "",
    mae_r: "",
    notes: "",
  };
}

export function tradeToInput(
  t: Trade,
  extra: { confluenceIds: string[]; mistakeIds: string[]; ruleChecks: Record<string, boolean> },
  timezone: string,
): TradeFormInput {
  return {
    account_id: t.account_id,
    instrument_id: t.instrument_id,
    direction: t.direction,
    trade_date: t.trade_date,
    entry_time_local: isoToLocalInput(t.entry_time, timezone),
    exit_time_local: isoToLocalInput(t.exit_time, timezone),
    session_id: t.session_id ?? "__none",
    entry_price: s(t.entry_price),
    stop_loss: s(t.stop_loss),
    take_profit: s(t.take_profit),
    exit_price: s(t.exit_price),
    position_size: s(t.position_size),
    strategy_id: t.strategy_id ?? "__none",
    setup_type_id: t.setup_type_id ?? "__none",
    grade_id: t.grade_id ?? "__none",
    news_condition: t.news_condition,
    entry_reasoning: t.entry_reasoning ?? "",
    followed_rules: t.followed_rules == null ? "" : t.followed_rules ? "yes" : "no",
    confluence_ids: extra.confluenceIds,
    rule_checks: extra.ruleChecks,
    risk_pct: s(t.risk_pct),
    risk_amount: s(t.risk_amount),
    gross_pnl: s(t.gross_pnl),
    fees: t.fees ? String(t.fees) : "",
    pnl_source: t.pnl_source,
    outcome_override: t.outcome_override ?? "__none",
    mistake_ids: extra.mistakeIds,
    mfe_r: s(t.mfe_r),
    mae_r: s(t.mae_r),
    notes: t.notes ?? "",
  };
}

/** A copy for "Duplicate": keeps the plan/context, clears the execution and result. */
export function duplicateInput(src: TradeFormInput, base: TradeFormInput): TradeFormInput {
  return {
    ...base,
    account_id: src.account_id,
    instrument_id: src.instrument_id,
    direction: src.direction,
    session_id: src.session_id,
    strategy_id: src.strategy_id,
    setup_type_id: src.setup_type_id,
    news_condition: src.news_condition,
    risk_pct: src.risk_pct,
    risk_amount: src.risk_amount,
    position_size: src.position_size,
    confluence_ids: src.confluence_ids,
    pnl_source: src.pnl_source,
  };
}
