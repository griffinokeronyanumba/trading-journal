"use server";

import { revalidatePath } from "next/cache";

import { dbErrorMessage, fail, ok, zodFieldErrors, type ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { strategySchema } from "./schema";

export async function saveStrategy(id: string | null, input: unknown): Promise<ActionResult<{ id: string }>> {
  await requireUser();
  const p = strategySchema.safeParse(input);
  if (!p.success) return fail("Please fix the highlighted fields.", zodFieldErrors(p.error.issues));
  const { rules, confluence_ids, session_ids, ...strategy } = p.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_strategy", {
    p: {
      strategy: { ...(id ? { id } : {}), ...strategy },
      rules: rules.map((r) => (r.id ? { id: r.id, rule_text: r.rule_text } : { rule_text: r.rule_text })),
      confluence_ids,
      session_ids,
    },
  });
  if (error) {
    if (error.code === "23505") return fail("A strategy with this name already exists.", { name: "This name is already used." });
    return fail(dbErrorMessage(error, "strategy"));
  }
  revalidatePath("/", "layout");
  return ok({ id: data as string });
}

/** Deletes the strategy. Its trades are kept (their strategy becomes "not set"). */
export async function deleteStrategy(id: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("strategies").delete().eq("id", id);
  if (error) return fail(dbErrorMessage(error, "strategy"));
  revalidatePath("/", "layout");
  return ok(undefined);
}
