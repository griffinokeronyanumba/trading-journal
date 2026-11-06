import { z } from "zod";

import { optionalText } from "@/lib/forms";

export const strategySchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(80, "Keep the name under 80 characters."),
  description: optionalText(4000),
  entry_conditions: optionalText(4000),
  exit_rules: optionalText(4000),
  notes: optionalText(4000),
  is_active: z.boolean(),
  rules: z
    .array(z.object({ id: z.string().optional(), rule_text: z.string().trim() }))
    .transform((rs) => rs.filter((r) => r.rule_text.length > 0))
    .pipe(z.array(z.object({ id: z.string().optional(), rule_text: z.string().max(200, "Keep each rule under 200 characters.") })).max(30, "Up to 30 rules.")),
  confluence_ids: z.array(z.guid()),
  session_ids: z.array(z.guid()),
});

export type StrategyFormInput = z.input<typeof strategySchema>;
export type StrategyFormValues = z.output<typeof strategySchema>;
