"use server";

import { revalidatePath } from "next/cache";

import { dbErrorMessage, fail, ok, zodFieldErrors, type ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { instrumentSchema } from "./schema";

export async function saveInstrument(id: string | null, input: unknown): Promise<ActionResult<{ id: string }>> {
  await requireUser();
  const parsed = instrumentSchema.safeParse(input);
  if (!parsed.success) return fail("Please fix the highlighted fields.", zodFieldErrors(parsed.error.issues));
  const supabase = await createClient();
  const { data, error } = id
    ? await supabase.from("instruments").update(parsed.data).eq("id", id).select("id").single()
    : await supabase.from("instruments").insert(parsed.data).select("id").single();
  if (error) {
    if (error.code === "23505") return fail("You already have an instrument with this symbol.", { symbol: "This symbol already exists." });
    return fail(dbErrorMessage(error, "instrument"));
  }
  revalidatePath("/", "layout");
  return ok({ id: data.id });
}

export async function setInstrumentActive(id: string, active: boolean): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("instruments").update({ is_active: active }).eq("id", id);
  if (error) return fail(dbErrorMessage(error, "instrument"));
  revalidatePath("/", "layout");
  return ok(undefined);
}

export async function deleteInstrument(id: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("instruments").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") return fail("This instrument has trades, so it can't be deleted. Deactivate it instead to hide it from new trades.");
    return fail(dbErrorMessage(error, "instrument"));
  }
  revalidatePath("/", "layout");
  return ok(undefined);
}
