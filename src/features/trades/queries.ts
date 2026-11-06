import "server-only";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { TradeEnriched } from "@/types/database";

export async function getTradeForEdit(id: string) {
  await requireUser();
  const supabase = await createClient();
  const [trade, confluences, mistakes, checks] = await Promise.all([
    supabase.from("trades").select("*").eq("id", id).maybeSingle(),
    supabase.from("trade_confluences").select("confluence_id").eq("trade_id", id),
    supabase.from("trade_mistakes").select("mistake_tag_id").eq("trade_id", id),
    supabase.from("trade_rule_checks").select("rule_id,followed").eq("trade_id", id),
  ]);
  if (trade.error) throw new Error(trade.error.message);
  if (!trade.data) return null;
  return {
    trade: trade.data,
    confluenceIds: (confluences.data ?? []).map((c) => c.confluence_id),
    mistakeIds: (mistakes.data ?? []).map((m) => m.mistake_tag_id),
    ruleChecks: Object.fromEntries((checks.data ?? []).map((c) => [c.rule_id, c.followed])) as Record<string, boolean>,
  };
}

export type TradeListParams = {
  accountId?: string;
  instrumentId?: string;
  strategyId?: string;
  direction?: "buy" | "sell";
  outcome?: "win" | "loss" | "breakeven" | "open";
  from?: string;
  to?: string;
  sort?: string;
  dir?: "asc" | "desc";
  page?: number;
};

export const SORTABLE = ["trade_date", "symbol", "net_pnl", "r_multiple", "risk_amount", "grade_rank"] as const;
export const PAGE_SIZE = 50;

export async function listTrades(p: TradeListParams): Promise<{ rows: TradeEnriched[]; hasNext: boolean }> {
  await requireUser();
  const supabase = await createClient();
  const sort = (SORTABLE as readonly string[]).includes(p.sort ?? "") ? (p.sort as (typeof SORTABLE)[number]) : "trade_date";
  const ascending = p.dir === "asc";
  const page = Math.max(1, p.page ?? 1);
  let q = supabase.from("trades_enriched").select("*");
  if (p.accountId) q = q.eq("account_id", p.accountId);
  if (p.instrumentId) q = q.eq("instrument_id", p.instrumentId);
  if (p.strategyId) q = q.eq("strategy_id", p.strategyId);
  if (p.direction) q = q.eq("direction", p.direction);
  if (p.outcome === "open") q = q.is("net_pnl", null);
  else if (p.outcome) q = q.eq("outcome", p.outcome);
  if (p.from) q = q.gte("trade_date", p.from);
  if (p.to) q = q.lte("trade_date", p.to);
  q = q.order(sort, { ascending, nullsFirst: false });
  if (sort !== "trade_date") q = q.order("trade_date", { ascending: false });
  q = q.order("entry_time", { ascending, nullsFirst: false }).order("created_at", { ascending });
  const from = (page - 1) * PAGE_SIZE;
  const { data, error } = await q.range(from, from + PAGE_SIZE); // one extra row tells us if there's a next page
  if (error) throw new Error(error.message);
  return { rows: data.slice(0, PAGE_SIZE), hasNext: data.length > PAGE_SIZE };
}
