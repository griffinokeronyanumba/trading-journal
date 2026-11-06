"use server";

import { revalidatePath } from "next/cache";

import { dbErrorMessage, fail, ok, type ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/auth";
import { periodBounds } from "@/lib/periods";
import { createClient } from "@/lib/supabase/server";
import { reviewSchema } from "./schema";

export async function saveReview(input: unknown): Promise<ActionResult<{ id: string }>> {
  await requireUser();
  const p = reviewSchema.safeParse(input);
  if (!p.success) return fail("The review couldn't be saved — some values are invalid.");
  const { mistake_ids, best_trade_ids, worst_trade_ids, ...review } = p.data;
  // Always store canonical period bounds (Monday weeks, whole months).
  const bounds = periodBounds(review.period, review.period_start);
  if (bounds.start !== review.period_start) return fail("Invalid period start.");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_review", {
    p: {
      review: { ...review, period_end: bounds.end },
      mistake_ids: review.period === "weekly" ? [] : mistake_ids,
      best_trade_ids: review.period === "weekly" ? best_trade_ids : [],
      worst_trade_ids: review.period === "weekly" ? worst_trade_ids.filter((id) => !best_trade_ids.includes(id)) : [],
    },
  });
  if (error) return fail(dbErrorMessage(error, "review"));
  revalidatePath("/reviews", "layout");
  return ok({ id: data as string });
}

export async function deleteReview(id: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("reviews").delete().eq("id", id);
  if (error) return fail(dbErrorMessage(error, "review"));
  revalidatePath("/reviews", "layout");
  return ok(undefined);
}
