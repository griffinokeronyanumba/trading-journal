import type { Metadata } from "next";
import { NotebookPen } from "lucide-react";

import { ComingSoon } from "@/components/layout/coming-soon";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Reviews" };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Reviews" description="Daily, weekly and monthly reflections." />
      <ComingSoon icon={NotebookPen} phase={6} title="Performance reviews" items={["Daily", "Weekly", "Monthly", "Linked trades & mistakes"]} />
    </div>
  );
}
