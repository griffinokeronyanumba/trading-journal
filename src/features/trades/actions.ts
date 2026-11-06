"use server";

import { revalidatePath } from "next/cache";

import { getProfile } from "@/features/accounts/queries";
import { removeScreenshotFiles } from "@/features/screenshots/storage-cleanup";
import { dbErrorMessage, fail, ok, zodFieldErrors, type ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { localInputToIso } from "@/lib/time";
import { autoPnlAvailability, pnlFromPrices } from "./calc";
import { tradeSchema } from "./schema";

export async function saveTrade(id: string | null, input: unknown): Promise<ActionResult<{ id: string }>> {
  await requireUser();
  const parsed = tradeSchema.safeParse(input);
  if (!parsed.success) return fail("Please fix the highlighted fields.", zodFieldErrors(parsed.error.issues));
  const v = parsed.data;

  const supabase = await createClient();
  const profile = await getProfile();
  const [{ data: account }, { data: instrument }] = await Promise.all([
    supabase.from("trading_accounts").select("currency").eq("id", v.account_id).maybeSingle(),
    supabase.from("instruments").select("tick_size,tick_value,quote_currency").eq("id", v.instrument_id).maybeSingle(),
  ]);
  if (!account) return fail("Choose one of your accounts.", { account_id: "Account not found." });
  if (!instrument) return fail("Choose one of your instruments.", { instrument_id: "Instrument not found." });

  // "Calculated" P&L is recomputed on the server — never trusted from the browser.
  let gross = v.gross_pnl;
  if (v.pnl_source === "calculated") {
    const can = autoPnlAvailability(instrument, account.currency);
    const calc = can.available ? pnlFromPrices(v.direction, v.entry_price, v.exit_price, v.position_size, instrument) : null;
    if (calc == null) return fail(can.reason ?? "Exit price and position size are needed to calculate P&L.", { gross_pnl: "Can't calculate P&L." });
    gross = calc;
  }

  const ruleChecks = Object.entries(v.rule_checks).map(([rule_id, followed]) => ({ rule_id, followed }));
  const followed = ruleChecks.length > 0 ? ruleChecks.every((r) => r.followed) : v.followed_rules === "" ? null : v.followed_rules === "yes";

  const { data, error } = await supabase.rpc("save_trade", {
    p: {
      trade: {
        ...(id ? { id } : {}),
        account_id: v.account_id,
        instrument_id: v.instrument_id,
        strategy_id: v.strategy_id,
        setup_type_id: v.setup_type_id,
        session_id: v.session_id,
        grade_id: v.grade_id,
        trade_date: v.trade_date,
        direction: v.direction,
        entry_time: localInputToIso(v.entry_time_local, profile.timezone),
        exit_time: localInputToIso(v.exit_time_local, profile.timezone),
        entry_price: v.entry_price,
        stop_loss: v.stop_loss,
        take_profit: v.take_profit,
        exit_price: v.exit_price,
        position_size: v.position_size,
        news_condition: v.news_condition,
        entry_reasoning: v.entry_reasoning,
        followed_rules: followed,
        risk_pct: v.risk_pct,
        risk_amount: v.risk_amount,
        gross_pnl: gross,
        fees: v.fees,
        pnl_source: v.pnl_source,
        outcome_override: v.outcome_override,
        mfe_r: v.mfe_r,
        mae_r: v.mae_r,
        notes: v.notes,
      },
      confluence_ids: v.confluence_ids,
      mistake_ids: v.mistake_ids,
      rule_checks: ruleChecks,
    },
  });
  if (error) return fail(dbErrorMessage(error, "trade"));
  revalidatePath("/", "layout");
  return ok({ id: data as string });
}

export async function deleteTrade(id: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  try {
    await removeScreenshotFiles(supabase, { tradeId: id });
  } catch (e) {
    return fail(`Couldn't delete the trade's screenshots: ${(e as Error).message}`);
  }
  const { error } = await supabase.from("trades").delete().eq("id", id);
  if (error) return fail(dbErrorMessage(error, "trade"));
  revalidatePath("/", "layout");
  return ok(undefined);
}
