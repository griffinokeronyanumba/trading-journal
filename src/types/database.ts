/**
 * Database types, kept in step with supabase/migrations by hand.
 * (Optional later: regenerate with `npx supabase gen types typescript`.)
 *
 * Postgres `numeric` arrives as a JSON number; `date` as "YYYY-MM-DD";
 * `timestamptz` and `time` as ISO strings.
 */

export type AccountType = "backtest" | "evaluation" | "funded" | "simulated" | "live" | "other";
export type InstrumentCategory = "forex" | "indices" | "commodities" | "crypto" | "stocks" | "custom";
export type TradeDirection = "buy" | "sell";
export type TradeOutcome = "win" | "loss" | "breakeven";
export type NewsCondition = "none" | "low_impact" | "medium_impact" | "high_impact" | "during_release";
export type PnlSource = "manual" | "calculated";
export type ScreenshotKind = "before" | "after";
export type ReviewPeriod = "daily" | "weekly" | "monthly";
export type ReviewTradeRole = "best" | "worst";

type Owned = { user_id: string };
type Stamps = { created_at: string; updated_at: string };

export type Profile = {
  id: string;
  display_name: string | null;
  timezone: string;
  default_currency: string;
  breakeven_band_r: number;
} & Stamps;

export type TradingAccount = {
  id: string;
  name: string;
  account_type: AccountType;
  currency: string;
  starting_balance: number;
  risk_per_trade_pct: number;
  daily_loss_limit_pct: number | null;
  max_drawdown_pct: number | null;
  opened_on: string;
  is_archived: boolean;
  notes: string | null;
} & Owned & Stamps;

export type Instrument = {
  id: string;
  symbol: string;
  display_name: string | null;
  category: InstrumentCategory;
  quote_currency: string | null;
  contract_size: number | null;
  tick_size: number | null;
  tick_value: number | null;
  pip_size: number | null;
  notes: string | null;
  is_active: boolean;
} & Owned & Stamps;

export type TradingSession = {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  sort_order: number;
  is_active: boolean;
} & Owned & Stamps;

export type TradeGrade = {
  id: string;
  label: string;
  description: string | null;
  sort_order: number;
} & Owned & Stamps;

export type Strategy = {
  id: string;
  name: string;
  description: string | null;
  entry_conditions: string | null;
  exit_rules: string | null;
  notes: string | null;
  is_active: boolean;
} & Owned & Stamps;

export type SetupType = { id: string; strategy_id: string | null; name: string } & Owned & Stamps;
export type Confluence = { id: string; name: string } & Owned & Stamps;
export type MistakeTag = { id: string; name: string } & Owned & Stamps;
export type StrategyRule = { id: string; strategy_id: string; rule_text: string; sort_order: number } & Owned & Stamps;
export type StrategyConfluence = { strategy_id: string; confluence_id: string } & Owned;
export type StrategySession = { strategy_id: string; session_id: string } & Owned;

export type Trade = {
  id: string;
  account_id: string;
  instrument_id: string;
  strategy_id: string | null;
  setup_type_id: string | null;
  session_id: string | null;
  grade_id: string | null;
  trade_date: string;
  direction: TradeDirection;
  entry_time: string | null;
  exit_time: string | null;
  entry_price: number;
  stop_loss: number | null;
  take_profit: number | null;
  exit_price: number | null;
  position_size: number | null;
  news_condition: NewsCondition;
  entry_reasoning: string | null;
  followed_rules: boolean | null;
  risk_pct: number | null;
  risk_amount: number | null;
  gross_pnl: number | null;
  fees: number;
  net_pnl: number | null; // generated
  pnl_source: PnlSource;
  r_multiple: number | null; // generated
  planned_rr: number | null; // generated
  potential_reward: number | null; // generated
  outcome_override: TradeOutcome | null;
  mfe_r: number | null;
  mae_r: number | null;
  notes: string | null;
} & Owned & Stamps;

/** Read model from the trades_enriched view (migration 0003). */
export type TradeEnriched = Trade & {
  account_name: string;
  currency: string;
  symbol: string;
  instrument_category: InstrumentCategory;
  strategy_name: string | null;
  setup_name: string | null;
  session_name: string | null;
  grade_label: string | null;
  grade_rank: number | null;
  outcome: TradeOutcome | null;
  weekday: number; // 1 = Monday … 7 = Sunday
  month: string; // YYYY-MM
  mistake_ids: string[];
  confluence_ids: string[];
  rules_checked: number;
  rules_broken: number;
};

