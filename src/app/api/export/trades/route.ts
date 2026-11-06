import { NextResponse, type NextRequest } from "next/server";

import { CSV_HEADERS, LIST_SEPARATOR } from "@/features/csv/columns";
import { isSupabaseConfigured } from "@/lib/env";
import { toCsv } from "@/lib/csv";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { createClient } from "@/lib/supabase/server";
import { isoToLocalInput } from "@/lib/time";
import { ACTIVE_ACCOUNT_COOKIE } from "@/lib/active-account";

/** GET /api/export/trades?account=<id|all> → CSV download of your trades. */
export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured) return NextResponse.json({ error: "Not configured" }, { status: 503 });
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims?.sub) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const param = request.nextUrl.searchParams.get("account") ?? request.cookies.get(ACTIVE_ACCOUNT_COOKIE)?.value ?? "all";
  const accountId = /^[0-9a-f-]{36}$/i.test(param) ? param : null;

  const [profile, confluences, mistakes] = await Promise.all([
    supabase.from("profiles").select("timezone").eq("id", auth.claims.sub).maybeSingle(),
    supabase.from("confluences").select("id,name"),
    supabase.from("mistake_tags").select("id,name"),
  ]);
  const tz = profile.data?.timezone ?? "Africa/Nairobi";
  const names = (rows: { id: string; name: string }[] | null, ids: string[]) =>
    ids.map((id) => rows?.find((r) => r.id === id)?.name).filter(Boolean).join(`${LIST_SEPARATOR} `);

  const trades = await fetchAll((from, to) => {
    let q = supabase.from("trades_enriched").select("*").order("trade_date").order("created_at").range(from, to);
    if (accountId) q = q.eq("account_id", accountId);
    return q;
  });

  const rows = trades.map((t) => {
    const local = (iso: string | null) => (iso ? isoToLocalInput(iso, tz).replace("T", " ") : "");
    const values: Record<(typeof CSV_HEADERS)[number], string | number | null> = {
      trade_id: t.id, account: t.account_name, currency: t.currency, trade_date: t.trade_date, symbol: t.symbol,
      direction: t.direction, session: t.session_name, strategy: t.strategy_name, setup: t.setup_name, grade: t.grade_label,
      entry_time: local(t.entry_time), exit_time: local(t.exit_time), entry_price: t.entry_price, stop_loss: t.stop_loss,
      take_profit: t.take_profit, exit_price: t.exit_price, position_size: t.position_size, risk_pct: t.risk_pct,
      risk_amount: t.risk_amount, gross_pnl: t.gross_pnl, fees: t.fees, net_pnl: t.net_pnl, r_multiple: t.r_multiple,
      planned_rr: t.planned_rr, outcome: t.outcome, outcome_override: t.outcome_override,
      followed_rules: t.followed_rules == null ? "" : t.followed_rules ? "yes" : "no", news_condition: t.news_condition,
      confluences: names(confluences.data, t.confluence_ids), mistakes: names(mistakes.data, t.mistake_ids),
      mfe_r: t.mfe_r, mae_r: t.mae_r, entry_reasoning: t.entry_reasoning, notes: t.notes,
    };
    return CSV_HEADERS.map((h) => values[h]);
  });

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse("﻿" + toCsv([...CSV_HEADERS], rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="trading-journal-trades-${stamp}.csv"`,
      "cache-control": "no-store",
    },
  });
}
