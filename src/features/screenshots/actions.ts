"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { dbErrorMessage, fail, ok, type ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MAX_PER_KIND, SCREENSHOT_BUCKET } from "./constants";

const addSchema = z.object({
  trade_id: z.guid(),
  kind: z.enum(["before", "after"]),
  storage_path: z.string().max(300),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  size_bytes: z.number().int().positive().nullable(),
});

/** Records an uploaded file. The upload itself goes straight from the browser to Storage. */
export async function addScreenshot(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const p = addSchema.safeParse(input);
  if (!p.success) return fail("Invalid screenshot details.");
  const v = p.data;
  const expected = new RegExp(`^${user.id}/${v.trade_id}/[A-Za-z0-9-]+\\.(webp|png|jpe?g)$`);
  if (!expected.test(v.storage_path)) return fail("Invalid file location.");

  const supabase = await createClient();
  const { data: existing, error: countError } = await supabase.from("trade_screenshots").select("sort_order").eq("trade_id", v.trade_id).eq("kind", v.kind);
  if (countError) return fail(dbErrorMessage(countError));
  if (existing.length >= MAX_PER_KIND) {
    await supabase.storage.from(SCREENSHOT_BUCKET).remove([v.storage_path]);
    return fail(`You can attach up to ${MAX_PER_KIND} “${v.kind}” screenshots per trade.`);
  }
  const sort_order = existing.reduce((m, s) => Math.max(m, s.sort_order + 1), 0);
  const { data, error } = await supabase.from("trade_screenshots").insert({ ...v, sort_order }).select("id").single();
  if (error) {
    await supabase.storage.from(SCREENSHOT_BUCKET).remove([v.storage_path]); // don't leave orphan files
    return fail(dbErrorMessage(error, "screenshot"));
  }
  revalidatePath(`/trades/${v.trade_id}`);
  return ok({ id: data.id });
}

export async function deleteScreenshot(id: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { data: shot, error } = await supabase.from("trade_screenshots").select("id,trade_id,storage_path").eq("id", z.guid().parse(id)).maybeSingle();
  if (error) return fail(dbErrorMessage(error));
  if (!shot) return fail("Screenshot not found.");
  const { error: se } = await supabase.storage.from(SCREENSHOT_BUCKET).remove([shot.storage_path]);
  if (se) return fail(`Couldn't delete the file: ${se.message}`);
  const { error: de } = await supabase.from("trade_screenshots").delete().eq("id", shot.id);
  if (de) return fail(dbErrorMessage(de));
  revalidatePath(`/trades/${shot.trade_id}`);
  return ok(undefined);
}

export async function updateScreenshotCaption(id: string, caption: string): Promise<ActionResult> {
  await requireUser();
  const c = z.string().trim().max(200).parse(caption);
  const supabase = await createClient();
  const { data, error } = await supabase.from("trade_screenshots").update({ caption: c || null }).eq("id", z.guid().parse(id)).select("trade_id").single();
  if (error) return fail(dbErrorMessage(error));
  revalidatePath(`/trades/${data.trade_id}`);
  return ok(undefined);
}
