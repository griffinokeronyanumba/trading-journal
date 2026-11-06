import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { getReferenceLists } from "@/features/settings/queries";
import { StrategyForm } from "@/features/strategies/components/strategy-form";

export const metadata: Metadata = { title: "New strategy" };

export default async function NewStrategyPage() {
  const lists = await getReferenceLists();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="New strategy" description="Define it precisely — the checklist keeps you honest when you trade it." />
      <StrategyForm
        initial={{ name: "", description: "", entry_conditions: "", exit_rules: "", notes: "", is_active: true, rules: [{ rule_text: "" }], confluence_ids: [], session_ids: [] }}
        confluences={lists.confluences}
        sessions={lists.sessions}
      />
    </div>
  );
}
