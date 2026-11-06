import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";

import { ComingSoon } from "@/components/layout/coming-soon";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Analytics" };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Analytics" description="Break down performance by instrument, session, strategy and more." />
      <ComingSoon icon={BarChart3} phase={5} title="Performance analytics" items={["Filters", "Instruments", "Sessions", "Strategies", "Buy vs sell", "Grades", "Mistakes", "Rule adherence"]} />
    </div>
  );
}
