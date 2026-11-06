import type { Metadata } from "next";
import { NotebookPen } from "lucide-react";

import { ComingSoon } from "@/components/layout/coming-soon";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "New trade" };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="New trade" description="Record a trade with its plan, execution and result." />
      <ComingSoon icon={NotebookPen} phase={3} title="Trade entry form" items={["Trade details", "Strategy & confluences", "Financials & R", "Mistakes & rules"]} />
    </div>
  );
}
