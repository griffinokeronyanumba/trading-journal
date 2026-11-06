import type { Metadata } from "next";
import { ListOrdered } from "lucide-react";

import { ComingSoon } from "@/components/layout/coming-soon";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Trades" };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Trades" description="Every recorded trade across your accounts." />
      <ComingSoon icon={ListOrdered} phase={3} title="Trade journal" items={["Sortable table", "Filters", "Edit & delete", "CSV export"]} />
    </div>
  );
}
