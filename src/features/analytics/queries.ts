import "server-only";

import { requireUser } from "@/lib/auth";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { createClient } from "@/lib/supabase/server";
import type { TradeEnriched } from "@/types/database";

/** Every trade (enriched) for the given accounts, oldest first. */
export async function getEnrichedTrades(accountIds: string[]): Promise<TradeEnriched[]> {
  await requireUser();
  if (accountIds.length === 0) return [];
  const supabase = await createClient();
  return fetchAll((from, to) =>
    supabase.from("trades_enriched").select("*").in("account_id", accountIds).order("trade_date").order("created_at").range(from, to),
  );
}
