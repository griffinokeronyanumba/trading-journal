import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { TradeScreenshot } from "@/types/database";
import { SCREENSHOT_BUCKET, SIGNED_URL_SECONDS } from "./constants";

export type ScreenshotView = Pick<TradeScreenshot, "id" | "kind" | "caption" | "width" | "height" | "size_bytes" | "created_at"> & { url: string | null };

/** Screenshots for a trade with short-lived signed URLs (the bucket is private). */
export async function getScreenshots(tradeId: string): Promise<ScreenshotView[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("trade_screenshots").select("*").eq("trade_id", tradeId).order("kind").order("sort_order");
  if (error) throw new Error(error.message);
  if (data.length === 0) return [];
  const { data: signed, error: se } = await supabase.storage.from(SCREENSHOT_BUCKET).createSignedUrls(data.map((s) => s.storage_path), SIGNED_URL_SECONDS);
  if (se) throw new Error(se.message);
  const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  return data.map((s) => ({
    id: s.id, kind: s.kind, caption: s.caption, width: s.width, height: s.height, size_bytes: s.size_bytes, created_at: s.created_at,
    url: urlByPath.get(s.storage_path) ?? null,
  }));
}
