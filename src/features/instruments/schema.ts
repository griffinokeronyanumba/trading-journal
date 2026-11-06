import { z } from "zod";

import { optionalNumber, optionalText } from "@/lib/forms";

export const instrumentSchema = z
  .object({
    symbol: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9._/-]{1,20}$/, "Use 1–20 letters, numbers or . _ / - (e.g. XAUUSD, BTC/USD)."),
    display_name: optionalText(80),
    category: z.enum(["forex", "indices", "commodities", "crypto", "stocks", "custom"]),
    quote_currency: z.preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? null : typeof v === "string" ? v.trim().toUpperCase() : v),
      z.string().regex(/^[A-Z]{3}$/, "Use a 3-letter currency code.").nullable(),
    ),
    contract_size: optionalNumber("Contract size", { positive: true }),
    tick_size: optionalNumber("Tick size", { positive: true }),
    tick_value: optionalNumber("Tick value", { positive: true }),
    pip_size: optionalNumber("Pip size", { positive: true }),
    notes: optionalText(1000),
    is_active: z.boolean(),
  })
  .refine((v) => (v.tick_size == null) === (v.tick_value == null), {
    message: "Enter both tick size and tick value (or neither).",
    path: ["tick_value"],
  });

export type InstrumentFormInput = z.input<typeof instrumentSchema>;
export type InstrumentFormValues = z.output<typeof instrumentSchema>;
