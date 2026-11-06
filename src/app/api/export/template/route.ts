import { NextResponse } from "next/server";

import { CSV_HEADERS, DERIVED } from "@/features/csv/columns";
import { toCsv } from "@/lib/csv";

/** GET /api/export/template → an example CSV showing the import format. */
export function GET() {
  const headers = CSV_HEADERS.filter((h) => !DERIVED.has(h));
  const example: Record<string, string | number> = {
    account: "", trade_date: "2026-01-05", symbol: "XAUUSD", direction: "buy", session: "London", strategy: "", setup: "", grade: "A",
    entry_time: "2026-01-05 10:30", exit_time: "2026-01-05 12:00", entry_price: 2000, stop_loss: 1990, take_profit: 2030, exit_price: 2030,
    position_size: 0.1, risk_pct: 1, risk_amount: 100, gross_pnl: 300, fees: 2, outcome_override: "", followed_rules: "yes",
    news_condition: "none", confluences: "", mistakes: "", mfe_r: "", mae_r: "", entry_reasoning: "Example — delete this row", notes: "",
  };
  return new NextResponse("﻿" + toCsv(headers, [headers.map((h) => example[h] ?? "")]), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="trading-journal-import-template.csv"' },
  });
}
