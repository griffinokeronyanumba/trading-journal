import "server-only";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** All user-defined lists used by trade entry and settings. */
export async function getReferenceLists() {
  await requireUser();
  const supabase = await createClient();
  const [sessions, grades, mistakes, confluences, setups, strategies, rules, strategyConfluences] = await Promise.all([
    supabase.from("trading_sessions").select("*").order("sort_order").order("name"),
    supabase.from("trade_grades").select("*").order("sort_order"),
    supabase.from("mistake_tags").select("*").order("name"),
    supabase.from("confluences").select("*").order("name"),
    supabase.from("setup_types").select("*").order("name"),
    supabase.from("strategies").select("*").order("name"),
    supabase.from("strategy_rules").select("*").order("sort_order"),
    supabase.from("strategy_confluences").select("*"),
  ]);
  for (const r of [sessions, grades, mistakes, confluences, setups, strategies, rules, strategyConfluences]) {
    if (r.error) throw new Error(r.error.message);
  }
  return {
    sessions: sessions.data!,
    grades: grades.data!,
    mistakes: mistakes.data!,
    confluences: confluences.data!,
    setups: setups.data!,
    strategies: strategies.data!,
    rules: rules.data!,
    strategyConfluences: strategyConfluences.data!,
  };
}
