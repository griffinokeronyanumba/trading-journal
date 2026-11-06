import "server-only";

import { getProfile, listAccounts } from "@/features/accounts/queries";
import { listInstruments } from "@/features/instruments/queries";
import { getReferenceLists } from "@/features/settings/queries";
import { localInputToIso } from "@/lib/time";
import type { NewsCondition, SaveTradePayload, TradeOutcome } from "@/types/database";
import { LIST_SEPARATOR, REQUIRED } from "./columns";

export const MAX_IMPORT_ROWS = 2000;
export type RowError = { line: number; messages: string[] };
export type PreviewRow = { line: number; date: string; account: string; symbol: string; direction: string; net: string };

const NEWS: Record<string, NewsCondition> = {
  "": "none", none: "none", "no news": "none", low_impact: "low_impact", low: "low_impact", medium_impact: "medium_impact",
  medium: "medium_impact", high_impact: "high_impact", high: "high_impact", during_release: "during_release", during: "during_release",
};
const lc = (s: string) => s.trim().toLowerCase();

/** Validate CSV rows and turn them into save_trade payloads. Pure apart from loading your lists. */
export async function prepareImport(rows: Record<string, string>[], defaultAccountId: string | null) {
  const [accounts, instruments, lists, profile] = await Promise.all([listAccounts({ includeArchived: true }), listInstruments(), getReferenceLists(), getProfile()]);
  const byName = <T extends { id: string }>(items: T[], key: (t: T) => string) => new Map(items.map((i) => [lc(key(i)), i.id]));
  const acc = byName(accounts, (a) => a.name);
  const inst = byName(instruments, (i) => i.symbol);
  const ses = byName(lists.sessions, (s) => s.name);
  const strat = byName(lists.strategies, (s) => s.name);
  const setup = byName(lists.setups, (s) => s.name);
  const grade = byName(lists.grades, (g) => g.label);
  const conf = byName(lists.confluences, (c) => c.name);
  const mist = byName(lists.mistakes, (m) => m.name);

  const payloads: SaveTradePayload[] = [];
  const preview: PreviewRow[] = [];
  const errors: RowError[] = [];

  rows.forEach((r, i) => {
    const line = i + 2; // header is line 1
    const msgs: string[] = [];
    const get = (k: string) => (r[k] ?? "").trim();
    const num = (k: string, opts: { positive?: boolean; min?: number } = {}) => {
      const raw = get(k).replace(/,/g, "").replace(/^'/, "");
      if (raw === "") return null;
      const n = Number(raw);
      if (!Number.isFinite(n)) { msgs.push(`${k} “${get(k)}” is not a number`); return null; }
      if (opts.positive && n <= 0) msgs.push(`${k} must be greater than 0`);
      if (opts.min != null && n < opts.min) msgs.push(`${k} must be at least ${opts.min}`);
      return n;
    };
    const lookup = (k: string, map: Map<string, string>, what: string) => {
      const v = get(k);
      if (!v) return null;
      const id = map.get(lc(v));
      if (!id) msgs.push(`Unknown ${what} “${v}” — create it first`);
      return id ?? null;
    };
    const list = (k: string, map: Map<string, string>, what: string) =>
      get(k).split(LIST_SEPARATOR).map((s) => s.trim()).filter(Boolean).flatMap((n) => {
        const id = map.get(lc(n));
        if (!id) { msgs.push(`Unknown ${what} “${n}”`); return []; }
        return [id];
      });
    const time = (k: string) => {
      const v = get(k).replace(" ", "T");
      if (!v) return null;
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v)) { msgs.push(`${k} must look like 2026-01-05 14:30`); return null; }
      return localInputToIso(v.slice(0, 16), profile.timezone);
    };

    for (const k of REQUIRED) if (!get(k)) msgs.push(`${k} is required`);
    const accountId = get("account") ? acc.get(lc(get("account"))) ?? null : defaultAccountId;
    if (get("account") && !accountId) msgs.push(`Unknown account “${get("account")}”`);
    if (!accountId) msgs.push("Choose an account to import into");
    const instrumentId = get("symbol") ? lookup("symbol", inst, "instrument") : null;
    const dirRaw = lc(get("direction"));
    const direction = ["buy", "long", "b"].includes(dirRaw) ? "buy" : ["sell", "short", "s"].includes(dirRaw) ? "sell" : null;
    if (get("direction") && !direction) msgs.push(`direction must be buy or sell`);
    const date = get("trade_date");
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) msgs.push("trade_date must be YYYY-MM-DD");
    const entry = num("entry_price", { positive: true });
    const exit = num("exit_price", { positive: true });
    const gross = num("gross_pnl");
    if (exit != null && gross == null) msgs.push("gross_pnl is required when exit_price is set");
    const news = NEWS[lc(get("news_condition"))];
    if (!news) msgs.push(`news_condition “${get("news_condition")}” is not recognised`);
    const fr = lc(get("followed_rules"));
    const followed = ["yes", "true", "y", "1"].includes(fr) ? true : ["no", "false", "n", "0"].includes(fr) ? false : fr === "" ? null : (msgs.push("followed_rules must be yes or no"), null);
    const ov = lc(get("outcome_override"));
    const outcome = (["win", "loss", "breakeven"].includes(ov) ? ov : ov === "" ? null : (msgs.push("outcome_override must be win, loss or breakeven"), null)) as TradeOutcome | null;
    const entryTime = time("entry_time");
    const exitTime = time("exit_time");
    if (entryTime && exitTime && exitTime < entryTime) msgs.push("exit_time is before entry_time");

    const payload: SaveTradePayload = {
      trade: {
        account_id: accountId ?? undefined,
        instrument_id: instrumentId ?? undefined,
        strategy_id: lookup("strategy", strat, "strategy"),
        setup_type_id: lookup("setup", setup, "setup"),
        session_id: lookup("session", ses, "session"),
        grade_id: lookup("grade", grade, "grade"),
        trade_date: date,
        direction: direction ?? undefined,
        entry_time: entryTime,
        exit_time: exitTime,
        entry_price: entry ?? undefined,
        stop_loss: num("stop_loss", { positive: true }),
        take_profit: num("take_profit", { positive: true }),
        exit_price: exit,
        position_size: num("position_size", { positive: true }),
        news_condition: news ?? "none",
        entry_reasoning: get("entry_reasoning") || null,
        followed_rules: followed,
        risk_pct: num("risk_pct", { positive: true }),
        risk_amount: num("risk_amount", { positive: true }),
        gross_pnl: gross,
        fees: num("fees", { min: 0 }) ?? 0,
        pnl_source: "manual",
        outcome_override: outcome,
        mfe_r: num("mfe_r", { min: 0 }),
        mae_r: num("mae_r", { min: 0 }),
        notes: get("notes") || null,
      },
      confluence_ids: list("confluences", conf, "confluence"),
      mistake_ids: list("mistakes", mist, "mistake"),
      rule_checks: [],
    };

    if (msgs.length) errors.push({ line, messages: msgs });
    else {
      payloads.push(payload);
      preview.push({
        line, date, symbol: get("symbol").toUpperCase(), direction: direction!,
        account: accounts.find((a) => a.id === accountId)?.name ?? "",
        net: gross == null ? "open" : String(Math.round((gross - (num("fees") ?? 0)) * 100) / 100),
      });
    }
  });

  return { payloads, preview, errors, total: rows.length };
}
