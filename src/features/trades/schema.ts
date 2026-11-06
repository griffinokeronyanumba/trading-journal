import { z } from "zod";

import { isoDate, optionalNumber, optionalText, requiredNumber } from "@/lib/forms";

const id = z.guid("Choose a value.");
const optionalId = z.preprocess((v) => (v === "" || v === "__none" || v == null ? null : v), z.guid().nullable());
const localDateTime = z.preprocess(
  (v) => (v === "" || v == null ? null : v),
  z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Use a valid date and time.").nullable(),
);

export const tradeSchema = z
  .object({
    account_id: id,
    instrument_id: id,
    direction: z.enum(["buy", "sell"]),
    trade_date: isoDate("Trade date"),
    entry_time_local: localDateTime,
    exit_time_local: localDateTime,
    session_id: optionalId,
    entry_price: requiredNumber("Entry price", { positive: true }),
    stop_loss: optionalNumber("Stop-loss", { positive: true }),
    take_profit: optionalNumber("Take-profit", { positive: true }),
    exit_price: optionalNumber("Exit price", { positive: true }),
    position_size: optionalNumber("Position size", { positive: true }),

    strategy_id: optionalId,
    setup_type_id: optionalId,
    grade_id: optionalId,
    news_condition: z.enum(["none", "low_impact", "medium_impact", "high_impact", "during_release"]),
    entry_reasoning: optionalText(4000),
    followed_rules: z.enum(["yes", "no", ""]),
    confluence_ids: z.array(z.guid()),
    rule_checks: z.record(z.string(), z.boolean()),

    risk_pct: optionalNumber("Risk %", { positive: true, max: 100 }),
    risk_amount: optionalNumber("Risk amount", { positive: true }),
    gross_pnl: optionalNumber("Realized P&L"),
    fees: optionalNumber("Fees", { min: 0 }).transform((v) => v ?? 0),
    pnl_source: z.enum(["manual", "calculated"]),
    outcome_override: z.preprocess((v) => (v === "" || v === "__none" ? null : v), z.enum(["win", "loss", "breakeven"]).nullable()),

    mistake_ids: z.array(z.guid()),
    mfe_r: optionalNumber("MFE", { min: 0 }),
    mae_r: optionalNumber("MAE", { min: 0 }),
    notes: optionalText(4000),
  })
  .refine((v) => !v.entry_time_local || !v.exit_time_local || v.exit_time_local >= v.entry_time_local, {
    message: "Exit time can't be before entry time.",
    path: ["exit_time_local"],
  })
  .refine((v) => v.exit_price == null || v.gross_pnl != null, {
    message: "Enter the realized P&L (or calculate it) for a closed trade.",
    path: ["gross_pnl"],
  });

export type TradeFormInput = z.input<typeof tradeSchema>;
export type TradeFormValues = z.output<typeof tradeSchema>;
