/**
 * Trading statistics — pure functions, no I/O, fully unit-tested.
 * Every page that shows a number gets it from here, so they always agree.
 *
 * Definitions (also shown in the UI):
 *  - A trade is "closed" when it has a net P&L.
 *  - Outcome: manual override if set; else from R using the break-even band
 *    (|R| ≤ band → break-even); else from the sign of net P&L.
 *  - Win rate = wins ÷ (wins + losses). Break-even trades are excluded.
 *  - Profit factor = gross profit ÷ |gross loss| (∞ when there are no losses).
 *  - Average R = mean R of closed trades that have a planned risk.
 *  - Max drawdown = largest peak-to-trough fall of the equity curve.
 */
import type { TradeOutcome } from "@/types/database";

export type TradeFact = {
  id: string;
  account_id: string;
  trade_date: string; // YYYY-MM-DD
  entry_time?: string | null;
  created_at?: string | null;
  net_pnl: number | null;
  r_multiple: number | null;
  planned_rr?: number | null;
  outcome_override?: TradeOutcome | null;
};

export type Summary = {
  totalTrades: number;
  wins: number;
  losses: number;
  breakevens: number;
  winRate: number | null; // percentage 0-100
  netPnl: number;
  grossProfit: number;
  grossLoss: number; // negative or 0
  profitFactor: number | null; // Infinity possible
  avgR: number | null;
  totalR: number;
  avgWin: number | null;
  avgLoss: number | null; // negative
  expectancy: number | null; // average net P&L per trade
  largestWin: number | null;
  largestLoss: number | null;
  avgPlannedRR: number | null;
};

const round = (v: number, d = 2) => Math.round((v + Number.EPSILON) * 10 ** d) / 10 ** d;

export function deriveOutcome(
  t: Pick<TradeFact, "net_pnl" | "r_multiple" | "outcome_override">,
  breakevenBandR: number,
): TradeOutcome | null {
  if (t.outcome_override) return t.outcome_override;
  if (t.r_multiple != null) {
    if (Math.abs(t.r_multiple) <= breakevenBandR) return "breakeven";
    return t.r_multiple > 0 ? "win" : "loss";
  }
  if (t.net_pnl == null) return null;
  if (t.net_pnl === 0) return "breakeven";
  return t.net_pnl > 0 ? "win" : "loss";
}

export function isClosed<T extends TradeFact>(t: T): t is T & { net_pnl: number } {
  return t.net_pnl != null;
}

/** Chronological order: date, then entry time, then creation time. */
export function sortChronologically<T extends TradeFact>(trades: T[]): T[] {
  return [...trades].sort(
    (a, b) =>
      a.trade_date.localeCompare(b.trade_date) ||
      (a.entry_time ?? "").localeCompare(b.entry_time ?? "") ||
      (a.created_at ?? "").localeCompare(b.created_at ?? ""),
  );
}

export function summarize(trades: TradeFact[], breakevenBandR: number): Summary {
  const closed = trades.filter(isClosed);
  let wins = 0, losses = 0, breakevens = 0;
  let grossProfit = 0, grossLoss = 0, netPnl = 0, totalR = 0, rCount = 0;
  let winSum = 0, lossSum = 0, largestWin: number | null = null, largestLoss: number | null = null;
  let rrSum = 0, rrCount = 0;

  for (const t of closed) {
    const outcome = deriveOutcome(t, breakevenBandR);
    if (outcome === "win") wins++;
    else if (outcome === "loss") losses++;
    else breakevens++;

    netPnl += t.net_pnl;
    if (t.net_pnl > 0) {
      grossProfit += t.net_pnl;
      if (outcome === "win") {
        winSum += t.net_pnl;
        largestWin = largestWin == null ? t.net_pnl : Math.max(largestWin, t.net_pnl);
      }
    } else if (t.net_pnl < 0) {
      grossLoss += t.net_pnl;
      if (outcome === "loss") {
        lossSum += t.net_pnl;
        largestLoss = largestLoss == null ? t.net_pnl : Math.min(largestLoss, t.net_pnl);
      }
    }
    if (t.r_multiple != null) {
      totalR += t.r_multiple;
      rCount++;
    }
    if (t.planned_rr != null) {
      rrSum += t.planned_rr;
      rrCount++;
    }
  }

  const decided = wins + losses;
  return {
    totalTrades: closed.length,
    wins,
    losses,
    breakevens,
    winRate: decided ? round((wins / decided) * 100) : null,
    netPnl: round(netPnl),
    grossProfit: round(grossProfit),
    grossLoss: round(grossLoss),
    profitFactor: closed.length === 0 ? null : grossLoss === 0 ? (grossProfit > 0 ? Infinity : null) : round(grossProfit / Math.abs(grossLoss)),
    avgR: rCount ? round(totalR / rCount) : null,
    totalR: round(totalR),
    avgWin: wins ? round(winSum / wins) : null,
    avgLoss: losses ? round(lossSum / losses) : null,
    expectancy: closed.length ? round(netPnl / closed.length) : null,
    largestWin,
    largestLoss,
    avgPlannedRR: rrCount ? round(rrSum / rrCount) : null,
  };
}

export type EquityPoint = { index: number; date: string; balance: number; pnl: number; tradeId: string | null };

