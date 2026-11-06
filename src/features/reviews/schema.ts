import { z } from "zod";

import { optionalText } from "@/lib/forms";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const reviewSchema = z.object({
  account_id: z.guid().nullable(),
  period: z.enum(["daily", "weekly", "monthly"]),
  period_start: day,
  period_end: day,
  summary: optionalText(8000),
  went_well: optionalText(8000),
  went_wrong: optionalText(8000),
  lessons: optionalText(8000),
  strategy_effectiveness: optionalText(8000),
  improvement_areas: optionalText(8000),
  objectives: optionalText(8000),
  mistake_ids: z.array(z.guid()),
  best_trade_ids: z.array(z.guid()).max(10),
  worst_trade_ids: z.array(z.guid()).max(10),
});

export type ReviewFormInput = z.input<typeof reviewSchema>;
