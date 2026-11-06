import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { getReferenceLists } from "@/features/settings/queries";
import { StrategyForm } from "@/features/strategies/components/strategy-form";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Edit strategy" };

export default async function EditStrategyPage({ params }: PageProps<"/strategies/[strategyId]/edit">) {
  const { strategyId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(strategyId)) notFound();
  const lists = await getReferenceLists();
  const st = lists.strategies.find((s) => s.id === strategyId);
  if (!st) notFound();
  const rules = lists.rules.filter((r) => r.strategy_id === st.id);
  const supabase = await createClient();
  const checks = rules.length ? await fetchAll((f, t) => supabase.from("trade_rule_checks").select("rule_id").in("rule_id", rules.map((r) => r.id)).range(f, t)) : [];
  const used: Record<string, number> = {};
  checks.forEach((c) => (used[c.rule_id] = (used[c.rule_id] ?? 0) + 1));
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={`Edit ${st.name}`} />
      <StrategyForm
        strategyId={st.id}
        usedRuleCount={used}
        initial={{
          name: st.name, description: st.description ?? "", entry_conditions: st.entry_conditions ?? "", exit_rules: st.exit_rules ?? "",
          notes: st.notes ?? "", is_active: st.is_active,
          rules: rules.map((r) => ({ id: r.id, rule_text: r.rule_text })),
          confluence_ids: lists.strategyConfluences.filter((c) => c.strategy_id === st.id).map((c) => c.confluence_id),
          session_ids: (await supabase.from("strategy_sessions").select("session_id").eq("strategy_id", st.id)).data?.map((x) => x.session_id) ?? [],
        }}
        confluences={lists.confluences}
        sessions={lists.sessions}
      />
    </div>
  );
}
