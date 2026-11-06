/** One column list for export AND import, so an export can be re-imported. */
export const CSV_HEADERS = [
  "trade_id", "account", "currency", "trade_date", "symbol", "direction", "session", "strategy", "setup", "grade",
  "entry_time", "exit_time", "entry_price", "stop_loss", "take_profit", "exit_price", "position_size",
  "risk_pct", "risk_amount", "gross_pnl", "fees", "net_pnl", "r_multiple", "planned_rr", "outcome", "outcome_override",
  "followed_rules", "news_condition", "confluences", "mistakes", "mfe_r", "mae_r", "entry_reasoning", "notes",
] as const;

/** Columns computed by the app — exported for analysis, ignored on import. */
export const DERIVED = new Set(["trade_id", "currency", "net_pnl", "r_multiple", "planned_rr", "outcome"]);
export const REQUIRED = ["trade_date", "symbol", "direction", "entry_price"] as const;
export const LIST_SEPARATOR = ";";
