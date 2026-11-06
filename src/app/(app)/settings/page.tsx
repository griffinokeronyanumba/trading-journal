import type { Metadata } from "next";
import { Settings } from "lucide-react";

import { ComingSoon } from "@/components/layout/coming-soon";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Settings" };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" description="Profile, timezone, sessions, grades and tags." />
      <ComingSoon icon={Settings} phase={2} title="Preferences" items={["Timezone (Africa/Nairobi)", "Session times", "Trade grades", "Break-even band (±0.1R)", "Mistake & confluence tags"]} />
    </div>
  );
}
