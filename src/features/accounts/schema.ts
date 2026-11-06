import { z } from "zod";

import { isoDate, optionalNumber, optionalText, requiredNumber } from "@/lib/forms";

export const accountSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(80, "Keep the name under 80 characters."),
  account_type: z.enum(["backtest", "evaluation", "funded", "simulated", "live", "other"]),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "Use a 3-letter currency code, e.g. USD."),
  starting_balance: requiredNumber("Starting balance", { positive: true, max: 1_000_000_000_000 }),
  risk_per_trade_pct: requiredNumber("Risk per trade", { positive: true, max: 100 }),
  daily_loss_limit_pct: optionalNumber("Daily loss limit", { positive: true, max: 100 }),
  max_drawdown_pct: optionalNumber("Max drawdown", { positive: true, max: 100 }),
  opened_on: isoDate("Creation date"),
  notes: optionalText(2000),
});

export type AccountFormInput = z.input<typeof accountSchema>;
export type AccountFormValues = z.output<typeof accountSchema>;