/** Balance after each closed trade, starting from the starting balance. */
export function equityCurve(trades: TradeFact[], startingBalance: number): EquityPoint[] {
  const points: EquityPoint[] = [];
  const closed = sortChronologically(trades.filter(isClosed));
  let balance = startingBalance;
  points.push({ index: 0, date: closed[0]?.trade_date ?? "", balance: round(balance), pnl: 0, tradeId: null });
  closed.forEach((t, i) => {
    balance += t.net_pnl;
    points.push({ index: i + 1, date: t.trade_date, balance: round(balance), pnl: t.net_pnl, tradeId: t.id });
  });
  return points;
}

export type Drawdown = { amount: number; pct: number; peak: number; trough: number };

/** Largest peak-to-trough decline. pct is relative to the peak. */
export function maxDrawdown(curve: Pick<EquityPoint, "balance">[]): Drawdown {
  let peak = curve[0]?.balance ?? 0;
  let best: Drawdown = { amount: 0, pct: 0, peak, trough: peak };
  for (const p of curve) {
    if (p.balance > peak) peak = p.balance;
    const dd = peak - p.balance;
    if (dd > best.amount) best = { amount: round(dd), pct: peak > 0 ? round((dd / peak) * 100) : 0, peak, trough: p.balance };
  }
  return best;
}

/** Cumulative R curve — currency-neutral, so it can combine accounts. */
export function rCurve(trades: TradeFact[]) {
  let total = 0;
  return sortChronologically(trades.filter((t) => isClosed(t) && t.r_multiple != null)).map((t, i) => {
    total += t.r_multiple as number;
    return { index: i + 1, date: t.trade_date, totalR: round(total), r: t.r_multiple as number };
  });
}

// ---------------------------------------------------------------------
// Account-level status (static drawdown, daily loss limit)
// ---------------------------------------------------------------------
export type AccountLimits = {
  starting_balance: number;
  daily_loss_limit_pct: number | null;
  max_drawdown_pct: number | null;
};

export type AccountStatus = {
  currentBalance: number;
  netPnl: number;
  returnPct: number;
  /** Static drawdown floor = starting × (1 − max DD %). */
  drawdownFloor: number | null;
  lowestBalance: number;
  /** Distance from current balance down to the floor. */
  drawdownRoom: number | null;
  drawdownBreached: boolean;
  /** Daily loss limit as money = starting × daily %. */
  dailyLossLimit: number | null;
  worstDay: { date: string; pnl: number } | null;
  dailyLimitBreaches: { date: string; pnl: number }[];
};

export function dailyPnl(trades: TradeFact[]) {
  const map = new Map<string, number>();
  for (const t of trades.filter(isClosed)) map.set(t.trade_date, (map.get(t.trade_date) ?? 0) + t.net_pnl);
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, pnl]) => ({ date, pnl: round(pnl) }));
}

export function accountStatus(account: AccountLimits, trades: TradeFact[]): AccountStatus {
  const curve = equityCurve(trades, account.starting_balance);
  const current = curve[curve.length - 1].balance;
  const net = round(current - account.starting_balance);
  const lowest = Math.min(...curve.map((p) => p.balance));
  const floor = account.max_drawdown_pct != null ? round(account.starting_balance * (1 - account.max_drawdown_pct / 100)) : null;
  const limit = account.daily_loss_limit_pct != null ? round(account.starting_balance * (account.daily_loss_limit_pct / 100)) : null;
  const days = dailyPnl(trades);
  const worst = days.reduce<{ date: string; pnl: number } | null>((w, d) => (w == null || d.pnl < w.pnl ? d : w), null);

  return {
    currentBalance: current,
    netPnl: net,
    returnPct: round((net / account.starting_balance) * 100),
    drawdownFloor: floor,
    lowestBalance: lowest,
    drawdownRoom: floor != null ? round(current - floor) : null,
    drawdownBreached: floor != null && lowest <= floor,
    dailyLossLimit: limit,
    worstDay: worst && worst.pnl < 0 ? worst : null,
    dailyLimitBreaches: limit != null ? days.filter((d) => d.pnl <= -limit) : [],
  };
}

// ---------------------------------------------------------------------
// Grouping helpers for analytics breakdowns
// ---------------------------------------------------------------------
export type GroupRow = { key: string; label: string; summary: Summary };

export function groupSummaries<T extends TradeFact>(
  trades: T[],
  keyOf: (t: T) => string | null | undefined | (string | null | undefined)[],
  labelOf: (key: string) => string,
  breakevenBandR: number,
): GroupRow[] {
  const groups = new Map<string, T[]>();
  for (const t of trades) {
    const raw = keyOf(t);
    const keys = Array.isArray(raw) ? raw : [raw];
    for (const k of keys.length ? keys : [null]) {
      const key = k ?? "__none__";
      const list = groups.get(key) ?? [];
      list.push(t);
      groups.set(key, list);
    }
  }
  return [...groups.entries()]
    .map(([key, list]) => ({ key, label: key === "__none__" ? "Not set" : labelOf(key), summary: summarize(list, breakevenBandR) }))
    .sort((a, b) => b.summary.netPnl - a.summary.netPnl);
}
