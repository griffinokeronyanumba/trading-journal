import "server-only";

import type { TradeFact } from "@/lib/analytics/metrics";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { createClient } from "@/lib/supabase/server";

/** The minimal trade columns needed for balances and statistics. */
export async function getTradeFacts(accountId?: string): Promise<TradeFact[]> {
  const supabase = await createClient();
  return fetchAll((from, to) => {
    let q = supabase
      .from("trades")
      .select("id,account_id,trade_date,entry_time,created_at,net_pnl,r_multiple,planned_rr,outcome_override")
      .order("trade_date")
      .order("created_at")
      .range(from, to);
    if (accountId) q = q.eq("account_id", accountId);
    return q;
  });
}
