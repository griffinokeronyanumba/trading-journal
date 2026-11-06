import type { Metadata } from "next";
import { BookOpenText } from "lucide-react";

import { ComingSoon } from "@/components/layout/coming-soon";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Strategies" };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Strategies" description="Your playbook, with the live performance of each strategy." />
      <ComingSoon icon={BookOpenText} phase={6} title="Strategy library" items={["Entry conditions", "Required confluences", "Rule checklist", "Performance"]} />
    </div>
  );
}