export type TradeConfluence = { trade_id: string; confluence_id: string } & Owned;
export type TradeMistake = { trade_id: string; mistake_tag_id: string } & Owned;
export type TradeRuleCheck = { trade_id: string; rule_id: string; followed: boolean } & Owned;

export type TradeScreenshot = {
  id: string;
  trade_id: string;
  kind: ScreenshotKind;
  storage_path: string;
  caption: string | null;
  sort_order: number;
  width: number | null;
  height: number | null;
  size_bytes: number | null;
  created_at: string;
} & Owned;

export type Review = {
  id: string;
  account_id: string | null;
  period: ReviewPeriod;
  period_start: string;
  period_end: string;
  summary: string | null;
  went_well: string | null;
  went_wrong: string | null;
  lessons: string | null;
  strategy_effectiveness: string | null;
  improvement_areas: string | null;
  objectives: string | null;
} & Owned & Stamps;

export type ReviewMistake = { review_id: string; mistake_tag_id: string } & Owned;
export type ReviewTrade = { review_id: string; trade_id: string; role: ReviewTradeRole } & Owned;

export type SaveTradePayload = {
  trade: Partial<Omit<Trade, "net_pnl" | "r_multiple" | "planned_rr" | "potential_reward" | "user_id" | "created_at" | "updated_at">>;
  confluence_ids: string[];
  mistake_ids: string[];
  rule_checks: { rule_id: string; followed: boolean }[];
};

export type SaveStrategyPayload = {
  strategy: { id?: string; name: string; description: string | null; entry_conditions: string | null; exit_rules: string | null; notes: string | null; is_active: boolean };
  rules: { id?: string; rule_text: string }[];
  confluence_ids: string[];
  session_ids: string[];
};

export type SaveReviewPayload = {
  review: Omit<Review, "id" | "user_id" | "created_at" | "updated_at">;
  mistake_ids: string[];
  best_trade_ids: string[];
  worst_trade_ids: string[];
};

// ---------------------------------------------------------------------
// Supabase client generic. Insert/Update are deliberately permissive
// (Partial) — the database enforces required columns and constraints,
// and every write is validated with Zod first.
// ---------------------------------------------------------------------
type Generated = "net_pnl" | "r_multiple" | "planned_rr" | "potential_reward" | "created_at" | "updated_at";
type T<Row> = {
  Row: Row;
  Insert: Partial<Omit<Row, Generated>>;
  Update: Partial<Omit<Row, Generated>>;
  Relationships: [];
};
type V<Row> = { Row: Row; Relationships: [] };

export type Database = {
  public: {
    Tables: {
      profiles: T<Profile>;
      trading_accounts: T<TradingAccount>;
      instruments: T<Instrument>;
      trading_sessions: T<TradingSession>;
      trade_grades: T<TradeGrade>;
      strategies: T<Strategy>;
      setup_types: T<SetupType>;
      confluences: T<Confluence>;
      mistake_tags: T<MistakeTag>;
      strategy_rules: T<StrategyRule>;
      strategy_confluences: T<StrategyConfluence>;
      strategy_sessions: T<StrategySession>;
      trades: T<Trade>;
      trade_confluences: T<TradeConfluence>;
      trade_mistakes: T<TradeMistake>;
      trade_rule_checks: T<TradeRuleCheck>;
      trade_screenshots: T<TradeScreenshot>;
      reviews: T<Review>;
      review_mistakes: T<ReviewMistake>;
      review_trades: T<ReviewTrade>;
    };
    Views: { trades_enriched: V<TradeEnriched> };
    Functions: {
      save_trade: { Args: { p: SaveTradePayload }; Returns: string };
      save_strategy: { Args: { p: SaveStrategyPayload }; Returns: string };
      save_review: { Args: { p: SaveReviewPayload }; Returns: string };
      import_trades: { Args: { p: SaveTradePayload[] }; Returns: number };
    };
    Enums: {
      account_type: AccountType;
      instrument_category: InstrumentCategory;
      trade_direction: TradeDirection;
      trade_outcome: TradeOutcome;
      news_condition: NewsCondition;
      pnl_source: PnlSource;
      screenshot_kind: ScreenshotKind;
      review_period: ReviewPeriod;
      review_trade_role: ReviewTradeRole;
    };
    CompositeTypes: Record<string, never>;
  };
};
