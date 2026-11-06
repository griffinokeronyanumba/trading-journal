import "server-only";

import type { createClient } from "@/lib/supabase/server";
import { SCREENSHOT_BUCKET } from "./constants";

type Client = Awaited<ReturnType<typeof createClient>>;

/**
 * Deleting database rows does not delete files in Storage, so before a trade
 * or account is deleted we remove its screenshot files explicitly.
 */
export async function removeScreenshotFiles(supabase: Client, filter: { tradeId?: string; accountId?: string }) {
  let tradeIds: string[] = [];
  if (filter.tradeId) tradeIds = [filter.tradeId];
  if (filter.accountId) {
    const { data, error } = await supabase.from("trades").select("id").eq("account_id", filter.accountId);
    if (error) throw new Error(error.message);
    tradeIds = data.map((t) => t.id);
  }
  if (tradeIds.length === 0) return;
  for (let i = 0; i < tradeIds.length; i += 200) {
    const { data, error } = await supabase.from("trade_screenshots").select("storage_path").in("trade_id", tradeIds.slice(i, i + 200));
    if (error) throw new Error(error.message);
    const paths = data.map((s) => s.storage_path);
    for (let j = 0; j < paths.length; j += 100) {
      const { error: e } = await supabase.storage.from(SCREENSHOT_BUCKET).remove(paths.slice(j, j + 100));
      if (e) throw new Error(e.message);
    }
  }
}
