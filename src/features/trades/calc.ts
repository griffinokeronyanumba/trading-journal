/**
 * Live trade-form calculations. Mirrors the database's generated columns
 * (net_pnl, r_multiple, planned_rr, potential_reward) so the preview always
 * matches what gets stored. Pure functions — unit-tested.
 *
 * P&L is only calculated from prices when the instrument has a contract
 * specification (tick size + tick value) AND its quote currency matches the
 * account currency. Otherwise P&L stays manual. No universal pip/point
 * assumptions are ever made.
 */
import type { TradeDirection, TradeOutcome } from "@/types/database";

const round = (v: number, d: number) => Math.round((v + Number.EPSILON) * 10 ** d) / 10 ** d;
const sign = (d: TradeDirection) => (d === "buy" ? 1 : -1);

export type InstrumentSpec = {
  tick_size: number | null;
  tick_value: number | null;
  quote_currency: string | null;
};

export function netPnl(gross: number | null, fees: number | null): number | null {
  if (gross == null) return null;
  return round(gross - (fees ?? 0), 2);
}

/** R = net P&L ÷ initial planned risk. */
export function rMultiple(net: number | null, riskAmount: number | null): number | null {
  if (net == null || riskAmount == null || riskAmount <= 0) return null;
  return round(net / riskAmount, 4);
}

export function plannedRR(entry: number | null, stop: number | null, target: number | null): number | null {
  if (entry == null || stop == null || target == null || stop === entry) return null;
  return round(Math.abs(target - entry) / Math.abs(entry - stop), 4);
}

export function potentialReward(riskAmount: number | null, rr: number | null): number | null {
  if (riskAmount == null || rr == null) return null;
  return round(riskAmount * rr, 2);
}

/** Price-based R (reference only, used when no risk amount is entered). */
export function priceR(direction: TradeDirection, entry: number | null, stop: number | null, exit: number | null) {
  if (entry == null || stop == null || exit == null || stop === entry) return null;
  return round(((exit - entry) * sign(direction)) / Math.abs(entry - stop), 4);
}

export function outcomeFromR(r: number | null, net: number | null, band: number): TradeOutcome | null {
  if (r != null) return Math.abs(r) <= band ? "breakeven" : r > 0 ? "win" : "loss";
  if (net == null) return null;
  return net === 0 ? "breakeven" : net > 0 ? "win" : "loss";
}

export function specsComplete(spec: InstrumentSpec | null | undefined): spec is InstrumentSpec & { tick_size: number; tick_value: number } {
  return !!spec && spec.tick_size != null && spec.tick_size > 0 && spec.tick_value != null && spec.tick_value > 0;
}

/** Why automatic P&L is or isn't available — shown to the user. */
export function autoPnlAvailability(spec: InstrumentSpec | null | undefined, accountCurrency: string | null | undefined) {
  if (!specsComplete(spec)) return { available: false, reason: "Add tick size and tick value to this instrument to enable automatic P&L." };
  if (!spec.quote_currency || spec.quote_currency !== accountCurrency)
    return {
      available: false,
      reason: `Instrument is quoted in ${spec.quote_currency ?? "an unknown currency"} but the account is in ${accountCurrency}. Enter P&L manually.`,
    };
  return { available: true, reason: null };
}

/** Money value of a price move: (move ÷ tick size) × tick value × size. */
export function pnlFromPrices(
  direction: TradeDirection,
  entry: number | null,
  exit: number | null,
  size: number | null,
  spec: InstrumentSpec | null | undefined,
): number | null {
  if (!specsComplete(spec) || entry == null || exit == null || size == null || size <= 0) return null;
  const ticks = ((exit - entry) * sign(direction)) / spec.tick_size;
  return round(ticks * spec.tick_value * size, 2);
}

/** Money at risk between entry and stop for a given size. */
export function riskFromPrices(entry: number | null, stop: number | null, size: number | null, spec: InstrumentSpec | null | undefined) {
  if (!specsComplete(spec) || entry == null || stop == null || size == null || size <= 0) return null;
  return round((Math.abs(entry - stop) / spec.tick_size) * spec.tick_value * size, 2);
}

/** Position size that risks exactly `riskAmount`. */
export function sizeForRisk(entry: number | null, stop: number | null, riskAmount: number | null, spec: InstrumentSpec | null | undefined) {
  if (!specsComplete(spec) || entry == null || stop == null || riskAmount == null || stop === entry) return null;
  const perUnit = (Math.abs(entry - stop) / spec.tick_size) * spec.tick_value;
  return round(riskAmount / perUnit, 4);
}

/** Default planned risk: risk % of the account's starting balance. */
export function defaultRiskAmount(riskPct: number | null, startingBalance: number | null) {
  if (riskPct == null || startingBalance == null) return null;
  return round((startingBalance * riskPct) / 100, 2);
}

/** Warnings for stop/target on the wrong side of entry. */
export function priceWarnings(direction: TradeDirection, entry: number | null, stop: number | null, target: number | null) {
  const w: string[] = [];
  if (entry == null) return w;
  if (stop != null && (direction === "buy" ? stop >= entry : stop <= entry))
    w.push(`Stop-loss should be ${direction === "buy" ? "below" : "above"} entry for a ${direction.toUpperCase()}.`);
  if (target != null && (direction === "buy" ? target <= entry : target >= entry))
    w.push(`Take-profit should be ${direction === "buy" ? "above" : "below"} entry for a ${direction.toUpperCase()}.`);
  return w;
}

// ---------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------
export type SessionWindow = { id: string; name: string; start_time: string; end_time: string; is_active: boolean };

const minutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

function inWindow(t: number, start: number, end: number) {
  return start <= end ? t >= start && t < end : t >= start || t < end; // crosses midnight
}

/**
 * Suggest a session for a local wall-clock time ("HH:MM").
 * When sessions overlap (e.g. London/New York) the one that opened most
 * recently wins, so 16:00 Nairobi → New York.
 */
export function suggestSession(localTime: string | null, sessions: SessionWindow[]): string | null {
  if (!localTime || !/^\d{2}:\d{2}/.test(localTime)) return null;
  const t = minutes(localTime);
  let best: { id: string; since: number } | null = null;
  for (const s of sessions) {
    if (!s.is_active) continue;
    const start = minutes(s.start_time), end = minutes(s.end_time);
    if (!inWindow(t, start, end)) continue;
    const since = (t - start + 1440) % 1440;
    if (!best || since < best.since) best = { id: s.id, since };
  }
  return best?.id ?? null;
}
