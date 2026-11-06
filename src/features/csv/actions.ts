"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { dbErrorMessage, fail, ok, type ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MAX_IMPORT_ROWS, prepareImport, type PreviewRow, type RowError } from "./prepare";

const input = z.object({
  rows: z.array(z.record(z.string(), z.string())).min(1, "The file has no data rows.").max(MAX_IMPORT_ROWS, `Import at most ${MAX_IMPORT_ROWS} trades at a time.`),
  accountId: z.guid().nullable(),
});

export async function previewImport(raw: unknown): Promise<ActionResult<{ total: number; valid: number; errors: RowError[]; preview: PreviewRow[] }>> {
  await requireUser();
  const p = input.safeParse(raw);
  if (!p.success) return fail(p.error.issues[0].message);
  const r = await prepareImport(p.data.rows, p.data.accountId);
  return ok({ total: r.total, valid: r.payloads.length, errors: r.errors.slice(0, 100), preview: r.preview.slice(0, 20) });
}

/** Imports every row or none (one database transaction). */
export async function commitImport(raw: unknown): Promise<ActionResult<{ imported: number }>> {
  await requireUser();
  const p = input.safeParse(raw);
  if (!p.success) return fail(p.error.issues[0].message);
  const r = await prepareImport(p.data.rows, p.data.accountId);
  if (r.errors.length) return fail(`${r.errors.length} row(s) have problems — fix them and try again. Nothing was imported.`);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("import_trades", { p: r.payloads });
  if (error) return fail(`Import failed, nothing was imported: ${dbErrorMessage(error, "trade")}`);
  revalidatePath("/", "layout");
  return ok({ imported: data as number });
}
