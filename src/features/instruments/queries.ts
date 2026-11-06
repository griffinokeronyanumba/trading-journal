import "server-only";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function listInstruments() {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("instruments").select("*").order("is_active", { ascending: false }).order("symbol");
  if (error) throw new Error(error.message);
  return data;
}
