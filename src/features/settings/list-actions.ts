"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { dbErrorMessage, fail, ok, type ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const TAG_TABLES = ["mistake_tags", "confluences", "setup_types"] as const;
export type TagTable = (typeof TAG_TABLES)[number];
const tagTable = z.enum(TAG_TABLES);
const name = z.string().trim().min(1, "Name is required.").max(60, "Keep it under 60 characters.");
const uuid = z.guid();

function done() {
  revalidatePath("/", "layout");
}

// ---------- Tags (mistakes, confluences, setup types) ----------
export async function saveTag(table: TagTable, id: string | null, rawName: string): Promise<ActionResult<{ id: string }>> {
  await requireUser();
  const t = tagTable.parse(table);
  const n = name.safeParse(rawName);
  if (!n.success) return fail(n.error.issues[0].message);
  const supabase = await createClient();
  const { data, error } = id
    ? await supabase.from(t).update({ name: n.data }).eq("id", uuid.parse(id)).select("id").single()
    : await supabase.from(t).insert({ name: n.data }).select("id").single();
  if (error) return fail(error.code === "23505" ? `“${n.data}” already exists.` : dbErrorMessage(error));
  done();
  return ok({ id: data.id });
}

export async function deleteTag(table: TagTable, id: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from(tagTable.parse(table)).delete().eq("id", uuid.parse(id));
  if (error) return fail(dbErrorMessage(error));
  done();
  return ok(undefined);
}

// ---------- Sessions ----------
const time = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Use HH:MM.");
const sessionSchema = z.object({ name: z.string().trim().min(1, "Name is required.").max(40), start_time: time, end_time: time, is_active: z.boolean() });

export async function saveSession(id: string | null, input: unknown): Promise<ActionResult<{ id: string }>> {
  await requireUser();
  const p = sessionSchema.safeParse(input);
  if (!p.success) return fail(p.error.issues[0].message);
  if (p.data.start_time.slice(0, 5) === p.data.end_time.slice(0, 5)) return fail("Start and end time can't be the same.");
  const supabase = await createClient();
  let sort_order: number | undefined;
  if (!id) {
    const { data } = await supabase.from("trading_sessions").select("sort_order").order("sort_order", { ascending: false }).limit(1);
    sort_order = (data?.[0]?.sort_order ?? -1) + 1;
  }
  const { data, error } = id
    ? await supabase.from("trading_sessions").update(p.data).eq("id", uuid.parse(id)).select("id").single()
    : await supabase.from("trading_sessions").insert({ ...p.data, sort_order }).select("id").single();
  if (error) return fail(error.code === "23505" ? "A session with that name already exists." : dbErrorMessage(error));
  done();
  return ok({ id: data.id });
}

export async function deleteSession(id: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("trading_sessions").delete().eq("id", uuid.parse(id));
  if (error) return fail(dbErrorMessage(error));
  done();
  return ok(undefined);
}

// ---------- Grades ----------
const gradeSchema = z.object({
  label: z.string().trim().min(1, "Label is required.").max(10, "Max 10 characters."),
  description: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v), z.string().trim().max(200).nullable()),
});

export async function saveGrade(id: string | null, input: unknown): Promise<ActionResult<{ id: string }>> {
  await requireUser();
  const p = gradeSchema.safeParse(input);
  if (!p.success) return fail(p.error.issues[0].message);
  const supabase = await createClient();
  let sort_order: number | undefined;
  if (!id) {
    const { data } = await supabase.from("trade_grades").select("sort_order").order("sort_order", { ascending: false }).limit(1);
    sort_order = (data?.[0]?.sort_order ?? -1) + 1;
  }
  const { data, error } = id
    ? await supabase.from("trade_grades").update(p.data).eq("id", uuid.parse(id)).select("id").single()
    : await supabase.from("trade_grades").insert({ ...p.data, sort_order }).select("id").single();
  if (error) return fail(error.code === "23505" ? "That grade label already exists." : dbErrorMessage(error));
  done();
  return ok({ id: data.id });
}

export async function deleteGrade(id: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("trade_grades").delete().eq("id", uuid.parse(id));
  if (error) return fail(dbErrorMessage(error));
  done();
  return ok(undefined);
}

/** Swap a grade with its neighbour (sort_order 0 = best). */
export async function moveGrade(id: string, direction: "up" | "down"): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { data: grades, error } = await supabase.from("trade_grades").select("id,sort_order").order("sort_order");
  if (error) return fail(dbErrorMessage(error));
  const i = grades.findIndex((g) => g.id === id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= grades.length) return ok(undefined);
  const order = grades.map((g) => g.id);
  [order[i], order[j]] = [order[j], order[i]];
  for (const [index, gid] of order.entries()) {
    const { error: e } = await supabase.from("trade_grades").update({ sort_order: index }).eq("id", gid);
    if (e) return fail(dbErrorMessage(e));
  }
  done();
  return ok(undefined);
}
