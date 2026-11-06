"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { removeScreenshotFiles } from "@/features/screenshots/storage-cleanup";
import { ACTIVE_ACCOUNT_COOKIE, ALL_ACCOUNTS } from "@/lib/active-account";
import { dbErrorMessage, fail, ok, zodFieldErrors, type ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { accountSchema } from "./schema";

export async function saveAccount(id: string | null, input: unknown): Promise<ActionResult<{ id: string }>> {
  await requireUser();
  const parsed = accountSchema.safeParse(input);
  if (!parsed.success) return fail("Please fix the highlighted fields.", zodFieldErrors(parsed.error.issues));

  const supabase = await createClient();
  const query = id
    ? supabase.from("trading_accounts").update(parsed.data).eq("id", id).select("id").single()
    : supabase.from("trading_accounts").insert(parsed.data).select("id").single();
  const { data, error } = await query;
  if (error) {
    const msg = dbErrorMessage(error, "account");
    return error.code === "23505" ? fail(msg, { name: msg }) : fail(msg);
  }
  revalidatePath("/", "layout");
  return ok({ id: data.id });
}

export async function setAccountArchived(id: string, archived: boolean): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("trading_accounts").update({ is_archived: archived }).eq("id", id);
  if (error) return fail(dbErrorMessage(error, "account"));
  revalidatePath("/", "layout");
  return ok(undefined);
}

/** Permanently deletes the account AND all of its trades (database cascade). */
export async function deleteAccount(id: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  try {
    await removeScreenshotFiles(supabase, { accountId: id });
  } catch (e) {
    return fail(`Couldn't delete the account's screenshots: ${(e as Error).message}`);
  }
  const { error } = await supabase.from("trading_accounts").delete().eq("id", id);
  if (error) return fail(dbErrorMessage(error, "account"));
  revalidatePath("/", "layout");
  return ok(undefined);
}

export async function setActiveAccount(id: string): Promise<void> {
  await requireUser();
  const jar = await cookies();
  jar.set(ACTIVE_ACCOUNT_COOKIE, id || ALL_ACCOUNTS, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/", "layout");
}
